/**
 * Modelos ternarios esquemáticos para el Laboratorio de Diagramas de Fase.
 * No son datos CALPHAD ni representan un sistema químico real.
 */
export const TEMPERATURE_MIN = 300;
export const TEMPERATURE_MAX = 1600;
export const TEMPERATURE_SPAN = TEMPERATURE_MAX - TEMPERATURE_MIN;
export const VOLUME_HEIGHT = 2.55;

export const TERNARY_MODELS = {
  complete: {
    label: 'Solubilidad sólida completa',
    shortLabel: 'Completa',
    baseLiquidus: 1320,
    mushyRange: 220,
    description: 'Una solución sólida continua α. El modelo muestra los campos L, L + α y α.',
    note: 'En este esquema los tres componentes se representan con una única solución sólida terminal α.'
  },
  partial: {
    label: 'Solubilidad sólida parcial',
    shortLabel: 'Parcial',
    baseLiquidus: 1260,
    mushyRange: 165,
    description: 'Soluciones sólidas terminales α, β y γ con regiones de coexistencia entre ellas.',
    note: 'Las regiones sólidas se simplifican en campos monofásicos terminales y campos bifásicos o trifásicos.'
  },
  limited: {
    label: 'Solubilidad sólida muy limitada',
    shortLabel: 'Muy limitada',
    baseLiquidus: 1190,
    mushyRange: 130,
    description: 'Campos terminales estrechos y regiones multifásicas amplias, con solubilidad mutua reducida.',
    note: 'El esquema acentúa la separación entre soluciones terminales y las regiones de coexistencia.'
  }
};

export const PHASE_COLORS = {
  L: '#e8b96f',
  α: '#4294a4',
  β: '#9279bd',
  γ: '#c27b54',
  'α+β': '#7889b0',
  'α+γ': '#8d987c',
  'β+γ': '#b28a8d',
  'α+β+γ': '#8d829c',
  'L+α': '#b8a47a',
  'L+β': '#b9a17f',
  'L+γ': '#c49a70',
  'L+α+β': '#ad9c91',
  'L+α+γ': '#b6a080',
  'L+β+γ': '#b89a84',
  'L+α+β+γ': '#b09b81'
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeComposition(a, b, c) {
  const values = [Math.max(0, Number(a) || 0), Math.max(0, Number(b) || 0), Math.max(0, Number(c) || 0)];
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => value / total);
}

export function liquidusTemperature(modelId, composition) {
  const model = TERNARY_MODELS[modelId] ?? TERNARY_MODELS.partial;
  const [a, b, c] = normalizeComposition(...composition);
  // Inclinación ilustrativa para que la superficie no sea horizontal.
  const compositionOffset = 105 * (a - b) + 38 * (b - c) + 28 * (a * c - 1 / 9);
  return clamp(model.baseLiquidus + compositionOffset, 850, 1510);
}

export function solidusTemperature(modelId, composition) {
  const model = TERNARY_MODELS[modelId] ?? TERNARY_MODELS.partial;
  return liquidusTemperature(modelId, composition) - model.mushyRange;
}

export function terminalSolvusThreshold(modelId, temperature) {
  const hotness = clamp((temperature - TEMPERATURE_MIN) / TEMPERATURE_SPAN, 0, 1);
  if (modelId === 'partial') return 0.66 - 0.11 * hotness;
  if (modelId === 'limited') return 0.88 - 0.09 * hotness;
  return null;
}

