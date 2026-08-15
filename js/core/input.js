/* ===== Golden Shadow — Input manager ===== */
const Input = {
  keys: {},
  pressed: {},
  mouseDX: 0,
  mouseDY: 0,
  mouseDown: false,
  rightMouseDown: false,
  touchAimDown: false,
  pointerLock: false,
  onKeyDown: null,
  onKeyUp: null,

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const code = e.code;
      this.keys[code] = true;
      this.pressed[code] = true;
      if (this.onKeyDown) this.onKeyDown(code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const code = e.code;
      this.keys[code] = false;
      if (this.onKeyUp) this.onKeyUp(code);
    });
    window.addEventListener('blur', () => { this.keys = {}; });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.pointerLock) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLock = (document.pointerLockElement === document.body);
      if (!this.pointerLock) { this.mouseDown = false; this.rightMouseDown = false; }
    });
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  /* ---------- touch support ---------- */
  isAiming() { return this.rightMouseDown || this.touchAimDown; },

  addTouchLook(dx, dy) {
    this.mouseDX += dx;
    this.mouseDY += dy;
  },

  /* One-shot virtual key press (touch buttons): fires onKeyDown and marks
     the frame-scoped "pressed" edge, same as a real keydown would. */
  tapKey(code) {
    this.keys[code] = true;
    this.pressed[code] = true;
    if (this.onKeyDown) this.onKeyDown(code);
  },
  releaseKey(code) {
    this.keys[code] = false;
  },

  requestPointerLock() {
    document.body.requestPointerLock && document.body.requestPointerLock();
  },

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  },

  consumePressed(code) {
    const v = this.pressed[code] === true;
    this.pressed[code] = false;
    return v;
  },

  consumeMouseDX() { const v = this.mouseDX; this.mouseDX = 0; return v; },
  consumeMouseDY() { const v = this.mouseDY; this.mouseDY = 0; return v; },

  endFrame() {
    this.pressed = {};
    this.mouseDX = 0;
    this.mouseDY = 0;
  },

  isDown(...codes) { return codes.some(c => this.keys[c]); }
};
