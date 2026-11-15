import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'react-native-reanimated';
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

export function TransferTrajectory({ moon, onComplete }: { moon: THREE.Vector3; onComplete: () => void }) {
  const reducedMotion = useReducedMotion();
  const elapsed = useRef(0), completed = useRef(false);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(makeTransferPoints(moon));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: .0014, gapSize: .001, transparent: true, opacity: .9 });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [moon]);
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, .05);
    const progress = reducedMotion ? Number(elapsed.current >= 1.8) : Math.min(1, Math.max(0, (elapsed.current - 1.8) / 3.2));
    line.material.opacity = reducedMotion ? .9 : .9 * THREE.MathUtils.smoothstep(elapsed.current, 1.8, 2.4);
    line.geometry.setDrawRange(0, Math.floor(line.geometry.attributes.position.count * progress));
    if (progress === 1 && !completed.current) { completed.current = true; onComplete(); }
  });
  return <primitive object={line} />;
}
