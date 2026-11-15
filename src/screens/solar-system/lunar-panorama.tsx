import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withTiming, Easing, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Canvas, useLoader } from './render-surface';
import { SurfaceSky, SurfaceSkyLabels, emptySkyMarkers } from './surface-sky';
import type { SurfaceTrack } from './surface-sky-data';
import type { SiteConditions } from './site-conditions';
import { loadLandingSiteConditions } from './mission-api';
import { SurfaceTimeline } from './surface-timeline';
import { LunarBase } from './lunar-base';
import { PanoramaMinimap } from './panorama-minimap';
import { type LunarSite } from './lunar-sites';
import { lunarPanoramas } from './lunar-panorama-assets';

function ViewAngles({ heading, pitch, landed }: { landed?: boolean; heading: SharedValue<number>; pitch: SharedValue<number> }) {
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
  return <Text testID="panorama-view-angles" pointerEvents="none" style={[styles.orientation, landed && { bottom: 64 }]}>Azimuth {angles.azimuth}° / Elevation {angles.elevation}°</Text>;
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
  return <mesh geometry={geometry} renderOrder={-10}><meshBasicMaterial map={texture} depthWrite={false} /></mesh>;
}
export function LandingSitePreview({ site }: { site: LunarSite }) {
  const [conditions, setConditions] = useState<SiteConditions>();
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    loadLandingSiteConditions(site, controller.signal)
      .then(value => { if (!controller.signal.aborted) setConditions(value); })
      .catch(() => { if (!controller.signal.aborted) setConditions(undefined); })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [site]);
  return <LunarPanorama site={site} conditions={conditions} />;
}

export function LunarPanorama({ site, conditions, onReady, landed = false, surfaceActive = true, track }: { site: LunarSite; conditions?: SiteConditions; onReady?: () => void; landed?: boolean; surfaceActive?: boolean; track?: SurfaceTrack }) {
  const elapsed = useSharedValue(0);
  const scrubbing = useSharedValue(false);
  const skyMarkers = useSharedValue(emptySkyMarkers());
  const siteId = site.id;
  const reducedMotion = useReducedMotion();
  const autoRotate = useSharedValue(!reducedMotion);
  const [viewerSize, setViewerSize] = useState({ width: 1, height: 1 });
  const targetHeading = useSharedValue(0), targetPitch = useSharedValue(0);
  const heading = useSharedValue(0), pitch = useSharedValue(0);
  useEffect(() => {
    targetHeading.set(0); targetPitch.set(0); heading.set(0); pitch.set(0); autoRotate.set(!reducedMotion);
  }, [siteId, targetHeading, targetPitch, heading, pitch, autoRotate, reducedMotion]);
  useEffect(() => {
    elapsed.set(0);
    skyMarkers.set(emptySkyMarkers());
    if (!track) return;
    const first = (['sun', 'earth'] as const).map(body => track.position(body, 0)).find(p => p.visible);
    if (first) {
      const az = THREE.MathUtils.degToRad(first.azimuth), el = THREE.MathUtils.degToRad(first.elevation);
      targetHeading.set(az); heading.set(az); targetPitch.set(el); pitch.set(el);
    }
  }, [track, elapsed, skyMarkers, targetHeading, heading, targetPitch, pitch]);
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
  useEffect(() => { if (source == null) onReady?.(); }, [onReady, source]);
  if (source == null) return <Text style={styles.failure}>Panorama unavailable for this landing site.</Text>;
  return <View style={{ flex: 1, minHeight: 0 }}>
    <PanoramaBoundary>
      <GestureDetector gesture={drag} touchAction="none">
        <View collapsable={false} testID="dem-panorama" accessibilityLabel={`${siteId} DEM panorama. Drag in any direction to look around.`} onLayout={e => setViewerSize(e.nativeEvent.layout)} style={styles.viewer}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas camera={{ position: [0, 0, 0], rotation: [0, -Math.PI / 2, 0], fov: 65, near: .1, far: 30 }} gl={{ antialias: true }}>
              <Suspense fallback={null}><PanoramaScene source={source} heading={heading} targetHeading={targetHeading} autoRotate={autoRotate} pitch={pitch} ready={ready} />{landed && <LunarBase />}{landed && track && <SurfaceSky track={track} elapsed={elapsed} markers={skyMarkers} scrubbing={scrubbing} active={surfaceActive} />}</Suspense>
            </Canvas>
          </View>
          {landed && track && <SurfaceSkyLabels markers={skyMarkers} onFind={body => {
            autoRotate.set(false);
            const position = track.position(body, elapsed.get());
            const az = position.azimuth * Math.PI / 180, el = position.elevation * Math.PI / 180;
            const next = heading.get() + Math.atan2(Math.sin(az - heading.get()), Math.cos(az - heading.get()));
            targetHeading.set(next); targetPitch.set(el);
            heading.set(withTiming(next, { duration: 600 })); pitch.set(withTiming(el, { duration: 600 }));
          }} />}
          <PanoramaMinimap conditions={conditions} skyMarkers={landed && track ? skyMarkers : undefined} side={landed ? 'right' : 'left'} site={site} heading={heading} horizontalFov={2 * Math.atan(Math.tan(65 * Math.PI / 360) * viewerSize.width / Math.max(1, viewerSize.height))} />
          {loading && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />}
          <ViewAngles heading={heading} pitch={pitch} landed={landed} />
        </View>
      </GestureDetector>
    </PanoramaBoundary>
    {landed && track && <SurfaceTimeline touchdownMs={track.touchdownMs} durationSeconds={track.durationSeconds} elapsed={elapsed} autoRotate={autoRotate} scrubbing={scrubbing} />}
  </View>;
}
const styles = StyleSheet.create({
  viewer: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 12, backgroundColor: '#000', borderWidth: .5, borderColor: '#454c57' },
  orientation: { position: 'absolute', bottom: 10, alignSelf: 'center', color: '#c4ceda', fontSize: 10, fontVariant: ['tabular-nums'], padding: 6, backgroundColor: '#050a12bb', borderRadius: 4 },
  failure: { color: '#aab7c7', padding: 20 },
});
