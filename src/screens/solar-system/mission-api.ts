import { launchSiteLabel, type LaunchSite } from './launch-sites';
import type { LunarSite } from './lunar-sites';

const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.azas.n-e.kr/api/v1').replace(/\/+$/, '');
export const defaultDeadline = '2027-01-31';

async function request<T>(path: string, signal: AbortSignal, body?: object): Promise<T> {
  const response = await fetch(baseUrl + path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  } : { signal });
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

export async function startAnalysis(siteId: number, deadline: string, signal: AbortSignal) {
  const { analysisRunId } = await request<{ analysisRunId: string }>(
    `/landing-sites/${siteId}/date-opportunities`, signal, { missionDeadlineUtc: deadline, surfaceDurationHours: 48 },
  );
  return analysisRunId;
}

export class FailedAnalysis extends Error {}
export type LaunchPlan = { touchdownUtc: string; sites: LaunchSite[] };
type LaunchOptions = {
  touchdownUtc: string | null;
  launchSites: { launchSiteCode: string; latitudeDeg: number; longitudeDegEast: number; candidates: { launchUtc: string }[] }[];
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
    touchdownUtc: result.touchdownUtc,
    sites: result.launchSites.map(site => ({
      ...launchSiteLabel(site.launchSiteCode), latitude: site.latitudeDeg, longitude: site.longitudeDegEast,
      launchAt: site.candidates[0]?.launchUtc ?? null,
    })),
  };
}
