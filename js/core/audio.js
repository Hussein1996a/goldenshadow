/* ===== Golden Shadow — Procedural WebAudio sound manager ===== */
const AudioMgr = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  muted: false,
  lastShot: 0,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = GAME.settings.masterVolume;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
    } catch (e) {
      this.ctx = null;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setVolume(v) {
    GAME.settings.masterVolume = v;
    if (this.master) this.master.gain.value = v;
  },

  setMusicVolume(v) {
    if (this.musicGain) this.musicGain.gain.value = v * 0.35;
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  /* ===== Sfx ===== */
  play(fn, { vol = 1, pan = 0, pitch = 1, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    panner.connect(g);
    g.connect(this.sfxGain);
    fn(t, pitch);
  },

  gunshot(kind = 'pistol', pan = 0) {
    const p = kind === 'smg' ? 1.25 : kind === 'rifle' ? 1.5 : 1;
    this.play((t) => {
      const dur = 0.16 / p;
      const noise = this.makeNoise(dur);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 3800 / p;
      filt.frequency.exponentialRampToValueAtTime(400, t + dur);
      noise.connect(filt);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.8, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      filt.connect(g);
      g.connect(this.ctx.destination);
      g.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + dur);
    }, { vol: 0.55, pan, pitch: p });
  },

  explosion(pan = 0) {
    this.play((t) => {
      const dur = 1.2;
      const noise = this.makeNoise(dur);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(900, t);
      filt.frequency.exponentialRampToValueAtTime(60, t + dur);
      noise.connect(filt);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      filt.connect(g);
      g.connect(this.sfxGain);
      noise.start(t);
      noise.stop(t + dur);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + dur);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.6, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(og);
      og.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur);
    }, { vol: 0.7, pan });
  },

  cash(pan = 0) {
    this.play((t) => {
      [1200, 1600, 2000].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = this.ctx.createGain();
        const st = t + i * 0.05;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.25, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
        o.connect(g); g.connect(this.sfxGain);
        o.start(st); o.stop(st + 0.2);
      });
    }, { vol: 0.5, pan });
  },

  pickup(pan = 0) {
    this.play((t) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(660, t);
      o.frequency.exponentialRampToValueAtTime(990, t + 0.1);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 0.25);
    }, { vol: 0.5, pan });
  },

  success(pan = 0) {
    this.play((t) => {
      [523, 659, 784, 1046].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const g = this.ctx.createGain();
        const st = t + i * 0.09;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.16, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
        o.connect(g); g.connect(this.sfxGain);
        o.start(st); o.stop(st + 0.3);
      });
    }, { vol: 0.6, pan });
  },

  fail(pan = 0) {
    this.play((t) => {
      [392, 311, 233].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const g = this.ctx.createGain();
        const st = t + i * 0.12;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.15, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
        o.connect(g); g.connect(this.sfxGain);
        o.start(st); o.stop(st + 0.4);
      });
    }, { vol: 0.5, pan });
  },

  click(pan = 0) {
    this.play((t) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 1500;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 0.1);
    }, { vol: 0.35, pan });
  },

  thud(pan = 0) {
    this.play((t) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 0.22);
    }, { vol: 0.5, pan });
  },

  siren(pan = 0) {
    this.play((t) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.setValueAtTime(0.12, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      for (let i = 0; i < 3; i++) {
        const st = t + i * 0.45;
        o.frequency.setValueAtTime(700, st);
        o.frequency.setValueAtTime(700, st + 0.2);
        o.frequency.setValueAtTime(950, st + 0.22);
        o.frequency.setValueAtTime(950, st + 0.44);
      }
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 1.4);
    }, { vol: 0.4, pan });
  },

  engine(rpm, { vol = 0.05, pan = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 40 + rpm * 90;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300 + rpm * 400;
    o.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.06);
  },

  footsteps() {
    this.play((t) => {
      const noise = this.makeNoise(0.07);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 500;
      noise.connect(filt);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      filt.connect(g); g.connect(this.sfxGain);
      noise.start(t); noise.stop(t + 0.08);
    }, { vol: 0.5 });
  },

  hurt() {
    this.play((t) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + 0.3);
    }, { vol: 0.5 });
  },

  makeNoise(dur) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
};
