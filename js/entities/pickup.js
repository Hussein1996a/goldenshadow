/* ===== Golden Shadow — Pickups & markers ===== */
class Pickup {
  constructor(x, z, kind, data = {}) {
    this.kind = kind;
    this.x = x; this.z = z;
    this.data = data;
    this.taken = false;
    this.group = new THREE.Group();
    this.t = rand(0, 10);

    if (kind === 'money') {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.15, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd76a })
      );
      coin.rotation.x = Math.PI / 2;
      coin.position.y = 0.6;
      this.group.add(coin);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.2 })
      );
      glow.position.y = 0.6;
      this.group.add(glow);
    } else if (kind === 'package') {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.7),
        new THREE.MeshBasicMaterial({ color: 0xe0a63a })
      );
      box.position.y = 0.6;
      this.group.add(box);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.18, 0.75),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      stripe.position.y = 0.7;
      this.group.add(stripe);
    } else if (kind === 'checkpoint') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.25, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0x54c46b, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 3;
      this.group.add(ring);
    } else if (kind === 'marker') {
      const color = data.color || 0x4f8cff;
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.9, 12, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
      );
      cyl.position.y = 6;
      this.group.add(cyl);
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
      );
      top.position.y = 12.5;
      this.group.add(top);
    }
    this.group.position.set(x, 0, z);
    World.scene.add(this.group);
  }

  animate(dt) {
    this.t += dt;
    if (this.kind === 'money' || this.kind === 'package') {
      this.group.position.y = Math.sin(this.t * 2.5) * 0.25;
      this.group.rotation.y += dt * 2;
    }
    if (this.kind === 'marker') {
      this.group.position.y = Math.sin(this.t * 3) * 0.4;
    }
  }

  remove() {
    World.scene.remove(this.group);
  }
}

const PickupManager = {
  list: [],

  addMoney(x, z, amt) {
    const p = new Pickup(x, z, 'money', { amt });
    this.list.push(p);
    return p;
  },

  addPackage(x, z, id) {
    const p = new Pickup(x, z, 'package', { id });
    this.list.push(p);
    return p;
  },

  addCheckpoint(x, z, order) {
    const p = new Pickup(x, z, 'checkpoint', { order });
    this.list.push(p);
    return p;
  },

  addMarker(x, z, color, kind) {
    const p = new Pickup(x, z, 'marker', { color, kind });
    this.list.push(p);
    return p;
  },

  update(dt) {
    const p = World.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      if (it.taken) {
        it.remove();
        this.list.splice(i, 1);
        continue;
      }
      it.animate(dt);
      const d = dist2(p.x, p.z, it.x, it.z);
      if (d < (it.kind === 'checkpoint' ? 3.5 : 2.2)) {
        this.collect(it);
        it.taken = true;
      }
    }
  },

  collect(it) {
    switch (it.kind) {
      case 'money':
        World.player.addMoney(it.data.amt || 50);
        AudioMgr.pickup();
        if (HUD) HUD.updateMoney();
        break;
      case 'package':
        AudioMgr.pickup();
        if (World.missionManager) World.missionManager.onCollect(it);
        break;
      case 'checkpoint':
        AudioMgr.pickup();
        if (World.missionManager) World.missionManager.onCheckpoint(it.data.order);
        break;
      default:
        break;
    }
  },

  clearMissionItems() {
    for (const it of this.list.slice()) {
      if (it.kind !== 'money') { it.taken = true; it.remove(); }
    }
    this.list = this.list.filter(it => it.kind === 'money');
  },

  clearMarkers() {
    for (const it of this.list.slice()) {
      if (it.kind === 'marker') { it.taken = true; it.remove(); }
    }
    this.list = this.list.filter(it => it.kind !== 'marker');
  },

  clearAll() {
    for (const it of this.list) it.remove();
    this.list = [];
  }
};
