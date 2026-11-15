import { useEffect, useMemo, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Svg, { Path } from 'react-native-svg';
import { surfaceDuration, surfacePosition, type SkyBody } from './surface-sky-data';

export type SkyMarkers = { sun: { x: number; y: number; visible: boolean; azimuth: number; elevation: number }; earth: { x: number; y: number; visible: boolean; azimuth: number; elevation: number } };
export const emptySkyMarkers = (): SkyMarkers => ({ sun: { x: 0, y: 0, visible: false, azimuth: 0, elevation: 0 }, earth: { x: 0, y: 0, visible: false, azimuth: 0, elevation: 0 } });
function SkyTrail({ body, elapsed }: { body: SkyBody; elapsed: SharedValue<number> }) {
  const line = useMemo(() => {
    const points = Array.from({ length: 241 }, (_, i) => {
      const p = surfacePosition(body, i / 240 * surfaceDuration), az = p.azimuth * Math.PI / 180, el = p.elevation * Math.PI / 180;
      return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(8);
    });
    const result = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: body === 'sun' ? '#FFD166' : '#74B9FF', dashSize: .045, gapSize: .045, transparent: true, opacity: .65, depthTest: false }));
    result.computeLineDistances(); result.renderOrder = 1; return result;
  }, [body]);
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);
  useFrame(() => line.geometry.setDrawRange(0, Math.floor(elapsed.get() / surfaceDuration * 240) + 1));
  return <primitive object={line} />;
}
export function SurfaceSky({ elapsed, markers, scrubbing, active }: { elapsed: SharedValue<number>; markers: SharedValue<SkyMarkers>; scrubbing: SharedValue<boolean>; active: boolean }) {
  const sun = useRef<THREE.Group>(null), earth = useRef<THREE.Group>(null);
  useFrame(({ camera, size }, dt) => {
    if (active && !scrubbing.get()) elapsed.set(Math.min(surfaceDuration, elapsed.get() + Math.min(dt, .05) * surfaceDuration / 90));
    camera.updateMatrixWorld();
    const positions = emptySkyMarkers();
    for (const body of ['sun', 'earth'] as const) {
      const mesh = body === 'sun' ? sun.current : earth.current;
      if (!mesh) continue;
      const sample = surfacePosition(body, elapsed.get());
      const az = THREE.MathUtils.degToRad(sample.azimuth), el = THREE.MathUtils.degToRad(sample.elevation);
      mesh.position.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(8);
      mesh.visible = sample.elevation >= sample.horizon;
      const local = mesh.position.clone().applyMatrix4(camera.matrixWorldInverse);
      const p = mesh.position.clone().project(camera);
      const visible = mesh.visible && local.z < 0 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
      positions[body] = {
        x: visible ? (p.x + 1) * size.width / 2 : 0,
        y: visible ? (1 - p.y) * size.height / 2 : 0,
        visible, azimuth: sample.azimuth, elevation: sample.elevation,
      };
    }
    markers.set(positions);
  });
  return <>
    <SkyTrail body="sun" elapsed={elapsed} /><SkyTrail body="earth" elapsed={elapsed} />
    <group ref={sun} />
    <group ref={earth} />
  </>;
}
function SkyLabel({ body, markers, onFind }: { body: SkyBody; markers: SharedValue<SkyMarkers>; onFind: (body: SkyBody) => void }) {
  const style = useAnimatedStyle(() => { const p = markers.get()[body]; return { opacity: p.visible ? 1 : 0, pointerEvents: p.visible ? 'box-none' as const : 'none' as const, transform: [{ translateX: p.x }, { translateY: p.y }] }; });
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
