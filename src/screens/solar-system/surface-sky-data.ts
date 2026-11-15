export type SkyBody = 'sun' | 'earth';
type BodyObservation = { azimuthDeg: number; elevationDeg: number; visible: boolean };
type Observation = { utc: string; elapsedSeconds: number; sun: BodyObservation; earth: BodyObservation };
export type SurfaceReport = {
  siteId: string; touchdownUtc: string; surfaceEndUtc: string; sampleStepSeconds: number; samples: Observation[];
};
type Position = { azimuth: number; elevation: number; visible: boolean | null };
export type SurfaceTrack = {
  touchdownMs: number; durationSeconds: number; sampleTimes: number[];
  position: (body: SkyBody, elapsed: number) => Position;
};

const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
const weights = [1, -9, 36, -84, 126, -126, 84, -36, 9, -1];

function makeTrack(samples: Observation[], body: SkyBody, step: number) {
  const values = samples.map(sample => sample[body]);
  const az: number[] = [];
  for (const value of values) {
    const prev = az[az.length - 1];
    az.push(prev === undefined ? value.azimuthDeg : prev + wrap(value.azimuthDeg - prev + 180) - 180);
  }
  return (elapsed: number): Position => {
    const offset = (elapsed - samples[0].elapsedSeconds) / step;
    const x = Math.max(0, Math.min(values.length - 1, offset));
    const left = Math.floor(x), raw = values[left];
    const visible = offset < 0 ? null : raw.visible;
    if (x === left) return { azimuth: wrap(raw.azimuthDeg), elevation: raw.elevationDeg, visible };
    if (values.length < 10) {
      const f = x - left;
      return { azimuth: wrap(az[left] + f * (az[left + 1] - az[left])),
        elevation: raw.elevationDeg + f * (values[left + 1].elevationDeg - raw.elevationDeg), visible };
    }
    // Barycentric form of the backend's nine-degree interpolant over ten adjacent observations.
    const start = Math.max(0, Math.min(left - 4, values.length - 10));
    let denominator = 0, azimuth = 0, elevation = 0;
    for (let j = 0; j < weights.length; j++) {
      const i = start + j, w = weights[j] / (x - i);
      denominator += w; azimuth += w * az[i]; elevation += w * values[i].elevationDeg;
    }
    return { azimuth: wrap(azimuth / denominator), elevation: elevation / denominator, visible };
  };
}

export function createSurfaceTrack(report: SurfaceReport): SurfaceTrack | null {
  const touchdownMs = Date.parse(report.touchdownUtc);
  const durationSeconds = (Date.parse(report.surfaceEndUtc) - touchdownMs) / 1000;
  const { samples, sampleStepSeconds: step } = report;
  const validBody = (b: BodyObservation) => b && Number.isFinite(b.azimuthDeg) &&
    Number.isFinite(b.elevationDeg) && typeof b.visible === 'boolean';
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(step) || step <= 0 ||
      !Array.isArray(samples) || samples.some((s, i) => !s || !Number.isFinite(s.elapsedSeconds) ||
        s.elapsedSeconds < 0 || s.elapsedSeconds > durationSeconds || Date.parse(s.utc) !== touchdownMs + s.elapsedSeconds * 1000 ||
        (i > 0 && s.elapsedSeconds !== samples[i - 1].elapsedSeconds + step) || !validBody(s.sun) || !validBody(s.earth))) {
    throw new Error('The sky observations for this touchdown are incomplete.');
  }
  if (samples.length === 0) return null;
  const tracks = { sun: makeTrack(samples, 'sun', step), earth: makeTrack(samples, 'earth', step) };
  return { touchdownMs, durationSeconds, sampleTimes: samples.map(s => s.elapsedSeconds),
    position: (body, elapsed) => tracks[body](elapsed) };
}
