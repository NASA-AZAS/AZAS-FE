import { launchSiteLabel, type LaunchSite } from './launch-sites';
import type { LunarSite } from './lunar-sites';
import { createSurfaceTrack, type SurfaceReport } from './surface-sky-data';
import { siteConditionsFromMean, type MeanDailyVisibility } from './site-conditions';

const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.azas.n-e.kr/api/v1').replace(/\/+$/, '');
export const defaultDeadline = '2027-01-31';

async function request<T>(path: string, signal: AbortSignal, options: RequestInit = {}): Promise<T> {
  const response = await fetch(baseUrl + path, { ...options, signal });
  if (response.status === 429) throw new Error('The analysis queue is full. Try again shortly.');
  if (!response.ok) throw new Error(`The mission service could not complete the request (HTTP ${response.status}).`);
  const payload = await response.json();
  if (!payload.success || payload.data == null) throw new Error('The mission service returned an incomplete response.');
  return payload.data;
}

type LandingSiteRow = {
  landingSiteId: number; siteCode: string; latitudeDegrees: number; longitudeDegrees: number;
  surfaceElevationMeters: number; observerHeightAboveSurfaceMeters: number;
  lowSlopeSquareSideMeters: number; terrainScreeningStatus: string;
};

export async function loadLandingSites(signal: AbortSignal): Promise<LunarSite[]> {
  const rows = await request<LandingSiteRow[]>('/landing-sites', signal);
  return rows.map(row => ({
    landingSiteId: row.landingSiteId, id: row.siteCode, name: row.siteCode,
    latitude: row.latitudeDegrees, longitude: row.longitudeDegrees,
    groundElevationM: row.surfaceElevationMeters, observerHeightM: row.observerHeightAboveSurfaceMeters,
    squareSideM: row.lowSlopeSquareSideMeters, screeningStatus: row.terrainScreeningStatus,
  }));
}

export async function loadLandingSiteConditions(site: LunarSite, signal: AbortSignal) {
  const detail = await request<LandingSiteRow & { meanDailyVisibility?: MeanDailyVisibility | null }>(
    `/landing-sites/${site.landingSiteId}`, signal,
  );
  if (detail.landingSiteId !== site.landingSiteId || detail.siteCode !== site.id) throw new Error('Landing site mismatch.');
  return siteConditionsFromMean(detail.meanDailyVisibility);
}

export async function startAnalysis(siteId: number, deadline: string, signal: AbortSignal) {
  const { analysisRunId } = await request<{ analysisRunId: string }>(
    `/landing-sites/${siteId}/date-opportunities`, signal, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionDeadlineUtc: deadline, surfaceDurationHours: 48 }),
    },
  );
  return analysisRunId;
}

export class FailedAnalysis extends Error {}
type SurfaceOpportunities = {
  analysisRunId: string; earliestTouchdownUtc: string | null;
  candidates: { candidateId: string; proposedLandingUtc: string; surfaceFinishUtc: string; surfaceStatus: string }[];
};

export async function loadSurfaceSky(runId: string, siteCode: string, touchdownUtc: string, signal: AbortSignal) {
  const path = `/analyses/${encodeURIComponent(runId)}`;
  const result = await request<SurfaceOpportunities>(path + '/date-opportunities', signal);
  const start = Date.parse(touchdownUtc);
  if (result.analysisRunId !== runId || !result.earliestTouchdownUtc || Date.parse(result.earliestTouchdownUtc) !== start) {
    throw new Error('The sky observations do not match the selected touchdown.');
  }
  const candidate = result.candidates.find(c => c.surfaceStatus === 'SATISFIED' && Date.parse(c.proposedLandingUtc) === start);
  if (!candidate?.candidateId) throw new Error('No surface candidate was found for this touchdown.');
  const report = await request<SurfaceReport>(
    `${path}/surface-candidates/${encodeURIComponent(candidate.candidateId)}/post-landing`, signal,
  );
  if (report.siteId !== siteCode || Date.parse(report.touchdownUtc) !== start ||
      Date.parse(report.surfaceEndUtc) !== Date.parse(candidate.surfaceFinishUtc)) {
    throw new Error('The sky observations do not match the selected landing site and time.');
  }
  return {
    track: createSurfaceTrack(report),
    conditions: siteConditionsFromMean(report.meanDailyVisibility),
  };
}
export type LaunchPlan = { runId: string; touchdownUtc: string; sites: LaunchSite[] };

type VisibilityWindow = { celestialBody: string; windowStartAt: string; windowEndAt: string };
export type TouchdownDay = {
  analysisDate: string;
  sunVisibleTimeRatio: number | null; earthVisibleTimeRatio: number | null; jointVisibleTimeRatio: number | null;
  sunKnownTimeRatio: number; earthKnownTimeRatio: number; jointKnownTimeRatio: number;
  resultStatus: string; terrainCoverageStatus: string; visibilityWindows: (VisibilityWindow | null)[] | null;
};