function solidPhaseSet(modelId, composition, temperature) {
  if (modelId === 'complete') return ['α'];

  const [a, b, c] = normalizeComposition(...composition);
  const values = [a, b, c];
  const labels = ['α', 'β', 'γ'];
  const sorted = values.map((value, index) => ({ value, label: labels[index] })).sort((x, y) => y.value - x.value);

  if (modelId === 'partial') {
    const terminalLimit = terminalSolvusThreshold(modelId, temperature);
    if (sorted[0].value >= terminalLimit) return [sorted[0].label];
    if (sorted[2].value < 0.16) return sorted.slice(0, 2).map((item) => item.label).sort((x, y) => ['α', 'β', 'γ'].indexOf(x) - ['α', 'β', 'γ'].indexOf(y));
    return ['α', 'β', 'γ'];
  }

  const terminalLimit = terminalSolvusThreshold(modelId, temperature);
  if (sorted[0].value >= terminalLimit) return [sorted[0].label];
  if (sorted[2].value < 0.10) return sorted.slice(0, 2).map((item) => item.label).sort((x, y) => ['α', 'β', 'γ'].indexOf(x) - ['α', 'β', 'γ'].indexOf(y));
  return ['α', 'β', 'γ'];
}

export function phaseState(modelId, composition, temperature) {
  const safeComposition = normalizeComposition(...composition);
  const liquidus = liquidusTemperature(modelId, safeComposition);
  const solidus = solidusTemperature(modelId, safeComposition);
  const solidFraction = clamp((liquidus - temperature) / (liquidus - solidus), 0, 1);
  const liquidFraction = 1 - solidFraction;
  const solidPhases = solidPhaseSet(modelId, safeComposition, temperature);

  let phases;
  if (temperature >= liquidus) phases = ['L'];
  else if (temperature > solidus) phases = ['L', ...solidPhases];
  else phases = [...solidPhases];

  const phaseLabel = phases.join(' + ');
  let regionDescription;
  if (solidFraction <= 0) {
    regionDescription = 'Líquido: la temperatura está por encima de la superficie liquidus para esta composición.';
  } else if (solidFraction >= 1) {
    regionDescription = 'Sólido: se ha atravesado la superficie solidus. Las fases mostradas corresponden al esquema genérico seleccionado.';
  } else {
    regionDescription = 'Intervalo de solidificación: coexisten líquido y sólido. La fracción sólida se interpola de forma didáctica entre las superficies liquidus y solidus.';
  }

  return {
    composition: safeComposition,
    temperature,
    liquidus,
    solidus,
    solidFraction,
    liquidFraction,
    solidPhases,
    phases,
    phaseLabel,
    regionDescription,
    isMushy: solidFraction > 0 && solidFraction < 1
  };
}

export function phaseColor(modelId, composition, temperature) {
  const state = phaseState(modelId, composition, temperature);
  if (state.phases.length === 1 && state.phases[0] === 'L') return PHASE_COLORS.L;
  const solids = state.solidPhases;
  if (state.solidFraction >= 1) return PHASE_COLORS[solids.join('+')] ?? PHASE_COLORS[solids[0]];
  const key = ['L', ...solids].join('+');
  return PHASE_COLORS[key] ?? '#b49a7e';
}

export function compositionToWorld(composition, normalizedTemperature = 0) {
  const [a, b, c] = normalizeComposition(...composition);
  return {
    x: -a + b,
    y: clamp(normalizedTemperature, 0, 1) * VOLUME_HEIGHT,
    z: -0.58 * (a + b) + 1.16 * c
  };
}

export function temperatureToHeight(temperature) {
  return clamp((temperature - TEMPERATURE_MIN) / TEMPERATURE_SPAN, 0, 1);
}

export function sampleTriangle(subdivisions, callback) {
  const n = Math.max(2, Math.floor(subdivisions));
  const triangles = [];
  const compositionAt = (i, j) => normalizeComposition(n - i - j, i, j);

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n - i; j += 1) {
      const p1 = compositionAt(i, j);
      const p2 = compositionAt(i + 1, j);
      const p3 = compositionAt(i, j + 1);
      triangles.push(callback([p1, p2, p3]));

      if (i + j < n - 1) {
        const p4 = compositionAt(i + 1, j + 1);
        triangles.push(callback([p2, p4, p3]));
      }
    }
  }
  return triangles;
}
