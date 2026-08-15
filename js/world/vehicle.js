/* ===== Golden Shadow — Vehicles ===== */
const VEHICLE_TYPES = {
  sedan:   { maxSpeed: 38,  accel: 16, braking: 40, handling: 2.3, colors: [0x3a3f4a, 0x6b6558, 0x4a4e57, 0x5d6169, 0x78393f, 0x2f5b3a] },
  sports:  { maxSpeed: 62,  accel: 30, braking: 46, handling: 3.0, colors: [0xc7442f, 0xd4af37, 0x2f5f9e, 0x22222a] },
  muscle:  { maxSpeed: 52,  accel: 26, braking: 42, handling: 2.5, colors: [0x8a3b2f, 0x1f3a52, 0x3f3a2e] },
  suv:     { maxSpeed: 40,  accel: 17, braking: 34, handling: 1.9, colors: [0x37475a, 0x4a4450, 0x3a4a3f] },
  truck:   { maxSpeed: 28,  accel: 10, braking: 26, handling: 1.3, colors: [0x6b6b70, 0x4a4f57, 0x5d4037] },
  van:     { maxSpeed: 32,  accel: 13, braking: 30, handling: 1.6, colors: [0x7a7a80, 0x57606e, 0x5c4a3a] },
  taxi:    { maxSpeed: 38,  accel: 18, braking: 38, handling: 2.3, colors: [0xd4c23a, 0xe0c34f] },
  police:  { maxSpeed: 55,  accel: 27, braking: 44, handling: 2.9, colors: [0xf2f2f2, 0x20242c] },
  civilian:{ maxSpeed: 34,  accel: 14, braking: 34, handling: 2.0, colors: [0x5a6068, 0x6b6558, 0x4a4e57, 0x2f4f6b, 0x78393f, 0x7a6a3a] }
};

let wheelGeo = null;

class Vehicle {
  constructor(type, x, z, heading, opts = {}) {
    const def = VEHICLE_TYPES[type] || VEHICLE_TYPES.sedan;
    this.type = type;
    this.def = def;
    this.x = x; this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.maxSpeed = def.maxSpeed;
    this.accel = def.accel;
    this.braking = def.braking;
    this.handling = def.handling;
    this.color = opts.color !== undefined ? opts.color : def.colors[randi(0, def.colors.length - 1)];
    this.radius = type === 'truck' ? 2.6 : type === 'van' || type === 'suv' ? 2.1 : 1.7;
    this.health = 100;
    this.isPolice = type === 'police';
    this.isAI = opts.ai !== false;
    this.path = null;
    this.pathIndex = 0;
    this.wheels = [];
    this.group = this.buildMesh();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = -this.heading;
    this.siren = 0;
    this.driven = false;
    this.alive = true;
    this.crew = opts.crew || 0;   // for police cars
    this.engineRpm = 0;
    this.targetSpeed = 0;
    this.laneAxis = null;
    this.turnTimer = 0;
    // Lightweight vehicle dynamics used for player-controlled drift without
    // destabilizing the existing traffic AI.
    this.lateralSlip = 0;
    this.handbrake = false;
  }

  buildMesh() {
    const g = new THREE.Group();
    if (!wheelGeo) wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12);

