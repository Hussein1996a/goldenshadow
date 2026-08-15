/* ===== Golden Shadow — Player ===== */
const WEAPON_DEFS = {
  unarmed: { nameKey: 'weapon_unarmed', damage: 0, rof: 0, mag: 0, auto: false, type: 'unarmed' },
  pistol:  { nameKey: 'weapon_pistol', damage: 30, rof: 0.30, mag: 12, auto: false, type: 'pistol', spread: 0.012 },
  smg:     { nameKey: 'weapon_smg', damage: 17, rof: 0.09, mag: 30, auto: true, type: 'smg', spread: 0.035 },
  rifle:   { nameKey: 'weapon_rifle', damage: 26, rof: 0.12, mag: 24, auto: true, type: 'rifle', spread: 0.02 }
};

class Player {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.x = 0; this.z = 0;
    this.y = 0; this.vy = 0;
    this.yaw = Math.PI / 2;
    this.pitch = 0;
    this.maxHealth = 100;
    this.health = 100;
    this.armor = 0;
    this.onGround = true;
    this.walkTime = 0;
    this.inVehicle = null;
    this.camDist = 8;
    this.camHeight = 3.2;
    this.radius = 0.6;
    this.lastDamage = 0;
    this.weapons = ['unarmed', 'pistol', 'smg', 'rifle'];
    this.currentWeapon = 1;
    this.mags = { pistol: 12, smg: 30, rifle: 24 };
    this.reserve = { pistol: 96, smg: 120, rifle: 60 };
    this.fireCooldown = 0;
    this.reloadTime = 0;
    this.shootAnim = 0;
    this.mesh = this.buildMesh();
    this.scene.add(this.mesh);
    this.footstepT = 0;
    this.speedMult = 1;
    this.stats = GAME.stats;
  }

  buildMesh() {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: 0x1f3a52 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2c3238 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc99c6e });
    const shoes = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x1c1712 });

    // ---- hip root: all sway / bob / lean happens here ----
    this.hips = new THREE.Group();
    this.hipsBaseY = 0.92;
    this.hips.position.y = this.hipsBaseY;
    g.add(this.hips);

    // torso built from a slightly tapered waist + broader chest for a less block-y silhouette
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.28), pants);
    waist.position.y = 0.12;
    this.hips.add(waist);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.3), shirt);
    chest.position.y = 0.47;
    this.hips.add(chest);

    // neck + head assembly (its own group so it can turn independently later)
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), skin);
    neck.position.y = 0.75;
    this.hips.add(neck);
    this.head = new THREE.Group();
    this.head.position.y = 0.85;
    this.hips.add(this.head);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), skin);
    headMesh.position.y = 0.19;
    this.head.add(headMesh);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.36), hairMat);
    hair.position.y = 0.38;
    this.head.add(hair);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x141414 }));
    cap.position.y = 0.44;
    this.head.add(cap);

    // ---- arms: shoulder -> elbow -> hand, each a real pivot joint ----
    const buildArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.33 * side, 0.62, 0);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.17), shirt);
      upper.position.y = -0.16;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.32;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.15), skin);
      fore.position.y = -0.15;
      elbow.add(fore);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.13), skin);
      hand.position.y = -0.33;
      elbow.add(hand);
      this.hips.add(shoulder);
      return { shoulder, elbow, hand };
    };
    const armLRig = buildArm(-1), armRRig = buildArm(1);
    this.armL = armLRig.shoulder; this.armLElbow = armLRig.elbow;
    this.armR = armRRig.shoulder; this.armRElbow = armRRig.elbow;
    this.handR = armRRig.hand;

    // ---- legs: hip -> knee -> foot, real pivot joints for a natural walk cycle ----
    const buildLeg = (side) => {
      const hipJ = new THREE.Group();
      hipJ.position.set(0.13 * side, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.22), pants);
      thigh.position.y = -0.2;
      hipJ.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.4;
      hipJ.add(knee);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.2), pants);
      shin.position.y = -0.19;
      knee.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.32), shoes);
      foot.position.set(0, -0.4, 0.07);
      knee.add(foot);
      this.hips.add(hipJ);
      return { hipJ, knee };
    };
    const legLRig = buildLeg(-1), legRRig = buildLeg(1);
    this.legL = legLRig.hipJ; this.legLKnee = legLRig.knee;
    this.legR = legRRig.hipJ; this.legRKnee = legRRig.knee;

    // weapon prop, carried in the right hand so it follows the arm naturally
    this.gunProp = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.26),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
    );
    this.gunProp.position.set(0, -0.07, 0.14);
    this.handR.add(this.gunProp);

    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.walkPhase = 0;
    this.idlePhase = rand(0, 10);
    return g;
  }

  setPos(x, z) {
    this.x = x; this.z = z;
    this.mesh.position.set(x, this.y, z);
  }

  getPos() { return { x: this.x, y: this.y, z: this.z }; }

  getForward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  resetHealth() {
    this.health = this.maxHealth;
    this.armor = 0;
  }

  addMoney(v) {
    GAME.money += v;
    if (v > 0) AudioMgr.cash();
  }

  damage(amount, source) {
    if (this.health <= 0) return;
    this.lastDamage = performance.now();
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = dmg * 0.6;
      this.armor = Math.max(0, this.armor - absorbed);
      dmg -= absorbed;
    }
    this.health -= dmg;
    AudioMgr.hurt();
    if (HUD) HUD.flashDamage();
    if (this.health <= 0) this.die();
  }

  die() {
    this.health = 0;
    if (World.onPlayerDeath) World.onPlayerDeath();
  }

  /* ---------- vehicle interaction ---------- */
  tryEnterVehicle(v) {
    if (!v || !v.alive) return;
    this.inVehicle = v;
    v.driven = true;
    v.isAI = false;
    v.targetSpeed = 0;
    this.mesh.visible = false;
    this.y = 0;
    this.x = v.x; this.z = v.z;
    AudioMgr.thud();
  }

  exitVehicle() {
    const v = this.inVehicle;
    if (!v) return;
    this.inVehicle = null;
    v.driven = false;
    v.isAI = false;
    v.speed = 0;
    this.mesh.visible = true;
    // place player beside car (right side = -X at heading 0)
    const right = -Math.cos(v.heading), leftZ = Math.sin(v.heading);
    const fx = v.x + right * 2.2, fz = v.z + leftZ * 2.2;
    this.setPos(fx, fz);
    const pos = this.city.resolveCollision({ x: this.x, z: this.z }, this.radius);
    this.setPos(pos.x, pos.z);
    AudioMgr.thud();
  }

  nearestVehicle() {
    return VehicleManager.nearest(this.x, this.z, 3.2);
  }

  /* ---------- weapons ---------- */
  getWeaponDef() {
    const id = this.weapons[this.currentWeapon];
    return WEAPON_DEFS[id];
  }

  switchWeapon(idx) {
    const def = WEAPON_DEFS[this.weapons[idx]];
    if (!def || def.type === 'unarmed') return;
    this.currentWeapon = idx;
    this.reloadTime = 0;
    AudioMgr.click();
    if (HUD) HUD.updateWeapon();
  }

  reload() {
    const id = this.weapons[this.currentWeapon];
    if (id === 'unarmed') return;
    const mag = this.mags[id];
    const def = WEAPON_DEFS[id];
    if (mag >= def.mag || this.reserve[id] <= 0) return;
    this.reloadTime = def.type === 'rifle' ? 2.2 : 1.6;
    if (HUD) HUD.notify(I18N.t('reload'), 'warn');
  }

  finishReload() {
    const id = this.weapons[this.currentWeapon];
    if (id === 'unarmed') return;
    const def = WEAPON_DEFS[id];
    const need = def.mag - this.mags[id];
    const take = Math.min(need, this.reserve[id]);
    this.mags[id] += take;
    this.reserve[id] -= take;
    if (HUD) HUD.updateWeapon();
  }

  canShoot() {
    if (this.fireCooldown > 0 || this.reloadTime > 0) return false;
    const id = this.weapons[this.currentWeapon];
    const def = WEAPON_DEFS[id];
    if (def.type === 'unarmed') return false;
    if (this.mags[id] <= 0) {
      if (this.reserve[id] > 0) this.reload();
      else if (HUD && !this.noAmmoMsg) { HUD.notify(I18N.t('noAmmo'), 'warn'); this.noAmmoMsg = true; setTimeout(() => this.noAmmoMsg = false, 2000); }
      return false;
    }
    return true;
  }

  fire(camDir, aiming) {
    const id = this.weapons[this.currentWeapon];
    const def = WEAPON_DEFS[id];
    if (!this.canShoot()) return;
    this.mags[id]--;
    this.fireCooldown = def.rof;
    this.shootAnim = 0.3;
    const spread = def.spread * (this.speedMult > 1 ? 2 : 1) * (aiming ? 0.4 : 1);
    const dir = {
      x: camDir.x + rand(-spread, spread),
      y: camDir.y + rand(-spread, spread) * 0.6,
      z: camDir.z + rand(-spread, spread)
    };
    const n = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    dir.x /= n; dir.y /= n; dir.z /= n;
    const from = {
      x: this.x + Math.sin(this.yaw) * 0.6,
      y: 1.6,
      z: this.z + Math.cos(this.yaw) * 0.6
    };
    const hit = Weapons.hitScan(from, dir, 250, 'player');
    if (hit.target) {
      if (hit.target.takeDamage) hit.target.takeDamage(def.damage, 'player');
      else if (hit.target.vehicle) {
        hit.target.vehicle.health -= def.damage;
        if (hit.target.vehicle.health <= 0 && hit.target.vehicle.alive) {
          VehicleManager.destroy(hit.target.vehicle);
          if (this.inVehicle === hit.target.vehicle) this.forceExit();
        }
      }
    }
    if (hit.point) {
      World.effects.bulletImpact(hit.point);
      if (hit.target && hit.target.flashHit) hit.target.flashHit();
    }
    World.effects.muzzleFlash(new THREE.Vector3(from.x, from.y, from.z));
    if (hit.end) World.effects.tracer(new THREE.Vector3(from.x, from.y, from.z), hit.end);
    AudioMgr.gunshot(def.type === 'smg' ? 'smg' : def.type === 'rifle' ? 'rifle' : 'pistol');
    this.pitch += 0.5 * (def.type === 'pistol' ? 1 : 2.2);
    if (this.pitch > 60) this.pitch = 60;
    if (HUD) HUD.updateWeapon();
  }

  forceExit() {
    this.health = Math.max(1, this.health - 30);
    this.exitVehicle();
    HUD && HUD.notify('!!', 'warn');
  }

  /* ---------- update ---------- */
  update(dt, input, camYaw, camPitch) {
    this.yaw = camYaw;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    // finish reload when timer expires: move ammo from reserve into magazine
    if (this.reloadTime > 0) {
      const prev = this.reloadTime;
      this.reloadTime = Math.max(0, this.reloadTime - dt);
      if (prev > 0 && this.reloadTime === 0) this.finishReload();
    }

    if (this.inVehicle) {
      this.updateVehicle(dt, input);
      return;
    }

    // --- on foot ---
    const aiming = input.isAiming ? input.isAiming() : false;
    this.aiming = aiming;
    const f = this.getForward();
    const right = { x: -Math.cos(this.yaw), z: Math.sin(this.yaw) };
    let mx = 0, mz = 0;
    if (input.isDown('KeyW', 'ArrowUp')) { mx += f.x; mz += f.z; }
    if (input.isDown('KeyS', 'ArrowDown')) { mx -= f.x; mz -= f.z; }
    if (input.isDown('KeyD', 'ArrowRight')) { mx += right.x; mz += right.z; }
    if (input.isDown('KeyA', 'ArrowLeft')) { mx -= right.x; mz -= right.z; }
    const ml = Math.sqrt(mx * mx + mz * mz);
    const sprint = input.isDown('ShiftLeft', 'ShiftRight') && !aiming;
    const speed = aiming ? 3.6 : (sprint ? 9.5 : 6.2);
    this.speedMult = ml > 0 ? (sprint ? 1.5 : 1) : 0;
    if (ml > 0.01) {
      mx = mx / ml; mz = mz / ml;
      this.x += mx * speed * dt;
      this.z += mz * speed * dt;
      this.walkTime += dt * (sprint ? 1.9 : 1.2);
      this.footstepT -= dt;
      if (this.footstepT <= 0 && this.onGround) {
        AudioMgr.footsteps();
        this.footstepT = 0.45;
      }
    }

    // jump / gravity
    if (input.consumePressed('Space') && this.onGround) {
      this.vy = 8.2;
      this.onGround = false;
    }
    if (!this.onGround) {
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.onGround = true; }
    }

    // collision
    const pos = this.city.resolveCollision({ x: this.x, z: this.z }, this.radius);
    this.x = pos.x; this.z = pos.z;

    // shooting
    const camDir = this.cameraDir(camPitch);
    if (input.mouseDown && this.currentWeapon > 0 && this.reloadTime <= 0) {
      this.fire(camDir, aiming);
    }
    // reload on R
    if (input.consumePressed('KeyR')) this.reload();

    // weapon switch
    if (input.consumePressed('Digit1')) this.switchWeapon(1);
    if (input.consumePressed('Digit2')) this.switchWeapon(2);
    if (input.consumePressed('Digit3')) this.switchWeapon(3);

    // animate
    this.animateFoot(dt, ml, sprint);

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw;

    // health regen
    if (this.health < 60 && performance.now() - this.lastDamage > 6000) {
      this.health = Math.min(60, this.health + dt * 3);
    }
  }

  cameraDir(pitch) {
    const ph = pitch * Math.PI / 180;
    const cp = Math.cos(ph);
    return { x: Math.sin(this.yaw) * cp, y: Math.sin(ph), z: Math.cos(this.yaw) * cp };
  }

  updateVehicle(dt, input) {
    const v = this.inVehicle;
    let throttle = 0, brake = 0, steer = 0;
    if (input.isDown('KeyW', 'ArrowUp')) throttle = 1;
    if (input.isDown('KeyS', 'ArrowDown')) brake = 1;
    if (input.isDown('KeyA', 'ArrowLeft')) steer = 1;
    if (input.isDown('KeyD', 'ArrowRight')) steer = -1;
    if (input.isDown('Space')) { brake = 1; v.speed *= 0.94; }
    v.applyInput(throttle, brake, steer, dt, input.isDown('Space'));
    // slight camera sway
    this.x = v.x; this.z = v.z;
    // distance driven stat
    this.stats.distanceDriven += v.speed * dt;
    // engine sound
    const rpm = clamp(Math.abs(v.speed) / v.maxSpeed, 0, 1);
    if (Math.random() < dt * 10) AudioMgr.engine(rpm, { vol: 0.04 });
    // damage from crashed? handled by collision in vehicle update
  }

  animateFoot(dt, moving, sprint) {
    const amp = sprint ? 1.0 : 0.6;
    if (moving > 0) {
      this.walkPhase += dt * (sprint ? 8.6 : 5.6);
      const t = this.walkPhase;
      const swingL = Math.sin(t) * amp;
      const swingR = Math.sin(t + Math.PI) * amp;
      this.legL.rotation.x = swingL;
      this.legR.rotation.x = swingR;
      // knees only bend forward, and mostly while that leg is lifting through mid-swing
      this.legLKnee.rotation.x = Math.max(0, -Math.sin(t + 0.9)) * amp * 1.4;
      this.legRKnee.rotation.x = Math.max(0, -Math.sin(t + 0.9 + Math.PI)) * amp * 1.4;
      // opposite-arm swing with a touch of elbow bend, like natural gait
      this.armL.rotation.x = -swingL * 0.7;
      this.armR.rotation.x = -swingR * 0.7;
      this.armLElbow.rotation.x = Math.max(0, Math.sin(t)) * 0.35;
      this.armRElbow.rotation.x = Math.max(0, Math.sin(t + Math.PI)) * 0.35;
      // vertical bob + slight side-to-side roll + forward lean while sprinting
      this.hips.position.y = this.hipsBaseY + Math.abs(Math.sin(t)) * 0.05;
      this.hips.rotation.z = Math.sin(t) * 0.035;
      this.hips.rotation.x = lerp(this.hips.rotation.x, sprint ? 0.14 : 0.045, dt * 8);
    } else {
      this.idlePhase += dt;
      const relax = dt * 7;
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0, relax);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0, relax);
      this.legLKnee.rotation.x = lerp(this.legLKnee.rotation.x, 0, relax);
      this.legRKnee.rotation.x = lerp(this.legRKnee.rotation.x, 0, relax);
      this.armL.rotation.x = lerp(this.armL.rotation.x, 0, relax);
      this.armR.rotation.x = lerp(this.armR.rotation.x, 0, relax);
      this.armLElbow.rotation.x = lerp(this.armLElbow.rotation.x, 0, relax);
      this.armRElbow.rotation.x = lerp(this.armRElbow.rotation.x, 0, relax);
      this.hips.rotation.x = lerp(this.hips.rotation.x, 0, relax);
      this.hips.rotation.z = lerp(this.hips.rotation.z, 0, relax);
      // idle breathing: subtle rise/fall of the chest
      this.hips.position.y = this.hipsBaseY + Math.sin(this.idlePhase * 1.3) * 0.008;
    }
    // gun prop visible for armed weapons
    this.gunProp.visible = this.currentWeapon > 0;
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    this.armRElbow.rotation.x -= this.shootAnim * 1.3;
  }

  /* ---------- camera ---------- */
  getCameraPose() {
    if (this.inVehicle) {
      const v = this.inVehicle;
      const f = { x: Math.sin(v.heading), z: Math.cos(v.heading) };
      return {
        pos: { x: v.x, y: 0, z: v.z },
        yaw: v.heading,
        pitch: 0,
        forward: f
      };
    }
    return {
      pos: { x: this.x, y: this.y, z: this.z },
      yaw: this.yaw,
      pitch: this.pitch,
      forward: this.getForward()
    };
  }

  bribePolice() {
    const stars = World.wantedLevel || 0;
    if (stars <= 0) return;
    const cost = 500 * stars;
    if (GAME.money < cost) { HUD && HUD.notify(I18N.t('noAmmo'), 'warn'); return; }
    GAME.money -= cost;
    World.wantedLevel = 0;
    if (World.onBribe) World.onBribe();
    AudioMgr.cash();
    HUD && HUD.updateMoney();
  }
}
