/* ===== Golden Shadow — Global config & helpers ===== */
const GAME = {
  NAME: 'Golden Shadow',
  NAME_AR: 'الظل الذهبي',
  VERSION: '1.0.0',
  lang: 'ar',
  settings: {
    masterVolume: 0.8,
    sensitivity: 6,
    fov: 75,
    quality: 'medium',
    dayCycle: true,
    traffic: true
  },
  time: 9.0,               // hours (0-24)
  dayLength: 480,          // seconds for a full day
  city: { blocks: 7, blockSize: 64, roadWidth: 22 },
  state: 'menu',           // menu | playing | paused | missionComplete | gameover
  money: 5000,
  stats: { missionsCompleted: 0, kills: 0, racesWon: 0, distanceDriven: 0 },
};

function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(x1, z1, x2, z2) { const dx = x2 - x1, dz = z2 - z1; return Math.sqrt(dx * dx + dz * dz); }
function angleTo(x1, z1, x2, z2) { return Math.atan2(x2 - x1, z2 - z1); }
function formatMoney(v) {
  v = Math.round(v);
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function shortId() { return Math.random().toString(36).slice(2, 10); }

/* Angle helpers (heading where 0 = +Z axis, positive = clockwise from +Z toward +X) */
function headingFromAngle(ang) { return Math.atan2(Math.sin(ang), Math.cos(ang)); }
function forwardFromHeading(h) { return { x: Math.sin(h), z: Math.cos(h) }; }