    const scale = this.type === 'truck' ? 1.6 : this.type === 'van' || this.type === 'suv' ? 1.25 : 1;
    const L = 4.6 * scale, W = 2.0 * scale, H = 1.3 * scale;
    // glossy automotive paint: high-ish metalness with a low roughness gives a
    // wet-look clearcoat sheen under the sun/hemi lights instead of the flat matte Lambert look
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.55, roughness: 0.28 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x16161a, metalness: 0.4, roughness: 0.5 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1b2330, transparent: true, opacity: 0.72, metalness: 0.2, roughness: 0.08, clearcoat: 0.6 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc3c3ca, metalness: 0.9, roughness: 0.25 });

    // ---- chassis group: carries the body only, so suspension lean/pitch/bounce
    // can be applied here without moving the wheels off the ground ----
    this.chassis = new THREE.Group();
    g.add(this.chassis);

    // body (length along +Z), slightly narrower at the base for a less brick-like shape
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.7, L), bodyMat);
    body.position.y = H * 0.35 + 0.15;
    this.chassis.add(body);
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, H * 0.42, L * 0.88), bodyMat);
    upperBody.position.y = H * 0.7 + 0.15 + H * 0.21;
    this.chassis.add(upperBody);
    // cabin (windshield/greenhouse), tapered narrower than the body
    const cabinH = 0.6 * scale;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, cabinH, L * 0.52), glassMat);
    cabin.position.set(0, H + 0.15 + cabinH / 2, -L * 0.08);
    this.chassis.add(cabin);
    // side mirrors
    const mirrorMat = darkMat;
    const mL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), mirrorMat);
    mL.position.set(W / 2 + 0.08, H + 0.15, L * 0.14);
    this.chassis.add(mL);
    const mR = mL.clone(); mR.position.x = -W / 2 - 0.08; this.chassis.add(mR);
    // hood / trunk shading
    const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, 0.08, L * 0.24), darkMat);
    hood.position.set(0, H + 0.3, L * 0.35);
    this.chassis.add(hood);
    const trunk = hood.clone();
    trunk.position.set(0, H + 0.3, -L * 0.4);
    this.chassis.add(trunk);
    // bumpers
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(W * 1.04, 0.35, 0.2), darkMat);
    bumper.position.set(0, 0.35, L / 2);
    this.chassis.add(bumper);
    const bumper2 = bumper.clone();
    bumper2.position.set(0, 0.35, -L / 2);
    this.chassis.add(bumper2);

    // wheels: each on its own steer pivot so front wheels can visually turn
    // independently from the tire spin, which lives on the mesh itself
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.1, roughness: 0.85 });
    const wheelPos = [
      [W / 2, 0.45, L * 0.32], [-W / 2, 0.45, L * 0.32],
      [W / 2, 0.45, -L * 0.32], [-W / 2, 0.45, -L * 0.32]
    ];
    this.wheelPivots = [];
    for (const p of wheelPos) {
      const pivot = new THREE.Group();
      pivot.position.set(p[0], p[1], p[2]);
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      pivot.add(w);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.47, 8), rimMat);
      w.add(rim);
      g.add(pivot);
      this.wheels.push(w);
      this.wheelPivots.push(pivot);
    }
    // front two pivots (index 0,1) get steered visually
    this.frontWheelPivots = [this.wheelPivots[0], this.wheelPivots[1]];

    // headlights (front +Z) and taillights (rear -Z)
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3c0 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.12), headMat);
    head.position.set(W * 0.4, 0.7, L / 2 + 0.05);
    this.chassis.add(head);
    const head2 = head.clone();
    head2.position.x = -W * 0.4;
    this.chassis.add(head2);
    this.headMat = headMat;
    const tailMat = new THREE.MeshBasicMaterial({ color: 0x3a0505 });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.1), tailMat);
    tail.position.set(W * 0.4, 0.7, -L / 2 - 0.03);
    this.chassis.add(tail);
    const tail2 = tail.clone(); tail2.position.x = -W * 0.4; this.chassis.add(tail2);
    this.tailMat = tailMat;
    this.brakeLit = false;

    // extras by type
    if (this.type === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      sign.position.set(0, H + 0.15 + cabinH + 0.18, -L * 0.15);
      this.chassis.add(sign);
    }
    if (this.isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.9), new THREE.MeshBasicMaterial({ color: 0x22222a }));
      bar.position.set(0, H + 0.15 + cabinH + 0.16, -L * 0.1);
      this.chassis.add(bar);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.28), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      r.position.set(0, H + 0.15 + cabinH + 0.22, -L * 0.1 - 0.22);
      this.chassis.add(r);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.28), new THREE.MeshBasicMaterial({ color: 0x2a5aff }));
      bl.position.set(0, H + 0.15 + cabinH + 0.22, -L * 0.1 + 0.22);
      this.chassis.add(bl);
      this.sirenR = r; this.sirenB = bl;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    this.prevSpeed = 0;
    return g;
  }

  /* ---------- control ---------- */
  applyInput(throttle, brake, steer, dt, handbrake = false) {
    // steer input is smoothed rather than snapped, so wheel-turn and body roll read naturally
    this.steer = lerp(this.steer, steer, (dt || 0.016) * 8);
    this.handbrake = !!handbrake;
    this.brakeLit = brake > 0;
    if (throttle > 0) {
      // power tapers off as the car nears top speed instead of a flat linear ramp
      const room = clamp(1 - Math.abs(this.speed) / this.maxSpeed, 0.15, 1);
      this.speed += this.accel * throttle * room * (this.speed < 0 ? 2 : 1);
    }
    if (brake > 0) {
      if (this.speed > 0) this.speed -= this.braking * brake;
      else if (this.speed > -6) this.speed -= this.accel * 0.4 * brake;
    }
    this.speed = clamp(this.speed, -8, this.maxSpeed);
    if (Math.abs(this.speed) < 0.3) this.speed = 0;

    // Rear-wheel-style slip: handbrake and high-speed steering build lateral
    // velocity; grip then pulls the car back onto its heading over time.
    const slipBuild = this.handbrake ? 1.8 : 0.35;
    const speedRatio = clamp(Math.abs(this.speed) / this.maxSpeed, 0, 1);
    this.lateralSlip += this.steer * Math.abs(this.speed) * speedRatio * slipBuild * (dt || 0.016);
    const grip = this.handbrake ? 0.55 : 4.8;
    this.lateralSlip *= Math.max(0, 1 - grip * (dt || 0.016));
    this.lateralSlip = clamp(this.lateralSlip, -10, 10);
  }

  update(dt, world) {
    if (!this.alive) return;
    const speedFactor = clamp(Math.abs(this.speed) / 12, 0, 1);
    this.heading += this.steer * this.handling * speedFactor * dt * 2.2;
    // friction when no control (AI cruising)
    if (this.isAI && !this.driven) {
      const target = this.targetSpeed || this.maxSpeed * 0.4;
      if (this.speed < target) this.speed = Math.min(target, this.speed + this.accel * 0.5 * dt);
      else this.speed = Math.max(target, this.speed - this.braking * 0.4 * dt);
    }
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const lx = fz, lz = -fx;
    this.x += (fx * this.speed + lx * this.lateralSlip) * dt;
    this.z += (fz * this.speed + lz * this.lateralSlip) * dt;

    // wheels spin
    const spin = this.speed * dt;
    for (const w of this.wheels) w.rotation.x -= spin * 0.6;
    // front wheels turn visually with steering input, more angle at low speed like a real car
    if (this.frontWheelPivots) {
      const steerAngle = this.steer * lerp(0.5, 0.22, speedFactor);
      for (const p of this.frontWheelPivots) p.rotation.y = lerp(p.rotation.y, steerAngle, dt * 10);
    }

    // collision with city
    const pos = { x: this.x, z: this.z };
    world.resolveCollision(pos, this.radius);
    this.x = pos.x; this.z = pos.z;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = -this.heading;

    // suspension feel: body rolls into turns and pitches under accel/braking,
    // while the wheel pivots (siblings of the chassis) stay planted on the ground
    if (this.chassis) {
      const accel = (this.speed - this.prevSpeed) / Math.max(dt, 0.0001);
      const targetRoll = clamp(-this.steer * speedFactor * 0.09, -0.12, 0.12);
      const targetPitch = clamp(-accel * 0.0009, -0.06, 0.06);
      this.chassis.rotation.z = lerp(this.chassis.rotation.z, targetRoll, dt * 6);
      this.chassis.rotation.x = lerp(this.chassis.rotation.x, targetPitch, dt * 6);
      this.prevSpeed = this.speed;
    }

    // lights at night
    if (this.headMat) this.headMat.color.setScalar(City.dayFactor < 0.5 ? 3 : 0);
    if (this.tailMat) {
      const braking = this.driven ? this.brakeLit : this.speed < this.targetSpeed - 1;
      this.tailMat.color.setHex(braking ? 0xff2222 : 0x3a0505);
    }
    if (this.isPolice) {
      this.siren += dt * 6;
      if (this.sirenR) {
        const on = Math.sin(this.siren) > 0;
        this.sirenR.material.color.setScalar(on ? 6 : 0.2);
        this.sirenB.material.color.setScalar(!on ? 6 : 0.2);
      }
    }
  }

  followPath(dt) {
    if (!this.path || this.pathIndex >= this.path.length) {
      this.targetSpeed = 0;
      return;
    }
    const p = this.path[this.pathIndex];
    const dx = p.x - this.x, dz = p.z - this.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const targetH = Math.atan2(dx, dz);
    let dh = targetH - this.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    this.steer = clamp(dh * 1.5, -1, 1);
    if (d < 14) this.pathIndex++;
    this.targetSpeed = 26;
  }
}