export async function loadTouchdownDay(runId: string, touchdownUtc: string, signal: AbortSignal) {
  const date = new Date(touchdownUtc).toISOString().slice(0, 10);
  const days = await request<(TouchdownDay | null)[]>(
    `/analyses/${encodeURIComponent(runId)}/daily-results?date=${date}`, signal,
  );
  if (!Array.isArray(days)) throw new Error('Incomplete daily results.');
  return days.find(day => day?.analysisDate === date) ?? null;
}

type LaunchOptions = {
  touchdownUtc: string | null;
  launchSites: { launchSiteId: number; launchSiteCode: string; latitudeDeg: number; longitudeDegEast: number; candidates: { launchUtc: string; candidateId: string }[] }[];
};

export async function loadLaunchPlan(runId: string, signal: AbortSignal): Promise<LaunchPlan | null> {
  const path = `/analyses/${encodeURIComponent(runId)}`;
  while (!signal.aborted) {
    const run = await request<{ executionStatus: string; failureCode?: string }>(path, signal);
    if (run.executionStatus === 'SUCCEEDED') break;
    if (run.executionStatus !== 'PENDING' && run.executionStatus !== 'RUNNING') {
      throw new FailedAnalysis(`Analysis failed (${run.failureCode ?? run.executionStatus}).`);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  // launch-options returns the first SATISFIED touchdown and its matching launch candidates together.
  const result = await request<LaunchOptions>(path + '/launch-options', signal);
  if (!result.touchdownUtc) return null;
  return {
    runId, touchdownUtc: result.touchdownUtc,
    sites: result.launchSites.map(site => ({
      id: `launch-${site.launchSiteId}`, ...launchSiteLabel(site.launchSiteCode),
      latitude: site.latitudeDeg, longitude: site.longitudeDegEast,
      launchAt: site.candidates[0]?.launchUtc ?? null, candidateId: site.candidates[0]?.candidateId ?? null,
    })),
  };
}

export type TrajectorySample = { elapsedSeconds: number; positionKm: number[]; velocityKmS: number[] };
type TrajectorySummary = {
  trajectoryRunId: string; candidateId: string; executionStatus: string; status: string | null;
};
type TrajectoryResult = TrajectorySummary & {
  analysisRunId: string; reason: string | null;
  frame: string; origin: string; segment: string; arrivalTarget: string; samples: TrajectorySample[];
};

function inProgress(run: TrajectorySummary) {
  return run.executionStatus === 'PENDING' || run.executionStatus === 'RUNNING';
}

export async function loadTrajectory(runId: string, candidateId: string, signal: AbortSignal, savedId?: string) {
  const path = `/analyses/${encodeURIComponent(runId)}`;
  if (!savedId) {
    const history = await request<TrajectorySummary[]>(path + '/trajectories', signal);
    const matches = history.filter(item => item.candidateId === candidateId);
    // History is newest first. Prefer a usable result even if a later attempt failed.
    const saved = matches.find(item => item.executionStatus === 'SUCCEEDED' && item.status === 'PRELIMINARY')
      ?? matches.find(inProgress)
      ?? matches.find(item => item.executionStatus === 'SUCCEEDED' && item.status === 'NO_PRELIMINARY_SOLUTION');
    savedId = saved?.trajectoryRunId;
  }
  const readSaved = (id: string) => request<TrajectoryResult>(path + '/trajectories/' + encodeURIComponent(id), signal);
  let result = savedId ? await readSaved(savedId) : await request<TrajectoryResult>(
    path + '/launch-options/' + encodeURIComponent(candidateId) + '/trajectory', signal, { method: 'POST' });
  const trajectoryId = savedId ?? result.trajectoryRunId;
  for (;;) {
    if (!trajectoryId || result.trajectoryRunId !== trajectoryId || result.analysisRunId !== runId || result.candidateId !== candidateId) {
      throw new Error('The trajectory does not match this launch.');
    }
    if (!inProgress(result)) break;
    await new Promise(resolve => setTimeout(resolve, 1500));
    result = await readSaved(trajectoryId);
  }
  if (result.status === 'NO_PRELIMINARY_SOLUTION') throw new Error('No transfer trajectory was found. Choose another launch site.');
  if (result.executionStatus !== 'SUCCEEDED' || result.status !== 'PRELIMINARY') throw new Error(`Trajectory calculation failed (${result.reason ?? 'unknown reason'}).`);
  if (result.frame !== 'ICRF' || result.origin !== 'EARTH' || result.segment !== 'TLI_TO_LUNAR_ARRIVAL'
      || result.arrivalTarget !== 'MOON_EARTH_FACING_OFFSET_2000_KM_FROM_CENTER') {
    throw new Error('This trajectory uses an unsupported coordinate frame or arrival target.');
  }
  return { trajectoryId, samples: result.samples };
}
