/* ===== Golden Shadow — Save / Load system ===== */
const Save = {
  KEY: 'golden_shadow_save_v1',
  KEY_SETTINGS: 'golden_shadow_settings_v1',
  KEY_LANG: 'golden_shadow_lang',

  save(profile) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(profile));
    } catch (e) { console.warn('Save failed', e); }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  saveSettings() {
    try {
      localStorage.setItem(this.KEY_SETTINGS, JSON.stringify(GAME.settings));
      localStorage.setItem(this.KEY_LANG, GAME.lang);
    } catch (e) {}
  },

  loadSettings() {
    try {
      const s = localStorage.getItem(this.KEY_SETTINGS);
      if (s) Object.assign(GAME.settings, JSON.parse(s));
      const l = localStorage.getItem(this.KEY_LANG);
      if (l) { GAME.lang = l; I18N.set(l); }
    } catch (e) {}
  }
};
