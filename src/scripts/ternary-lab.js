import {
  TEMPERATURE_MIN,
  TEMPERATURE_MAX,
  TEMPERATURE_SPAN,
  VOLUME_HEIGHT,
  TERNARY_MODELS,
  PHASE_COLORS,
  clamp,
  normalizeComposition,
  liquidusTemperature,
  solidusTemperature,
  phaseState,
  phaseColor,
  terminalSolvusThreshold,
  compositionToWorld,
  temperatureToHeight,
  sampleTriangle
} from './ternary-model.js';

const $ = (id) => document.getElementById(id);

export function initTernaryLab() {
  const root = $('ternary-lab');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const view3d = $('ternary-3d-canvas');
  const sliceCanvas = $('ternary-slice-canvas');
  const microCanvas = $('microstructure-canvas');
  const viewCtx = view3d?.getContext('2d');
  const sliceCtx = sliceCanvas?.getContext('2d');
  const microCtx = microCanvas?.getContext('2d');
  if (!viewCtx || !sliceCtx || !microCtx) return;

  const state = {
    model: 'partial',
    temperature: 1180,
    composition: [0.34, 0.33, 0.33],
    direction: 'cooling',
    speed: 32,
    playing: false,
    lastFrame: 0,
    yaw: -0.62,
    pitch: 0.58,
    zoom: 1,
    showLiquidus: true,
    showSolidus: true,
    showSolvus: true,
    dragging: false,
    lastPointer: null,
    width3d: 760,
    height3d: 510
  };

  const canvasColors = {
    ink: '#e8eff5',
    muted: '#a9bdcc',
    grid: 'rgba(204,222,235,.18)',
    liquidus: 'rgba(239,190,118,.70)',
    solidus: 'rgba(95,184,179,.75)',
    slice: 'rgba(91,154,192,.16)',
    edge: 'rgba(225,237,245,.78)'
  };

  const triangleVertices = [
    { x: -1, y: 0, z: -0.58, name: 'A' },
    { x: 1, y: 0, z: -0.58, name: 'B' },
    { x: 0, y: 0, z: 1.16, name: 'C' }
  ];

  function currentState() {
    return phaseState(state.model, state.composition, state.temperature);
  }

  function resizeCanvas(canvas, ctx, targetHeight) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = targetHeight ?? Math.round(rect.height || 320);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function project(point) {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    const xr = point.x * cy - point.z * sy;
    const zr = point.x * sy + point.z * cy;
    const yr = point.y * cp - zr * sp;
    const depth = point.y * sp + zr * cp;
    const perspective = 1 / (1 + depth * 0.105);
    const baseScale = Math.min(state.width3d * 0.335, state.height3d * 0.68) * state.zoom;
    return {
      x: state.width3d * 0.51 + xr * baseScale * perspective,
      y: state.height3d * 0.56 - yr * baseScale * perspective,
      depth
    };
  }

  function drawPolygon(ctx, points, fill, stroke = null, lineWidth = 1) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function projectedTriangle(tri, getHeight) {
    return tri.map((composition) => project(compositionToWorld(composition, temperatureToHeight(getHeight(composition)))));
  }

  function drawSurface(ctx, modelId, kind) {
    const triangles = sampleTriangle(14, (compositionTri) => {
      const projected = projectedTriangle(compositionTri, (comp) => kind === 'liquidus'
        ? liquidusTemperature(modelId, comp)
        : solidusTemperature(modelId, comp));
      return { points: projected, depth: projected.reduce((sum, p) => sum + p.depth, 0) / 3 };
    });
    triangles.sort((a, b) => a.depth - b.depth);
    const fill = kind === 'liquidus' ? 'rgba(228,174,104,.19)' : 'rgba(76,166,163,.17)';
    const stroke = kind === 'liquidus' ? 'rgba(244,199,139,.25)' : 'rgba(132,211,197,.24)';
    for (const tri of triangles) drawPolygon(ctx, tri.points, fill, stroke, 0.65);

    // Malla de líneas composicionales sobre la superficie.
    const n = 14;
    ctx.beginPath();
    ctx.strokeStyle = kind === 'liquidus' ? 'rgba(245,207,157,.28)' : 'rgba(151,218,206,.24)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i <= n; i += 2) {
      for (let j = 0; j <= n - i; j += 2) {
        const comp = normalizeComposition(n - i - j, i, j);
        const point = project(compositionToWorld(comp, temperatureToHeight(kind === 'liquidus'
          ? liquidusTemperature(modelId, comp)
          : solidusTemperature(modelId, comp))));
        ctx.moveTo(point.x - 2, point.y);
        ctx.lineTo(point.x + 2, point.y);
      }
    }
    ctx.stroke();
  }

  function solvusLineCompositions(phase, threshold) {
    if (phase === 'α') return [[threshold, 1 - threshold, 0], [threshold, 0, 1 - threshold]];
    if (phase === 'β') return [[1 - threshold, threshold, 0], [0, threshold, 1 - threshold]];
    return [[1 - threshold, 0, threshold], [0, 1 - threshold, threshold]];
  }

  function drawSolvusSurfaces(ctx, modelId) {
    if (modelId === 'complete') return;
    const model = TERNARY_MODELS[modelId];
    const endTemperature = model.baseLiquidus - model.mushyRange - 22;
    const levels = 12;
    const phases = [
      { label: 'α', color: 'rgba(86,164,179,.20)' },
      { label: 'β', color: 'rgba(159,132,202,.19)' },
      { label: 'γ', color: 'rgba(207,139,99,.19)' }
    ];

    for (const phase of phases) {
      const bands = [];
      for (let i = 0; i <= levels; i += 1) {
        const temperature = TEMPERATURE_MIN + (endTemperature - TEMPERATURE_MIN) * (i / levels);
        const threshold = terminalSolvusThreshold(modelId, temperature);
        const endpoints = solvusLineCompositions(phase.label, threshold);
        bands.push(endpoints.map((comp) => project(compositionToWorld(comp, temperatureToHeight(temperature)))));
      }
      for (let i = 0; i < bands.length - 1; i += 1) {
        const quad = [bands[i][0], bands[i][1], bands[i + 1][1], bands[i + 1][0]];
        drawPolygon(ctx, quad, phase.color, phase.color.replace(/,\.[0-9]+\)/, ',.58)'), 0.75);
      }
      const mid = bands[Math.floor(bands.length * 0.68)];
      if (mid) {
        const center = { x: (mid[0].x + mid[1].x) / 2, y: (mid[0].y + mid[1].y) / 2 };
        ctx.save();
        ctx.font = '700 9px system-ui, sans-serif';
        ctx.fillStyle = phase.label === 'α' ? '#9ed3dc' : phase.label === 'β' ? '#c5b5e5' : '#e1b18e';
        ctx.fillText(`SOLVUS ${phase.label}`, center.x + 5, center.y - 5);
        ctx.restore();
      }
    }
  }

  function sliceTrianglePoints(temp) {
    const h = temperatureToHeight(temp);
    return triangleVertices.map((vertex) => project({ ...vertex, y: h * VOLUME_HEIGHT }));
  }

  function drawSliceOnVolume(ctx) {
    const h = temperatureToHeight(state.temperature);
    const outline = triangleVertices.map((vertex) => project({ ...vertex, y: h * VOLUME_HEIGHT }));
    drawPolygon(ctx, outline, canvasColors.slice, 'rgba(135,194,225,.9)', 1.5);

    const triangles = sampleTriangle(10, (comps) => {
      const points = comps.map((comp) => project(compositionToWorld(comp, h)));
      const phase = phaseColor(state.model, [
        (comps[0][0] + comps[1][0] + comps[2][0]) / 3,
        (comps[0][1] + comps[1][1] + comps[2][1]) / 3,
        (comps[0][2] + comps[1][2] + comps[2][2]) / 3
      ], state.temperature);
      return { points, phase, depth: points.reduce((sum, p) => sum + p.depth, 0) / 3 };
    });
    triangles.sort((a, b) => a.depth - b.depth);
    for (const tri of triangles) drawPolygon(ctx, tri.points, `${tri.phase}cc`, 'rgba(237,246,250,.20)', 0.55);

    // Borde del plano de corte y marcador de composición seleccionada.
    drawPolygon(ctx, outline, null, 'rgba(212,235,247,.95)', 2.1);
    const selected = project(compositionToWorld(state.composition, h));
    const bottom = project(compositionToWorld(state.composition, 0));
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(244,220,176,.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(selected.x, selected.y); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(selected.x, selected.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff2d6'; ctx.fill(); ctx.strokeStyle = '#815d3e'; ctx.lineWidth = 2; ctx.stroke();
  }

  function draw3D() {
    const dims = resizeCanvas(view3d, viewCtx, 510);
    state.width3d = dims.width;
    state.height3d = dims.height;
    const ctx = viewCtx;
    ctx.clearRect(0, 0, dims.width, dims.height);
    const bg = ctx.createLinearGradient(0, 0, dims.width, dims.height);
    bg.addColorStop(0, '#122a3d');
    bg.addColorStop(1, '#1b3c53');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, dims.width, dims.height);

    // Plano de base y caras transparentes del prisma.
    const bottom = triangleVertices.map((vertex) => project(vertex));
    const top = triangleVertices.map((vertex) => project({ ...vertex, y: VOLUME_HEIGHT }));
    drawPolygon(ctx, [bottom[0], bottom[1], top[1], top[0]], 'rgba(159,190,207,.07)', 'rgba(205,226,237,.18)', 1);
    drawPolygon(ctx, [bottom[1], bottom[2], top[2], top[1]], 'rgba(159,190,207,.05)', 'rgba(205,226,237,.15)', 1);
    drawPolygon(ctx, [bottom[2], bottom[0], top[0], top[2]], 'rgba(159,190,207,.07)', 'rgba(205,226,237,.15)', 1);
    drawPolygon(ctx, bottom, 'rgba(180,203,217,.07)', 'rgba(225,238,245,.42)', 1.2);
    drawPolygon(ctx, top, 'rgba(180,203,217,.025)', 'rgba(225,238,245,.28)', 1);

    // Superficies ilustrativas de liquidus y solidus.
    if (state.showLiquidus) drawSurface(ctx, state.model, 'liquidus');
    if (state.showSolidus) drawSurface(ctx, state.model, 'solidus');
    if (state.showSolvus) drawSolvusSurfaces(ctx, state.model);

    // Plano isotérmico.
    drawSliceOnVolume(ctx);

    // Aristas verticales y ejes de referencia.
    ctx.strokeStyle = canvasColors.edge;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath(); ctx.moveTo(bottom[i].x, bottom[i].y); ctx.lineTo(top[i].x, top[i].y); ctx.stroke();
    }
    drawPolygon(ctx, bottom, null, 'rgba(230,240,246,.86)', 1.4);
    drawPolygon(ctx, top, null, 'rgba(230,240,246,.62)', 1.25);

    // Marcas de temperatura junto a la arista A.
    const axisStart = project(triangleVertices[0]);
    const axisEnd = project({ ...triangleVertices[0], y: VOLUME_HEIGHT });
    ctx.save();
    ctx.strokeStyle = 'rgba(220,233,241,.55)';
    ctx.fillStyle = '#c9d8e2';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (const temp of [300, 600, 900, 1200, 1500]) {
      const p = project({ ...triangleVertices[0], y: temperatureToHeight(temp) * VOLUME_HEIGHT });
      ctx.beginPath(); ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y); ctx.stroke();
      ctx.fillText(`${temp}°`, p.x - 8, p.y + 3);
    }
    ctx.restore();

    // Etiquetas de componentes en la base.
    const labels = [
      { p: bottom[0], name: 'A', dx: -18, dy: 17 },
      { p: bottom[1], name: 'B', dx: 17, dy: 17 },
      { p: bottom[2], name: 'C', dx: 0, dy: -14 }
    ];
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = '#f1f6f9';
    ctx.textAlign = 'center';
    for (const item of labels) ctx.fillText(item.name, item.p.x + item.dx, item.p.y + item.dy);
    ctx.fillStyle = '#b9ccd9';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('T', axisEnd.x - 20, axisEnd.y - 8);

    // Rótulos de las superficies.
    const liqLabel = project(compositionToWorld([0.18, 0.38, 0.44], temperatureToHeight(liquidusTemperature(state.model, [0.18, 0.38, 0.44]))));
    const solLabel = project(compositionToWorld([0.18, 0.38, 0.44], temperatureToHeight(solidusTemperature(state.model, [0.18, 0.38, 0.44]))));
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#f3c98d'; ctx.fillText('LIQUIDUS', liqLabel.x + 7, liqLabel.y - 5);
    ctx.fillStyle = '#9bddd0'; ctx.fillText('SOLIDUS', solLabel.x + 7, solLabel.y + 12);
    ctx.fillStyle = '#d7e3eb';
    ctx.textAlign = 'left';
    ctx.fillText('Arrastra para rotar · rueda para acercar', 15, dims.height - 16);
  }

  function triangleLayout(width, height) {
    const marginX = 34;
    const top = 24;
    const bottom = height - 33;
    const side = Math.min(width - marginX * 2, (bottom - top) * 1.9);
    const left = (width - side) / 2;
    return {
      A: { x: left, y: bottom },
      B: { x: left + side, y: bottom },
      C: { x: left + side / 2, y: top },
      left, top, bottom, side
    };
  }

  function compTo2D(comp, tri) {
    const [a, b, c] = normalizeComposition(...comp);
    return {
      x: a * tri.A.x + b * tri.B.x + c * tri.C.x,
      y: a * tri.A.y + b * tri.B.y + c * tri.C.y
    };
  }

  function barycentricFrom2D(point, tri) {
    const v0 = { x: tri.B.x - tri.A.x, y: tri.B.y - tri.A.y };
    const v1 = { x: tri.C.x - tri.A.x, y: tri.C.y - tri.A.y };
    const v2 = { x: point.x - tri.A.x, y: point.y - tri.A.y };
    const den = v0.x * v1.y - v1.x * v0.y;
    const b = (v2.x * v1.y - v1.x * v2.y) / den;
    const c = (v0.x * v2.y - v2.x * v0.y) / den;
    const a = 1 - b - c;
    if (a < -0.015 || b < -0.015 || c < -0.015) return null;
    return normalizeComposition(Math.max(0, a), Math.max(0, b), Math.max(0, c));
  }

  function draw2DSlice() {
    const dims = resizeCanvas(sliceCanvas, sliceCtx, 320);
    const ctx = sliceCtx;
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#f7fafc'; ctx.fillRect(0, 0, dims.width, dims.height);
    const tri = triangleLayout(dims.width, dims.height);
    const n = 22;
    const p = (i, j) => compTo2D([n - i - j, i, j], tri);

    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n - i; j += 1) {
        const comps1 = [
          normalizeComposition(n - i - j, i, j),
          normalizeComposition(n - i - j - 1, i + 1, j),
          normalizeComposition(n - i - j - 1, i, j + 1)
        ];
        const center1 = normalizeComposition(
          comps1.reduce((sum, c) => sum + c[0], 0),
          comps1.reduce((sum, c) => sum + c[1], 0),
          comps1.reduce((sum, c) => sum + c[2], 0)
        );
        const color1 = phaseColor(state.model, center1, state.temperature);
        drawPolygon(ctx, [p(i, j), p(i + 1, j), p(i, j + 1)], color1, 'rgba(255,255,255,.35)', 0.5);

        if (i + j < n - 1) {
          const comps2 = [
            normalizeComposition(n - i - j - 1, i + 1, j),
            normalizeComposition(n - i - j - 2, i + 1, j + 1),
            normalizeComposition(n - i - j - 1, i, j + 1)
          ];
          const center2 = normalizeComposition(
            comps2.reduce((sum, c) => sum + c[0], 0),
            comps2.reduce((sum, c) => sum + c[1], 0),
            comps2.reduce((sum, c) => sum + c[2], 0)
          );
          drawPolygon(ctx, [p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)], phaseColor(state.model, center2, state.temperature), 'rgba(255,255,255,.35)', 0.5);
        }
      }
    }

    drawPolygon(ctx, [tri.A, tri.B, tri.C], null, '#304e63', 2);
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillStyle = '#233d50';
    ctx.textAlign = 'center';
    ctx.fillText('A', tri.A.x - 10, tri.A.y + 19);
    ctx.fillText('B', tri.B.x + 10, tri.B.y + 19);
    ctx.fillText('C', tri.C.x, tri.C.y - 10);

    const marker = compTo2D(state.composition, tri);
    ctx.beginPath(); ctx.arc(marker.x, marker.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#193b54'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(marker.x, marker.y, 2, 0, Math.PI * 2); ctx.fillStyle = '#193b54'; ctx.fill();

    sliceCanvas._triangle = tri;
    sliceCanvas._dimensions = dims;
  }

  function clipByBisector(poly, site, other) {
    const nx = 2 * (other.x - site.x);
    const ny = 2 * (other.y - site.y);
    const c = other.x * other.x + other.y * other.y - site.x * site.x - site.y * site.y;
    const out = [];
    for (let i = 0; i < poly.length; i += 1) {
      const current = poly[i];
      const previous = poly[(i + poly.length - 1) % poly.length];
      const fc = nx * current.x + ny * current.y - c;
      const fp = nx * previous.x + ny * previous.y - c;
      const currentInside = fc <= 0.0001;
      const previousInside = fp <= 0.0001;
      if (currentInside !== previousInside) {
        const t = fp / (fp - fc);
        out.push({ x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t });
      }
      if (currentInside) out.push(current);
    }
    return out;
  }

  function createSeeds(width, height, count = 66) {
    let seed = 74129;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    return Array.from({ length: count }, () => ({
      x: 9 + rand() * (width - 18),
      y: 9 + rand() * (height - 18),
      phasePick: rand(),
      solidPick: rand()
    }));
  }

  let microCells = null;
  let microSize = '';

  function buildMicroCells(width, height) {
    const seeds = createSeeds(width, height, 66);
    return seeds.map((site) => {
      let polygon = [
        { x: 0, y: 0 }, { x: width, y: 0 },
        { x: width, y: height }, { x: 0, y: height }
      ];
      for (const other of seeds) {
        if (other === site || polygon.length === 0) continue;
        polygon = clipByBisector(polygon, site, other);
      }
      return { ...site, polygon };
    }).filter((site) => site.polygon.length >= 3);
  }

  function drawMicrostructure() {
    const dims = resizeCanvas(microCanvas, microCtx, 250);
    const ctx = microCtx;
    const width = dims.width;
    const height = dims.height;
    const sizeKey = `${width}x${height}`;
    if (!microCells || microSize !== sizeKey) {
      microCells = buildMicroCells(width, height);
      microSize = sizeKey;
    }

    const phase = currentState();
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#e4c48f');
    bg.addColorStop(1, '#d2ad75');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

    const [a, b, c] = state.composition;
    const componentWeight = { α: a, β: b, γ: c };
    const phaseWeights = phase.solidPhases.map((label) => ({ label, weight: Math.max(0.001, componentWeight[label]) }));
    const total = phaseWeights.reduce((sum, item) => sum + item.weight, 0);

    if (phase.solidFraction <= 0.001) {
      // Líquido continuo: no se dibujan límites de grano inexistentes.
      ctx.save();
      ctx.strokeStyle = 'rgba(149,105,54,.22)';
      ctx.lineWidth = 1.15;
      for (let row = 0; row < 5; row += 1) {
        const y = 52 + row * 37;
        ctx.beginPath();
        ctx.moveTo(12, y);
        ctx.bezierCurveTo(width * 0.28, y - 16, width * 0.62, y + 18, width - 12, y - 5);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(76,62,43,.78)';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText('LÍQUIDO', 13, height - 12);
      return;
    }

    microCells.forEach((site) => {
      const polygon = site.polygon;
      const isSolid = site.solidPick < phase.solidFraction;
      if (!isSolid) return; // El fondo continuo representa el líquido residual.
      const pick = site.phasePick * total;
      let cumulative = 0;
      const selected = phaseWeights.find((item) => {
        cumulative += item.weight;
        return pick <= cumulative;
      }) ?? phaseWeights[0];
      const phaseLabel = selected.label;
      let grainColor = PHASE_COLORS[selected.label];
      const variation = (site.phasePick - 0.5) * 18;
      grainColor = adjustColor(grainColor, variation);
      drawPolygon(ctx, polygon, grainColor, 'rgba(43,58,66,.66)', 0.9);

      // Ramificaciones esquemáticas para sugerir crecimiento dendrítico en la zona pastosa.
      if (phase.isMushy && site.phasePick > 0.42) {
        ctx.save();
        drawPolygon(ctx, polygon, null, null);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(site.x, site.y);
        for (let branch = 0; branch < 5; branch += 1) {
          const angle = (Math.PI * 2 * branch) / 5 + site.phasePick * 2;
          const length = 7 + 11 * phase.solidFraction;
          ctx.moveTo(site.x, site.y);
          ctx.lineTo(site.x + Math.cos(angle) * length, site.y + Math.sin(angle) * length);
        }
        ctx.strokeStyle = 'rgba(34,65,81,.40)'; ctx.lineWidth = 1.15; ctx.stroke();
        ctx.restore();
      }
    });

    ctx.fillStyle = 'rgba(21,43,59,.78)';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SECCIÓN MICROESTRUCTURAL ESQUEMÁTICA', 12, 19);
  }

  function adjustColor(hex, amount) {
    const value = hex.replace('#', '');
    const num = parseInt(value, 16);
    const r = clamp((num >> 16) + amount, 0, 255);
    const g = clamp(((num >> 8) & 0x00ff) + amount, 0, 255);
    const b = clamp((num & 0x0000ff) + amount, 0, 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function updateReadouts() {
    const result = currentState();
    $('temperature-output').textContent = `${Math.round(state.temperature)} °C`;
    $('slice-temperature').textContent = `T = ${Math.round(state.temperature)} °C`;
    $('temperature-slider').value = String(Math.round(state.temperature));
    $('composition-a-output').textContent = `${Math.round(state.composition[0] * 100)} %`;
    $('composition-b-output').textContent = `${Math.round(state.composition[1] * 100)} %`;
    $('composition-c-output').textContent = `${Math.round(state.composition[2] * 100)} %`;
    $('composition-a-slider').value = String(Math.round(state.composition[0] * 100));
    $('composition-b-slider').value = String(Math.round(state.composition[1] * 100));
    $('phase-current').textContent = result.phaseLabel;
    $('liquidus-value').textContent = `${Math.round(result.liquidus)} °C`;
    $('solidus-value').textContent = `${Math.round(result.solidus)} °C`;
    $('solid-fraction-value').textContent = `${Math.round(result.solidFraction * 100)} %`;
    $('solid-fraction-bar').style.width = `${result.solidFraction * 100}%`;
    $('phase-explanation').textContent = result.regionDescription;
    $('model-description').textContent = TERNARY_MODELS[state.model].description;
    $('show-solvus').disabled = state.model === 'complete';
    $('show-solvus').closest('label').style.opacity = state.model === 'complete' ? '0.48' : '1';
    $('micro-caption').textContent = result.solidFraction <= 0
      ? 'Estado líquido: no hay granos sólidos; el material se encuentra fundido en el esquema.'
      : result.solidFraction >= 1
        ? `Estado sólido esquemático: ${result.solidPhases.join(' + ')}. La textura representa una sección 2D, no un volumen microestructural 3D.`
        : 'Zona pastosa: los granos ilustrativos crecen al enfriar y se reducen al calentar.';
    $('direction-heating').classList.toggle('is-selected', state.direction === 'heating');
    $('direction-cooling').classList.toggle('is-selected', state.direction === 'cooling');
    $('play-button').textContent = state.playing ? 'Pausar' : (state.direction === 'heating' ? 'Iniciar calentamiento' : 'Iniciar enfriamiento');
    $('play-button').setAttribute('aria-pressed', String(state.playing));
  }

  function renderAll() {
    updateReadouts();
    draw3D();
    draw2DSlice();
    drawMicrostructure();
  }

  function setComposition(a, b, c) {
    state.composition = normalizeComposition(a, b, c);
    renderAll();
  }

  function onCompositionSlider() {
    let a = Number($('composition-a-slider').value) / 100;
    let b = Number($('composition-b-slider').value) / 100;
    if (a + b > 1) {
      if (document.activeElement === $('composition-a-slider')) b = Math.max(0, 1 - a);
      else a = Math.max(0, 1 - b);
    }
    setComposition(a, b, 1 - a - b);
  }

  $('model-select').addEventListener('change', (event) => {
    state.model = event.target.value;
    const liq = liquidusTemperature(state.model, state.composition);
    const sol = solidusTemperature(state.model, state.composition);
    state.temperature = (liq + sol) / 2;
    stopPlayback();
    renderAll();
  });

  $('temperature-slider').addEventListener('input', (event) => {
    state.temperature = Number(event.target.value);
    renderAll();
  });
  $('composition-a-slider').addEventListener('input', onCompositionSlider);
  $('composition-b-slider').addEventListener('input', onCompositionSlider);
  $('show-liquidus').addEventListener('change', (event) => { state.showLiquidus = event.target.checked; draw3D(); });
  $('show-solidus').addEventListener('change', (event) => { state.showSolidus = event.target.checked; draw3D(); });
  $('show-solvus').addEventListener('change', (event) => { state.showSolvus = event.target.checked; draw3D(); });

  $('speed-slider').addEventListener('input', (event) => {
    state.speed = Number(event.target.value);
    $('speed-output').textContent = `${state.speed} °C/s`;
  });

  $('direction-heating').addEventListener('click', () => {
    state.direction = 'heating';
    renderAll();
  });
  $('direction-cooling').addEventListener('click', () => {
    state.direction = 'cooling';
    renderAll();
  });

  let frameHandle = null;
  function stopPlayback() {
    state.playing = false;
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    frameHandle = null;
    state.lastFrame = 0;
    updateReadouts();
  }

  function playbackFrame(timestamp) {
    if (!state.playing) return;
    if (!state.lastFrame) state.lastFrame = timestamp;
    const delta = Math.min((timestamp - state.lastFrame) / 1000, 0.08);
    state.lastFrame = timestamp;
    state.temperature += (state.direction === 'heating' ? 1 : -1) * state.speed * delta;
    if (state.temperature >= TEMPERATURE_MAX || state.temperature <= TEMPERATURE_MIN) {
      state.temperature = clamp(state.temperature, TEMPERATURE_MIN, TEMPERATURE_MAX);
      renderAll();
      stopPlayback();
      return;
    }
    renderAll();
    frameHandle = requestAnimationFrame(playbackFrame);
  }

  $('play-button').addEventListener('click', () => {
    if (state.playing) {
      stopPlayback();
      return;
    }
    state.playing = true;
    state.lastFrame = 0;
    updateReadouts();
    frameHandle = requestAnimationFrame(playbackFrame);
  });

  $('reset-temperature').addEventListener('click', () => {
    stopPlayback();
    const liq = liquidusTemperature(state.model, state.composition);
    const sol = solidusTemperature(state.model, state.composition);
    state.temperature = (liq + sol) / 2;
    renderAll();
  });

  $('reset-view').addEventListener('click', () => {
    state.yaw = -0.62;
    state.pitch = 0.58;
    state.zoom = 1;
    draw3D();
  });

  sliceCanvas.addEventListener('click', (event) => {
    const rect = sliceCanvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const composition = barycentricFrom2D(point, sliceCanvas._triangle ?? triangleLayout(rect.width, rect.height));
    if (composition) setComposition(...composition);
  });

  view3d.addEventListener('pointerdown', (event) => {
    state.dragging = true;
    state.lastPointer = { x: event.clientX, y: event.clientY };
    view3d.setPointerCapture(event.pointerId);
    view3d.classList.add('is-dragging');
  });
  view3d.addEventListener('pointermove', (event) => {
    if (!state.dragging || !state.lastPointer) return;
    const dx = event.clientX - state.lastPointer.x;
    const dy = event.clientY - state.lastPointer.y;
    state.yaw += dx * 0.008;
    state.pitch = clamp(state.pitch + dy * 0.006, 0.18, 1.22);
    state.lastPointer = { x: event.clientX, y: event.clientY };
    draw3D();
  });
  const endDrag = () => {
    state.dragging = false;
    state.lastPointer = null;
    view3d.classList.remove('is-dragging');
  };
  view3d.addEventListener('pointerup', endDrag);
  view3d.addEventListener('pointercancel', endDrag);
  view3d.addEventListener('wheel', (event) => {
    event.preventDefault();
    state.zoom = clamp(state.zoom * (event.deltaY < 0 ? 1.08 : 0.92), 0.66, 1.55);
    draw3D();
  }, { passive: false });

  const resizeObserver = new ResizeObserver(() => renderAll());
  resizeObserver.observe(root);
  window.addEventListener('beforeunload', () => {
    stopPlayback();
    resizeObserver.disconnect();
  }, { once: true });

  // Iniciar en un estado bifásico/pastoso para mostrar la funcionalidad del plano.
  const initialLiquidus = liquidusTemperature(state.model, state.composition);
  state.temperature = initialLiquidus - 72;
  $('temperature-slider').min = String(TEMPERATURE_MIN);
  $('temperature-slider').max = String(TEMPERATURE_MAX);
  $('temperature-slider').value = String(state.temperature);
  $('speed-output').textContent = `${state.speed} °C/s`;
  renderAll();
}
