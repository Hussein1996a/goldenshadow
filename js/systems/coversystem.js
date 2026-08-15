/* ===== Golden Shadow — Advanced AI Cover System ===== */
const CoverSystem = {
  findBestCover(enemy, playerPos) {
    if (!City || !City.colliders) return null;
    let best = null;
    let bestScore = Infinity;

    for (const c of City.colliders) {
      const pad = 1.15;
      const candidates = [
        {x:c.minX-pad,z:clamp(playerPos.z,c.minZ-pad,c.maxZ+pad)},
        {x:c.maxX+pad,z:clamp(playerPos.z,c.minZ-pad,c.maxZ+pad)},
        {x:clamp(playerPos.x,c.minX-pad,c.maxX+pad),z:c.minZ-pad},
        {x:clamp(playerPos.x,c.minX-pad,c.maxX+pad),z:c.maxZ+pad}
      ];
      for (const p of candidates) {
        if (!City.isClearPoint(p.x,p.z,0.75)) continue;
        const dE = dist2(enemy.x,enemy.z,p.x,p.z);
        const dP = dist2(p.x,p.z,playerPos.x,playerPos.z);
        if (dE > 55 || dP > 65 || dE < 3) continue;
        // Hard cover: player cannot draw a direct line to the candidate.
        if (!Weapons.isLineBlocked(p,playerPos)) continue;
        const score = dE*0.9 + dP*0.18;
        if (score < bestScore) {
          bestScore = score;
          best = {x:p.x,z:p.z};
        }
      }
    }
    return best;
  },

  hasCover(enemy, playerPos) {
    return !!this.findCoverLine(enemy, playerPos);
  },

  findCoverLine(enemy, playerPos) {
    const p = {x:enemy.x,z:enemy.z};
    if (!Weapons.isLineBlocked(p,playerPos)) return null;
    return p;
  }
};
