import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';
import { makeTransferPoints } from './transfer-route';

export function TransferTrajectory({ moon, flight = false, onComplete }: { moon: THREE.Vector3; flight?: boolean; onComplete: () => void }) {
  const reducedMotion = useReducedMotion();
  const elapsed = useRef(0), completed = useRef(false);
  const state = useMemo(() => {
    const points = makeTransferPoints(moon);
    const positions = new Float32Array((points.length - 1) * 6);
    const distances = new Float32Array((points.length - 1) * 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('lineDistance', new THREE.BufferAttribute(distances, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.RawShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { opacity: { value: 0 } },
      vertexShader: 'precision highp float; attribute vec3 position; attribute float lineDistance; varying float vDistance; void main(){vDistance=lineDistance;gl_Position=vec4(position,1.0);}',
      fragmentShader: 'precision highp float; uniform float opacity; varying float vDistance; void main(){if(mod(vDistance,14.0)>8.0)discard;gl_FragColor=vec4(1.0,1.0,1.0,opacity);}',
    });
    const line = new THREE.LineSegments(geometry, material);
    line.frustumCulled = false;
    return { points, positions, distances, geometry, material, line, matrix: new THREE.Matrix4(), a: new THREE.Vector3(), b: new THREE.Vector3() };
  }, [moon]);
  useEffect(() => () => { state.geometry.dispose(); state.material.dispose(); }, [state]);
  useFrame(({ camera, size }, delta) => {
    elapsed.current += Math.min(delta, .05);
    const progress = flight ? 1 : reducedMotion ? Number(elapsed.current >= 1.8) : Math.min(1, Math.max(0, (elapsed.current - 1.8) / 3.2));
    state.material.uniforms.opacity.value = reducedMotion || flight ? .9 : .9 * THREE.MathUtils.smoothstep(elapsed.current, 1.8, 2.4);
    // Project to clip space first: w=1 gives screen-linear dash distances, independent of zoom/depth.
    camera.updateMatrixWorld();
    state.line.parent?.updateWorldMatrix(true, false);
    state.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (state.line.parent) state.matrix.multiply(state.line.parent.matrixWorld);
    let count = 0, distance = 0;
    const end = Math.floor((state.points.length - 1) * progress);
    for (let i = 0; i < end; i++) {
      state.a.copy(state.points[i]).applyMatrix4(state.matrix);
      state.b.copy(state.points[i + 1]).applyMatrix4(state.matrix);
      if (![state.a.x, state.a.y, state.a.z, state.b.x, state.b.y, state.b.z].every(Number.isFinite)) continue;
      if (state.a.z < -1 || state.a.z > 1 || state.b.z < -1 || state.b.z > 1) continue;
      if ((state.a.x < -1.1 && state.b.x < -1.1) || (state.a.x > 1.1 && state.b.x > 1.1) || (state.a.y < -1.1 && state.b.y < -1.1) || (state.a.y > 1.1 && state.b.y > 1.1)) continue;
      state.a.x = THREE.MathUtils.clamp(state.a.x, -6, 6); state.a.y = THREE.MathUtils.clamp(state.a.y, -6, 6);
      state.b.x = THREE.MathUtils.clamp(state.b.x, -6, 6); state.b.y = THREE.MathUtils.clamp(state.b.y, -6, 6);
      const length = Math.hypot((state.b.x - state.a.x) * size.width / 2, (state.b.y - state.a.y) * size.height / 2);
      state.a.toArray(state.positions, count * 3); state.distances[count++] = distance;
      distance += length;
      state.b.toArray(state.positions, count * 3); state.distances[count++] = distance;
    }
    state.geometry.attributes.position.needsUpdate = true;
    state.geometry.attributes.lineDistance.needsUpdate = true;
    state.geometry.setDrawRange(0, count);
    if (progress === 1 && !completed.current && !flight) { completed.current = true; onComplete(); }
  });
  return <primitive object={state.line} />;
}
