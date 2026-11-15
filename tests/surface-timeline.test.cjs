const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the TS sources without adding a native runtime or test dependency.
function loadSource(name, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../src/screens/solar-system', name);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, process,
    require: id => id in mocks ? mocks[id] : require(id), ...globals,
  }, { filename });
  return module.exports;
}

const data = loadSource('surface-sky-data.ts');
const fixture = JSON.parse(readFileSync(path.resolve(__dirname, '../post_landing.json'), 'utf8'));
const start = Date.parse(fixture.touchdownUtc);
const end = start + 48 * 3600 * 1000;
const utc = ms => new Date(ms).toISOString();
const trackFor = values => data.createSurfaceTrack({ ...fixture, nextTerrainOccultationUtc: values });
const bodies = track => Array.from(track.terrainOccultations, event => event.body);

test('includes touchdown and exactly 48 hours, excludes one millisecond outside', () => {
  const track = trackFor({ sun: utc(start), earth: utc(end) });
  assert.deepEqual(bodies(track), ['sun', 'earth']);
  assert.equal(track.terrainOccultations[0].elapsedSeconds, 0);
  assert.equal(track.terrainOccultations[1].elapsedSeconds, 172800);
  assert.equal(trackFor({ sun: utc(start - 1), earth: utc(end + 1) }).terrainOccultations.length, 0);
  assert.equal(trackFor({ sun: utc(start + 1), earth: utc(end - 1) }).terrainOccultations.length, 2);
});

test('handles absent, null, malformed and single-body values independently', () => {
  for (const values of [undefined, null, {}, { sun: null }, { sun: 'invalid', earth: '' }, { sun: 0, earth: {} }]) {
    assert.equal(trackFor(values).terrainOccultations.length, 0);
  }
  assert.deepEqual(bodies(trackFor({ sun: utc(start), earth: 'invalid' })), ['sun']);
  assert.deepEqual(bodies(trackFor({ sun: null, earth: utc(end) })), ['earth']);
  assert.deepEqual(bodies(trackFor({ earth: utc(start) })), ['earth']);
  assert.deepEqual(bodies(trackFor({ sun: utc(start) })), ['sun']);
  assert.equal(data.createSurfaceTrack(fixture).terrainOccultations.length, 0);
});

test('retains simultaneous events and normalizes actual UTC including subsecond precision', () => {
  const track = trackFor({ sun: '2027-01-19T14:10:00.123+09:00', earth: '2027-01-19T05:10:00.123Z' });
  assert.deepEqual(bodies(track), ['sun', 'earth']);
  for (const event of track.terrainOccultations) {
    assert.equal(event.utc, '2027-01-19T05:10:00.123Z');
    assert.equal(event.elapsedSeconds, 3600.123);
  }
});

test('events do not change sky interpolation, duration, samples, empty/error behavior', () => {
  const before = data.createSurfaceTrack(fixture);
  const after = trackFor({ sun: utc(start), earth: utc(end) });
  assert.equal(after.durationSeconds, before.durationSeconds);
  assert.deepEqual(after.sampleTimes, before.sampleTimes);
  for (const body of ['sun', 'earth']) for (const time of [0, 1, 600, 86400.5, 172800]) {
    assert.deepEqual(after.position(body, time), before.position(body, time));
  }
  assert.equal(data.createSurfaceTrack({ ...fixture, samples: [] }), null);
  assert.throws(() => data.createSurfaceTrack({ ...fixture, sampleStepSeconds: 0 }), /incomplete/);
  assert.throws(() => data.createSurfaceTrack({ ...fixture, samples: [{ ...fixture.samples[0], elapsedSeconds: -1 }] }), /incomplete/);
  assert.equal(data.createSurfaceTrack({ ...fixture, samples: [fixture.samples[0]], surfaceEndUtc: utc(start + 72 * 3600 * 1000),
    nextTerrainOccultationUtc: { sun: utc(end + 1) } }).terrainOccultations.length, 0);
});

const shared = initial => { let value = initial; return { get: () => value, set: next => { value = next; } }; };
function renderTimeline(events) {
  const handlers = {}, effects = [], animations = [];
  let seconds = 0, interval, cleared = false;
  const gesture = { minDistance() { return this; }, shouldCancelWhenOutside() { return this; } };
  for (const name of ['onBegin', 'onUpdate', 'onEnd', 'onFinalize']) gesture[name] = callback => { handlers[name] = callback; return gesture; };
  const jsx = (type, props) => ({ type, props });
  const { SurfaceTimeline } = loadSource('surface-timeline.tsx', {
    react: { useMemo: fn => fn(), useEffect: fn => effects.push(fn), useState: () => [seconds, next => { seconds = next; }] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text' },
    'react-native-gesture-handler': { Gesture: { Pan: () => gesture }, GestureDetector: 'GestureDetector' },
    'react-native-reanimated': { __esModule: true, default: { View: 'Animated.View' }, useSharedValue: shared,
      useAnimatedStyle: fn => { animations.push(fn); return fn(); } },
  }, { setInterval: fn => { interval = fn; return 1; }, clearInterval: () => { cleared = true; } });
  const elapsed = shared(0), autoRotate = shared(true), scrubbing = shared(false);
  const props = { touchdownMs: start, durationSeconds: 172800, terrainOccultations: events, elapsed, autoRotate, scrubbing };
  let tree = SurfaceTimeline(props);
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(child => nodes(child))];
  }
  const find = id => nodes(tree).find(node => node.props?.testID === id)?.props;
  const text = id => [find(id)?.children].flat(Infinity).join('');
  return { find, text, handlers, elapsed, autoRotate, scrubbing, animations,
    tick: () => { interval(); tree = SurfaceTimeline(props); },
    startEffect: () => effects[0](), isCleared: () => cleared };
}

