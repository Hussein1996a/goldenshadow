/* ===== Golden Shadow — Visual effects ===== */
const Effects = {
  scene: null,
  tracers: [],
  holes: [],
  flashes: [],

  init(scene) {
    this.scene = scene;
    this.tracerGeo = new THREE.BufferGeometry();
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
  },

  tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, this.tracerMat);
    line.userData.life = 0.06;
    this.scene.add(line);
    this.tracers.push(line);
  },

  muzzleFlash(pos) {
    const light = new THREE.PointLight(0xffdd88, 2.2, 10);
    light.position.copy(pos);
    this.scene.add(light);
    this.flashes.push({ light, life: 0.05 });
  },

  bulletImpact(pos) {
    const sp = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints([pos]),
      new THREE.PointsMaterial({ color: 0xffcc66, size: 0.4 })
    );
    sp.userData.life = 0.08;
    this.scene.add(sp);
    this.tracers.push(sp);
  },

  explosion(x, z, { big = false } = {}) {
    const r = big ? 4 : 2.5;
    const fire = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.9 })
    );
    fire.position.set(x, r / 2, z);
    this.scene.add(fire);
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.8, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.6 })
    );
    smoke.position.set(x, r * 1.6, z);
    this.scene.add(smoke);
    this.flashes.push({ light: new THREE.PointLight(0xff6622, big ? 8 : 4, big ? 60 : 30, 1.4), life: 0.4, lightSet: true });
    if (this.flashes[this.flashes.length - 1].lightSet) {
      this.flashes[this.flashes.length - 1].light.position.set(x, 3, z);
      this.scene.add(this.flashes[this.flashes.length - 1].light);
    }
    // animators
    fire.userData = { kind: 'expand', life: 0.5, maxR: r * 2, grow: true };
    smoke.userData = { kind: 'rise', life: 1.2, maxY: 14 };
    this.tracers.push(fire);
    this.tracers.push(smoke);
  },

  /* ---------- vehicle collisions & run-overs ---------- */
  crashSpark(x, z) {
    const sp = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.8, z)]),
      new THREE.PointsMaterial({ color: 0xffe08a, size: 0.5 })
    );
    sp.userData = { life: 0.14 };
    this.scene.add(sp);
    this.tracers.push(sp);
    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 })
    );
    smoke.position.set(x, 0.9, z);
    this.scene.add(smoke);
    smoke.userData = { kind: 'rise', life: 0.6, maxY: 4 };
    this.tracers.push(smoke);
    const light = new THREE.PointLight(0xffcc66, 3, 12);
    light.position.set(x, 1, z);
    this.scene.add(light);
    this.flashes.push({ light, life: 0.12 });
  },

  bloodSplat(x, z) {
    const geo = new THREE.CircleGeometry(rand(0.5, 0.9), 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x4a0a0a, transparent: true, opacity: 0.75 });
    const decal = new THREE.Mesh(geo, mat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(x, 0.03, z);
    this.scene.add(decal);
    decal.userData = { kind: 'fade', life: 7, maxLife: 7 };
    this.tracers.push(decal);
  },

  update(dt) {
    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.userData.life -= dt;
      if (t.userData.kind === 'expand' && t.userData.grow) {
        const s = 1 + dt * 6;
        t.scale.set(s, s, s);
        if (t.userData.life < 0.2) t.material.opacity = t.userData.life * 5;
        if (t.userData.life <= 0) t.userData.grow = false;
      } else if (t.userData.kind === 'rise') {
        t.position.y += dt * 5;
        t.material.opacity = Math.max(0, t.userData.life * 0.5);
      } else if (t.userData.kind === 'fade') {
        t.material.opacity = Math.max(0, (t.userData.life / t.userData.maxLife) * 0.75);
      } else if (t.isLine) {
        t.material.opacity = t.userData.life * 15;
      } else if (t.userData.life <= 0) {
        t.material.opacity = 0;
      }
      if (t.userData.life <= 0) {
        this.scene.remove(t);
        this.tracers.splice(i, 1);
      }
    }
    // flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.lightSet) f.light.intensity = Math.max(0, f.life * 8);
      else f.light.intensity = f.life * 20;
      if (f.life <= 0) {
        this.scene.remove(f.light);
        this.flashes.splice(i, 1);
      }
    }
  }
};
