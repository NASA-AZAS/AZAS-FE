const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

test('arrival options hide unsupported dates and analyses use backend visibility defaults', async () => {
  const requests = [];
  const first = '2027-01-19T04:10:00Z', later = '2028-03-02T08:00:00Z';
  const opportunities = { analysisRunId: 'run', earliestTouchdownUtc: first, candidates: [], windows: [
    { startUtc: later, endUtc: later, surfaceStatus: 'SATISFIED' },
    { startUtc: first, endUtc: first, surfaceStatus: 'SATISFIED' },
    { startUtc: first, endUtc: first, surfaceStatus: 'SATISFIED' },
    { startUtc: 'bad', surfaceStatus: 'SATISFIED' },
    { startUtc: '2027-02-01T00:00:00Z', surfaceStatus: 'UNSATISFIED' },
  ] };
  const fetch = async (url, init) => {
    requests.push({ url, init });
    const data = init.method === 'POST' ? { analysisRunId: 'run' }
      : url.endsWith('/launch-options') ? { analysisRunId: 'run', touchdownUtc: first, launchSites: [] }
      : url.endsWith('/date-opportunities') ? opportunities : { executionStatus: 'SUCCEEDED' };
    return { ok: true, status: 200, json: async () => ({ success: true, data }) };
  };
  const code = ts.transpileModule(readFileSync('src/screens/solar-system/mission-api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)(() => ({}), mod, mod.exports, fetch);
  const api = mod.exports, signal = new AbortController().signal;
  assert.equal(api.defaultDeadline, '2029-12-31');
  const id = await api.startAnalysis(6, api.defaultDeadline, signal);
  const result = await api.loadArrivalOptions(id, signal);
  assert.deepEqual(result.dates, [first]);
  assert.equal(result.firstPlan.touchdownUtc, first);
  await api.startAnalysis(6, api.defaultDeadline, signal);
  const body = JSON.parse(requests.at(-1).init.body);
  assert.equal(body.searchStartUtc, undefined);
  assert.equal(body.surfaceDurationHours, undefined);
  assert.equal(body.surfaceCriteria, undefined);
  assert.equal(body.missionDeadlineUtc, '2029-12-31');
});

function selectedApi({ empty = false, wrongDate = false, emptyWindows = false } = {}) {
  const first = '2027-01-11T03:30:00Z', later = '2027-02-10T08:40:00Z', requests = [];
  let trackReport;
  const fetch = async (url, init) => {
    requests.push({ url, init });
    const selected = new URL(url).searchParams.get('touchdownUtc');
    const date = selected && !wrongDate ? later : first;
    const surfaceId = date === later ? 'surface:later' : 'surface:first';
    let data;
    if (url.includes('/post-landing')) data = { siteId: 'DM2', surfaceCandidateId: 'surface:later', touchdownUtc: later, surfaceEndUtc: '2027-02-12T08:40:00Z', samples: [] };
    else if (url.includes('/trajectories/')) data = { trajectoryRunId: 'trajectory/later', analysisRunId: 'run', candidateId: 'launch:later', surfaceCandidateId: 'surface:later', proposedLandingUtc: later, executionStatus: 'SUCCEEDED', status: 'PRELIMINARY', frame: 'ICRF', origin: 'EARTH', segment: 'TLI_TO_LUNAR_ARRIVAL', arrivalTarget: 'MOON_EARTH_FACING_OFFSET_2000_KM_FROM_CENTER', samples: [] };
    else if (url.includes('/launch-options')) data = { analysisRunId: 'run', touchdownUtc: date, surfaceCandidateId: surfaceId, launchSites: empty ? [] : [{ launchSiteId: 1, launchSiteCode: 'Kennedy', latitudeDeg: 28, longitudeDegEast: -80, candidates: [{ candidateId: selected ? 'launch:later' : 'launch:first', launchUtc: '2027-02-06T00:00:00Z', proposedLandingUtc: date }] }] };
    else if (url.endsWith('/date-opportunities')) data = { analysisRunId: 'run', earliestTouchdownUtc: first, windows: [{ startUtc: first, endUtc: first, surfaceStatus: 'SATISFIED' }], arrivalWindows: emptyWindows ? [] : [first, later].map(startUtc => ({ startUtc, endUtc: '2027-02-20T00:00:00Z', surfaceStatus: 'SATISFIED' })), candidates: [] };
    else data = { executionStatus: 'SUCCEEDED' };
    return { ok: true, status: 200, json: async () => ({ success: true, data }) };
  };
  const code = ts.transpileModule(readFileSync('src/screens/solar-system/mission-api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)(name => name === './launch-sites' ? { launchSiteLabel: name => ({ name }) } : name === './surface-sky-data' ? { createSurfaceTrack: report => { trackReport = report; return report; } } : { siteConditionsFromMean: () => undefined }, mod, mod.exports, fetch);
  return { api: mod.exports, first, later, requests, report: () => trackReport };
}

test('all arrivalWindows are selectable with one run, and later launch/trajectory/sky keep the selected identity', async () => {
  const { api, first, later, requests, report } = selectedApi(), signal = new AbortController().signal;
  assert.deepEqual((await api.loadArrivalOptions('run', signal)).dates, [first, later]);
  const plan = await api.loadLaunchPlan('run', signal, later);
  assert.equal(new URL(requests.at(-1).url).searchParams.get('touchdownUtc'), later);
  assert.equal(plan.touchdownUtc, later);
  assert.equal(plan.surfaceCandidateId, 'surface:later');
  assert.equal(plan.firstSurfaceCandidate.candidateId, 'surface:later');
  assert.equal(plan.sites[0].candidateId, 'launch:later');
  await api.loadTrajectory('run', plan.sites[0].candidateId, signal, 'trajectory/later', plan);
  await api.loadSurfaceSky(plan, 'DM2', signal);
  assert.match(requests.at(-1).url, /surface-candidates\/surface%3Alater\/post-landing$/);
  assert.equal(report().touchdownUtc, later);
  assert.equal(requests.some(r => r.init.method === 'POST'), false, 'selection must reuse the existing analysis');
});

test('empty arrivalWindows remain empty and a selected date with no launches returns an empty plan', async () => {
  const signal = new AbortController().signal;
  const noDates = selectedApi({ emptyWindows: true });
  assert.deepEqual((await noDates.api.loadArrivalOptions('run', signal)).dates, []);
  const noLaunches = selectedApi({ empty: true });
  assert.deepEqual((await noLaunches.api.loadLaunchPlan('run', signal, noLaunches.later)).sites, []);
});

test('an old server returning the first date for a different selection is rejected', async () => {
  const { api, later } = selectedApi({ wrongDate: true });
  await assert.rejects(api.loadLaunchPlan('run', new AbortController().signal, later), /selected arrival date/);
});