test('renders correct timeline positions and separate readable labels at equal times and endpoints', () => {
  for (const times of [[start, end], [start + 86400000, start + 86400000]]) {
    const track = trackFor({ sun: utc(times[0]), earth: utc(times[1]) });
    const ui = renderTimeline(track.terrainOccultations);
    for (const body of ['sun', 'earth']) {
      const marker = ui.find(`terrain-occultation-${body}-marker`);
      assert.equal(marker.style.left, `${(times[body === 'sun' ? 0 : 1] - start) / (end - start) * 100}%`);
      assert.match(ui.text(`terrain-occultation-${body}-label`), new RegExp(body === 'sun' ? 'Sun' : 'Earth'));
      assert.match(ui.text(`terrain-occultation-${body}-label`), /2027-01-\d\d \d\d:10:00.000 UTC/);
      assert.match(ui.find(`terrain-occultation-${body}-label`).accessibilityLabel, /first terrain occultation/);
    }
    assert.notEqual(ui.find('terrain-occultation-sun-marker').style.top, ui.find('terrain-occultation-earth-marker').style.top);
  }
  assert.equal(renderTimeline([]).find('terrain-occultation-sun-marker'), undefined);
  const single = renderTimeline(trackFor({ earth: utc(start) }).terrainOccultations);
  assert.equal(single.find('terrain-occultation-sun-label'), undefined);
  assert.ok(single.find('terrain-occultation-earth-label'));
});

test('preserves scrubbing clamps, rotation stop, hour accessibility steps, UTC clock and animated progress', () => {
  for (const events of [undefined, [], trackFor({ sun: utc(start), earth: utc(end) }).terrainOccultations]) {
    const ui = renderTimeline(events);
    const slider = ui.find('surface-time-slider');
    slider.onLayout({ nativeEvent: { layout: { width: 200 } } });
    ui.handlers.onBegin({ x: 100 });
    assert.equal(ui.elapsed.get(), 86400);
    assert.equal(ui.scrubbing.get(), true);
    assert.equal(ui.autoRotate.get(), false);
    assert.equal(ui.animations[0]().width, '50%');
    assert.equal(ui.animations[1]().left, '50%');
    const cleanup = ui.startEffect();
    ui.tick();
    assert.equal(ui.text('surface-time'), '2027-01-20 04:10 UTC');
    cleanup();
    assert.equal(ui.isCleared(), true);
    ui.handlers.onUpdate({ x: -20 });
    assert.equal(ui.elapsed.get(), 0);
    slider.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
    assert.equal(ui.elapsed.get(), 0);
    slider.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    assert.equal(ui.elapsed.get(), 3600);
    ui.handlers.onEnd({ x: 240 });
    assert.equal(ui.elapsed.get(), 172800);
    slider.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    assert.equal(ui.elapsed.get(), 172800);
    ui.handlers.onFinalize();
    assert.equal(ui.scrubbing.get(), false);
  }
});

test('existing post-landing request propagates API events without another network call', async () => {
  const report = { ...fixture, nextTerrainOccultationUtc: { sun: utc(start), earth: utc(end) } };
  const requests = [];
  const api = loadSource('mission-api.ts', {
    './surface-sky-data': data, './launch-sites': {}, './site-conditions': { siteConditionsFromMean: () => undefined },
  }, { fetch: async url => {
    requests.push(url);
    return { ok: true, json: async () => ({ success: true, data: requests.length === 1 ? {
      analysisRunId: 'run', earliestTouchdownUtc: fixture.touchdownUtc,
      candidates: [{ candidateId: 'candidate', proposedLandingUtc: fixture.touchdownUtc, surfaceFinishUtc: fixture.surfaceEndUtc, surfaceStatus: 'SATISFIED' }],
    } : report }) };
  } });
  const result = await api.loadSurfaceSky('run', fixture.siteId, fixture.touchdownUtc, new AbortController().signal);
  assert.deepEqual(bodies(result.track), ['sun', 'earth']);
  assert.equal(requests.length, 2);
  assert.match(requests[1], /surface-candidates\/candidate\/post-landing$/);
});
