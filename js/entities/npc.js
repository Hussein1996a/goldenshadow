/* ===== Golden Shadow — NPCs (pedestrians, enemies, police) ===== */
const NPC_COLORS = {
  ped: [0x5a6470, 0x6b5740, 0x4a4e57, 0x753a3a, 0x3a5a75, 0x6a5a3a, 0x444a55, 0x7a5a6b],
  enemy: [0x2e3a44, 0x3a2e3a, 0x4a3a2e, 0x2a2f3a],
  cop: [0x1a3a6e, 0x2a4a8e]
};

class NPC {
  constructor(opts) {
    this.type = opts.type || 'ped';
    this.x = opts.x;
    this.z = opts.z;
    this.y = 0;
    this.heading = opts.heading || rand(0, Math.PI * 2);
    this.health = opts.health || (this.type === 'cop' ? 90 : this.type === 'enemy' ? 70 : 45);
    this.maxHealth = this.health;
    this.damage = opts.damage || (this.type === 'cop' ? 12 : this.type === 'enemy' ? 9 : 0);
    this.enemyType = opts.enemyType || 'gang';
    this.alive = true;
    this.radius = 0.45;
    this.state = 'wander';
    this.stateT = 0;
    this.walkT = 0;
    this.fireT = rand(0.5, 2);
    this.target = opts.target || null;     // mission target marker
    this.aggro = opts.aggro || 35;
    this.weaponKind = opts.weaponKind || (this.type === 'cop' ? 'pistol' : ['pistol', 'smg'][randi(0, 1)]);
    this.missionOwned = opts.missionOwned || false;
    this.dropMoney = opts.dropMoney !== undefined ? opts.dropMoney : true;
    this.group = this.buildMesh();
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
    World.scene.add(this.group);
    World.npcs.push(this);
    this.wanderTarget = null;
    this.fleeT = 0;
    this.name = opts.name || '';
    this.turn = rand(0, Math.PI * 2);
    this.idleT = rand(0, 3);
    // Advanced combat AI: enemies can seek hard cover, hold a position,
    // peek when a firing lane opens, then retreat to safety.
    this.coverPoint = null;
    this.coverT = 0;
    this.peekT = 0;
    this.coverCooldown = rand(1.5, 4);
    this.lastCombatT = 0;
    // vehicle-impact handling: a soft cooldown so a car idling against a
    // pedestrian doesn't retrigger a flee/stagger reaction every frame
    this.bumpCooldown = 0;
  }

