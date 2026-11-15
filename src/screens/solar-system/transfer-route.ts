import * as THREE from 'three';
import type { TrajectorySample } from './mission-api';

const KM_PER_SCENE_UNIT = 2_000_000;
const TARGET_OFFSET_KM = 2000; // Backend arrival target is on the Earth-facing side of the Moon.
export const FLIGHT_DURATION_SECONDS = 60;

export function createTransferRoute(samples: TrajectorySample[]) {
  const vector = (v: number[]) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  if (!Array.isArray(samples) || samples.length < 2 || samples[0].elapsedSeconds !== 0 ||
      samples.some((s, i) => !vector(s.positionKm) || !vector(s.velocityKmS) || !Number.isFinite(s.elapsedSeconds)
        || (i > 0 && s.elapsedSeconds <= samples[i - 1].elapsedSeconds))) {
    throw new Error('The transfer trajectory has incomplete samples.');
  }
  const positions = samples.map(s => new THREE.Vector3().fromArray(s.positionKm));
  const velocities = samples.map(s => new THREE.Vector3().fromArray(s.velocityKmS));
  const last = positions.length - 1;
  // Rigidly rotate the Earth-centred ICRF samples into the camera's transfer-plane view.
  // +X points to lunar arrival, +Y is normal to the orbit. All distances keep the scene's physical scale.
  const xAxis = positions[last].clone().normalize();
  const normal = positions[0].clone().cross(velocities[0]);
  const zAxis = xAxis.clone().cross(normal).normalize();
  if (!zAxis.lengthSq()) throw new Error('The transfer plane could not be determined.');
  const yAxis = zAxis.clone().cross(xAxis);
  const points = positions.map(p => new THREE.Vector3(p.dot(xAxis), p.dot(yAxis), p.dot(zAxis)).divideScalar(KM_PER_SCENE_UNIT));
  const moonPosition = new THREE.Vector3((positions[last].length() + TARGET_OFFSET_KM) / KM_PER_SCENE_UNIT, 0, 0);
  const bounds = new THREE.Box3().setFromPoints(points).expandByPoint(new THREE.Vector3()).expandByPoint(moonPosition);
  const lengthsKm = [0];
  for (let i = 1; i <= last; i++) lengthsKm.push(lengthsKm[i - 1] + positions[i].distanceTo(positions[i - 1]));
  const durationSeconds = samples[last].elapsedSeconds;
  const durationAt = (progress: number) => THREE.MathUtils.clamp(progress, 0, 1) * durationSeconds;
  function segmentAt(seconds: number) {
    let low = 1, high = last;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (samples[mid].elapsedSeconds < seconds) low = mid + 1;
      else high = mid;
    }
    const start = samples[low - 1].elapsedSeconds;
    return { i: low, fraction: (seconds - start) / (samples[low].elapsedSeconds - start) };
  }
  function sample(progress: number, out: THREE.Vector3) {
    const { i, fraction } = segmentAt(durationAt(progress));
    return out.lerpVectors(points[i - 1], points[i], fraction);
  }
  const velocity = new THREE.Vector3();
  function metrics(progress: number) {
    const { i, fraction } = segmentAt(durationAt(progress));
    return {
      remainingKm: lengthsKm[last] - THREE.MathUtils.lerp(lengthsKm[i - 1], lengthsKm[i], fraction),
      speedKmh: velocity.lerpVectors(velocities[i - 1], velocities[i], fraction).length() * 3600,
    };
  }
  return { points, moonPosition, bounds, durationSeconds, sample, metrics };
}

export type TransferRoute = ReturnType<typeof createTransferRoute>;
export function isTransferArrival(route: Pick<TransferRoute, 'points'>, progress: number, position: THREE.Vector3) {
  const endpoint = route.points[route.points.length - 1];
  // Gate on the final segment so an earlier orbit passing the endpoint cannot trigger arrival.
  return progress >= 1 || (progress >= .95 && position.distanceToSquared(endpoint) <= (100 / KM_PER_SCENE_UNIT) ** 2);
}
export type FlightTelemetry = { progress: number; remainingSeconds: number; remainingKm: number; speedKmh: number; arrived: boolean };
export const initialFlightTelemetry = (route?: TransferRoute): FlightTelemetry => ({
  progress: 0, remainingSeconds: FLIGHT_DURATION_SECONDS, ...(route?.metrics(0) ?? { remainingKm: 0, speedKmh: 0 }), arrived: false,
});
export type FlightPlayback = { speed: number; paused: boolean; skip: boolean };
export type FlightMarkers = { earthX: number; earthY: number; earthVisible: boolean; moonX: number; moonY: number; moonVisible: boolean; sunX: number; sunY: number; sunVisible: boolean };
//
export function requestFlightSkip(playback: FlightPlayback) { playback.skip = true; }
