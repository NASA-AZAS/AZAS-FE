import data from '../../../post_landing.json';

// Temporary Site01 trajectory reused for all demo sites until per-site API data arrives.
export const surfaceSkyData = data;
export const surfaceDuration = (Date.parse(data.surfaceEndUtc) - Date.parse(data.touchdownUtc)) / 1000;
export type SkyBody = 'sun' | 'earth';
export function surfacePosition(body: SkyBody, elapsed: number) {
  const t = Math.max(0, Math.min(surfaceDuration, elapsed));
  let lo = 0, hi = data.samples.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (data.samples[mid].elapsedSeconds <= t) lo = mid; else hi = mid; }
  const a = data.samples[lo], b = data.samples[hi];
  const f = Math.max(0, Math.min(1, (t - a.elapsedSeconds) / (b.elapsedSeconds - a.elapsedSeconds)));
  const azimuthDelta = ((b[body].azimuthDeg - a[body].azimuthDeg + 540) % 360) - 180;
  return {
    azimuth: (a[body].azimuthDeg + azimuthDelta * f + (body === 'earth' ? 70 : -35) * t / surfaceDuration + 360) % 360,
    // Elevated illustrative arcs for the demo; these are not the JSON ephemerides.
    elevation: (body === 'sun' ? 24 : 36) + 18 * Math.sin(t / surfaceDuration * Math.PI),
    horizon: a[body].terrainHorizonDeg + (b[body].terrainHorizonDeg - a[body].terrainHorizonDeg) * f,
  };
}
