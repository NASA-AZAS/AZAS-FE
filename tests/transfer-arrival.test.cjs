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
test('automatic skip starts at 200ms remaining, before final camera calculations', () => {
  const source = readFileSync('src/screens/solar-system/scene.tsx', 'utf8');
  const start = source.indexOf('if (missionFlight && flightTelemetry && flightRoute)');
  const branch = source.indexOf('if (remainingSeconds <= .2)', start);
  const camera = source.indexOf('flightRoute.sample(progress < 1', start);
  assert.ok(branch > start && branch < camera);
  assert.match(source.slice(branch, camera), /view.completed = true;[\s\S]*onFlightArrived\?\.\(\);\s*return;/);
});

test('manual and automatic arrival request the same skip operation', () => {
  const playback = { speed: 1, paused: false, skip: false };
  mod.exports.requestFlightSkip(playback);
  assert.equal(playback.skip, true);
  const scene = readFileSync('src/screens/solar-system/scene.tsx', 'utf8');
  const hud = readFileSync('src/screens/solar-system/moon-flight-hud.tsx', 'utf8');
  assert.match(scene, /if \(!skipping && playback\) \{\s*requestFlightSkip\(playback\);\s*return;/);
  assert.match(hud, /requestFlightSkip\(playback.current\)/);
});
