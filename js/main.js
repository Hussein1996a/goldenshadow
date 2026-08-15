/* ===== Golden Shadow — Main entry & game loop ===== */
const World = {
  scene: null,
  camera: null,
  renderer: null,
  player: null,
  npcs: [],
  wantedLevel: 0,
  wantedTimer: 0,
  lastIncident: 0,
  lastShotPos: null,
  bribeHintShown: false
};

const Game = {
  state: 'menu',
  started: false,
  camYaw: 0,
  camPitch: 0,
  camSmoothX: 0,
  camSmoothY: 0,
  camSmoothZ: 0,
  clock: null,
  worldBuildError: false,

  init() {
    // Bind UI handlers FIRST so the menu always works even if 3D fails.
    MissionManager.init();
    HUD.init();
    Minimap.init();
    Input.init();
    TouchControls.init();
    Menus.init();

    try {
      this.buildWorld();
    } catch (err) {
      console.error('World build failed:', err);
      this.worldBuildError = true;
      HUD.showBootError('World build failed: ' + (err && err.message ? err.message : err));
    }

    this.clock = new THREE.Clock();
    this.loop();
  },

  buildWorld() {
    AudioMgr.init();
    // renderer
    const container = document.getElementById('renderer-container');
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Modern Three.js color pipeline: higher perceived fidelity and more natural highlights.
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if ('toneMapping' in renderer) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if ('toneMappingExposure' in renderer) renderer.toneMappingExposure = 1.08;
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    World.renderer = renderer;

    const scene = new THREE.Scene();
    World.scene = scene;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2500);
    World.camera = camera;

    // systems
    Effects.init(scene);
    City.init(scene);
    VehicleManager.init(scene, City);
    World.effects = Effects;
    World.pickups = PickupManager;
    World.missionManager = MissionManager;

    // player
    World.player = new Player(scene, City);
    const spawn = City.findClearSpawn('goldst');
    World.player.setPos(spawn.x, spawn.z);
    World.player.resetHealth();
    World.player.armor = 50;

    // initial pedestrians
    for (let i = 0; i < 30; i++) {
      const p = City.randomRoadPoint();
      NPCSpawner.spawnPedestrian(clamp(p.x, City.bounds.min + 10, City.bounds.max - 10), clamp(p.z, City.bounds.min + 10, City.bounds.max - 10));
    }

    // camera smoothing
    this.camYaw = World.player.yaw;
    this.camSmoothX = World.player.x;
    this.camSmoothY = 3;
    this.camSmoothZ = World.player.z;

    // events
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('click', () => {
      AudioMgr.resume();
      if (this.state === 'playing' && !Input.pointerLock && !TouchControls.active) {
        Input.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      if (!Input.pointerLock && this.state === 'playing' && !Menus.inMenu && !TouchControls.active) {
        this.togglePause(true);
      }
    });
    Input.onKeyDown = (code) => this.onKey(code);
    Input.onKeyUp = () => {};

    // day/night
    GAME.time = 9.0;

    // complete callback
    MissionManager.onCompleteCb = (m) => {
      if (m.type === 'story') {
        const next = MissionManager.all.find(x => x.requires === m.id);
        if (next) HUD.showSubtitle('→ ' + next.title[GAME.lang] + ' (' + I18N.t('nextMission') + ')', 5);
      }
    };
  },

  isPlaying() { return this.state === 'playing'; },

  startGame(profile, showIntro = true) {
    if (!World.player) {
      HUD.notify(I18N.t('worldInitFailed'), 'warn');
      return;
    }
    if (World.player) {
      World.player.resetHealth();
      World.player.armor = 50;
    }
    if (profile) {
      MissionManager.loadProfile(profile);
      HUD.notify(I18N.t('savedGame'), 'success');
    } else {
      MissionManager.completed = {};
      GAME.stats = { missionsCompleted: 0, kills: 0, racesWon: 0, distanceDriven: 0 };
      GAME.money = 5000;
      const spawn = City.locationPos('goldst');
      World.player.setPos(spawn.x, spawn.z);
      World.player.yaw = Math.PI / 2;
      if (showIntro) {
        HUD.showSubtitle(I18N.t('welcome') + ' — ' + I18N.t('welcomeSub'), 6);
        HUD.notify(I18N.t('newGameStarted'), 'success');
      }
    }
    this.started = true;
    Menus.hideMainMenu();
    this.setState('playing');
    HUD.updateMoney();
    HUD.updateWeapon();
    HUD.updateHealth(World.player.health, World.player.maxHealth);
    HUD.updateArmor(World.player.armor);
    HUD.updateWanted(0);
    World.wantedLevel = 0;
    Save.save(MissionManager.getProfile());
  },

  setState(s) {
    this.state = s;
    if (s === 'playing') {
      document.getElementById('main-menu').classList.add('hidden');
      document.getElementById('pause-menu').classList.add('hidden');
      document.getElementById('gameover-modal').classList.add('hidden');
    }
  },

  setPlaying() {
    this.setState('playing');
    if (!Input.pointerLock && !TouchControls.active) Input.requestPointerLock();
  },

  togglePause(force = null) {
    if (this.state === 'playing') {
      this.state = 'paused';
      Menus.showPause();
      Input.exitPointerLock();
    } else if (this.state === 'paused' && force !== true) {
      this.state = 'playing';
      Menus.hidePause();
      if (!TouchControls.active) Input.requestPointerLock();
    }
  },

  quitToMenu() {
    Save.save(MissionManager.getProfile());
    this.state = 'menu';
    Menus.hidePause();
    Menus.hideMainMenu();
    Menus.showMainMenu();
    MissionManager.stopActive();
    World.wantedLevel = 0;
    Input.exitPointerLock();
  },

  respawn() {
    const p = World.player;
    if (!p.inVehicle) {
      p.resetHealth();
      p.armor = 50;
    }
    const spawn = City.locationPos('garage');
    p.setPos(spawn.x, spawn.z);
    p.yaw = 0;
    HUD.updateHealth(p.health, p.maxHealth);
    HUD.updateArmor(p.armor);
  },

  applySettings() {
    if (!World.camera || !World.renderer) return;
    const s = GAME.settings;
    World.camera.fov = s.fov;
    World.camera.updateProjectionMatrix();
    const pixelRatio = s.quality === 'high' ? 2 : s.quality === 'medium' ? 1.5 : 1;
    World.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatio));
    if ('toneMappingExposure' in World.renderer) World.renderer.toneMappingExposure = s.quality === 'high' ? 1.1 : 1.05;
    World.renderer.shadowMap.enabled = s.quality !== 'low';
    if (s.quality === 'low') {
      World.renderer.shadowMap.type = THREE.BasicShadowMap;
    } else {
      World.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (World.scene && City.sunLight) {
        const shadowSize = s.quality === 'high' ? 4096 : 2048;
        City.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
        if (City.sunLight.shadow.map) City.sunLight.shadow.map.dispose();
        City.sunLight.shadow.map = null;
      }
    }
    AudioMgr.setVolume(s.masterVolume);
  },

  onResize() {
    World.camera.aspect = window.innerWidth / window.innerHeight;
    World.camera.updateProjectionMatrix();
    World.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  onKey(code) {
    if (code === 'Escape') {
      if (this.state === 'playing') this.togglePause();
      else if (this.state === 'paused') this.togglePause(false);
      return;
    }
    if (this.state !== 'playing') return;
    if (code === 'KeyE') this.interact();
    if (code === 'KeyB') World.player.bribePolice();
  },

  interact() {
    const p = World.player;
    if (p.inVehicle) {
      p.exitVehicle();
      return;
    }
    // building interiors first (while on foot)
    if (Interiors.toggle()) return;
    const v = p.nearestVehicle();
    if (v) {
      p.tryEnterVehicle(v);
      MissionManager.onVehicleEnter(v);
      AudioMgr.thud();
      return;
    }
    const hint = MissionManager.getContextHint();
    if (hint) {
      MissionManager.interact();
    }
  },

  /* ---------- wanted system ---------- */
  updateWanted(dt) {
    const now = performance.now();
    // decay after inactivity
    if (World.wantedLevel > 0 && now - World.lastIncident > 20000) {
      World.wantedTimer -= dt;
      if (World.wantedTimer <= 0) {
        World.wantedLevel--;
        World.wantedTimer = 8;
        HUD.updateWanted(World.wantedLevel);
        if (World.wantedLevel <= 0) AudioMgr.cash();
      }
    }
    if (World.wantedLevel >= 4 && !World.bribeHintShown) {
      World.bribeHintShown = true;
      HUD.showCenterMsg(I18N.t('policeHot') + ' — ' + I18N.t('wantedBribe'), 4);
    }
    if (World.wantedLevel < 4) World.bribeHintShown = false;
  },

  /* ---------- camera ---------- */
  updateCamera(dt) {
    const p = World.player;
    const pose = p.getCameraPose();
    const dx = Input.consumeMouseDX();
    const dy = Input.consumeMouseDY();
    const sens = GAME.settings.sensitivity;
    let targetYaw = pose.yaw;
    let targetPitch = pose.pitch;
    if (!p.inVehicle) {
      targetYaw = pose.yaw - dx * 0.0028 * sens;
      targetPitch = clamp(pose.pitch - dy * 0.0028 * sens, -65, 65);
      p.yaw = targetYaw;
      p.pitch = targetPitch;
    } else {
      // slight camera orbit around vehicle
      const v = p.inVehicle;
      let camPitch = -dy * 0.0028 * sens;
      this.camPitch = clamp(this.camPitch + camPitch, -30, 30);
      const lookYaw = pose.yaw - dx * 0.0028 * sens * 0.5;
      this.camLookYaw = lookYaw;
    }

    const aiming = !p.inVehicle && Input.isAiming();
    const dist = p.inVehicle ? 9.5 : (aiming ? 3.6 : 8);
    const height = p.inVehicle ? 3.6 : (aiming ? 2.6 : 3.2);
    const yaw = p.inVehicle ? (this.camLookYaw !== undefined ? this.camLookYaw : pose.yaw) : p.yaw;
    const pitch = p.inVehicle ? this.camPitch : p.pitch;
    const ph = pitch * Math.PI / 180;
    const baseY = p.inVehicle ? 0.8 : 1.6;
    const shoulder = aiming ? 0.72 : 0;
    const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw);
    const target = {
      x: p.x - Math.sin(yaw) * Math.cos(ph) * dist + rightX * shoulder,
      y: baseY - Math.sin(ph) * dist + height,
      z: p.z - Math.cos(yaw) * Math.cos(ph) * dist + rightZ * shoulder
    };

    // Camera collision: prevent the third-person/ADS camera from entering
    // buildings and snapping through walls during close-quarters combat.
    if (!p.inVehicle && typeof Weapons !== 'undefined' && Weapons.nearestBuildingT) {
      const ax = p.x + rightX * shoulder, az = p.z + rightZ * shoulder;
      const vx = target.x - ax, vz = target.z - az;
      const len = Math.sqrt(vx * vx + vz * vz);
      if (len > 0.01) {
        const bt = Weapons.nearestBuildingT(ax, az, vx / len, vz / len, len);
        if (bt < len) {
          const safe = Math.max(0.55, bt - 0.45);
          target.x = ax + (vx / len) * safe;
          target.z = az + (vz / len) * safe;
        }
      }
    }
    // smooth (snappier zoom transition when toggling aim)
    const camLerp = 1 - Math.pow(aiming ? 0.00002 : 0.001, dt);
    this.camSmoothX = lerp(this.camSmoothX, target.x, camLerp);
    this.camSmoothY = lerp(this.camSmoothY, target.y, camLerp);
    this.camSmoothZ = lerp(this.camSmoothZ, target.z, camLerp);
    World.camera.position.set(this.camSmoothX, this.camSmoothY, this.camSmoothZ);
    const lookAhead = aiming ? 4.5 : 1.2;
    World.camera.lookAt(
      p.x + Math.sin(yaw) * lookAhead,
      baseY + (aiming ? 0.05 : 0),
      p.z + Math.cos(yaw) * lookAhead
    );

    // narrow FOV slightly while aiming for a zoom-in feel
    const targetFov = aiming ? GAME.settings.fov * 0.72 : GAME.settings.fov;
    if (Math.abs(World.camera.fov - targetFov) > 0.05) {
      World.camera.fov = lerp(World.camera.fov, targetFov, 1 - Math.pow(0.0005, dt));
      World.camera.updateProjectionMatrix();
    }

    // crosshair: only while armed, on foot, and not obstructed by menus
    if (HUD.setAiming) HUD.setAiming(!p.inVehicle && p.currentWeapon > 0, aiming);
  },

  /* ---------- loop ---------- */
  loop() {
    requestAnimationFrame(() => this.loop());
    if (!World.scene || !World.renderer || !World.player) {
      Input.endFrame();
      return;
    }
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const p = World.player;

    // time & sky
    if (GAME.settings.dayCycle && this.state === 'playing') {
      GAME.time = (GAME.time + dt * 24 / GAME.dayLength) % 24;
    }
    City.updateSky(GAME.time);

    if (this.state === 'playing') {
      // input-driven player update
      p.update(dt, Input, p.yaw, p.pitch);
      VehicleManager.update(dt, p.getPos());
      NPCSpawner.maintainPedestrians(dt);
      NPCSpawner.spawnPolice(dt);
      // npcs update
      const pos = p.getPos();
      for (const n of World.npcs) n.update(dt, pos);
      PickupManager.update(dt);
      Effects.update(dt);
      MissionManager.update(dt);
      this.updateWanted(dt);
      this.updateCamera(dt);

      // context hint
      this.updateContextHint();

      // HUD
      HUD.update(dt);
      HUD.updateHealth(p.health, p.maxHealth);
      HUD.updateArmor(p.armor);
      if (p.inVehicle) {
        HUD.setVehicleHud(true, I18N.t('vehicle_' + p.inVehicle.type));
        HUD.updateSpeed(p.inVehicle.speed);
      } else {
        HUD.setVehicleHud(false);
      }
      HUD.updateWanted(World.wantedLevel);
      HUD.updateTime(GAME.time);
      HUD.updateLocation(City.locationNameAt(p.x, p.z));
      HUD.updateNav();
      Minimap.update();
    } else if (this.state === 'menu') {
      // ambient camera drift behind menu
      const ang = performance.now() * 0.00005;
      const cx = World.player.x + Math.sin(ang) * 30;
      const cz = World.player.z + Math.cos(ang) * 30;
      World.camera.position.set(cx, 22, cz);
      World.camera.lookAt(World.player.x, 0, World.player.z);
      Minimap.update();
    } else if (this.state === 'paused') {
      Effects.update(dt);
      Minimap.update();
    }

    // hud damage vignette (simple overlay via css opacity using body class)
    World.renderer.render(World.scene, World.camera);
    Input.endFrame();

    // hide loading after first frames
    if (this.worldBuildError) return;
    if (this._hideLoading) {
      HUD.hideLoading();
      this._hideLoading = false;
    } else if (!this._loadingHidden) {
      this._loadingHidden = true;
      setTimeout(() => { HUD.hideLoading(); }, 200);
    }
  },

  updateContextHint() {
    const p = World.player;
    if (p.inVehicle) {
      HUD.setContextHint(I18N.t('exitVehicle').replace('E', '<kbd>E</kbd>'));
      return;
    }
    // building interior hint (inside takes priority)
    const ihint = Interiors.getContextHint();
    if (ihint) {
      HUD.setContextHint(ihint.replace('E', '<kbd>E</kbd>'));
      return;
    }
    const v = p.nearestVehicle();
    if (v) {
      HUD.setContextHint(I18N.t('enterVehicle').replace('E', '<kbd>E</kbd>'));
      return;
    }
    const mhint = MissionManager.getContextHint();
    if (mhint) {
      HUD.setContextHint(mhint.replace('E', '<kbd>E</kbd>'));
      return;
    }
    HUD.setContextHint(null);
  }
};

