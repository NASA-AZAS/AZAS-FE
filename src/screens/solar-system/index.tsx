import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, PanResponder, Platform, StyleSheet, ScrollView, Pressable, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas } from './render-surface';
import { SolarScene, type LunarProjection, type ViewControls } from './scene';
import { SpaceHud, type BodyId } from './space-hud';
import { LunarPanorama } from './lunar-panorama';
import { PolarOverview } from './polar-overview';
import { NASA_RED, lunarSites, type LunarSite } from './lunar-sites';
import { viewDistance, INITIAL_MOON_ANGLE, introMoonDistance } from './scale';

const initialView = (): ViewControls => ({ yaw: .18, pitch: .48, zoom: 1, locked: false, revision: 0, fromBody: null });
const sceneTouchStyle: ViewStyle & { touchAction?: 'none' } = Platform.OS === 'web' ? { touchAction: 'none' } : {};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

class SceneBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError('Unable to start the 3D view. Please reopen the app on a device with graphics support.'); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function SolarSystemScreen() {
  const detailScrollGesture = useMemo(() => Gesture.Native(), []);
  const [exploring, setExploring] = useState(false);
  const [candidate, setCandidate] = useState<LunarSite | null>(null);
  const [lunarPoints, setLunarPoints] = useState<LunarProjection>([]);
  const [selected, setSelected] = useState<BodyId | null>('moon');
  const [requestedBody, setRequestedBody] = useState<BodyId | null>('moon');
  const [systemView, setSystemView] = useState(false);
  const [intro, setIntro] = useState(true);
  const [speed, setSpeed] = useState(1);
  const simulationSeconds = useRef(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const { width, height } = useWindowDimensions();
  const controls = useRef({ ...initialView(), yaw: Math.atan2(-Math.cos(INITIAL_MOON_ANGLE), -Math.sin(INITIAL_MOON_ANGLE)), pitch: 0 });
  const selectionMoving = useRef(false);
  const selectionFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(selectionFrame.current), []);
  const gesture = useRef({ x: 0, y: 0, count: 0, pinch: 0 });
  const pinch = (event: import('react-native').GestureResponderEvent) => {
    const [a, b] = event.nativeEvent.touches;
    return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
  };
  const ready = useCallback(() => setLoading(false), []);
  const fail = useCallback((message: string) => { setLoading(false); setError(message); }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {
        // App configuration also declares landscape; resizable OS windows may override it.
      });
    }
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  const responder = useMemo(() => PanResponder.create({
      onStartShouldSetPanResponder: () => !controls.current.locked && !selectionMoving.current,
      onMoveShouldSetPanResponder: () => !controls.current.locked && !selectionMoving.current,
      onPanResponderGrant: (event) => {
        const touch = event.nativeEvent.touches[0];
        gesture.current = { x: touch?.pageX ?? 0, y: touch?.pageY ?? 0, count: event.nativeEvent.touches.length, pinch: pinch(event) };
      },
      onPanResponderMove: (event) => {
        if (controls.current.locked || selectionMoving.current) { gesture.current.count = 0; return; }
        const touch = event.nativeEvent.touches[0];
        if (!touch) return;
        const count = event.nativeEvent.touches.length;
        const previous = gesture.current;
        if (count === 1 && previous.count === 1) {
          controls.current.yaw -= (touch.pageX - previous.x) * .006;
          controls.current.pitch += (touch.pageY - previous.y) * .006;
        }
        const span = pinch(event);
        if (count === 2 && previous.count === 2 && span > 0 && previous.pinch > 0) {
          controls.current.zoom = clamp(controls.current.zoom * previous.pinch / span, .3, 5);
        }
        gesture.current = { x: touch.pageX, y: touch.pageY, count, pinch: span };
      },
      onPanResponderTerminationRequest: () => true,
    }), []);

  const moveTo = (body: BodyId | null, orbitView = false, introView = false) => {
    if (selected === body && body !== null && intro === introView && systemView === orbitView) return;
    setIntro(introView);
    setSystemView(orbitView);
    const current = controls.current;
    controls.current = { ...initialView(), yaw: current.yaw, pitch: current.pitch,
      locked: true, revision: current.revision + 1, fromBody: selected };
    setRequestedBody(body);
    setSelected(body);
  };
  const openEarthSystem = () => {
    if (controls.current.locked || (selected !== null && !intro)) return;
    moveTo('earth', true);
  };
  const openMoonIntro = () => {
    if (!systemView || controls.current.locked) return;
    moveTo('moon', false, true);
  };
  const openExplorer = () => { setExploring(true); setCandidate(null); moveTo('moon'); controls.current.revision += 1; controls.current.locked = true; };
  const selectCandidate = (site: LunarSite) => {
    if (selectionMoving.current || controls.current.locked) return;
    if (candidate) { setCandidate(site); return; }
    selectionMoving.current = true;
    const pitch = controls.current.pitch, zoom = controls.current.zoom;
    let start: number | null = null;
    const advance = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 900), eased = t * t * (3 - 2 * t);
      const delta = Math.atan2(Math.sin(-Math.PI / 2 - pitch), Math.cos(-Math.PI / 2 - pitch));
      controls.current.pitch = pitch + delta * eased;
      controls.current.zoom = zoom + (.16 - zoom) * eased;
      if (t < 1) selectionFrame.current = requestAnimationFrame(advance);
      else { selectionMoving.current = false; setCandidate(site); }
    };
    selectionFrame.current = requestAnimationFrame(advance);
  };
  const closeCandidate = () => {
    cancelAnimationFrame(selectionFrame.current);
    setCandidate(null);
    selectionMoving.current = true;
    const pitch = controls.current.pitch, zoom = controls.current.zoom;
    const delta = Math.atan2(Math.sin(.22 - pitch), Math.cos(.22 - pitch));
    let start: number | null = null;
    const restore = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 800), eased = t * t * (3 - 2 * t);
      controls.current.pitch = pitch + delta * eased;
      controls.current.zoom = zoom + (1 - zoom) * eased;
      if (t < 1) selectionFrame.current = requestAnimationFrame(restore);
      else selectionMoving.current = false;
    };
    selectionFrame.current = requestAnimationFrame(restore);
  };
  const focus = (body: BodyId) => moveTo(body);
  const reset = () => {
    const current = controls.current;
    const angleDelta = Math.atan2(Math.sin(current.yaw - .18), Math.cos(current.yaw - .18));
    const pristine = Math.abs(current.zoom - 1) < .001 && Math.abs(angleDelta) < .001 && Math.abs(current.pitch - .48) < .001;
    if (selected === null && (current.locked || pristine)) return;
    moveTo(null);
  };


  const wheelProps = Platform.OS === 'web' ? {
    onWheel: (event: { deltaY: number }) => {
      if (controls.current.locked || selectionMoving.current) return;
      controls.current.zoom = clamp(controls.current.zoom * Math.exp(event.deltaY * .001), .3, 5);
    },
  } : {};
  return (
    <View style={styles.screen}>
      <View style={[StyleSheet.absoluteFill, sceneTouchStyle, candidate && { right: '46%' }]} {...responder.panHandlers} {...wheelProps} accessibilityLabel="Interactive solar system. Drag to orbit. Select a body to zoom in; reset to return to the Sun-centered overview.">
        <SceneBoundary onError={fail}>
          <Canvas camera={{ position: [-Math.cos(INITIAL_MOON_ANGLE) * introMoonDistance, 0, -Math.sin(INITIAL_MOON_ANGLE) * introMoonDistance], fov: 43, near: .000001, far: 4000 }}
            frameloop={active && !candidate ? 'always' : 'never'}
            gl={{ antialias: true, alpha: false }}
            >
            <Suspense fallback={null}>
              <SolarScene candidateSelected={candidate !== null} exploring={exploring} onLunarProjection={setLunarPoints} speed={speed} simulationSeconds={simulationSeconds} onMoonIntro={openMoonIntro} systemView={systemView} onSystemFocus={openEarthSystem} intro={intro} controls={controls} selected={selected} paused={paused || !active} onReady={ready} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      </View>
      {!exploring && <SpaceHud onExplore={openExplorer} speed={speed} onSpeedChange={setSpeed} simulationSeconds={simulationSeconds} selected={requestedBody} onSelect={focus} paused={paused} onTogglePause={() => setPaused(value => !value)}
        onReset={reset} loading={loading} error={error} />}
      {exploring && <>
        {candidate && <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '54%', backgroundColor: '#03070d' }} pointerEvents="none">{Array.from({ length: 85 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${(i * 73.71) % 100}%`, top: `${(i * 41.13) % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, borderRadius: 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}</Animated.View>}
        {candidate && <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 76, top: 20, width: Math.min(width * .54 - 56, height - 100), height: Math.min(width * .54 - 56, height - 100) + 60 }}><PolarOverview selected={candidate} onSelect={selectCandidate} /></Animated.View>}
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, candidate && { right: '46%' }]}>
          {!candidate && lunarPoints.filter(p => p.visible).map(point => point.id.includes('Pole')
            ? <Text key={point.id} pointerEvents="none" style={{ position: 'absolute', left: point.x - 10, top: point.y - 7, width: 20, textAlign: 'center', color: '#fff', fontSize: 11 }}>{point.id === 'North Pole' ? 'N' : 'S'}</Text>
            : <Pressable key={point.id} accessibilityRole="button" accessibilityLabel={`Open ${lunarSites.find(s => s.id === point.id)?.name}`} onPress={() => selectCandidate(lunarSites.find(s => s.id === point.id)!)} style={{ position: 'absolute', left: point.x - 12, top: point.y - 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="circle-double" size={16} color={'#fff'} accessible={false} /><Text pointerEvents="none" style={{ position: 'absolute', top: 23, width: 80, textAlign: 'center', color: '#fff', fontSize: 9 }}>{lunarSites.find(s => s.id === point.id)?.name}</Text></Pressable>)}
        </View>
        {candidate && <View style={{ position: 'absolute', right: 16, top: 20, bottom: 20, width: '50%', padding: 12, gap: 12, backgroundColor: '#080e18ee', borderWidth: .5, borderColor: '#777', borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 16 }}>South pole · {candidate.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close candidate map" onPress={closeCandidate} style={{ padding: 10 }}><Text style={{ color: '#fff' }}>✕</Text></Pressable></View>
          <GestureDetector gesture={detailScrollGesture} touchAction="pan-y"><ScrollView key={candidate.id} testID="candidate-detail-scroll" nestedScrollEnabled directionalLockEnabled showsVerticalScrollIndicator contentContainerStyle={{ gap: 20, paddingBottom: 12 }}>
            <LunarPanorama site={candidate} viewerHeight={Math.max(270, height - 150)} scrollGesture={detailScrollGesture} />
          </ScrollView></GestureDetector>
        </View>}
      </>}
      {width < height && (
        <View style={styles.rotate}>
          <Text style={styles.rotateTitle}>A wider view of the universe</Text>
          <Text style={styles.notice}>Rotate your device to landscape to explore.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#03070d' },
  rotate: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#03070d', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  rotateTitle: { color: '#eff7ff', fontSize: 22, textAlign: 'center' },
  notice: { color: '#96acbd', textAlign: 'center', lineHeight: 22 },
});
