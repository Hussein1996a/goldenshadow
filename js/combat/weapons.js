/* ===== Golden Shadow — Combat hitscan ===== */
const Weapons = {
  rayRect2D(ox, oz, dx, dz, minX, minZ, maxX, maxZ) {
    let tmin = 0, tmax = Infinity;
    if (Math.abs(dx) < 1e-8) { if (ox < minX || ox > maxX) return null; }
    else {
      let t1 = (minX - ox) / dx, t2 = (maxX - ox) / dx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    if (Math.abs(dz) < 1e-8) { if (oz < minZ || oz > maxZ) return null; }
    else {
      let t1 = (minZ - oz) / dz, t2 = (maxZ - oz) / dz;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    return tmin;
  },

  nearestBuildingT(ox, oz, dx, dz, maxT) {
    let best = Infinity;
    for (const c of City.colliders) {
      const t = this.rayRect2D(ox, oz, dx, dz, c.minX, c.minZ, c.maxX, c.maxZ);
      if (t !== null && t > 0.1 && t < best) best = t;
    }
    return best;
  },

  isLineBlocked(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1e-4) return false;
    const t = this.nearestBuildingT(a.x, a.z, dx / d, dz / d, d);
    return t < d;
  },

  /* Perform a hitscan from origin along dir. source = 'player' | npc id */
  hitScan(origin, dir, range, source) {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(dir.x, dir.y, dir.z),
      0.05, range
    );
    const meshes = [];
    const map = new Map();
    // NPCs (enemies, peds, cops)
    for (const n of World.npcs) {
      if (!n.alive || n === source) continue;
      meshes.push(n.group);
      map.set(n.group, n);
    }
    // vehicles
    for (const v of VehicleManager.list) {
      if (!v.alive) continue;
      meshes.push(v.group);
      map.set(v.group, { vehicle: v, hp: true });
    }
    // player
    if (source !== 'player' && World.player && !World.player.inVehicle) {
      meshes.push(World.player.mesh);
      map.set(World.player.mesh, World.player);
    }
    let nearest = null;
    if (meshes.length) {
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length) nearest = hits[0];
    }
    // building occlusion
    const bt = this.nearestBuildingT(origin.x, origin.z, dir.x, dir.z, range);
    let dist = range;
    if (nearest) dist = nearest.distance;
    let target = null;
    let point = null;
    if (nearest && nearest.distance < bt) {
      // walk up to root group
      let root = nearest.object;
      while (root.parent && root.parent !== World.scene) root = root.parent;
      target = map.get(root);
      point = new THREE.Vector3(nearest.point.x, nearest.point.y, nearest.point.z);
      dist = nearest.distance;
    } else {
      dist = Math.min(bt, range);
    }
    const end = new THREE.Vector3(
      origin.x + dir.x * dist,
      origin.y + dir.y * dist,
      origin.z + dir.z * dist
    );
    return { target, point, end, dist };
  }
};