/* World helper: wanted level */
World.addWanted = function (n) {
  World.wantedLevel = clamp(World.wantedLevel + n, 0, 5);
  World.lastIncident = performance.now();
  World.wantedTimer = 8;
  if (World.wantedLevel > 0 && World.wantedLevel < 4) {
    AudioMgr.siren();
  }
  if (HUD) HUD.updateWanted(World.wantedLevel);
};

World.onPlayerDeath = function () {
  if (MissionManager.active) {
    MissionManager.fail('killed');
  } else {
    GAME.money = Math.max(0, GAME.money - 200);
    HUD.updateMoney();
    HUD.showCenterMsg(I18N.t('gameOver') + ' -$200', 2.5);
    Game.respawn();
  }
};

World.respawnAfterFail = function () {
  GAME.money = Math.max(0, GAME.money - 200);
  HUD.updateMoney();
  Game.respawn();
};

/* Boot */
window.addEventListener('load', () => {
  window.addEventListener('error', (e) => {
    try {
      if (HUD && HUD.showBootError) {
        HUD.showBootError('Error: ' + (e.message || 'unknown'));
        document.getElementById('main-menu').classList.add('hidden');
      }
    } catch (_) {}
  });
  Save.loadSettings();
  Menus.inMenu = true;
  Game.init();
  Game.applySettings();
  if (!Game.worldBuildError) HUD.hideLoading();
  Menus.showMainMenu();
  HUD.updateMoney();
});
