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
