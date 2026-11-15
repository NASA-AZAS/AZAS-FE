import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { createTransferRoute, FlightTelemetry } from './transfer-route';

export function FlightRocket({ map, route, telemetry, size }: { map: THREE.Texture; route: ReturnType<typeof createTransferRoute>; telemetry: MutableRefObject<FlightTelemetry>; size: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null), flame = useRef<THREE.Mesh>(null);
  const point = useRef(new THREE.Vector3()), ahead = useRef(new THREE.Vector3()), direction = useRef(new THREE.Vector3());
  const inverse = useRef(new THREE.Quaternion());
  const roll = useRef(0), time = useRef(0);
  useFrame(({ camera }, delta) => {
    if (!group.current) return;
    const progress = telemetry.current.progress;
    route.sample(progress, point.current);
    route.sample(Math.min(1, progress + .0002), ahead.current);
    if (progress === 1) { route.sample(.9998, ahead.current); direction.current.subVectors(point.current, ahead.current); }
    else direction.current.subVectors(ahead.current, point.current);
    direction.current.normalize().applyQuaternion(inverse.current.copy(camera.quaternion).invert());
    if (Math.hypot(direction.current.x, direction.current.y) > .01) roll.current = Math.atan2(direction.current.y, direction.current.x) - Math.PI / 4;
    group.current.position.copy(point.current);
    // A camera-facing layered card keeps the original 2D mascot readable through a full orbit.
    group.current.quaternion.copy(camera.quaternion);
    group.current.rotateZ(roll.current);
    group.current.scale.setScalar(size.current);
    time.current += delta;
    if (flame.current) { flame.current.visible = !telemetry.current.arrived; flame.current.scale.y = 1 + Math.sin(time.current * 22) * .12; }
  });
  return <group ref={group}>
    <mesh position={[0, 0, -.035]} scale={[1.07, 1.07, 1]}>
      <planeGeometry args={[1, 1]} /><meshBasicMaterial map={map} color="#7495bb" transparent opacity={.22} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh><planeGeometry args={[1, 1]} /><meshBasicMaterial map={map} transparent alphaTest={.08} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {[.14, .19].map(x => <mesh key={x} position={[x, .103, .02]} rotation={[0, 0, -.2]} scale={[.026, .06, 1]}>
      <circleGeometry args={[.5, 16]} /><meshBasicMaterial color="#fff0d8" depthWrite={false} />
    </mesh>)}
    <mesh ref={flame} position={[-.36, -.36, -.015]} rotation={[0, 0, -Math.PI / 4]}>
      <coneGeometry args={[.045, .22, 12]} /><meshBasicMaterial color="#ff6238" transparent opacity={.7} depthWrite={false} />
    </mesh>
  </group>;
}
