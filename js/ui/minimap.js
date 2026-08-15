/* ===== Golden Shadow — Minimap ===== */
const Minimap = {
  canvas: null,
  ctx: null,
  scale: 0.34,
  size: 220,
  roadXs: [],
  compassEl: null,

  init() {
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas.getContext('2d');
    this.size = this.canvas.width;
    this.compassEl = document.getElementById('compass');
    const { blocks } = GAME.city;
    for (let i = 0; i <= blocks; i++) {
      this.roadXs.push(City.roadCenterX(i));
    }
  },

  toScreen(x, z, px, pz) {
    return {
      x: this.size / 2 + (x - px) * this.scale,
      y: this.size / 2 + (z - pz) * this.scale
    };
  },

  update() {
    const ctx = this.ctx;
    const p = World.player;
    const px = p.x, pz = p.z;
    const half = (this.size / 2) / this.scale;

    ctx.clearRect(0, 0, this.size, this.size);
    // background
    ctx.fillStyle = '#14161d';
    ctx.fillRect(0, 0, this.size, this.size);

    // roads
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    for (const rc of this.roadXs) {
      // horizontal road (constant z)
      let z1 = this.toScreen(0, rc, px, pz).y;
      if (z1 > -20 && z1 < this.size + 20) {
        ctx.beginPath();
        ctx.moveTo(-20, z1);
        ctx.lineTo(this.size + 20, z1);
        ctx.stroke();
      }
      let x1 = this.toScreen(rc, 0, px, pz).x;
      if (x1 > -20 && x1 < this.size + 20) {
        ctx.beginPath();
        ctx.moveTo(x1, -20);
        ctx.lineTo(x1, this.size + 20);
        ctx.stroke();
      }
    }
    // center lines dashed
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    for (const rc of this.roadXs) {
      const z1 = this.toScreen(0, rc, px, pz).y;
      if (z1 > -20 && z1 < this.size + 20) {
        ctx.beginPath(); ctx.moveTo(-20, z1); ctx.lineTo(this.size + 20, z1); ctx.stroke();
      }
      const x1 = this.toScreen(rc, 0, px, pz).x;
      if (x1 > -20 && x1 < this.size + 20) {
        ctx.beginPath(); ctx.moveTo(x1, -20); ctx.lineTo(x1, this.size + 20); ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // world bounds
    ctx.strokeStyle = 'rgba(227,75,63,0.5)';
    ctx.lineWidth = 2;
    const b1 = this.toScreen(City.bounds.min, City.bounds.min, px, pz);
    const b2 = this.toScreen(City.bounds.max, City.bounds.max, px, pz);
    ctx.strokeRect(b1.x, b1.y, b2.x - b1.x, b2.y - b1.y);

    // mission markers
    for (const mk of MissionManager.markers) {
      const s = this.toScreen(mk.x, mk.z, px, pz);
      const col = '#' + mk.color.toString(16).padStart(6, '0');
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // npcs
    for (const n of World.npcs) {
      if (!n.alive) continue;
      const dx = n.x - px, dz = n.z - pz;
      if (dx * dx + dz * dz > half * half) continue;
      const s = this.toScreen(n.x, n.z, px, pz);
      ctx.fillStyle = n.type === 'ped' ? 'rgba(200,200,200,0.7)' : n.type === 'cop' ? 'rgba(79,140,255,0.9)' : 'rgba(227,75,63,0.9)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, n.type === 'ped' ? 1.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // traffic vehicles
    for (const v of VehicleManager.traffic) {
      if (!v.alive) continue;
      const dx = v.x - px, dz = v.z - pz;
      if (dx * dx + dz * dz > half * half) continue;
      const s = this.toScreen(v.x, v.z, px, pz);
      ctx.fillStyle = 'rgba(212,175,55,0.5)';
      ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    }

    // player arrow
    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    const ang = p.inVehicle ? p.inVehicle.heading : p.yaw;
    ctx.rotate(Math.PI - ang);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // compass (matches map orientation: -Z = north/up, +X = east/right)
    const deg = ((Math.atan2(Math.sin(ang), -Math.cos(ang)) * 180 / Math.PI) % 360 + 360) % 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    this.compassEl.textContent = dirs[idx];
  }
};
