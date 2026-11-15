import { useEffect, useMemo, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Svg, { Path } from 'react-native-svg';
import type { SurfaceTrack, SkyBody } from './surface-sky-data';

type Marker = { x: number; y: number; onScreen: boolean; visible: boolean | null; azimuth: number | null; elevation: number | null };
export type SkyMarkers = Record<SkyBody, Marker>;
const emptyMarker = (): Marker => ({ x: 0, y: 0, onScreen: false, visible: null, azimuth: null, elevation: null });
export const emptySkyMarkers = (): SkyMarkers => ({ sun: emptyMarker(), earth: emptyMarker() });

function pointOnSky(azimuth: number, elevation: number, point = new THREE.Vector3()) {
  const az = THREE.MathUtils.degToRad(azimuth), el = THREE.MathUtils.degToRad(elevation);
  return point.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(8);
}

function SkyTrail({ body, track, elapsed }: { body: SkyBody; track: SurfaceTrack; elapsed: SharedValue<number> }) {
  const { line, ends } = useMemo(() => {
    const ends: number[] = [], points: THREE.Vector3[] = [];
    for (let i = 1; i < track.sampleTimes.length; i++) {
      const start = track.sampleTimes[i - 1], end = track.sampleTimes[i];
      const a = track.position(body, start);
      if (!a.visible) continue;
      const b = track.position(body, end);
      points.push(pointOnSky(a.azimuth, a.elevation), pointOnSky(b.azimuth, b.elevation));
      ends.push(end);
    }
    const line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: body === 'sun' ? '#FFD166' : '#74B9FF', dashSize: .045, gapSize: .045, transparent: true, opacity: .65, depthTest: false }));
    if (points.length) line.computeLineDistances();
    line.geometry.setDrawRange(0, 0);
    line.renderOrder = 1;
    return { line, ends };
  }, [body, track]);
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);
  useFrame(() => {
    const time = elapsed.get();
    let lo = 0, hi = ends.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (ends[mid] <= time) lo = mid + 1; else hi = mid;
    }
    line.geometry.setDrawRange(0, lo * 2);
  });
  return <primitive object={line} />;
}
export function SurfaceSky({ track, elapsed, markers, scrubbing, active }: { track: SurfaceTrack; elapsed: SharedValue<number>; markers: SharedValue<SkyMarkers>; scrubbing: SharedValue<boolean>; active: boolean }) {
  const sun = useRef<THREE.Group>(null), earth = useRef<THREE.Group>(null);
  useFrame(({ camera, size }, dt) => {
    if (active && !scrubbing.get()) elapsed.set(Math.min(track.durationSeconds, elapsed.get() + Math.min(dt, .05) * track.durationSeconds / 90));
    camera.updateMatrixWorld();
    const positions = emptySkyMarkers();
    for (const body of ['sun', 'earth'] as const) {
      const mesh = body === 'sun' ? sun.current : earth.current;
      if (!mesh) continue;
      const sample = track.position(body, elapsed.get());
      pointOnSky(sample.azimuth, sample.elevation, mesh.position);
      mesh.visible = sample.visible === true;
      const local = mesh.position.clone().applyMatrix4(camera.matrixWorldInverse);
      const p = mesh.position.clone().project(camera);
      const visible = mesh.visible && local.z < 0 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
      positions[body] = {
        x: visible ? (p.x + 1) * size.width / 2 : 0,
        y: visible ? (1 - p.y) * size.height / 2 : 0,
        onScreen: visible, visible: sample.visible, azimuth: sample.azimuth, elevation: sample.elevation,
      };
    }
    markers.set(positions);
  });
  return <>
    <SkyTrail body="sun" track={track} elapsed={elapsed} /><SkyTrail body="earth" track={track} elapsed={elapsed} />
    <group ref={sun} />
    <group ref={earth} />
  </>;
}
function SkyLabel({ body, markers, onFind }: { body: SkyBody; markers: SharedValue<SkyMarkers>; onFind: (body: SkyBody) => void }) {
  const style = useAnimatedStyle(() => { const p = markers.get()[body]; return { opacity: p.onScreen ? 1 : 0, pointerEvents: p.onScreen ? 'box-none' as const : 'none' as const, transform: [{ translateX: p.x }, { translateY: p.y }] }; });
  return <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, top: 0, width: 84, height: 34 }, style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Find ${body}`} onPress={() => onFind(body)} style={{ position: 'absolute', left: -12, top: -42, width: 100, height: 64 }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Svg pointerEvents="none" width={100} height={64} style={{ position: 'absolute', left: 0, top: 0 }}><Path d="M12 42 L22 28 L54 28" fill="none" stroke="#fff" strokeWidth={.8} /></Svg>

      <Text pointerEvents="none" style={{ position: 'absolute', left: 26, top: 11, color: '#fff', fontSize: 10, textShadowColor: '#000', textShadowRadius: 3 }}>{body === 'sun' ? 'Sun' : 'Earth'}</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 6, top: 36, width: 12, height: 12, borderRadius: 6, backgroundColor: body === 'sun' ? '#FFD166' : '#74B9FF' }} />
    </Pressable>
  </Animated.View>;
}
export function SurfaceSkyLabels({ markers, onFind }: { markers: SharedValue<SkyMarkers>; onFind: (body: SkyBody) => void }) { return <><SkyLabel body="sun" markers={markers} onFind={onFind} /><SkyLabel body="earth" markers={markers} onFind={onFind} /></>; }
