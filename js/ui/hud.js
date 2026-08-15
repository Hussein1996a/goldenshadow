/* ===== Golden Shadow — HUD ===== */
const HUD = {
  els: {},
  activeMission: null,
  damageFlashT: 0,
  messageT: 0,

  init() {
    const g = (id) => document.getElementById(id);
    this.els = {
      hud: g('hud'),
      missionBox: g('mission-box'),
      missionTitle: g('mission-title'),
      missionDesc: g('mission-desc'),
      objectiveList: g('objective-list'),
      wantedStars: g('wanted-stars'),
      timeDisplay: g('time-display'),
      locationDisplay: g('location-display'),
      weaponName: g('weapon-name'),
      ammoDisplay: g('ammo-display'),
      healthBar: g('health-bar'),
      armorBar: g('armor-bar'),
      moneyBar: g('money-bar'),
      crosshair: g('crosshair'),
      navMarker: g('nav-marker'),
      navArrow: g('nav-arrow'),
      navDistance: g('nav-distance'),
      centerMsg: g('center-msg'),
      subtitle: g('subtitle'),
      notifications: g('notifications'),
      contextHint: g('context-hint'),
      vehicleHud: g('vehicle-hud'),
      speedDisplay: g('speed-display'),
      vehicleName: g('vehicle-name'),
      loadingScreen: g('loading-screen'),
      loadingText: g('loading-text'),
      completeModal: g('mission-complete-modal'),
      completeTitle: g('complete-title'),
      completeReward: g('complete-reward'),
      completeStats: g('complete-stats'),
      gameoverModal: g('gameover-modal')
    };
    this.els.hud.classList.remove('hidden');
  },

  showLoading() {
    this.els.loadingScreen.classList.remove('hidden');
  },
  hideLoading() {
    this.els.loadingScreen.classList.add('hidden');
  },
  showBootError(msg) {
    this.els.loadingText.textContent = msg;
    this.els.loadingScreen.classList.remove('hidden');
  },

  /* ---------- mission panel ---------- */
  setMission(m) {
    this.activeMission = m;
    if (!m) {
      this.els.missionTitle.textContent = '—';
      this.els.missionDesc.textContent = '—';
      this.els.objectiveList.innerHTML = '';
      return;
    }
    this.els.missionTitle.textContent = m.title[GAME.lang];
    this.els.missionDesc.textContent = m.desc[GAME.lang];
    this.updateObjectives();
  },

  clearMission() {
    this.setMission(null);
  },

  updateObjectives() {
    const mm = MissionManager;
    if (!this.activeMission) return;
    const list = this.els.objectiveList;
    list.innerHTML = '';
    for (const obj of mm.objectiveStates) {
      const d = document.createElement('div');
      d.className = 'obj-item ' + (obj.done ? 'done' : 'active');
      d.textContent = this.objectiveText(obj);
      list.appendChild(d);
    }
  },

  objectiveText(obj) {
    const t = (k) => I18N.t(k);
    const locName = (k) => k ? I18N.t('location_' + k) : '';
    switch (obj.type) {
      case 'goto': return t('objective_goto') + ' — ' + locName(obj.locKey);
      case 'kill': return t('objective_kill') + ' ' + (obj.progress) + '/' + obj.total + ' (' + t('enemy_' + (obj.enemyType || 'gang')) + ')';
      case 'collect': return t('objective_collect') + ' ' + (obj.progress) + '/' + obj.total;
      case 'find': return t('objective_find') + ' ' + (obj.progress) + '/' + obj.total;
      case 'deliver': {
        if (obj.phase === 0) return t('objective_goto') + ' — ' + t('mrk_pickup') + ' (' + locName(obj.fromLoc) + ')';
        return t('objective_deliver') + ' — ' + locName(obj.toLoc);
      }
      case 'race': {
        const left = Math.max(0, obj.timeLeft);
        return t('objective_race') + ' — ' + (obj.checkpointIndex) + '/' + obj.checkpoints.length + ' ⏱ ' + Math.ceil(left) + 's';
      }
      case 'steal': {
        if (obj.phase === 0) return t('objective_steal') + ' (' + t('vehicle_' + obj.vehType) + ')';
        return t('objective_deliver') + ' — ' + locName(obj.toLoc);
      }
      case 'survive': return t('objective_survive') + ' ⏱ ' + Math.ceil(Math.max(0, obj.timeLeft)) + 's';
      case 'destroy': return t('objective_destroy') + ' ' + (obj.progress) + '/' + obj.total;
      case 'bribe': return t('objective_bribe');
      case 'photo': return t('objective_photo');
      default: return obj.type;
    }
  },

  /* ---------- status bars ---------- */
  updateHealth(h, max) {
    this.els.healthBar.style.width = (h / max * 100) + '%';
  },
  updateArmor(a) {
    this.els.armorBar.style.width = (a / 100 * 100) + '%';
    this.els.armorBar.parentElement.parentElement.style.opacity = a > 0 ? 1 : 0.4;
  },
  updateMoney() {
    this.els.moneyBar.style.width = Math.min(100, GAME.money / 500000 * 100) + '%';
  },

  updateWeapon() {
    const p = World.player;
    const id = p.weapons[p.currentWeapon];
    this.els.weaponName.textContent = I18N.t(WEAPON_DEFS[id].nameKey);
    if (id === 'unarmed') {
      this.els.ammoDisplay.textContent = '—';
    } else {
      const mag = p.mags[id];
      const low = mag <= Math.ceil(WEAPON_DEFS[id].mag * 0.25);
      this.els.ammoDisplay.innerHTML = `<span class="${low ? 'low' : ''}">${mag}</span> / ${p.reserve[id]}`;
    }
  },

  updateWanted(stars) {
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `<span class="star ${i < stars ? 'on' : 'off'}">★</span>`;
    }
    this.els.wantedStars.innerHTML = html;
  },

  updateTime(hour) {
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour % 1) * 60);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    this.els.timeDisplay.textContent = `${hh}:${mm}`;
  },

  updateLocation(key) {
    this.els.locationDisplay.textContent = I18N.t(key || 'location_downtown');
  },

  setVehicleHud(show, name) {
    this.els.vehicleHud.classList.toggle('hidden', !show);
    if (name) this.els.vehicleName.textContent = name;
  },

  updateSpeed(s) {
    this.els.speedDisplay.textContent = Math.round(s * 3.6);
  },

  setAiming(armed, aiming) {
    if (!this.els.crosshair) return;
    this.els.crosshair.classList.toggle('hidden', !armed);
    this.els.crosshair.classList.toggle('aiming', !!aiming);
  },

  /* ---------- transient ---------- */
  notify(text, cls = '') {
    const n = document.createElement('div');
    n.className = 'notif ' + cls;
    n.textContent = text;
    this.els.notifications.appendChild(n);
    setTimeout(() => {
      n.style.opacity = '0';
      n.style.transition = 'opacity 0.5s';
      setTimeout(() => n.remove(), 500);
    }, 4000);
    while (this.els.notifications.children.length > 4) this.els.notifications.removeChild(this.els.notifications.firstChild);
  },

  showCenterMsg(text, dur = 2.2) {
    this.els.centerMsg.textContent = text;
    this.els.centerMsg.style.opacity = 1;
    clearTimeout(this.centerMsgT);
    this.centerMsgT = setTimeout(() => { this.els.centerMsg.style.opacity = 0; }, dur * 1000);
  },

  showSubtitle(text, dur = 3.5) {
    this.els.subtitle.textContent = text;
    this.els.subtitle.style.opacity = 1;
    clearTimeout(this.subT);
    this.subT = setTimeout(() => { this.els.subtitle.style.opacity = 0; }, dur * 1000);
  },

  setContextHint(text) {
    if (text) {
      this.els.contextHint.innerHTML = text;
      this.els.contextHint.classList.remove('hidden');
    } else {
      this.els.contextHint.classList.add('hidden');
    }
  },

  flashDamage() {
    this.damageFlashT = 0.25;
  },

  missionCompleteModal(m, total) {
    this.els.completeTitle.textContent = I18N.t('missionComplete');
    this.els.completeReward.textContent = '+ $' + formatMoney(total);
    this.els.completeStats.innerHTML =
      `<div>${I18N.t('missionsDone')}: ${GAME.stats.missionsCompleted} / 200</div>` +
      `<div>${I18N.t('kills')}: ${GAME.stats.kills}</div>` +
      `<div>${I18N.t('moneyEarned')}: $${formatMoney(GAME.money)}</div>`;
    this.els.completeModal.classList.remove('hidden');
    Input.exitPointerLock();
  },

  hideCompleteModal() {
    this.els.completeModal.classList.add('hidden');
  },

  showGameOver() {
    this.els.gameoverModal.classList.remove('hidden');
  },
  hideGameOver() {
    this.els.gameoverModal.classList.add('hidden');
  },

  showFail(text) {
    this.showCenterMsg(text, 3);
  },

  /* ---------- navigation marker (arrow + distance to active objective) ---------- */
  updateNav() {
    const el = this.els.navMarker;
    if (!el) return;
    const t = MissionManager.getNavTarget();
    if (!t) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const p = World.player;
    const ang = p.inVehicle ? p.inVehicle.heading : p.yaw;
    const targetAng = Math.atan2(t.x - p.x, t.z - p.z);
    const diff = ((targetAng - ang) * 180 / Math.PI + 540) % 360 - 180;
    const arrow = this.els.navArrow;
    arrow.style.transform = 'rotate(' + diff + 'deg)';
    const d = Math.max(1, Math.round(Math.sqrt((t.x - p.x) * (t.x - p.x) + (t.z - p.z) * (t.z - p.z))));
    this.els.navDistance.textContent = d + ' m';
    if (d < 12) {
      arrow.classList.add('flash');
      arrow.textContent = '▼';
    } else {
      arrow.classList.remove('flash');
      arrow.textContent = '▲';
    }
  },

  /* ---------- per-frame damage flash ---------- */
  update(dt) {
    if (this.damageFlashT > 0) {
      this.damageFlashT -= dt;
    }
  }
};
