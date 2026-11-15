const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const filename = resolve(__dirname, '../src/screens/solar-system/render-surface.web.tsx');
const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const mod = { exports: {} };
const defaults = { enabled: true, connected: 'canvas' };
new Function('require', 'module', 'exports', code)(name => name === '@react-three/fiber'
  ? { Canvas: 'canvas', events: () => defaults } : require(name), mod, mod.exports);

test('web raycasting uses the visible canvas rect, independent of target offsets and zoom', () => {
  const manager = mod.exports.Canvas({}).props.events({});
  assert.equal(manager.connected, defaults.connected);
  for (const rect of [
    { left: 0, top: 0, width: 844, height: 390 },
    { left: 110, top: 24, width: 670, height: 310 },
    { left: 180, top: 80, width: 320, height: 180 },
  ]) {
    for (const [x, y] of [[.5, .5], [.1, .8], [1, 0]]) {
      let pointer, casts = 0;
      const state = {
        gl: { domElement: { getBoundingClientRect: () => rect } },
        pointer: { set: (...args) => { pointer = args; } },
        raycaster: { setFromCamera: () => { casts++; } }, camera: {},
      };
      manager.compute({ clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y, offsetX: 2, offsetY: 4 }, state);
      assert.ok(Math.abs(pointer[0] - (2 * x - 1)) < 1e-9);
      assert.ok(Math.abs(pointer[1] - (1 - 2 * y)) < 1e-9);
      assert.equal(casts, 1);
    }
  }
});

test('hidden canvases do not cast and an explicit event manager remains supported', () => {
  const manager = mod.exports.Canvas({}).props.events({});
  manager.compute({}, { gl: { domElement: { getBoundingClientRect: () => ({ width: 0, height: 0 }) } } });
  const customEvents = () => ({});
  assert.equal(mod.exports.Canvas({ events: customEvents }).props.events, customEvents);
});