/* ===== Vehicle Manager (spawn + traffic) ===== */
const VehicleManager = {
  scene: null,
  list: [],
  traffic: [],
  spawnTimer: 0,
  parkedCount: 0,

  init(scene, city) {
    this.scene = scene;
    this.city = city;
    this.spawnParked();
  },

  spawn(type, x, z, heading, opts = {}) {
    const v = new Vehicle(type, x, z, heading, opts);
    this.scene.add(v.group);
    this.list.push(v);
    if (opts.traffic) this.traffic.push(v);
    return v;
  },

  spawnParked() {
    const parked = 40;
    for (let i = 0; i < parked; i++) {
      const p = this.city.randomRoadPoint();
      const heading = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      const types = ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'civilian', 'civilian', 'muscle'];
      const t = types[randi(0, types.length - 1)];
      const v = this.spawn(t, p.x, p.z, heading, { traffic: true, ai: false });
      v.speed = 0;
      v.targetSpeed = 0;
      this.parkedCount++;
    }
  },

  spawnTraffic(dt, playerPos) {
    this.spawnTimer -= dt;
    const maxTraffic = GAME.settings.traffic ? 22 : 0;
    if (this.traffic.length >= maxTraffic || this.spawnTimer > 0) return;
    this.spawnTimer = 1.6;
    const p = this.city.randomRoadPoint();
    // heading along the road
    const seg = this.city.nearestRoadSegment(p.x, p.z);
    const heading = seg.horizontal ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
    const types = ['civilian', 'sedan', 'taxi', 'van', 'suv', 'truck'];
    const t = types[randi(0, types.length - 1)];
    const v = this.spawn(t, p.x, p.z, heading, { traffic: true });
    v.targetSpeed = v.maxSpeed * rand(0.35, 0.6);
    v.laneAxis = seg;
    // pick a fixed lane offset (right-hand side of travel) so opposing traffic
    // doesn't share the same line down the middle of the road
    const quarter = (GAME.city.roadWidth || 22) / 4;
    v.laneOffset = seg.horizontal
      ? (Math.sin(heading) > 0 ? quarter : -quarter)
      : (Math.cos(heading) > 0 ? -quarter : quarter);
    v.cruiseSpeed = v.targetSpeed;
  },

  updateTraffic(dt, playerPos) {
    for (const v of this.traffic) {
      if (!v.alive || v.driven) continue;
      // keep to a fixed lane line, offset from road centerline
      if (v.laneAxis && v.speed > 0.5) {
        const seg = v.laneAxis;
        const rc = seg.rc + (v.laneOffset || 0);
        const d = seg.horizontal ? v.z - rc : v.x - rc;
        const wantH = seg.horizontal ? (Math.sin(v.heading) > 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.cos(v.heading) > 0 ? 0 : Math.PI);
        let dh = (wantH - clamp(d * 0.06, -0.5, 0.5)) - v.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        v.steer = clamp(dh * 0.6, -0.5, 0.5);
      }
      // resume cruise speed by default, then apply the slowdowns below
      let desired = v.cruiseSpeed !== undefined ? v.cruiseSpeed : v.maxSpeed * 0.4;

      // slow / queue behind the nearest vehicle ahead in roughly the same lane —
      // this is what produces natural-looking congestion instead of cars overlapping
      const fwd = { x: Math.sin(v.heading), z: Math.cos(v.heading) };
      let gap = Infinity;
      for (const other of this.list) {
        if (other === v || !other.alive) continue;
        const dx = other.x - v.x, dz = other.z - v.z;
        const along = dx * fwd.x + dz * fwd.z;
        if (along <= 0.5 || along > 16) continue;
        const lateral = Math.abs(dx * fwd.z - dz * fwd.x);
        if (lateral > 2.6) continue;
        if (along < gap) gap = along;
      }
      if (gap < 16) {
        const safe = 7.5;
        const slow = clamp((gap - 3) / safe, 0, 1);
        desired = Math.min(desired, v.maxSpeed * 0.55 * slow);
      }

      // slow near the player on foot so it doesn't feel like traffic ignores them
      const pd = dist2(v.x, v.z, playerPos.x, playerPos.z);
      if (pd < 14) desired = Math.min(desired, 4);
      v.targetSpeed = desired;

      // despawn out of bounds
      if (Math.abs(v.x) > this.city.bounds.max + 60 || Math.abs(v.z) > this.city.bounds.max + 60) {
        this.remove(v);
        continue;
      }
    }
  },

  update(dt, playerPos) {
    for (const v of this.list) {
      if (!v.alive) continue;
      if (v.isAI && v.path) v.followPath(dt);
      v.update(dt, this.city);
    }
    this.spawnTraffic(dt, playerPos);
    this.updateTraffic(dt, playerPos);
  },

  remove(v) {
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
    const j = this.traffic.indexOf(v);
    if (j >= 0) this.traffic.splice(j, 1);
    this.scene.remove(v.group);
  },

  destroy(v) {
    if (!v.alive) return;
    v.alive = false;
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
    const j = this.traffic.indexOf(v);
    if (j >= 0) this.traffic.splice(j, 1);
    // explosion effect
    if (World && World.effects) World.effects.explosion(v.x, v.z);
    AudioMgr.explosion();
    this.scene.remove(v.group);
  },

  nearest(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const v of this.list) {
      if (!v.alive) continue;
      const d = dist2(x, z, v.x, v.z);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  },

  clearAll() {
    for (const v of this.list.slice()) this.remove(v);
  }
};
