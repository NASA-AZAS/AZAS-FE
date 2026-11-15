const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

const code = ts.transpileModule(readFileSync('src/screens/solar-system/arrival-video.web.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount(rejectPlayback = false) {
  const listeners = {}, cleanups = [], timers = [];
  let plays = 0, errors = 0, completions = 0;
  const element = {
    currentTime: 0, readyState: 1, error: null, ended: false,
    play() { plays++; return rejectPlayback ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); },
    pause() {},
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; },
  };
  const mocks = {
    react: {
      useRef: () => ({ current: element }), useState: () => [false, () => {}],
      useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
    },
    'react-native': { StyleSheet: { absoluteFill: {} }, View: 'view', ActivityIndicator: 'spinner' },
    'expo-asset': { Asset: { fromModule: () => ({ uri: '/arrival.mp4' }) } },
    'react-native-reanimated': {
      __esModule: true, default: { View: 'view' },
      useSharedValue: value => ({ get: () => value, set() {} }), useAnimatedStyle: fn => fn(), withTiming: value => value,
    },
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', 'document', code)(
    name => name.endsWith('.mp4') ? 1 : mocks[name] ?? require(name), mod, mod.exports,
    fn => { timers.push(fn); return timers.length; }, () => {}, { hidden: false },
  );
  mod.exports.ArrivalVideo({ active: true, visible: true, onError: () => errors++, onComplete: () => completions++ });
  return { element, listeners, timers, cleanups, counts: () => ({ plays, errors, completions }) };
}

test('web arrival requests muted inline playback without waiting for canplay; rejection immediately advances', async () => {
  const r = mount(true);
  assert.equal(r.element.readyState, 1);
  assert.equal(r.element.muted, true);
  assert.equal(r.element.playsInline, true);
  assert.equal(r.counts().plays, 1);
  await Promise.resolve();
  assert.equal(r.counts().errors, 1);
  r.listeners.error();
  assert.equal(r.counts().errors, 1, 'failure must advance only once');
});

test('successful playback advances on ended and cancels a pending rejection after unmount', async () => {
  const normal = mount();
  normal.listeners.ended();
  normal.listeners.error();
  assert.equal(normal.counts().completions, 1);
  assert.equal(normal.counts().errors, 0);
  const unmounted = mount(true);
  unmounted.cleanups.forEach(cleanup => cleanup());
  await Promise.resolve();
  assert.equal(unmounted.counts().errors, 0);
});
