/* ===== Golden Shadow — Mission Manager ===== */
const MissionManager = {
  all: [],
  byId: {},
  completed: {},
  active: null,
  markers: [],
  activeEnemies: [],
  activeVehicles: [],
  objectiveStates: [],
  onCompleteCb: null,

  init() {
    this.all = STORY_MISSIONS.concat(RACING_MISSIONS, DELIVERY_MISSIONS, COMBAT_MISSIONS, HEIST_MISSIONS, COLLECT_MISSIONS);
    for (const m of this.all) this.byId[m.id] = m;
  },

  getPlayerLevel() {
    const n = Object.keys(this.completed).length;
    return Math.min(Math.floor(n / 15) + 1, 13);
  },

  isUnlocked(m) {
    if (!m.requires || this.completed[m.requires]) {
      return this.getPlayerLevel() >= m.level;
    }
    return false;
  },

  getStatus(m) {
    if (this.completed[m.id]) return 'completed';
    if (this.active && this.active.id === m.id) return 'active';
    return this.isUnlocked(m) ? 'unlocked' : 'locked';
  },

  progress() {
    return Object.keys(this.completed).length + ' / ' + this.all.length;
  },

  /* ---------- starting & stopping ---------- */
  start(id) {
    const m = this.byId[id];
    if (!m || this.active) return false;
    if (this.completed[id]) return false;
    if (!this.isUnlocked(m)) return false;
    this.cleanupActive();
    this.active = m;
    this.objectiveStates = [];
    m._rt = {
      collected: 0,
      collectedTotal: 0,
      killed: 0,
      destroyed: 0,
      checkpointsPassed: 0,
      phase: 0,
      surviveT: 0,
      spawnT: 0,
      startedAt: performance.now()
    };
    for (const spec of m.objs) {
      this.objectiveStates.push(this.expandObjective(spec, m));
    }
    // initial markers
    this.refreshMarkers();
    if (HUD) {
      HUD.setMission(m);
      HUD.notify(I18N.t('missionAccept') + ': ' + m.title[GAME.lang], 'success');
      AudioMgr.success();
    }
    return true;
  },

  stopActive() {
    this.cleanupActive();
    this.active = null;
    this.objectiveStates = [];
    if (HUD) HUD.clearMission();
  },

  cleanupActive() {
    for (const e of this.activeEnemies) e.remove();
    this.activeEnemies = [];
    for (const v of this.activeVehicles) {
      if (v.alive) VehicleManager.remove(v);
    }
    this.activeVehicles = [];
    PickupManager.clearMissionItems();
    this.markers = [];
  },

  /* ---------- objective expansion ---------- */
  expandObjective(spec, m) {
    const type = spec[0];
    const base = {
      type,
      done: false,
      failed: false,
      labelKey: 'objective_' + type,
      progress: 0,
      total: 1
    };
    switch (type) {
      case 'goto': {
        const loc = spec[1];
        const p = City.locationPos(loc);
        base.targetPos = p;
        base.locKey = loc;
        return base;
      }
      case 'kill': {
        const count = spec[1], loc = spec[2], enemyType = spec[3];
        const p = City.locationPos(loc);
        base.total = count;
        base.targetPos = p;
        base.locKey = loc;
        base.enemyType = enemyType;
        for (let i = 0; i < count; i++) {
          const ang = rand(0, Math.PI * 2);
          const r = rand(12, 26);
          const x = clamp(p.x + Math.sin(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
          const z = clamp(p.z + Math.cos(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
          const e = NPCSpawner.spawnEnemy(x, z, {
            enemyType,
            weaponKind: enemyType === 'merc' || enemyType === 'cartel' ? 'rifle' : (Math.random() < 0.5 ? 'pistol' : 'smg'),
            damage: randi(7, 12),
            aggro: 60,
            missionOwned: true
          });
          e.missionId = m.id;
          this.activeEnemies.push(e);
        }
        return base;
      }
      case 'collect':
      case 'find': {
        const count = spec[1], loc = spec[2];
        const p = City.locationPos(loc);
        base.total = count;
        base.targetPos = p;
        base.locKey = loc;
        base._packages = [];
        for (let i = 0; i < count; i++) {
          const ang = rand(0, Math.PI * 2);
          const r = rand(10, 22);
          const x = clamp(p.x + Math.sin(ang) * r, City.bounds.min + 10, City.bounds.max - 10);
          const z = clamp(p.z + Math.cos(ang) * r, City.bounds.min + 10, City.bounds.max - 10);
          base._packages.push({ x, z, taken: false });
        }
        return base;
      }
      case 'deliver': {
        const from = spec[1], to = spec[2];
        const fp = City.locationPos(from), tp = City.locationPos(to);
        base.total = 3;
        base.phase = 0;
        base.fromPos = fp;
        base.toPos = tp;
        base.fromLoc = from;
        base.toLoc = to;
        PickupManager.addPackage(fp.x, fp.z, m.id);
        return base;
      }
      case 'race': {
        const locs = spec[1];
        base.total = locs.length;
        base.checkpoints = locs.map(l => City.locationPos(l));
        base.checkpointIndex = 0;
        // compute time limit
        let dist = 0;
        for (let i = 0; i < locs.length - 1; i++) {
          dist += dist2(base.checkpoints[i].x, base.checkpoints[i].z, base.checkpoints[i + 1].x, base.checkpoints[i + 1].z);
        }
        base.timeLimit = dist / 24 + 40;
        base.timeLeft = base.timeLimit;
        for (let i = 0; i < base.checkpoints.length; i++) {
          const cp = base.checkpoints[i];
          PickupManager.addCheckpoint(cp.x, cp.z, i);
        }
        return base;
      }
      case 'steal': {
        const vehType = spec[1], loc = spec[2], to = spec[3];
        const p = City.locationPos(loc), tp = City.locationPos(to);
        base.phase = 0;
        base.total = 2;
        base.targetPos = p;
        base.toPos = tp;
        base.vehType = vehType;
        const v = VehicleManager.spawn(vehType, p.x, p.z, rand(0, Math.PI * 2), { ai: false });
        v.missionTarget = true;
        v.missionId = m.id;
        this.activeVehicles.push(v);
        return base;
      }
      case 'survive': {
        const sec = spec[1], loc = spec[2], n = spec[3];
        const p = City.locationPos(loc);
        base.total = sec;
        base.timeLeft = sec;
        base.surviveSec = sec;
        base.spawnCount = n;
        base.targetPos = p;
        base.locKey = loc;
        base.spawnT = 0;
        for (let i = 0; i < n; i++) {
          this.spawnSurviveEnemy(p, m);
        }
        return base;
      }
      case 'destroy': {
        const count = spec[1], loc = spec[2];
        const p = City.locationPos(loc);
        base.total = count;
        base.targetPos = p;
        base.locKey = loc;
        for (let i = 0; i < count; i++) {
          const ang = rand(0, Math.PI * 2);
          const r = rand(12, 24);
          const x = clamp(p.x + Math.sin(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
          const z = clamp(p.z + Math.cos(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
          const v = VehicleManager.spawn(['truck', 'van'][randi(0, 1)], x, z, rand(0, Math.PI * 2), { ai: false });
          v.missionTarget = true;
          v.missionId = m.id;
          this.activeVehicles.push(v);
        }
        return base;
      }
      case 'bribe': {
        base.total = 1;
        return base;
      }
      case 'photo': {
        const loc = spec[1];
        const p = City.locationPos(loc);
        base.targetPos = p;
        base.locKey = loc;
        return base;
      }
      default:
        return base;
    }
  },

  spawnSurviveEnemy(p, m) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(20, 40);
    const x = clamp(p.x + Math.sin(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
    const z = clamp(p.z + Math.cos(ang) * r, City.bounds.min + 12, City.bounds.max - 12);
    const e = NPCSpawner.spawnEnemy(x, z, {
      enemyType: m.type === 'story' ? 'gang' : ['gang', 'cartel', 'thug'][randi(0, 2)],
      weaponKind: Math.random() < 0.4 ? 'rifle' : (Math.random() < 0.5 ? 'pistol' : 'smg'),
      aggro: 80,
      missionOwned: true
    });
    e.missionId = m.id;
    this.activeEnemies.push(e);
    return e;
  },

  /* ---------- markers ---------- */
  addMarker(x, z, color, kind) {
    PickupManager.addMarker(x, z, color, kind);
    this.markers.push({ x, z, color, kind });
  },

  refreshMarkers() {
    PickupManager.clearMarkers();
    this.markers = [];
    for (const obj of this.objectiveStates) {
      if (obj.done) continue;
      switch (obj.type) {
        case 'goto':
        case 'kill':
        case 'find':
        case 'photo':
        case 'destroy':
          if (obj.targetPos) this.addMarker(obj.targetPos.x, obj.targetPos.z, 0x4f8cff, 'goto');
          break;
        case 'collect':
          for (const p of obj._packages) {
            if (!p.taken) this.addMarker(p.x, p.z, 0xe0a63a, 'pickup');
          }
          break;
        case 'deliver':
          if (obj.phase === 0) {
            this.addMarker(obj.fromPos.x, obj.fromPos.z, 0xe0a63a, 'pickup');
          } else {
            this.addMarker(obj.toPos.x, obj.toPos.z, 0x54c46b, 'deliver');
          }
          break;
        case 'race':
          if (obj.checkpoints[obj.checkpointIndex]) {
            this.addMarker(obj.checkpoints[obj.checkpointIndex].x, obj.checkpoints[obj.checkpointIndex].z, 0x54c46b, 'checkpoint');
          }
          break;
        case 'steal':
          if (obj.phase === 0) {
            this.addMarker(obj.targetPos.x, obj.targetPos.z, 0xd4af37, 'vehicle');
          } else {
            this.addMarker(obj.toPos.x, obj.toPos.z, 0x54c46b, 'deliver');
          }
          break;
        case 'survive':
          if (obj.targetPos) this.addMarker(obj.targetPos.x, obj.targetPos.z, 0xe34b3f, 'target');
          break;
        default:
          break;
      }
    }
  },

  /* ---------- nav target for HUD / minimap ---------- */
  getNavTarget() {
    if (!this.active) return null;
    const states = this.objectiveStates.filter(o => !o.done && !o.failed);
    if (!states.length) return null;
    const obj = states[0];
    let t = null;
    switch (obj.type) {
      case 'goto': case 'kill': case 'find': case 'photo': case 'destroy': case 'survive':
        if (obj.targetPos) t = { x: obj.targetPos.x, z: obj.targetPos.z, kind: obj.type, obj };
        break;
      case 'collect': {
        let best = null, bd = Infinity;
        for (const p of obj._packages) {
          if (p.taken) continue;
          const d = dist2(World.player.x, World.player.z, p.x, p.z);
          if (d < bd) { bd = d; best = p; }
        }
        if (best) t = { x: best.x, z: best.z, kind: 'collect', obj };
        break;
      }
      case 'deliver':
        if (obj.phase === 0) t = { x: obj.fromPos.x, z: obj.fromPos.z, kind: 'deliver', obj };
        else t = { x: obj.toPos.x, z: obj.toPos.z, kind: 'deliver', obj };
        break;
      case 'race':
        if (obj.checkpointIndex < obj.checkpoints.length) {
          t = { x: obj.checkpoints[obj.checkpointIndex].x, z: obj.checkpoints[obj.checkpointIndex].z, kind: 'race', obj };
        }
        break;
      case 'steal':
        if (obj.phase === 0) {
          const v = this.activeVehicles.find(vv => vv.missionTarget);
          if (v) t = { x: v.x, z: v.z, kind: 'steal', obj };
        } else {
          t = { x: obj.toPos.x, z: obj.toPos.z, kind: 'steal', obj };
        }
        break;
      case 'bribe':
        t = null;
        break;
      default: break;
    }
    return t;
  },

  /* ---------- event handlers ---------- */
  onKill(npc) {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done || obj.type !== 'kill' || !npc.missionId || npc.missionId !== this.active.id) continue;
      obj.progress++;
      if (obj.progress >= obj.total) obj.done = true;
      if (HUD) HUD.updateObjectives();
    }
    this.checkComplete();
  },

  onCollect(pickup) {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done) continue;
      if (obj.type === 'collect' || obj.type === 'find') {
        for (const p of obj._packages) {
          if (!p.taken && dist2(p.x, p.z, pickup.x, pickup.z) < 2.5) {
            p.taken = true;
            obj.progress++;
            if (obj.progress >= obj.total) obj.done = true;
            if (HUD) HUD.updateObjectives();
            this.refreshMarkers();
            this.checkComplete();
            return;
          }
        }
      }
      if (obj.type === 'deliver' && obj.phase === 0) {
        if (dist2(obj.fromPos.x, obj.fromPos.z, pickup.x, pickup.z) < 3) {
          obj.phase = 1;
          obj.progress = 1;
          if (HUD) HUD.updateObjectives();
          this.refreshMarkers();
          return;
        }
      }
    }
  },

  onCheckpoint(order) {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done || obj.type !== 'race') continue;
      if (obj.checkpoints[obj.checkpointIndex]) {
        const cp = obj.checkpoints[obj.checkpointIndex];
        if (dist2(cp.x, cp.z, World.player.x, World.player.z) < 8) {
          obj.checkpointIndex++;
          obj.progress = obj.checkpointIndex;
          AudioMgr.pickup();
          if (obj.checkpointIndex >= obj.checkpoints.length) {
            obj.done = true;
            GAME.stats.racesWon++;
          }
          if (HUD) HUD.updateObjectives();
          this.refreshMarkers();
          this.checkComplete();
        }
      }
      break;
    }
  },

  onVehicleEnter(v) {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done || obj.type !== 'steal') continue;
      if (obj.phase === 0 && v.missionTarget) {
        obj.phase = 1;
        obj.progress = 1;
        if (HUD) HUD.updateObjectives();
        this.refreshMarkers();
      }
    }
  },

  onVehicleDestroyed(v) {
    if (!this.active) return;
    if (v.missionTarget) {
      // steal target destroyed = fail
      for (const obj of this.objectiveStates) {
        if (obj.type === 'steal' && !obj.done) {
          this.fail('target');
          return;
        }
      }
    }
    for (const obj of this.objectiveStates) {
      if (obj.done || obj.type !== 'destroy' || !v.missionId || v.missionId !== this.active.id) continue;
      obj.progress++;
      if (obj.progress >= obj.total) obj.done = true;
      if (HUD) HUD.updateObjectives();
    }
    this.checkComplete();
  },

  onBribe() {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done || obj.type !== 'bribe') continue;
      obj.done = true;
      if (HUD) HUD.updateObjectives();
      this.checkComplete();
    }
  },

  onPhoto() {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done || obj.type !== 'photo') continue;
      obj.done = true;
      if (HUD) HUD.updateObjectives();
      this.checkComplete();
    }
  },

  /* ---------- update (race timer, survive, navigation distances) ---------- */
  update(dt) {
    if (!this.active) return;
    const p = World.player;
    for (const obj of this.objectiveStates) {
      if (obj.done) continue;
      // goto / photo proximity
      if (obj.type === 'goto' && obj.targetPos) {
        if (dist2(p.x, p.z, obj.targetPos.x, obj.targetPos.z) < 10) {
          obj.done = true;
          if (HUD) HUD.updateObjectives();
          this.refreshMarkers();
          this.checkComplete();
        }
      }
      if (obj.type === 'photo' && obj.targetPos) {
        if (dist2(p.x, p.z, obj.targetPos.x, obj.targetPos.z) < 8) {
          // wait for E press; set near flag
          obj.near = true;
        } else obj.near = false;
      }
      if (obj.type === 'deliver' && obj.phase === 1) {
        if (dist2(p.x, p.z, obj.toPos.x, obj.toPos.z) < 12) {
          obj.near = true;
        } else obj.near = false;
      }
      if (obj.type === 'steal' && obj.phase === 1) {
        if (dist2(p.x, p.z, obj.toPos.x, obj.toPos.z) < 12) {
          obj.done = true;
          obj.progress = obj.total;
          if (HUD) HUD.updateObjectives();
          this.refreshMarkers();
          this.checkComplete();
        }
      }
      // race timer
      if (obj.type === 'race' && !obj.done) {
        obj.timeLeft -= dt;
        if (obj.timeLeft <= 0) {
          this.fail('timeout');
          return;
        }
        if (HUD && HUD.updateObjectives) HUD.updateObjectives();
      }
      // survive
      if (obj.type === 'survive' && !obj.done) {
        obj.timeLeft -= dt;
        obj.spawnT -= dt;
        if (obj.spawnT <= 0) {
          obj.spawnT = 3;
          const alive = this.activeEnemies.filter(e => e.alive).length;
          if (alive < obj.spawnCount) this.spawnSurviveEnemy(obj.targetPos, this.active);
        }
        if (obj.timeLeft <= 0) {
          obj.done = true;
          if (HUD) HUD.updateObjectives();
          // clear remaining enemies
          for (const e of this.activeEnemies) e.remove();
          this.activeEnemies = [];
          this.checkComplete();
          return;
        }
        if (HUD) HUD.updateObjectives();
      }
      // bribe auto-complete if wanted already 0
      if (obj.type === 'bribe' && !obj.done && !(World.wantedLevel > 0)) {
        obj.done = true;
        if (HUD) HUD.updateObjectives();
        this.checkComplete();
      }
    }
  },

  checkComplete() {
    if (!this.active) return;
    if (this.objectiveStates.every(o => o.done)) {
      this.complete();
    }
  },

  complete() {
    const m = this.active;
    this.completed[m.id] = true;
    GAME.stats.missionsCompleted++;
    GAME.money += m.reward;
    const bonus = Math.floor(m.reward * 0.1);
    GAME.money += bonus;
    if (HUD) {
      HUD.missionCompleteModal(m, m.reward + bonus);
      HUD.updateMoney();
    }
    AudioMgr.success();
    this.cleanupActive();
    this.active = null;
    this.objectiveStates = [];
    if (HUD) HUD.setMission(null);
    Save.save(this.getProfile());
    if (this.onCompleteCb) this.onCompleteCb(m);
  },

  fail(reason) {
    if (!this.active) return;
    const m = this.active;
    if (HUD) {
      const key = reason === 'timeout' ? 'missionFailedTimeout' : reason === 'target' ? 'missionFailedTarget' : 'missionFailedKilled';
      HUD.showFail(I18N.t(key));
    }
    AudioMgr.fail();
    this.cleanupActive();
    this.active = null;
    this.objectiveStates = [];
    if (HUD) HUD.setMission(null);
    World.respawnAfterFail();
  },

  /* ---------- interaction (photo / deliver drop) ---------- */
  getContextHint() {
    if (!this.active) return null;
    for (const obj of this.objectiveStates) {
      if (obj.done) continue;
      if (obj.type === 'photo' && obj.near) return I18N.t('pressPhoto');
      if (obj.type === 'deliver' && obj.phase === 1 && obj.near) return I18N.t('dropPackage');
    }
    return null;
  },

  interact() {
    if (!this.active) return;
    for (const obj of this.objectiveStates) {
      if (obj.done) continue;
      if (obj.type === 'photo' && obj.near) { this.onPhoto(); return; }
      if (obj.type === 'deliver' && obj.phase === 1 && obj.near) {
        obj.done = true;
        obj.progress = obj.total;
        if (HUD) HUD.updateObjectives();
        this.refreshMarkers();
        AudioMgr.cash();
        this.checkComplete();
        return;
      }
    }
  },

  /* ---------- persistence ---------- */
  getProfile() {
    return {
      completed: this.completed,
      stats: GAME.stats,
      money: GAME.money,
      x: World.player ? World.player.x : 0,
      z: World.player ? World.player.z : 0,
      health: World.player ? World.player.health : 100,
      armor: World.player ? World.player.armor : 0,
      time: GAME.time,
      mags: World.player ? World.player.mags : null,
      reserve: World.player ? World.player.reserve : null
    };
  },

  loadProfile(prof) {
    if (!prof) return;
    this.completed = prof.completed || {};
    if (prof.stats) Object.assign(GAME.stats, prof.stats);
    GAME.money = prof.money !== undefined ? prof.money : GAME.money;
    GAME.time = prof.time !== undefined ? prof.time : GAME.time;
    if (World.player) {
      World.player.health = prof.health !== undefined ? prof.health : 100;
      World.player.armor = prof.armor || 0;
      if (prof.mags) Object.assign(World.player.mags, prof.mags);
      if (prof.reserve) Object.assign(World.player.reserve, prof.reserve);
      World.player.setPos(prof.x !== undefined ? prof.x : World.player.x, prof.z !== undefined ? prof.z : World.player.z);
    }
  }
};