  buildMesh() {
    const g = new THREE.Group();
    const colors = NPC_COLORS[this.type] || NPC_COLORS.ped;
    const skinTones = [0xc99c6e, 0xa9764e, 0x8a5a3a, 0xe0b98a, 0x7a4a30];
    const shirt = new THREE.MeshLambertMaterial({ color: colors[randi(0, colors.length - 1)] });
    const pants = new THREE.MeshLambertMaterial({ color: [0x2c3238, 0x22262c, 0x3a3530, 0x1c2430][randi(0, 3)] });
    const skin = new THREE.MeshLambertMaterial({ color: skinTones[randi(0, skinTones.length - 1)] });
    const hairMat = new THREE.MeshLambertMaterial({ color: [0x1c1712, 0x2a1e14, 0x3a3a3a, 0x14100c][randi(0, 3)] });
    // slight per-npc height/build variance so a crowd doesn't look copy-pasted
    this.scale = rand(0.93, 1.08);
    g.scale.setScalar(this.scale);

    this.hips = new THREE.Group();
    this.hipsBaseY = 0.88;
    this.hips.position.y = this.hipsBaseY;
    g.add(this.hips);

    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.26), pants);
    waist.position.y = 0.1;
    this.hips.add(waist);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.28), shirt);
    chest.position.y = 0.42;
    this.hips.add(chest);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), skin);
    neck.position.y = 0.68;
    this.hips.add(neck);
    this.head = new THREE.Group();
    this.head.position.y = 0.77;
    this.hips.add(this.head);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), skin);
    headMesh.position.y = 0.17;
    this.head.add(headMesh);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.34), hairMat);
    hair.position.y = 0.34;
    this.head.add(hair);

    const buildArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.3 * side, 0.55, 0);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.29, 0.16), shirt);
      upper.position.y = -0.145;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.29;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.27, 0.14), skin);
      fore.position.y = -0.135;
      elbow.add(fore);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.12), skin);
      hand.position.y = -0.3;
      elbow.add(hand);
      this.hips.add(shoulder);
      return { shoulder, elbow, hand };
    };
    const armL = buildArm(-1), armR = buildArm(1);
    this.armL = armL.shoulder; this.armLElbow = armL.elbow;
    this.armR = armR.shoulder; this.armRElbow = armR.elbow; this.handR = armR.hand;

    const buildLeg = (side) => {
      const hipJ = new THREE.Group();
      hipJ.position.set(0.12 * side, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.37, 0.2), pants);
      thigh.position.y = -0.185;
      hipJ.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.37;
      hipJ.add(knee);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.18), pants);
      shin.position.y = -0.18;
      knee.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), new THREE.MeshLambertMaterial({ color: 0x141414 }));
      foot.position.set(0, -0.38, 0.06);
      knee.add(foot);
      this.hips.add(hipJ);
      return { hipJ, knee };
    };
    const legL = buildLeg(-1), legR = buildLeg(1);
    this.legs = [legL.hipJ, legR.hipJ];
    this.legL = legL.hipJ; this.legR = legR.hipJ;
    this.legLKnee = legL.knee; this.legRKnee = legR.knee;

    // weapon prop for enemies/cops, carried in the hand
    if (this.type === 'enemy' || this.type === 'cop') {
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.22), new THREE.MeshLambertMaterial({ color: 0x181818 }));
      gun.position.set(0, -0.05, 0.12);
      this.handR.add(gun);
    }
    if (this.type === 'cop') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.38), new THREE.MeshLambertMaterial({ color: 0x14233c }));
      cap.position.y = 0.4;
      this.head.add(cap);
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.walkPhase = rand(0, 6.28);
    this.idlePhase = rand(0, 10);
    return g;
  }

  takeDamage(amount, source) {
    if (!this.alive) return;
    this.health -= amount;
    this.flashHit();
    if (this.type === 'ped') {
      this.state = 'flee';
      this.fleeT = 4;
      this.fleeFrom = source === 'player' ? World.player.getPos() : null;
    } else {
      this.state = 'attack';
      this.lastCombatT = 0;
      // Taking fire can force a tactical retreat instead of a mindless rush.
      if (this.type === 'enemy' && CoverSystem) {
        const pp = World.player ? World.player.getPos() : null;
        if (pp && (this.health < this.maxHealth * 0.62 || Math.random() < 0.35)) {
          const cover = CoverSystem.findBestCover(this, pp);
          if (cover) {
            this.coverPoint = cover;
            this.state = 'seekCover';
            this.coverT = rand(2.5, 5.5);
            this.peekT = 0;
          }
        }
      }
    }
    // bystanders react
    this.notifyNearby();
    if (this.health <= 0) this.die();
  }

  notifyNearby() {
    for (const n of World.npcs) {
      if (n === this || !n.alive || n.type !== 'ped') continue;
      if (dist2(n.x, n.z, this.x, this.z) < 18) {
        n.state = 'flee';
        n.fleeT = 6;
        n.fleeFrom = { x: this.x, z: this.z };
      }
    }
  }

  flashHit() {
    this.flashT = 0.1;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    // death effect
    const puff = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x8a3b3b, transparent: true, opacity: 0.8 })
    );
    puff.position.set(this.x, 1, this.z);
    World.scene.add(puff);
    const sp = new THREE.SphereGeometry(0.35, 6, 4);
    const s = new THREE.Mesh(sp, new THREE.MeshLambertMaterial({ color: 0x4a4a55 }));
    s.position.set(this.x, 0.2, this.z);
    World.scene.add(s);
    setTimeout(() => { World.scene.remove(puff); World.scene.remove(s); }, 600);
    // drop money
    if (this.dropMoney) {
      const amt = this.type === 'ped' ? randi(15, 45) : randi(30, 90);
      World.pickups.addMoney(this.x, this.z, amt);
    }
    if (this.type === 'ped') World.addWanted(1);
    else if (this.type === 'cop') World.addWanted(3);
    if (GAME.stats) GAME.stats.kills++;
    if (World.missionManager) World.missionManager.onKill(this);
    if (this.ranOver) {
      // struck by a vehicle: leave the body flung to the ground instead of
      // just vanishing, with a blood mark where it lands
      if (World.effects && World.effects.bloodSplat) World.effects.bloodSplat(this.x, this.z);
      this.group.rotation.x = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + rand(-0.12, 0.12));
      this.group.rotation.z = rand(-0.3, 0.3);
      this.group.position.y = 0.12;
      this.ragdoll = {
        vx: (this.knockDir ? this.knockDir.x : 0) * (this.knockForce || 5),
        vz: (this.knockDir ? this.knockDir.z : 0) * (this.knockForce || 5),
        t: 1.1,
        scheduled: false
      };
    } else {
      this.group.visible = false;
    }
  }

  /* ---------- struck by a car ---------- */
  runOver(vehicle) {
    if (!this.alive) return;
    const speed = Math.abs(vehicle.speed);
    const dir = { x: Math.sin(vehicle.heading), z: Math.cos(vehicle.heading) };
    if (speed < 7) {
      // glancing bump at low speed: stagger and flee rather than die
      if (this.bumpCooldown > 0) return;
      this.bumpCooldown = 1;
      this.state = 'flee';
      this.fleeT = 2.5;
      this.fleeFrom = { x: vehicle.x, z: vehicle.z };
      AudioMgr.thud();
      return;
    }
    this.ranOver = true;
    this.knockDir = dir;
    this.knockForce = clamp(speed * 0.55, 3, 16);
    AudioMgr.thud();
    this.takeDamage(this.health + 999, 'vehicle');
  }

  /* ---------- limp/slide to a stop after being struck ---------- */
  updateRagdoll(dt) {
    const r = this.ragdoll;
    if (!r) return;
    const friction = Math.max(0, 1 - dt * 3.5);
    r.vx *= friction; r.vz *= friction;
    this.x += r.vx * dt; this.z += r.vz * dt;
    const pos = City.resolveCollision({ x: this.x, z: this.z }, this.radius);
    this.x = pos.x; this.z = pos.z;
    this.group.position.set(this.x, this.group.position.y, this.z);
    r.t -= dt;
    if (r.t <= 0 && !r.scheduled) {
      r.scheduled = true;
      setTimeout(() => this.remove(), 2000);
    }
  }

  shootAtPlayer() {
    if (!World.player) return;
    const p = World.player;
    const mx = p.inVehicle ? p.x : p.x;
    const mz = p.inVehicle ? p.z : p.z;
    const dist = dist2(this.x, this.z, mx, mz);
    const muzzle = { x: this.x, z: this.z, y: 1.5 };
    let dir = {
      x: (mx - this.x) / dist,
      y: (1.2 - 1.5) / Math.max(dist, 1),
      z: (mz - this.z) / dist
    };
    const spread = 0.05 + dist * 0.004;
    dir.x += rand(-spread, spread);
    dir.y += rand(-spread, spread) * 0.4;
    dir.z += rand(-spread, spread);
    const n = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    dir.x /= n; dir.y /= n; dir.z /= n;
    const hit = Weapons.hitScan(muzzle, dir, 120, this);
    if (hit.target === World.player) {
      const dmg = this.damage * rand(0.7, 1.2);
      World.player.damage(dmg, this);
    } else if (hit.target && hit.target.vehicle) {
      const v = hit.target.vehicle;
      v.health -= this.damage * 0.7;
      if (v.health <= 0 && v.alive) {
        VehicleManager.destroy(v);
        if (World.player.inVehicle === v) World.player.forceExit();
      }
    }
    if (hit.end) {
      World.effects.tracer(new THREE.Vector3(muzzle.x, muzzle.y, muzzle.z), hit.end);
      if (hit.point) World.effects.bulletImpact(hit.point);
    }
    World.effects.muzzleFlash(new THREE.Vector3(muzzle.x, muzzle.y, muzzle.z));
    AudioMgr.gunshot(this.weaponKind, (this.x - World.player.x) / 50);
  }

  update(dt, playerPos) {
    if (!this.alive) {
      if (this.ragdoll) this.updateRagdoll(dt);
      return;
    }
    this.flashT = Math.max(0, (this.flashT || 0) - dt);
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    this.turn += dt;
    const distToPlayer = dist2(this.x, this.z, playerPos.x, playerPos.z);

    // state logic
    const canSee = distToPlayer < this.aggro && !Weapons.isLineBlocked({ x: this.x, z: this.z }, { x: playerPos.x, z: playerPos.z });
    if (this.type === 'ped') {
      if (this.state === 'flee') {
        this.fleeT -= dt;
        if (this.fleeT <= 0) this.state = 'wander';
        const away = this.fleeFrom;
        if (away) {
          const a = Math.atan2(this.x - away.x, this.z - away.z);
          this.heading = lerpAngle(this.heading, a, dt * 4);
          this.move(dt, 6);
        }
      } else {
        this.wander(dt, 2.2);
      }
    } else if (this.type === 'enemy') {
      this.lastCombatT += dt;
      this.coverCooldown -= dt;

      // If exposed for too long or hurt, choose hard cover near a building.
      if ((this.state === 'attack' || this.state === 'chase') &&
          this.coverCooldown <= 0 && (this.health < this.maxHealth * 0.62 || Math.random() < dt * 0.08) &&
          CoverSystem) {
        const cover = CoverSystem.findBestCover(this, playerPos);
        if (cover) {
          this.coverPoint = cover;
          this.state = 'seekCover';
          this.coverT = rand(2.5, 5.5);
          this.peekT = rand(0.4, 1.0);
        }
        this.coverCooldown = rand(5, 9);
      }

      if (this.target && this.target.alive === false) {
        this.state = 'idle';
      } else if (this.state === 'seekCover' && this.coverPoint) {
        const dCover = dist2(this.x, this.z, this.coverPoint.x, this.coverPoint.z);
        this.heading = lerpAngle(this.heading, Math.atan2(this.coverPoint.x - this.x, this.coverPoint.z - this.z), dt * 7);
        if (dCover > 1.15) {
          this.move(dt, 5.4);
        } else {
          this.state = 'cover';
          this.coverT = Math.max(this.coverT, 2.5);
          this.peekT = rand(0.5, 1.2);
        }
      } else if (this.state === 'cover') {
        this.coverT -= dt;
        this.peekT -= dt;
        this.heading = lerpAngle(this.heading, Math.atan2(playerPos.x - this.x, playerPos.z - this.z), dt * 5);

        // Stay behind the obstacle until a short peek window opens.
        if (this.peekT <= 0) {
          if (canSee && distToPlayer < 65) {
            this.fireT -= dt;
            if (this.fireT <= 0) {
              this.shootAtPlayer();
              this.fireT = this.weaponKind === 'smg' ? rand(0.14, 0.3) : rand(0.75, 1.45);
              this.peekT = rand(0.55, 1.1);
            }
          } else if (this.coverT <= 0) {
            this.state = 'chase';
          } else {
            // Micro-peek toward the target, then return to cover.
            const px = this.x + Math.sin(this.heading) * 0.8;
            const pz = this.z + Math.cos(this.heading) * 0.8;
            if (City.isClearPoint(px, pz, this.radius)) {
              this.x = px; this.z = pz;
            }
            this.peekT = 0.65;
          }
        }
        if (this.coverT <= 0) {
          this.state = canSee ? 'attack' : 'chase';
          this.coverPoint = null;
          this.coverCooldown = rand(4, 7);
        }
      } else if (canSee && distToPlayer < this.aggro) {
        this.state = 'attack';
      } else if (this.state === 'attack') {
        this.state = 'chase';
      }

      if (this.state === 'attack' || this.state === 'chase') {
        this.heading = lerpAngle(this.heading, Math.atan2(playerPos.x - this.x, playerPos.z - this.z), dt * 6);
        if (distToPlayer > 14) this.move(dt, 4.2);
        else if (distToPlayer < 6) this.move(dt, -3);
        this.fireT -= dt;
        if (this.fireT <= 0 && canSee && distToPlayer < 60) {
          this.shootAtPlayer();
          this.fireT = this.weaponKind === 'smg' ? rand(0.12, 0.25) : rand(0.8, 1.6);
        }
      } else if (this.state !== 'seekCover' && this.state !== 'cover') {
        this.wander(dt, 2.0);
      }
    } else if (this.type === 'cop') {
      const wanted = World.wantedLevel || 0;
      if (wanted > 0 && canSee) {
        this.state = 'attack';
        this.heading = lerpAngle(this.heading, Math.atan2(playerPos.x - this.x, playerPos.z - this.z), dt * 6);
        if (distToPlayer > 15) this.move(dt, 5);
        if (wanted >= 3) {
          this.fireT -= dt;
          if (this.fireT <= 0 && distToPlayer < 70) {
            this.shootAtPlayer();
            this.fireT = rand(0.7, 1.4);
          }
        }
      } else if (wanted > 0 && distToPlayer < 80) {
        this.moveToward(dt, playerPos, 6.5);
      } else {
        this.wander(dt, 1.8);
      }
    }

    this.updateWalkAnim(dt);
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
    // hit flash
    if (this.flashT > 0 && this.group.children.length) {
      this.group.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material.emissive && (o.material.emissive.setHex(0x330000)); } });
    } else {
      this.group.traverse(o => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(0x000000); });
    }
  }

  move(dt, speed) {
    let fx = Math.sin(this.heading) * speed * dt;
    let fz = Math.cos(this.heading) * speed * dt;
    // gentle separation so pedestrians/enemies don't walk through each other or bunch up
    const sep = this.separationForce();
    fx += sep.x * dt * 2.2;
    fz += sep.z * dt * 2.2;
    this.x += fx; this.z += fz;
    this.walkT += dt * 2;
    const pos = City.resolveCollision({ x: this.x, z: this.z }, this.radius);
    this.x = pos.x; this.z = pos.z;
  }

  separationForce() {
    let sx = 0, sz = 0;
    for (const n of World.npcs) {
      if (n === this || !n.alive) continue;
      const dx = this.x - n.x, dz = this.z - n.z;
      const d2v = dx * dx + dz * dz;
      const minD = this.radius + n.radius + 0.35;
      if (d2v > 0 && d2v < minD * minD) {
        const d = Math.sqrt(d2v);
        const push = (minD - d) / minD;
        sx += (dx / d) * push;
        sz += (dz / d) * push;
      }
    }
    return { x: sx, z: sz };
  }

  moveToward(dt, target, speed) {
    const a = Math.atan2(target.x - this.x, target.z - this.z);
    this.heading = lerpAngle(this.heading, a, dt * 3);
    this.move(dt, speed);
  }

  wander(dt, speed) {
    // brief, occasional pause-and-glance when passing close to another wandering pedestrian —
    // reads as two people acknowledging each other on the sidewalk rather than clipping through
    if (this.type === 'ped' && !this.pauseT) {
      for (const n of World.npcs) {
        if (n === this || !n.alive || n.type !== 'ped' || n.pauseT) continue;
        if (dist2(this.x, this.z, n.x, n.z) < 2.4 && Math.random() < dt * 0.6) {
          this.pauseT = rand(0.6, 1.4);
          n.pauseT = this.pauseT;
          const a = Math.atan2(n.x - this.x, n.z - this.z);
          this.heading = a; n.heading = a + Math.PI;
          break;
        }
      }
    }
    if (this.pauseT) {
      this.pauseT -= dt;
      if (this.pauseT < 0) this.pauseT = 0;
      return;
    }
    this.idleT -= dt;
    if (!this.wanderTarget || dist2(this.x, this.z, this.wanderTarget.x, this.wanderTarget.z) < 1.5 || this.idleT <= 0) {
      this.idleT = rand(1, 4);
      this.wanderTarget = {
        x: clamp(this.x + rand(-18, 18), City.bounds.min + 8, City.bounds.max - 8),
        z: clamp(this.z + rand(-18, 18), City.bounds.min + 8, City.bounds.max - 8)
      };
    }
    this.moveToward(dt, this.wanderTarget, speed * 0.4);
  }

  updateWalkAnim(dt) {
    // detect movement
    const moving = Math.abs(this.x - this.prevX) + Math.abs(this.z - this.prevZ) > 0.001;
    this.prevX = this.x; this.prevZ = this.z;
    const amp = this.state === 'flee' || this.state === 'chase' || this.state === 'attack' ? 0.95 : 0.55;
    if (moving && this.legLKnee) {
      this.walkPhase += dt * (amp > 0.7 ? 8 : 5.4);
      const t = this.walkPhase;
      const swingL = Math.sin(t) * amp, swingR = Math.sin(t + Math.PI) * amp;
      this.legL.rotation.x = swingL;
      this.legR.rotation.x = swingR;
      this.legLKnee.rotation.x = Math.max(0, -Math.sin(t + 0.9)) * amp * 1.4;
      this.legRKnee.rotation.x = Math.max(0, -Math.sin(t + 0.9 + Math.PI)) * amp * 1.4;
      if (this.armL && this.state !== 'attack') {
        this.armL.rotation.x = -swingL * 0.7;
        this.armR.rotation.x = -swingR * 0.7;
        this.armLElbow.rotation.x = Math.max(0, Math.sin(t)) * 0.3;
        this.armRElbow.rotation.x = Math.max(0, Math.sin(t + Math.PI)) * 0.3;
      }
      this.hips.position.y = this.hipsBaseY + Math.abs(Math.sin(t)) * 0.045;
      this.hips.rotation.z = Math.sin(t) * 0.03;
    } else if (this.legLKnee) {
      const relax = dt * 6;
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0, relax);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0, relax);
      this.legLKnee.rotation.x = lerp(this.legLKnee.rotation.x, 0, relax);
      this.legRKnee.rotation.x = lerp(this.legRKnee.rotation.x, 0, relax);
      if (this.armL && this.state !== 'attack') {
        this.armL.rotation.x = lerp(this.armL.rotation.x, 0, relax);
        this.armR.rotation.x = lerp(this.armR.rotation.x, 0, relax);
      }
      this.idlePhase += dt;
      this.hips.position.y = this.hipsBaseY + Math.sin(this.idlePhase * 1.2) * 0.006;
      this.hips.rotation.z = lerp(this.hips.rotation.z, 0, relax);
    }
    // subtle head turn: glance toward whatever the ped is reacting to
    if (this.head) {
      const lookYaw = this.state === 'attack' || this.state === 'flee' ? 0 : Math.sin(this.idlePhase * 0.6) * 0.35;
      this.head.rotation.y = lerp(this.head.rotation.y, lookYaw, dt * 2.5);
    }
  }

  remove() {
    const i = World.npcs.indexOf(this);
    if (i >= 0) World.npcs.splice(i, 1);
    World.scene.remove(this.group);
  }
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const NPCSpawner = {
  spawnPedestrian(x, z) {
    return new NPC({ type: 'ped', x, z, heading: rand(0, Math.PI * 2) });
  },

  spawnEnemy(x, z, opts = {}) {
    return new NPC({
      type: 'enemy',
      x, z,
      heading: opts.heading !== undefined ? opts.heading : rand(0, Math.PI * 2),
      health: opts.health || 70,
      damage: opts.damage || randi(7, 12),
      enemyType: opts.enemyType || 'gang',
      weaponKind: opts.weaponKind || (Math.random() < 0.5 ? 'pistol' : 'smg'),
      aggro: opts.aggro || 40,
      missionOwned: opts.missionOwned !== false,
      dropMoney: opts.dropMoney !== false
    });
  },

  spawnCop(x, z) {
    return new NPC({ type: 'cop', x, z, heading: rand(0, Math.PI * 2), health: 90, damage: 12, dropMoney: false });
  },

  maintainPedestrians(dt) {
    if (!GAME.settings.traffic) return;
    const wanted = World.wantedLevel || 0;
    let maxPeds = 40;
    let count = 0;
    for (const n of World.npcs) if (n.type === 'ped') count++;
    if (count >= maxPeds) return;
    if (Math.random() > dt * 2) return;
    const p = World.player;
    const x = clamp(p.x + rand(-120, 120), City.bounds.min + 12, City.bounds.max - 12);
    const z = clamp(p.z + rand(-120, 120), City.bounds.min + 12, City.bounds.max - 12);
    this.spawnPedestrian(x, z);
  },

  spawnPolice(dt) {
    const wanted = World.wantedLevel || 0;
    if (wanted <= 0) return;
    let cops = 0;
    for (const n of World.npcs) if (n.type === 'cop') cops++;
    const need = Math.min(wanted + 1, 8);
    if (cops >= need) return;
    if (Math.random() > dt * 1.5) return;
    const p = World.player;
    const ang = rand(0, Math.PI * 2);
    const r = rand(25, 50);
    const x = clamp(p.x + Math.sin(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
    const z = clamp(p.z + Math.cos(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
    this.spawnCop(x, z);
  },

  clearAll() {
    for (const n of World.npcs.slice()) n.remove();
  }
};
