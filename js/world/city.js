/* ===== Golden Shadow — Procedural City ===== */
const City = {
  scene: null,
  colliders: [],          // {minX, minZ, maxX, maxZ}
  bounds: { min: -312, max: 312 },
  blockCenters: [],
  cellLocations: {},      // key "gx,gz" -> location name
  LOCATION_KEYS: {},
  lampMeshes: null,
  buildingCount: 0,
  enterables: [],
  containers: [],
  trafficNodes: [],

  init(scene) {
    this.scene = scene;
    this.buildColliders();
    this.buildGround();
    this.buildBlocks();
    this.buildProps();
    this.buildSky();
    this.buildLights();
    this.computeLocationMap();
  },

  totalSize() {
    const { blocks, blockSize, roadWidth } = GAME.city;
    return blocks * blockSize + (blocks + 1) * roadWidth;
  },

  blockCenter(i) {
    const { blocks, blockSize, roadWidth } = GAME.city;
    const half = this.totalSize() / 2;
    return -half + roadWidth + i * (blockSize + roadWidth) + blockSize / 2;
  },

  roadCenterX(i) {
    const { blocks, blockSize, roadWidth } = GAME.city;
    const half = this.totalSize() / 2;
    return -half + roadWidth + i * (blockSize + roadWidth) + blockSize + roadWidth / 2;
  },

  /* ---------- Colliders (buildings as AABB) ---------- */
  buildColliders() {
    // City boundary walls only. Individual buildings add their own colliders,
    // so players can walk on the sidewalk and reach building doors.
    this.colliders = [];
    const b = this.bounds;
    const T = 6;
    this.colliders.push(
      { minX: b.min - T, minZ: b.min - T, maxX: b.max + T, maxZ: b.min },
      { minX: b.min - T, minZ: b.max, maxX: b.max + T, maxZ: b.max + T },
      { minX: b.min - T, minZ: b.min - T, maxX: b.min, maxZ: b.max + T },
      { minX: b.max, minZ: b.min - T, maxX: b.max + T, maxZ: b.max + T }
    );
  },

  /* ---------- Ground texture (single draw call) ---------- */
  buildGround() {
    const { blocks, blockSize, roadWidth } = GAME.city;
    const size = this.totalSize();
    const TEX = 2048;
    const c = document.createElement('canvas');
    c.width = c.height = TEX;
    const ctx = c.getContext('2d');
    const px = (world) => ((world + size / 2) / size) * TEX;

    // base (lot color)
    ctx.fillStyle = '#3c3f45';
    ctx.fillRect(0, 0, TEX, TEX);

    // sidewalk strips around each block
    const sw = 9;
    for (let gx = 0; gx < blocks; gx++) {
      for (let gz = 0; gz < blocks; gz++) {
        const cx = this.blockCenter(gx), cz = this.blockCenter(gz);
        const h = blockSize / 2;
        ctx.fillStyle = '#b7b3ab';
        ctx.fillRect(px(cx - h), px(cz - h), px(cx + h) - px(cx - h), px(cz + h) - px(cz - h));
        ctx.fillStyle = '#8f8b85';
        ctx.fillRect(px(cx - h + sw), px(cz - h + sw), px(cx + h - sw) - px(cx - h + sw), px(cz + h - sw) - px(cz - h + sw));
      }
    }

    // roads (horizontal & vertical lanes between blocks)
    ctx.fillStyle = '#2a2b30';
    for (let i = 0; i <= blocks; i++) {
      const rc = this.roadCenterX(i);
      const rw = roadWidth;
      ctx.fillRect(0, px(rc - rw / 2), TEX, px(rc + rw / 2) - px(rc - rw / 2));
      ctx.fillRect(px(rc - rw / 2), 0, px(rc + rw / 2) - px(rc - rw / 2), TEX);
    }

    // lane markings (dashed yellow center lines)
    ctx.strokeStyle = '#d8b64c';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([10, 14]);
    for (let i = 0; i < blocks; i++) {
      const rc = this.roadCenterX(i);
      ctx.beginPath(); ctx.moveTo(0, px(rc)); ctx.lineTo(TEX, px(rc)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(rc), 0); ctx.lineTo(px(rc), TEX); ctx.stroke();
    }
    ctx.setLineDash([]);

    // crosswalk zebra stripes at every road intersection
    ctx.fillStyle = 'rgba(220,220,215,0.55)';
    for (let i = 0; i <= blocks; i++) {
      for (let j = 0; j <= blocks; j++) {
        const cx = this.roadCenterX(i), cz = this.roadCenterX(j);
        const half = roadWidth / 2;
        const stripeW = 1.6, gap = 1.6, count = Math.floor((roadWidth - 6) / (stripeW + gap));
        // stripes on the north & south approach (crossing the vertical road)
        for (let s = 0; s < count; s++) {
          const off = -((count - 1) * (stripeW + gap)) / 2 + s * (stripeW + gap);
          const y0 = cz - half + 2.4, y1 = cz - half + 5.4;
          ctx.fillRect(px(cx + off - stripeW / 2), px(y0), px(cx + off + stripeW / 2) - px(cx + off - stripeW / 2), px(y1) - px(y0));
          const y2 = cz + half - 5.4, y3 = cz + half - 2.4;
          ctx.fillRect(px(cx + off - stripeW / 2), px(y2), px(cx + off + stripeW / 2) - px(cx + off - stripeW / 2), px(y3) - px(y2));
        }
        // stripes on the east & west approach (crossing the horizontal road)
        for (let s = 0; s < count; s++) {
          const off = -((count - 1) * (stripeW + gap)) / 2 + s * (stripeW + gap);
          const x0 = cx - half + 2.4, x1 = cx - half + 5.4;
          ctx.fillRect(px(x0), px(cz + off - stripeW / 2), px(x1) - px(x0), px(cz + off + stripeW / 2) - px(cz + off - stripeW / 2));
          const x2 = cx + half - 5.4, x3 = cx + half - 2.4;
          ctx.fillRect(px(x2), px(cz + off - stripeW / 2), px(x3) - px(x2), px(cz + off + stripeW / 2) - px(cz + off - stripeW / 2));
        }
      }
    }

    // edge borders
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, TEX, TEX);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);
  },

  /* ---------- Buildings & special zones ---------- */
  makeWindowTexture(baseColor, tint) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 256);
    const cols = 4, rows = 12;
    const cw = 128 / cols, ch = 256 / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const lit = Math.random() < 0.35;
        ctx.fillStyle = lit ? '#f7e7a8' : '#1a1e28';
        if (lit) { ctx.fillStyle = Math.random() < 0.5 ? '#ffe9b0' : '#cfd6e4'; }
        ctx.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
        if (lit) {
          ctx.fillStyle = 'rgba(255,230,150,0.25)';
          ctx.fillRect(i * cw + 3, j * ch + 3, cw - 6, 2);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tint ? 2 : 1, tint ? 4 : 2);
    return tex;
  },

  addBox(x, y, z, w, h, d, mat, { collider = true, skipCollider = false } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (collider && !skipCollider) {
      this.colliders.push({ minX: x - w / 2, minZ: z - d / 2, maxX: x + w / 2, maxZ: z + d / 2 });
    }
    return mesh;
  },

  /* ---------- Enterable buildings (with interiors) ---------- */
  addEnterable(x, y, z, w, h, d, mat) {
    const mesh = this.addBox(x, y, z, w, h, d, mat);
    const c = this.colliders[this.colliders.length - 1];
    // door on the +X face of the building (visible recessed doorway)
    const door = { x: x + w / 2 + 1.5, z };
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 3.6, 4.4),
      new THREE.MeshLambertMaterial({ color: 0x1c1712 })
    );
    doorFrame.position.set(x + w / 2 + 0.15, 1.8, z);
    this.scene.add(doorFrame);
    const doorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 4),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.15 })
    );
    doorGlow.position.set(x + w / 2 + 0.3, 2.1, z);
    doorGlow.rotation.y = Math.PI / 2;
    this.scene.add(doorGlow);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.6, 5),
      new THREE.MeshBasicMaterial({ color: 0x11151c })
    );
    sign.position.set(x + w / 2 + 0.25, 5.2, z);
    this.scene.add(sign);
    // build interior shell (hidden until entered)
    const inner = new THREE.Group();
    const inW = Math.max(4, w - 4), inD = Math.max(4, d - 4);
    const inH = Math.min(h + 6, 80);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xbdb8ac });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x9a9488 });
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x8a8478 });
    // floor & ceiling
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(inW, inD), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(x, 0.05, z);
    inner.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(inW, inD), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(x, inH, z);
    inner.add(ceil);
    // walls (colliders recorded, meshes single-sided facing inward)
    const t = 0.8;
    const wGeo = new THREE.PlaneGeometry(inW, inH);
    const wallOpts = { side: THREE.DoubleSide };
    // -X wall
    const m1 = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial(wallOpts));
    m1.position.set(x - inW / 2, inH / 2, z); m1.rotation.y = Math.PI / 2; inner.add(m1);
    // +X wall (has door gap -> split into two segments)
    const segW = (inW / 2) - 2.2;
    for (let s = -1; s <= 1; s += 2) {
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(segW, inH), new THREE.MeshLambertMaterial(wallOpts));
      seg.position.set(x + inW / 2, inH / 2, z + s * (segW / 2 + 2.2));
      seg.rotation.y = -Math.PI / 2; inner.add(seg);
    }
    // -Z wall
    const m2 = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial(wallOpts));
    m2.position.set(x, inH / 2, z - inD / 2); inner.add(m2);
    // +Z wall
    const m3 = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial(wallOpts));
    m3.position.set(x, inH / 2, z + inD / 2); m3.rotation.y = Math.PI; inner.add(m3);
    // inner colliders
    const ic = [
      { minX: x - inW / 2 - t, minZ: z - inD / 2, maxX: x - inW / 2, maxZ: z + inD / 2 },
      { minX: x - inW / 2, minZ: z - inD / 2 - t, maxX: x + inW / 2, maxZ: z - inD / 2 },
      { minX: x - inW / 2, minZ: z + inD / 2, maxX: x + inW / 2, maxZ: z + inD / 2 + t },
      { minX: x + inW / 2, minZ: z - inD / 2 - t, maxX: x + inW / 2 + t, maxZ: z - 2.4 },
      { minX: x + inW / 2, minZ: z + 2.4, maxX: x + inW / 2 + t, maxZ: z + inD / 2 + t }
    ];
    // furniture (simple + realistic feel)
    this.addInteriorFurniture(inner, x, z, inW, inD);
    // warm interior light
    const pl = new THREE.PointLight(0xffe9b0, 0.5, 40);
    pl.position.set(x, inH - 3, z);
    inner.add(pl);
    inner.visible = false;
    this.scene.add(inner);
    this.enterables.push({
      mesh, collider: c, door, inner, innerColliders: ic,
      x, z, w, d, h,
      spawn: { x: x + 1, z },   // inside, just past the door gap
      exitOut: { x: x + w / 2 + 5, z } // outside, in front of the door
    });
    return mesh;
  },

  addInteriorFurniture(group, cx, cz, inW, inD) {
    const fMat = new THREE.MeshLambertMaterial({ color: 0x6b4f3a });
    const fMat2 = new THREE.MeshLambertMaterial({ color: 0x3a3f47 });
    const count = randi(1, 2);
    for (let i = 0; i < count; i++) {
      const bx = cx + rand(-inW * 0.25, inW * 0.25);
      const bz = cz + rand(-inD * 0.25, inD * 0.25);
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), fMat);
      table.position.set(bx, 0.45, bz);
      group.add(table);
      for (let s = -1; s <= 1; s += 2) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), fMat2);
        chair.position.set(bx + s * 1.8, 0.4, bz);
        group.add(chair);
      }
    }
    // shelf against wall
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(inD * 0.4, 1.8, 0.6), fMat2);
    shelf.position.set(cx - inW / 2 + 0.8, 0.9, cz);
    group.add(shelf);
  },

  palette() {
    return [
      { base: '#4a4e57', tint: '#22262e' },
      { base: '#5d6169', tint: '#2c313a' },
      { base: '#6b6558', tint: '#332e26' },
      { base: '#464b56', tint: '#20242c' },
      { base: '#7a756a', tint: '#3a352c' },
      { base: '#58535c', tint: '#2a2730' }
    ];
  },

  buildBlocks() {
    const { blocks, blockSize } = GAME.city;
    const palette = this.palette();
    const CELLS = this.CELLS;

    for (let gx = 0; gx < blocks; gx++) {
      for (let gz = 0; gz < blocks; gz++) {
        const cx = this.blockCenter(gx);
        const cz = this.blockCenter(gz);
        const cellKey = this.cellLocations[`${gx},${gz}`] || 'downtown';
        const special = this.SPECIAL[cellKey];
        if (special) {
          special(this, cx, cz);
          continue;
        }
        const p = palette[(gx * 7 + gz) % palette.length];
        const winTex = this.makeWindowTexture(p.base, true);
        const roofMat = new THREE.MeshLambertMaterial({ color: p.tint });

        const layout = randi(0, 2);
        const h1 = randi(10, 20), h2 = randi(22, 40);
        const inHalf = blockSize / 2 - 10;
        if (layout === 0) {
          // single big building
          const w = randi(22, inHalf * 1.6), d = randi(22, inHalf * 1.6);
          const h = randi(14, 30);
          const bx = cx + rand(-4, 4), bz = cz + rand(-4, 4);
          // roughly 1 in 2 single buildings is enterable
          if (Math.random() < 0.5) {
            this.addEnterable(bx, 0, bz, w, h, d, this.buildingMat(winTex, roofMat));
          } else {
            this.addBox(bx, 0, bz, w, h, d, this.buildingMat(winTex, roofMat));
          }
          this.addBuildingDetails(bx, bz, w, d, h);
          this.buildingCount++;
        } else if (layout === 1) {
          // two buildings
          const w = inHalf - 6, d = (inHalf - 6);
          this.addBox(cx - w / 2 - 2, 0, cz - d / 2 - 2, w, h1, d, this.buildingMat(this.makeWindowTexture(p.base, false), roofMat));
          this.addBox(cx + w / 2 + 2, 0, cz + d / 2 + 2, w, h2, d, this.buildingMat(this.makeWindowTexture(p.base, false), roofMat));
          this.addBuildingDetails(cx - w / 2 - 2, cz - d / 2 - 2, w, d, h1);
          this.addBuildingDetails(cx + w / 2 + 2, cz + d / 2 + 2, w, d, h2);
          this.buildingCount += 2;
        } else {
          // four corner buildings
          const w = (inHalf - 6) / 1.15, d = (inHalf - 6) / 1.15;
          const off = (inHalf) / 2 + 1;
          const hs = [randi(9, 16), randi(12, 22), randi(8, 14), randi(16, 30)];
          const poss = [[cx - off, cz - off], [cx + off, cz - off], [cx - off, cz + off], [cx + off, cz + off]];
          for (let i = 0; i < 4; i++) {
            this.addBox(poss[i][0], 0, poss[i][1], w, hs[i], d, this.buildingMat(this.makeWindowTexture(p.base, false), roofMat));
            this.addBuildingDetails(poss[i][0], poss[i][1], w, d, hs[i]);
            this.buildingCount++;
          }
        }
        this.placeTrees(cx, cz);
      }
    }
    console.log('buildings', this.buildingCount, 'colliders', this.colliders.length);
  },

  buildingMat(winTex, roofMat) {
    // slight roughness variance on facades gives a subtle glass/concrete sheen
    // instead of the flat matte look, without the cost of a full glass shader
    const mat = new THREE.MeshStandardMaterial({ map: winTex, metalness: 0.12, roughness: 0.72 });
    mat.roof = roofMat;
    return mat;
  },

  addBuildingDetails(bx, bz, w, d, h) {
    // rooftop parapet + ac units to make boxes read as buildings
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.6, 1.6, d + 0.6),
      new THREE.MeshLambertMaterial({ color: 0x14161c })
    );
    parapet.position.set(bx, h + 0.8, bz);
    parapet.castShadow = true;
    this.scene.add(parapet);
    const n = randi(1, 3);
    const acMat = new THREE.MeshLambertMaterial({ color: 0x2a2d33 });
    for (let i = 0; i < n; i++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.6), acMat);
      ac.position.set(bx + rand(-w * 0.3, w * 0.3), h + 1.8 + i * 0.2, bz + rand(-d * 0.3, d * 0.3));
      this.scene.add(ac);
    }
    // corner columns for large buildings give depth
    if (w > 26 && d > 26) {
      const colMat = new THREE.MeshLambertMaterial({ color: 0x1a1d24 });
      for (let s1 = -1; s1 <= 1; s1 += 2) {
        for (let s2 = -1; s2 <= 1; s2 += 2) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), colMat);
          col.position.set(bx + s1 * (w / 2 - 1), h / 2, bz + s2 * (d / 2 - 1));
          col.castShadow = true;
          this.scene.add(col);
        }
      }
    }
  },

  placeTrees(cx, cz) {
    if (Math.random() < 0.25) return;
    const n = randi(1, 3);
    for (let i = 0; i < n; i++) {
      const x = cx + rand(-14, 14), z = cz + rand(-14, 14);
      if (this.overlapsBuilding(x, z)) continue;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 2.4),
        new THREE.MeshLambertMaterial({ color: 0x5a4632 })
      );
      trunk.position.set(x, 1.2, z);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(rand(1.6, 2.4), 6, 5),
        new THREE.MeshLambertMaterial({ color: 0x2f6b3a })
      );
      leaf.position.set(x, 3.4, z);
      this.scene.add(trunk); this.scene.add(leaf);
    }
  },

  overlapsBuilding(x, z) {
    for (const c of this.colliders) {
      const half = (c.maxX - c.minX) / 2;
      if (half < 6) continue;
      if (x > c.minX + 2 && x < c.maxX - 2 && z > c.minZ + 2 && z < c.maxZ - 2) return true;
    }
    return false;
  },

  /* ---------- Special zones ---------- */
  SPECIAL: {
    park(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const mat = new THREE.MeshLambertMaterial({ color: 0x2e6b34 });
      ctx.addBox(cx, 0, cz, half * 2, 1.2, half * 2, mat, { skipCollider: false });
      // path
      const path = new THREE.Mesh(new THREE.PlaneGeometry(6, half * 2), new THREE.MeshLambertMaterial({ color: 0x9a9a92 }));
      path.rotation.x = -Math.PI / 2; path.position.set(cx, 1.22, cz);
      ctx.scene.add(path);
      for (let i = 0; i < 6; i++) {
        const x = cx + rand(-half * 0.7, half * 0.7), z = cz + rand(-half * 0.7, half * 0.7);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3), new THREE.MeshLambertMaterial({ color: 0x5a4632 }));
        trunk.position.set(x, 1.5, z);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(rand(2.2, 3), 7, 6), new THREE.MeshLambertMaterial({ color: 0x2f6b3a }));
        leaf.position.set(x, 4.2, z);
        ctx.scene.add(trunk); ctx.scene.add(leaf);
      }
    },
    beach(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const mat = new THREE.MeshLambertMaterial({ color: 0xd8c48a });
      ctx.addBox(cx, 0, cz, half * 2, 1.0, half * 2, mat, { skipCollider: false });
      ctx.placeTrees(cx, cz);
    },
    airport(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const mat = new THREE.MeshLambertMaterial({ color: 0x33343a });
      ctx.addBox(cx, 0, cz, half * 2, 0.8, half * 2, mat, { skipCollider: false });
      // runway stripes
      const line = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.2, 2.4), new THREE.MeshBasicMaterial({ color: 0xf5f5f0 }));
      line.position.set(cx, 1, cz); ctx.scene.add(line);
      const line2 = line.clone(); line2.position.set(cx, 1, cz + 12); ctx.scene.add(line2);
    },
    stadium(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const outer = new THREE.Mesh(
        new THREE.CylinderGeometry(half * 0.8, half * 0.85, 14, 24),
        new THREE.MeshLambertMaterial({ color: 0x4a5568 })
      );
      outer.position.set(cx, 7, cz);
      ctx.scene.add(outer);
      const field = new THREE.Mesh(new THREE.CircleGeometry(half * 0.65, 24), new THREE.MeshLambertMaterial({ color: 0x3e7c46 }));
      field.rotation.x = -Math.PI / 2; field.position.set(cx, 14.1, cz);
      ctx.scene.add(field);
      ctx.colliders.push({ minX: cx - half, minZ: cz - half, maxX: cx + half, maxZ: cz + half });
    },
    tower(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const winTex = ctx.makeWindowTexture('#39404e', true);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(half * 0.8, 95, half * 0.8), new THREE.MeshLambertMaterial({ map: winTex }));
      tower.position.set(cx, 47.5, cz);
      tower.castShadow = true;
      ctx.scene.add(tower);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(4, 14, 6), new THREE.MeshLambertMaterial({ color: 0xd4af37 }));
      spire.position.set(cx, 102, cz);
      ctx.scene.add(spire);
      ctx.colliders.push({ minX: cx - half * 0.4, minZ: cz - half * 0.4, maxX: cx + half * 0.4, maxZ: cz + half * 0.4 });
      this.towerPos = { x: cx, z: cz };
    },
    harbor(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const mat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });
      ctx.addBox(cx, 0, cz, half * 2, 1.2, half * 2, mat, { skipCollider: false });
      // shipping containers
      const cMat = new THREE.MeshLambertMaterial({ color: 0xc7442f });
      const cMat2 = new THREE.MeshLambertMaterial({ color: 0x2f7ac7 });
      for (let i = 0; i < 5; i++) {
        const x = cx + rand(-half * 0.7, half * 0.7), z = cz + rand(-half * 0.7, half * 0.7);
        const m = (i % 2 === 0) ? cMat : cMat2;
        const box = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 3), m);
        box.position.set(x, 2, z);
        ctx.scene.add(box);
      }
    },
    factory(ctx, cx, cz) {
      const half = GAME.city.blockSize / 2 - 9;
      const mat = new THREE.MeshLambertMaterial({ color: 0x6b6b70 });
      ctx.addBox(cx, 0, cz, half * 2, randi(18, 28), half * 2, mat);
      // smokestacks
      for (let i = 0; i < 2; i++) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 20, 10), new THREE.MeshLambertMaterial({ color: 0x8a3b2f }));
        s.position.set(cx + (i === 0 ? -half * 0.5 : half * 0.5), 28, cz);
        ctx.scene.add(s);
      }
    }
  },

  /* ---------- Props (lamps, hydrants, benches) ---------- */
  buildProps() {
    const { blocks, blockSize, roadWidth } = GAME.city;
    const lampPole = new THREE.CylinderGeometry(0.18, 0.24, 6, 6);
    const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
    const lampHead = new THREE.SphereGeometry(0.5, 8, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const lampGeo = new THREE.BufferGeometry();
    const lampCount = blocks * 4 + 4;
    const lampPos = [];
    for (let i = 0; i <= blocks; i++) {
      const rc = this.roadCenterX(i);
      for (let s = -1; s <= 1; s += 2) {
        for (let k = 0; k < blocks; k++) {
          const pc = this.blockCenter(k);
          lampPos.push([rc + s * roadWidth * 0.28, pc + 4]);
          lampPos.push([pc + 4, rc + s * roadWidth * 0.28]);
        }
      }
    }
    const lampGeom = new THREE.BufferGeometry();
    const lp = [];
    for (const p of lampPos) {
      lp.push(new THREE.Vector3(p[0], 0, p[1]));
    }
    this.lamps = lp;
    // InstancedMesh for lamp poles
    const inst = new THREE.InstancedMesh(lampPole, poleMat, lp.length);
    const dummy = new THREE.Object3D();
    lp.forEach((v, i) => {
      dummy.position.copy(v); dummy.position.y = 3;
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.castShadow = true;
    this.scene.add(inst);
    // lamp heads
    const instHead = new THREE.InstancedMesh(lampHead, lampHeadMat, lp.length);
    lp.forEach((v, i) => {
      dummy.position.copy(v); dummy.position.y = 6.1;
      dummy.updateMatrix();
      instHead.setMatrixAt(i, dummy.matrix);
    });
    this.scene.add(instHead);
    this.lampHeadMesh = instHead;
    this.lampHeadMat = lampHeadMat;
    this.lampCount = lp.length;
  },

  /* ---------- Sky, sun, lights ---------- */
  buildSky() {
    const geo = new THREE.SphereGeometry(950, 24, 14);
    this.skyGeo = geo;
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false });
    this.skyMesh = new THREE.Mesh(geo, mat);
    this.skyMesh.renderOrder = -10;
    this.scene.add(this.skyMesh);
    // sun disc
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(50, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false, transparent: true, opacity: 0.9 })
    );
    this.sunMesh = sun;
    this.scene.add(sun);
    this.updateSky(GAME.time);
  },

  updateSky(hour) {
    // compute sky colors
    const day = 0.55;
    let k; // day factor 0..1
    if (hour >= 6 && hour <= 19) k = day;
    else if (hour > 19 && hour < 21) k = lerp(day, 0.06, (hour - 19) / 2);
    else if (hour >= 5 && hour < 6) k = lerp(0.06, day, (hour - 5));
    else k = 0.06;
    const top = new THREE.Color(0x1a2b4a).lerp(new THREE.Color(0x0a0d18), 1 - k);
    const bottom = new THREE.Color(0xffd9a0).lerp(new THREE.Color(0x0a0d18), 1 - k);
    const pos = this.skyGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 950;
      c.copy(bottom).lerp(top, Math.max(0, y));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    this.skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.skyGeo.attributes.color.needsUpdate = true;
    // scene background & fog
    this.scene.background = new THREE.Color().copy(bottom).multiplyScalar(0.7);
    this.scene.fog = new THREE.Fog(
      new THREE.Color().copy(top).multiplyScalar(0.35),
      120, 520 + k * 200
    );
    this.dayFactor = k;
    // sun position
    const ang = ((hour - 6) / 24) * Math.PI * 2;
    const sx = Math.cos(ang) * 700, sy = Math.sin(ang) * 700, sz = -350;
    if (this.sunLight) {
      this.sunLight.position.set(sx, Math.max(80, sy), sz);
      this.sunLight.intensity = 0.5 + k * 0.9;
      this.sunLight.color.setHSL(0.09, 0.7 - k * 0.3, 0.7);
    }
    if (this.sunMesh) {
      this.sunMesh.position.set(sx, Math.max(150, sy), sz);
      this.sunMesh.lookAt(0, 0, 0);
      this.sunMesh.material.opacity = clamp(k * 1.6, 0, 0.95);
    }
    if (this.ambient) this.ambient.intensity = 0.18 + k * 0.55;
    // lamps glow at night
    if (this.lampHeadMat) this.lampHeadMat.color.setScalar(clamp((1 - k) * 4, 0, 1));
  },

  buildLights() {
    this.sunLight = new THREE.DirectionalLight(0xfff0d0, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -350;
    this.sunLight.shadow.camera.right = 350;
    this.sunLight.shadow.camera.top = 350;
    this.sunLight.shadow.camera.bottom = -350;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1500;
    this.scene.add(this.sunLight);
    this.sunLight.target.position.set(0, 0, 0);
    this.scene.add(this.sunLight.target);
    this.ambient = new THREE.AmbientLight(0x8090c0, 0.5);
    this.scene.add(this.ambient);
    const hemi = new THREE.HemisphereLight(0x8899cc, 0x443322, 0.25);
    this.scene.add(hemi);
    this.hemi = hemi;
  },

  /* ---------- Location map ---------- */
  CELLS: {
    '0,0': 'north', '1,0': 'north', '2,0': 'north', '3,0': 'north', '4,0': 'north', '5,0': 'north', '6,0': 'outskirts',
    '0,1': 'slums', '1,1': 'slums', '2,1': 'oldtown', '3,1': 'market', '4,1': 'market', '5,1': 'station', '6,1': 'oldtown',
    '0,2': 'factory', '1,2': 'factory', '2,2': 'garage', '3,2': 'missionrow', '4,2': 'university', '5,2': 'hospital', '6,2': 'industrial',
    '0,3': 'industrial', '1,3': 'industrial', '2,3': 'downtown', '3,3': 'tower', '4,3': 'hotel', '5,3': 'uptown', '6,3': 'uptown',
    '0,4': 'harbor', '1,4': 'dockyard', '2,4': 'downtown', '3,4': 'bank', '4,4': 'casino', '5,4': 'uptown', '6,4': 'hills',
    '0,5': 'harbor', '1,5': 'southside', '2,5': 'southside', '3,5': 'goldst', '4,5': 'club', '5,5': 'strip', '6,5': 'park',
    '0,6': 'beach', '1,6': 'southside', '2,6': 'southside', '3,6': 'stadium', '4,6': 'club', '5,6': 'airport', '6,6': 'airport'
  },

  // aliases -> primary key (some cells host two named spots)
  ALIASES: {
    tower: '3,3', police: '3,2', garage: '2,2', station: '5,1', bridge: '3,2',
    bank: '3,4', casino: '4,4', hotel: '4,3', hospital: '5,2', club: '4,5',
    strip: '5,5', stadium: '3,6', airport: '5,6', beach: '0,6', park: '6,5',
    downtown: '3,3', goldst: '3,5', missionrow: '3,2', university: '4,2',
    industrial: '1,3', harbor: '0,4', southside: '2,5', uptown: '5,3',
    eastside: '6,3', westside: '2,3', north: '3,0', hills: '6,4',
    oldtown: '2,1', market: '3,1', factory: '1,2', dockyard: '1,4',
    slums: '1,1', outskirts: '6,0'
  },

  computeLocationMap() {
    for (const key in this.CELLS) {
      const gx = parseInt(key.split(',')[0]), gz = parseInt(key.split(',')[1]);
      this.LOCATION_KEYS[key] = this.CELLS[key];
    }
  },

  locationPos(name) {
    const key = this.ALIASES[name];
    if (!key) { console.warn('unknown location', name); return { x: 0, z: 0 }; }
    const gx = parseInt(key.split(',')[0]), gz = parseInt(key.split(',')[1]);
    const x = this.blockCenter(gx) + rand(-6, 6);
    const z = this.blockCenter(gz) + rand(-6, 6);
    return { x, z };
  },

  isClearPoint(x, z, pad = 1.2) {
    for (const c of this.colliders) {
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return false;
    }
    return true;
  },

  findClearSpawn(name) {
    const key = this.ALIASES[name];
    const gx = key ? parseInt(key.split(',')[0]) : 3;
    const gz = key ? parseInt(key.split(',')[1]) : 5;
    const cx = this.blockCenter(gx), cz = this.blockCenter(gz);
    const { roadWidth, blockSize } = GAME.city;
    // walk outward along the nearest road lines until a clear point is found
    for (let ring = 0; ring < 8; ring++) {
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * Math.PI * 2;
        const r = ring * 8 + 10;
        const x = clamp(cx + Math.sin(ang) * r, this.bounds.min + roadWidth, this.bounds.max - roadWidth);
        const z = clamp(cz + Math.cos(ang) * r, this.bounds.min + roadWidth, this.bounds.max - roadWidth);
        if (this.isClearPoint(x, z)) return { x, z };
      }
    }
    // fallback: search the road network
    for (let i = 0; i <= 7; i++) {
      const rc = this.roadCenterX(i);
      for (let j = -8; j <= 8; j++) {
        const x = rc + j * 1.5, z = this.bounds.min + roadWidth;
        if (this.isClearPoint(x, z)) return { x, z };
      }
    }
    return { x: cx, z: cz };
  },

  locationKey(name) { return 'location_' + name; },

  locationNameAt(x, z) {
    const { blocks, blockSize } = GAME.city;
    let best = 'downtown', bestD = Infinity;
    for (const key in this.CELLS) {
      const gx = parseInt(key.split(',')[0]), gz = parseInt(key.split(',')[1]);
      const cx = this.blockCenter(gx), cz = this.blockCenter(gz);
      const d = (x - cx) ** 2 + (z - cz) ** 2;
      if (d < bestD) { bestD = d; best = this.CELLS[key]; }
    }
    return 'location_' + best;
  },

  /* ---------- Enterable doors ---------- */
  nearestEnterable(x, z, radius = 5) {
    let best = null, bd = radius * radius;
    for (const e of this.enterables) {
      const dx = e.door.x - x, dz = e.door.z - z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  /* ---------- Collision resolution (circle vs AABB) ---------- */
  resolveCollision(pos, radius) {
    let r = pos;
    for (const c of this.colliders) {
      const cx = clamp(pos.x, c.minX, c.maxX);
      const cz = clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 === 0) {
          // inside AABB, push out along smallest axis
          const left = pos.x - c.minX, right = c.maxX - pos.x;
          const top = pos.z - c.minZ, bottom = c.maxZ - pos.z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) pos.x = c.minX - radius;
          else if (m === right) pos.x = c.maxX + radius;
          else if (m === top) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        } else {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        }
        r = pos;
      }
    }
    // world bounds
    const b = this.bounds;
    pos.x = clamp(pos.x, b.min + 4, b.max - 4);
    pos.z = clamp(pos.z, b.min + 4, b.max - 4);
    return pos;
  },

  isInsideRoadArea(x, z, gap) {
    const { blocks, blockSize, roadWidth } = GAME.city;
    const size = this.totalSize();
    const off = x + size / 2, ofz = z + size / 2;
    for (let i = 0; i <= blocks; i++) {
      const rc = this.roadCenterX(i);
      if (Math.abs(x - rc) < roadWidth / 2 + gap) return true;
      if (Math.abs(z - rc) < roadWidth / 2 + gap) return true;
    }
    return false;
  },

  randomRoadPoint() {
    const { blocks, blockSize, roadWidth } = GAME.city;
    const rc = this.roadCenterX(randi(0, blocks));
    const horizontal = Math.random() < 0.5;
    const along = rand(this.bounds.min + 30, this.bounds.max - 30);
    const off = rand(-roadWidth / 2 + 3, roadWidth / 2 - 3);
    return horizontal ? { x: along, z: rc + off } : { x: rc + off, z: along };
  },

  nearestRoadSegment(x, z) {
    // returns {horizontal, rc} for AI movement
    const { blocks, roadWidth } = GAME.city;
    let best = null, bestD = Infinity;
    for (let i = 0; i <= blocks; i++) {
      const rc = this.roadCenterX(i);
      const dh = Math.abs(z - rc); // horizontal road near x varying
      if (dh < bestD) { bestD = dh; best = { horizontal: true, rc, axis: 'z' }; }
      const dv = Math.abs(x - rc);
      if (dv < bestD) { bestD = dv; best = { horizontal: false, rc, axis: 'x' }; }
    }
    return best;
  }
};
