const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const THREE = require('three');
const mod = { exports: {} };
const code = ts.transpileModule(readFileSync('src/screens/solar-system/transfer-route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
const { isTransferArrival } = mod.exports;
test('arrival uses the trajectory endpoint in its final section, not an earlier close pass', () => {
  const endpoint = new THREE.Vector3(.2, .01, 0), route = { points: [new THREE.Vector3(), endpoint] };
  assert.equal(isTransferArrival(route, .5, endpoint), false);
  assert.equal(isTransferArrival(route, .999, endpoint.clone().add(new THREE.Vector3(99 / 2000000, 0, 0))), true);
  assert.equal(isTransferArrival(route, .999, endpoint.clone().add(new THREE.Vector3(101 / 2000000, 0, 0))), false);
  assert.equal(isTransferArrival(route, 1, new THREE.Vector3()), true, 'a skipped or overshot final frame must still finish');
});
test('endpoint transition occurs before final camera calculations', () => {
  const source = readFileSync('src/screens/solar-system/scene.tsx', 'utf8');
  const start = source.indexOf('if (missionFlight && flightTelemetry && flightRoute)');
  const branch = source.indexOf('if (isTransferArrival(', start);
  const camera = source.indexOf('flightRoute.sample(progress < 1', start);
  assert.ok(branch > start && branch < camera);
  assert.match(source.slice(branch, camera), /view.completed = true;[\s\S]*onFlightArrived\?\.\(\);\s*return;/);
});
