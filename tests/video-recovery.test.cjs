const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(readFileSync('src/screens/solar-system/moon-launch-video.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
function render({ ready = true, active = true, os = 'web' } = {}) {
  const timers = [], listeners = {};
  let failed = 0, ended = 0, played = 0;
  const player = { currentTime: 0, status: ready ? 'readyToPlay' : 'loading', play: () => played++, pause() {}, addListener: (name, cb) => { listeners[name] = cb; return { remove() {} }; } };
  const mocks = {
    react: { useState: () => [ready, () => {}], useEffect: fn => fn() },
    'react-native': { Platform: { OS: os }, StyleSheet: { absoluteFill: {} }, ActivityIndicator: 'spinner' },
    'expo-video': { useVideoPlayer: (_, setup) => { setup(player); return player; }, VideoView: 'video' },
    'react-native-reanimated': { __esModule: true, default: { View: 'view' }, useSharedValue: v => ({ get: () => v, set() {} }), useAnimatedStyle: fn => fn(), withTiming: v => v },
  };
  const timer = (cb, ms) => { const t = { cb, ms, cleared: false }; timers.push(t); return t; };
  const clear = t => { t.cleared = true; };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', code)(name => mocks[name] ?? require(name), mod, mod.exports, timer, clear, timer, clear);
  mod.exports.MoonLaunchVideo({ source: 1, autoplay: true, active, visible: true, onComplete: () => ended++, onError: () => failed++ });
  return { player, timers, listeners, counts: () => ({ failed, ended, played }) };
}
test('automatic video playback advances normally, then recovers from a stall', () => {
  const r = render(), watchdog = r.timers.find(t => t.ms === 10000);
  assert.equal(r.player.muted, true);
  r.player.currentTime = 2; watchdog.cb();
  assert.equal(r.counts().failed, 0);
  watchdog.cb();
  assert.equal(r.counts().failed, 1);
  assert.equal(watchdog.cleared, true);
  r.listeners.playToEnd();
  assert.equal(r.counts().ended, 1);
});
test('loading timeout recovers and inactive videos do not start a watchdog', () => {
  const r = render({ ready: false });
  r.timers.find(t => t.ms === 20000).cb();
  assert.equal(r.counts().failed, 1);
  assert.equal(render({ active: false }).timers.length, 0);
  assert.equal(render({ os: 'ios' }).player.muted, false);
});
