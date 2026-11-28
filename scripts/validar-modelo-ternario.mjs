import assert from 'node:assert/strict';
import {
  TERNARY_MODELS,
  normalizeComposition,
  liquidusTemperature,
  solidusTemperature,
  phaseState,
  terminalSolvusThreshold,
  phaseColor,
  sampleTriangle,
  compositionToWorld,
  temperatureToHeight
} from '../src/scripts/ternary-model.js';

const composition = normalizeComposition(34, 33, 33);
assert.ok(Math.abs(composition.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);

for (const modelId of Object.keys(TERNARY_MODELS)) {
  const liquidus = liquidusTemperature(modelId, composition);
  const solidus = solidusTemperature(modelId, composition);
  assert.ok(liquidus > solidus, `${modelId}: liquidus debe ser mayor que solidus`);
  assert.equal(phaseState(modelId, composition, liquidus + 20).solidFraction, 0);
  const mushy = phaseState(modelId, composition, (liquidus + solidus) / 2);
  assert.ok(mushy.solidFraction > 0 && mushy.solidFraction < 1);
  assert.equal(phaseState(modelId, composition, solidus - 20).solidFraction, 1);
  assert.match(phaseColor(modelId, composition, (liquidus + solidus) / 2), /^#[0-9a-f]{6}$/i);
}
assert.equal(terminalSolvusThreshold('complete', 900), null);
assert.ok(terminalSolvusThreshold('partial', 900) > terminalSolvusThreshold('partial', 1200));
assert.ok(terminalSolvusThreshold('limited', 900) > terminalSolvusThreshold('limited', 1200));

const triangles = sampleTriangle(12, (points) => points);
assert.equal(triangles.length, 144, 'La malla triangular debe contener n² triángulos');
const world = compositionToWorld(composition, temperatureToHeight(950));
assert.ok(Number.isFinite(world.x) && Number.isFinite(world.y) && Number.isFinite(world.z));

console.log('Validación del modelo ternario: correcta.');
console.log(`Modelos comprobados: ${Object.keys(TERNARY_MODELS).join(', ')}`);
console.log(`Triángulos de muestreo: ${triangles.length}`);

for (const [composition, expected] of [
  [[1, 0, 0], 'α'],
  [[0, 1, 0], 'β'],
  [[0, 0, 1], 'γ']
]) {
  const cornerState = phaseState('partial', composition, 500);
  assert.equal(cornerState.solidPhases.join('+'), expected, `La esquina debe representar ${expected}`);
}
assert.deepEqual(phaseState('complete', [0.2, 0.3, 0.5], 500).solidPhases, ['α']);
assert.deepEqual(phaseState('partial', [1/3, 1/3, 1/3], 500).solidPhases, ['α', 'β', 'γ']);
assert.deepEqual(phaseState('limited', [1/3, 1/3, 1/3], 500).solidPhases, ['α', 'β', 'γ']);
console.log('Comprobación de campos sólidos terminales y multifásicos: correcta.');
