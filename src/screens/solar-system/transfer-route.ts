import * as THREE from 'three';
import { scale } from './scale';

// Presentation mock: parking spirals, a curved transfer, and lunar capture; no gravity solver.
export function makeTransferPoints(moon: THREE.Vector3) {
  const direction = moon.clone().normalize(), side = new THREE.Vector3(-direction.z, 0, direction.x);
  const position = (center: THREE.Vector3, radius: number, angle: number) => center.clone().addScaledVector(direction, radius * Math.cos(angle)).addScaledVector(side, radius * Math.sin(angle));
  const origin = new THREE.Vector3();
  const points = Array.from({ length: 401 }, (_, i) => {
    const t = i / 400;
    return position(origin, scale.earthRadius * (1.1 + 2.9 * t), t * Math.PI * 4);
  });
  const end = moon.clone().addScaledVector(direction, -.006);
  const curve = new THREE.CubicBezierCurve3(points[points.length - 1], direction.clone().multiplyScalar(.04).addScaledVector(side, .035), moon.clone().addScaledVector(direction, -.04).addScaledVector(side, .025), end);
  points.push(...curve.getPoints(400).slice(1));
  for (let i = 1; i <= 240; i++) {
    const t = i / 240;
    points.push(position(moon, .006 * (1 - t) + scale.moonRadius * 1.5 * t, Math.PI + t * Math.PI * 2.5));
  }
  return points;
}


export function createTransferRoute(moon: THREE.Vector3) {
  const points = makeTransferPoints(moon);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
  const totalLength = lengths[lengths.length - 1];
  const sample = (progress: number, out: THREE.Vector3) => {
    const distance = THREE.MathUtils.clamp(progress, 0, 1) * totalLength;
    let low = 1, high = lengths.length - 1;
    while (low < high) { const middle = (low + high) >> 1; if (lengths[middle] < distance) low = middle + 1; else high = middle; }
    const span = lengths[low] - lengths[low - 1];
    return out.lerpVectors(points[low - 1], points[low], span ? (distance - lengths[low - 1]) / span : 0);
  };
  return { points, lengths, totalLength, sample };
}

const routeLengthKm = createTransferRoute(new THREE.Vector3(scale.moonOrbit, 0, 0)).totalLength * 2_000_000;
export const FLIGHT_DURATION_SECONDS = 60;
export const MISSION_DURATION_DAYS = 4;
// Representative four-day Earth–Moon average, not an instantaneous engine/trajectory speed.
export const AVERAGE_SPEED_KMH = scale.moonOrbit * 2_000_000 / (MISSION_DURATION_DAYS * 24);
export type FlightTelemetry = { progress: number; remainingSeconds: number; remainingKm: number; speedKmh: number; arrived: boolean };
export const initialFlightTelemetry = (): FlightTelemetry => ({ progress: 0, remainingSeconds: FLIGHT_DURATION_SECONDS, remainingKm: routeLengthKm, speedKmh: AVERAGE_SPEED_KMH, arrived: false });

export type FlightPlayback = { speed: number; paused: boolean; skip: boolean };
export type FlightMarkers = { earthX: number; earthY: number; earthVisible: boolean; moonX: number; moonY: number; moonVisible: boolean; sunX: number; sunY: number; sunVisible: boolean };
