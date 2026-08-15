/* ===== Golden Shadow — Enterable Building Interiors ===== */
const Interiors = {
  inside: null,

  enter(e) {
    const p = World.player;
    if (!p || p.inVehicle || this.inside) return false;
    // hide exterior box, swap collider for inner walls
    e.mesh.visible = false;
    const idx = City.colliders.indexOf(e.collider);
    if (idx >= 0) City.colliders.splice(idx, 1);
    for (const c of e.innerColliders) City.colliders.push(c);
    e.inner.visible = true;
    this.inside = e;
    p.setPos(e.spawn.x, e.spawn.z);
    AudioMgr.thud();
    if (HUD) HUD.showCenterMsg(I18N.t('enterBuilding'), 1.5);
    return true;
  },

  exit() {
    const e = this.inside;
    if (!e) return;
    const p = World.player;
    e.mesh.visible = true;
    for (const c of e.innerColliders) {
      const i = City.colliders.indexOf(c);
      if (i >= 0) City.colliders.splice(i, 1);
    }
    City.colliders.push(e.collider);
    e.inner.visible = false;
    if (p) p.setPos(e.exitOut.x, e.exitOut.z);
    this.inside = null;
    AudioMgr.thud();
    if (HUD) HUD.showCenterMsg(I18N.t('exitBuilding'), 1.5);
  },

  toggle() {
    if (this.inside) { this.exit(); return true; }
    const p = World.player;
    const e = City.nearestEnterable(p.x, p.z, 5);
    if (e) { this.enter(e); return true; }
    return false;
  },

  getContextHint() {
    const p = World.player;
    if (!p) return null;
    if (this.inside) return I18N.t('exitBuildingHint');
    const e = City.nearestEnterable(p.x, p.z, 5);
    return e ? I18N.t('enterBuildingHint') : null;
  }
};
