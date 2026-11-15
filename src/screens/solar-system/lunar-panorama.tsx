import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming, Easing, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Canvas, useLoader } from './render-surface';
import { PanoramaMinimap } from './panorama-minimap';
import { type LunarSite } from './lunar-sites';
import { lunarPanoramas } from './lunar-panorama-assets';

function ViewAngles({ heading, pitch }: { heading: SharedValue<number>; pitch: SharedValue<number> }) {
  const [angles, setAngles] = useState({ azimuth: '0.0', elevation: '0.0' });
  useEffect(() => {
    // Sample the displayed camera angle at 10Hz without rerendering the panorama scene.
    const timer = setInterval(() => {
      const azimuth = ((heading.get() * 180 / Math.PI) % 360 + 360) % 360;
      const elevation = pitch.get() * 180 / Math.PI;
      const next = { azimuth: (Math.round(azimuth * 10) % 3600 / 10).toFixed(1), elevation: (Math.abs(elevation) < .05 ? 0 : elevation).toFixed(1) };
      setAngles(previous => previous.azimuth === next.azimuth && previous.elevation === next.elevation ? previous : next);
    }, 100);
    return () => clearInterval(timer);
  }, [heading, pitch]);
  return <Text testID="panorama-view-angles" pointerEvents="none" style={styles.orientation}>Azimuth {angles.azimuth}° / Elevation {angles.elevation}°</Text>;
}

class PanoramaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text style={styles.failure}>Unable to load this panorama.</Text> : this.props.children; }
}
function PanoramaScene({ source, heading, targetHeading, autoRotate, pitch, ready }: { source: number; heading: SharedValue<number>; targetHeading: SharedValue<number>; autoRotate: SharedValue<boolean>; pitch: SharedValue<number>; ready: () => void }) {
  const [texture] = useLoader(THREE.TextureLoader, [source as unknown as string]);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Reflect the geometry so image u=0 faces +X (north), u=.25 faces +Z (east).
  const geometry = useMemo(() => new THREE.SphereGeometry(10, 64, 32).scale(-1, 1, 1), []);
  useEffect(() => { ready(); return () => { geometry.dispose(); texture.dispose(); }; }, [geometry, texture, ready]);
  useFrame(({ camera }, delta) => {
    if (autoRotate.get()) {
      const next = heading.get() - Math.min(delta, .05) * .0375;
      heading.set(next); targetHeading.set(next);
    }
    const angle = heading.get();
    const elevation = pitch.get(), horizontal = Math.cos(elevation);
    camera.lookAt(horizontal * Math.cos(angle), Math.sin(elevation), horizontal * Math.sin(angle));
  });
  return <mesh geometry={geometry}><meshBasicMaterial map={texture} /></mesh>;
}
export function LunarPanorama({ site, onReady }: { site: LunarSite; onReady?: () => void }) {
  const siteId = site.id;
  const reducedMotion = useReducedMotion();
  const autoRotate = useSharedValue(!reducedMotion);
  const [viewerSize, setViewerSize] = useState({ width: 1, height: 1 });
  const targetHeading = useSharedValue(0), targetPitch = useSharedValue(0);
  const heading = useSharedValue(0), pitch = useSharedValue(0);
  useEffect(() => {
    targetHeading.set(0); targetPitch.set(0); heading.set(0); pitch.set(0); autoRotate.set(!reducedMotion);
  }, [siteId, targetHeading, targetPitch, heading, pitch, autoRotate, reducedMotion]);
  const [loading, setLoading] = useState(true);
  const ready = useMemo(() => () => { setLoading(false); onReady?.(); }, [onReady]);
  const drag = useMemo(() => Gesture.Pan().maxPointers(1).minDistance(3)
    .onTouchesDown(() => autoRotate.set(false))
    .onChange(e => {
      targetHeading.set(targetHeading.get() - e.changeX * .0072);
      targetPitch.set(Math.max(-Math.PI / 2 + .02, Math.min(Math.PI / 2 - .02, targetPitch.get() + e.changeY * .0072)));
      const timing = { duration: 45, easing: Easing.out(Easing.quad) };
      heading.set(withTiming(targetHeading.get(), timing));
      pitch.set(withTiming(targetPitch.get(), timing));
    }), [heading, pitch, targetHeading, targetPitch, autoRotate]);
  const source = lunarPanoramas[siteId];
  return <View style={{ flex: 1, minHeight: 0 }}>
    <PanoramaBoundary>
      <GestureDetector gesture={drag} touchAction="none">
        <View collapsable={false} testID="dem-panorama" accessibilityLabel={`${siteId} DEM panorama. Drag in any direction to look around.`} onLayout={e => setViewerSize(e.nativeEvent.layout)} style={styles.viewer}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas camera={{ position: [0, 0, 0], rotation: [0, -Math.PI / 2, 0], fov: 65, near: .1, far: 30 }} gl={{ antialias: true }}>
              <Suspense fallback={null}><PanoramaScene source={source} heading={heading} targetHeading={targetHeading} autoRotate={autoRotate} pitch={pitch} ready={ready} /></Suspense>
            </Canvas>
          </View>
          <PanoramaMinimap site={site} heading={heading} horizontalFov={2 * Math.atan(Math.tan(65 * Math.PI / 360) * viewerSize.width / Math.max(1, viewerSize.height))} />
          {loading && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />}
          <ViewAngles heading={heading} pitch={pitch} />
        </View>
      </GestureDetector>
    </PanoramaBoundary>
  </View>;
}
const styles = StyleSheet.create({
  viewer: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 12, backgroundColor: '#000', borderWidth: .5, borderColor: '#454c57' },
  orientation: { position: 'absolute', bottom: 10, alignSelf: 'center', color: '#c4ceda', fontSize: 10, fontVariant: ['tabular-nums'], padding: 6, backgroundColor: '#050a12bb', borderRadius: 4 },
  failure: { color: '#aab7c7', padding: 20 },
});
