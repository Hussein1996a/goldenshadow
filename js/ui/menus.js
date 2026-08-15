/* ===== Golden Shadow — Menus ===== */
const Menus = {
  currentTab: 'all',
  selectedMission: null,
  inMenu: true,

  init() {
    const $ = (id) => document.getElementById(id);

    // Main menu
    $('btn-continue').addEventListener('click', () => {
      const prof = Save.load();
      if (prof) { Game.startGame(prof); }
      else { HUD.notify(I18N.t('noSave'), 'warn'); }
    });
    $('btn-newgame').addEventListener('click', () => this.confirmNewGame());
    $('btn-missions').addEventListener('click', () => this.openMissions(true));
    $('btn-settings').addEventListener('click', () => this.openSettings());
    $('btn-controls').addEventListener('click', () => this.openControls());
    $('btn-lang').addEventListener('click', () => this.toggleLanguage());

    // Pause menu
    $('btn-resume').addEventListener('click', () => Game.togglePause());
    $('btn-pause-missions').addEventListener('click', () => this.openMissions(false));
    $('btn-pause-settings').addEventListener('click', () => this.openSettings());
    $('btn-save').addEventListener('click', () => {
      Save.save(MissionManager.getProfile());
      HUD.notify(I18N.t('saved'), 'success');
    });
    $('btn-quit').addEventListener('click', () => Game.quitToMenu());

    // Submenu closes
    $('btn-missions-close').addEventListener('click', () => this.closeMissions());
    $('btn-settings-close').addEventListener('click', () => this.closeSettings());
    $('btn-controls-close').addEventListener('click', () => this.closeControls());

    // Mission tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.renderMissions();
      });
    });

    $('btn-start-mission').addEventListener('click', () => {
      if (this.selectedMission) this.startSelected();
    });

    // Complete modal
    $('btn-complete-continue').addEventListener('click', () => {
      HUD.hideCompleteModal();
      Game.setPlaying();
    });

    // Game over
    $('btn-gameover-continue').addEventListener('click', () => {
      HUD.hideGameOver();
      Game.respawn();
      Game.setPlaying();
    });

    // Settings
    $('btn-settings-save').addEventListener('click', () => this.saveSettings());

    $('btn-lang').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.toggleLanguage(); });

    this.applyLanguage();
    this.updateMenuStats();
  },

  /* ---------- language ---------- */
  toggleLanguage() {
    GAME.lang = GAME.lang === 'ar' ? 'en' : 'ar';
    I18N.set(GAME.lang);
    Save.saveSettings();
    this.applyLanguage();
    AudioMgr.click();
  },

  applyLanguage() {
    document.documentElement.dir = GAME.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = GAME.lang;
    document.title = GAME.lang === 'ar' ? 'الظل الذهبي — Golden Shadow' : 'Golden Shadow — الظل الذهبي';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = I18N.t(key);
    });
    document.getElementById('btn-lang').textContent = I18N.t('language');
    this.updateMenuStats();
    this.renderMissions();
    this.renderControls();
    if (HUD.activeMission) HUD.updateObjectives();
    if (World.player) HUD.updateWeapon();
  },

  updateMenuStats() {
    const el = document.getElementById('menu-footer-stats');
    const prof = Save.load();
    if (prof) {
      const n = prof.completed ? Object.keys(prof.completed).length : 0;
      el.textContent = `${I18N.t('missionsDone')}: ${n} / 200 • $${formatMoney(prof.money !== undefined ? prof.money : 0)}`;
    } else {
      el.textContent = I18N.t('noSave');
    }
  },

  confirmNewGame() {
    if (confirm(I18N.t('newGameConfirm'))) {
      Game.startGame(null);
    }
  },

  /* ---------- missions browser ---------- */
  openMissions(fromMain) {
    this.fromMain = fromMain;
    document.getElementById('missions-menu').classList.remove('hidden');
    this.renderMissions();
    const first = MissionManager.all.find(m => this.isVisible(m) && MissionManager.isUnlocked(m));
    if (first) this.selectMission(first);
    else if (MissionManager.all.length) this.selectMission(MissionManager.all[0]);
  },

  closeMissions() {
    document.getElementById('missions-menu').classList.add('hidden');
  },

  isVisible(m) {
    if (this.currentTab === 'all') return true;
    return m.type === this.currentTab;
  },

  renderMissions() {
    const list = document.getElementById('missions-list');
    list.innerHTML = '';
    const missions = MissionManager.all.filter(m => this.isVisible(m));
    for (const m of missions) {
      const status = MissionManager.getStatus(m);
      const div = document.createElement('div');
      div.className = 'mission-item ' + (status === 'locked' ? 'locked' : '') + (status === 'completed' ? 'completed' : '');
      if (this.selectedMission && this.selectedMission.id === m.id) div.classList.add('selected');
      div.innerHTML = `
        <div class="mi-title">${m.title[GAME.lang]}</div>
        <div class="mi-meta">
          <span>${I18N.t('level')} ${m.level}</span>
          <span>$ ${formatMoney(m.reward)}</span>
        </div>`;
      div.addEventListener('click', () => this.selectMission(m));
      list.appendChild(div);
    }
  },

  selectMission(m) {
    this.selectedMission = m;
    document.querySelectorAll('.mission-item').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.mission-item').forEach(el => {
      if (el.querySelector('.mi-title').textContent === m.title[GAME.lang]) el.classList.add('selected');
    });
    const status = MissionManager.getStatus(m);
    const d = document.getElementById('mission-detail');
    document.getElementById('md-title').textContent = m.title[GAME.lang];
    document.getElementById('md-desc').textContent = m.desc[GAME.lang];
    document.getElementById('md-reward').textContent = I18N.t('reward') + ': $' + formatMoney(m.reward);
    let statusText = '';
    if (status === 'completed') statusText = '✔ ' + I18N.t('missionCompleted');
    else if (status === 'active') statusText = '▶ ' + I18N.t('missionActive');
    else if (status === 'unlocked') statusText = I18N.t('missionNotStarted');
    else statusText = '🔒 ' + I18N.t('missionLocked');
    document.getElementById('md-status').textContent = statusText;
    const btn = document.getElementById('btn-start-mission');
    btn.classList.toggle('hidden', status === 'completed' || status === 'active');
    btn.disabled = status !== 'unlocked';
    btn.textContent = status === 'locked' ? I18N.t('startMissionDisabled') : I18N.t('startMission');
  },

  startSelected() {
    const m = this.selectedMission;
    if (!m || !MissionManager.isUnlocked(m) || MissionManager.completed[m.id] || MissionManager.active) return;
    this.closeMissions();
    if (!Game.isPlaying()) {
      const prof = Save.load();
      if (prof) Game.startGame(prof, false);
      else Game.startGame(null, false);
    }
    MissionManager.start(m.id);
  },

  /* ---------- settings ---------- */
  openSettings() {
    const s = GAME.settings;
    document.getElementById('set-master').value = Math.round(s.masterVolume * 100);
    document.getElementById('set-sens').value = s.sensitivity;
    document.getElementById('set-fov').value = s.fov;
    document.getElementById('set-quality').value = s.quality;
    document.getElementById('set-daycycle').checked = !!s.dayCycle;
    document.getElementById('set-traffic').checked = !!s.traffic;
    document.getElementById('set-lang').value = GAME.lang;
    document.getElementById('settings-menu').classList.remove('hidden');
  },

  closeSettings() {
    document.getElementById('settings-menu').classList.add('hidden');
  },

  saveSettings() {
    const s = GAME.settings;
    s.masterVolume = document.getElementById('set-master').value / 100;
    s.sensitivity = parseInt(document.getElementById('set-sens').value);
    s.fov = parseInt(document.getElementById('set-fov').value);
    s.quality = document.getElementById('set-quality').value;
    s.dayCycle = document.getElementById('set-daycycle').checked;
    s.traffic = document.getElementById('set-traffic').checked;
    const lang = document.getElementById('set-lang').value;
    if (lang !== GAME.lang) { GAME.lang = lang; I18N.set(lang); }
    Save.saveSettings();
    AudioMgr.setVolume(s.masterVolume);
    Game.applySettings();
    this.applyLanguage();
    this.closeSettings();
    HUD.notify(I18N.t('saved'), 'success');
  },

  /* ---------- controls ---------- */
  openControls() {
    this.renderControls();
    document.getElementById('controls-menu').classList.remove('hidden');
  },
  closeControls() {
    document.getElementById('controls-menu').classList.add('hidden');
  },
  renderControls() {
    const el = document.getElementById('controls-content');
    const rows = I18N.t('controlsBody').split('•');
    let html = '<table>';
    for (const r of rows) {
      const t = r.trim();
      if (!t) continue;
      const idx = t.indexOf(' ');
      const key = t.substring(0, idx);
      const val = t.substring(idx).trim();
      html += `<tr><td>${key}</td><td>${val}</td></tr>`;
    }
    html += '</table><div class="hint">' + I18N.t('controlsCar') + '</div>';
    el.innerHTML = html;
  },

  showMainMenu() {
    this.inMenu = true;
    document.getElementById('main-menu').classList.remove('hidden');
    this.updateMenuStats();
  },
  hideMainMenu() {
    this.inMenu = false;
    document.getElementById('main-menu').classList.add('hidden');
  },

  showPause() {
    document.getElementById('pause-menu').classList.remove('hidden');
  },
  hidePause() {
    document.getElementById('pause-menu').classList.add('hidden');
  }
};
