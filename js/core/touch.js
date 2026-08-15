/* ===== Golden Shadow — Touch controls (mobile) ===== */
const TouchControls = {
  active: false,
  els: {},
  joyTouchId: null,
  joyCenter: { x: 0, y: 0 },
  lookTouchId: null,
  weaponIdx: 1,

  init() {
    this.active = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!this.active) return;
    const g = (id) => document.getElementById(id);
    this.els = {
      root: g('touch-controls'),
      lookZone: g('touch-look-zone'),
      joystick: g('touch-joystick'),
      knob: g('joystick-knob'),
      fire: g('tbtn-fire'),
      aim: g('tbtn-aim'),
      jump: g('tbtn-jump'),
      interact: g('tbtn-interact'),
      reload: g('tbtn-reload'),
      weapon: g('tbtn-weapon'),
      pause: g('tbtn-pause')
    };
    this.els.root.classList.remove('hidden');
    this.bindJoystick();
    this.bindLook();
    this.bindButtons();
  },

  /* ---------- movement joystick ---------- */
  bindJoystick() {
    const el = this.els.joystick;
    const knob = this.els.knob;
    const maxR = 40;
    const start = (e) => {
      const t = e.changedTouches[0];
      this.joyTouchId = t.identifier;
      const rect = el.getBoundingClientRect();
      this.joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joyTouchId) continue;
        let dx = t.clientX - this.joyCenter.x;
        let dy = t.clientY - this.joyCenter.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxR) { dx = dx / d * maxR; dy = dy / d * maxR; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.applyMove(dx / maxR, dy / maxR);
        e.preventDefault();
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joyTouchId) continue;
        this.joyTouchId = null;
        knob.style.transform = 'translate(0,0)';
        this.applyMove(0, 0);
      }
    };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
  },

  applyMove(nx, ny) {
    const dead = 0.18;
    const set = (code, on) => { Input.keys[code] = on; };
    const mag = Math.sqrt(nx * nx + ny * ny);
    if (mag < dead) {
      set('KeyW', false); set('KeyS', false); set('KeyA', false); set('KeyD', false);
      return;
    }
    set('KeyW', ny < -dead);
    set('KeyS', ny > dead);
    set('KeyD', nx > dead);
    set('KeyA', nx < -dead);
  },

  /* ---------- look / aim drag zone (right side of screen) ---------- */
  bindLook() {
    const el = this.els.lookZone;
    let lastX = 0, lastY = 0;
    const start = (e) => {
      const t = e.changedTouches[0];
      this.lookTouchId = t.identifier;
      lastX = t.clientX; lastY = t.clientY;
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.lookTouchId) continue;
        const dx = t.clientX - lastX, dy = t.clientY - lastY;
        lastX = t.clientX; lastY = t.clientY;
        Input.addTouchLook(dx * 2.1, dy * 2.1);
        e.preventDefault();
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouchId) this.lookTouchId = null;
      }
    };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
  },

  /* ---------- action buttons ---------- */
  bindButtons() {
    const hold = (el, onDown, onUp) => {
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('active'); onDown(); }, { passive: false });
      const release = (e) => { e.preventDefault(); el.classList.remove('active'); onUp(); };
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release, { passive: false });
    };
    hold(this.els.fire, () => { Input.mouseDown = true; }, () => { Input.mouseDown = false; });
    hold(this.els.aim, () => { Input.touchAimDown = true; }, () => { Input.touchAimDown = false; });
    hold(this.els.jump, () => { Input.tapKey('Space'); }, () => { Input.releaseKey('Space'); });
    hold(this.els.interact, () => { Input.tapKey('KeyE'); }, () => { Input.releaseKey('KeyE'); });
    hold(this.els.reload, () => { Input.tapKey('KeyR'); }, () => { Input.releaseKey('KeyR'); });
    hold(this.els.pause, () => { Input.tapKey('Escape'); }, () => { Input.releaseKey('Escape'); });
    hold(this.els.weapon, () => {
      this.weaponIdx = this.weaponIdx >= 3 ? 1 : this.weaponIdx + 1;
      Input.tapKey('Digit' + this.weaponIdx);
    }, () => { Input.releaseKey('Digit' + this.weaponIdx); });
  }
};
