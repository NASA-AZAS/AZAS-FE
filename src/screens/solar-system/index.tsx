import { theme } from '../../theme';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, PanResponder, Platform, StyleSheet, Pressable, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas } from './render-surface';
import { SolarScene, type LunarProjection, type ViewControls } from './scene';
import { SpaceHud, type BodyId } from './space-hud';
import { launchSites } from './launch-sites';
import { LaunchTimeList } from './launch-time-list';
import { LunarGuide } from './lunar-guide';
import { StartupSplash } from './startup-splash';
import { overviewTiles } from './local-overview-tiles';
import { localLunarAssets } from './local-lunar-assets';
import { localMinimaps } from './local-minimap-assets';
import { lunarPanoramas } from './lunar-panorama-assets';
import { LunarPanorama } from './lunar-panorama';
import { ArrivalDatePicker } from './arrival-date-picker';
import type { ArrivalWindow } from './arrival-windows';
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
  const [startup, setStartup] = useState<'loading' | 'flight' | 'done'>('loading');
  const startupBlocked = useRef(true);
  const [brandHeld, setBrandHeld] = useState(false);
  const [brandReady, setBrandReady] = useState(false);
  const brandLoaded = useCallback(() => { setBrandReady(true); SplashScreen.hideAsync().catch(() => {}); }, []);
  useEffect(() => {
    if (!brandReady) return;
    const timer = setTimeout(() => setBrandHeld(true), 1500);
    return () => clearTimeout(timer);
  }, [brandReady]);
  const [assetsReady, setAssetsReady] = useState(false);
  const [splashShown, setSplashShown] = useState(false);
  const startupDone = useCallback(() => { startupBlocked.current = false; setStartup('done'); }, []);
  const launchLocked = useRef(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [rocketGone, setRocketGone] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [earthStage, setEarthStage] = useState(false);
  const earthStageRef = useRef(false);
  const chosenLanding = useRef<LunarSite | null>(null);
  const chosenArrival = useRef<ArrivalWindow | null>(null);
  const [choosingArrival, setChoosingArrival] = useState(false);
  const [launchSiteId, setLaunchSiteId] = useState<string | null>(null);
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
  const tourTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tourFrame = useRef(0);
  const cancelTour = () => { if (tourTimer.current) clearTimeout(tourTimer.current); tourTimer.current = null; cancelAnimationFrame(tourFrame.current); };
  useEffect(() => () => { if (tourTimer.current) clearTimeout(tourTimer.current); cancelAnimationFrame(tourFrame.current); }, []);
  const guideReady = useCallback(() => { launchLocked.current = false; setLaunchBusy(false); }, []);
  const explorerArrival = useCallback(() => {
    launchLocked.current = true;
    setLaunchBusy(true);
    if (tourTimer.current) clearTimeout(tourTimer.current);
    if (earthStageRef.current) { setGuideVisible(true); return; }
    tourTimer.current = setTimeout(() => {
      launchLocked.current = true;
      setLaunchBusy(true);
      const pitch = controls.current.pitch, zoom = controls.current.zoom;
      const delta = Math.atan2(Math.sin(-Math.PI / 2 - pitch), Math.cos(-Math.PI / 2 - pitch));
      let start: number | null = null;
      const advance = (now: number) => {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / 1200), eased = t*t*(3-2*t);
        controls.current.pitch = pitch + delta * eased;
        controls.current.zoom = zoom + (.36 - zoom) * eased;
        if (t < 1) tourFrame.current = requestAnimationFrame(advance);
        else { setGuideVisible(true); }
      };
      tourFrame.current = requestAnimationFrame(advance);
    }, 1000);
  }, []);
  const selectionMoving = useRef(false);
  const selectionFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(selectionFrame.current), []);
  const gesture = useRef({ x: 0, y: 0, count: 0, pinch: 0 });
  const pinch = (event: import('react-native').GestureResponderEvent) => {
    const [a, b] = event.nativeEvent.touches;
    return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
  };
  useEffect(() => {
    let alive = true;
    Promise.all([Ionicons.loadFont(), MaterialCommunityIcons.loadFont(), Asset.loadAsync([
      require('../../../assets/rocket-neon-dark.png'), ...overviewTiles.map(t => t.source),
      ...Object.values(localLunarAssets).map(a => a.image), ...Object.values(localMinimaps), ...Object.values(lunarPanoramas),
    ])]).then(() => { if (alive) setAssetsReady(true); }).catch(() => { if (alive) setError('Unable to prepare local assets. Please reopen the app.'); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (startup === 'loading' && assetsReady && brandReady && brandHeld && splashShown && !loading && !error) setStartup('flight'); }, [startup, assetsReady, brandReady, brandHeld, splashShown, loading, error]);
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
      onStartShouldSetPanResponder: () => !controls.current.locked && !selectionMoving.current && !launchLocked.current && !startupBlocked.current,
      onMoveShouldSetPanResponder: () => !controls.current.locked && !selectionMoving.current && !launchLocked.current && !startupBlocked.current,
      onPanResponderGrant: (event) => {
        cancelTour();
        const touch = event.nativeEvent.touches[0];
        gesture.current = { x: touch?.pageX ?? 0, y: touch?.pageY ?? 0, count: event.nativeEvent.touches.length, pinch: pinch(event) };
      },
      onPanResponderMove: (event) => {
        if (controls.current.locked || selectionMoving.current || launchLocked.current || startupBlocked.current) { gesture.current.count = 0; return; }
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
          controls.current.zoom = clamp(controls.current.zoom * previous.pinch / span, earthStageRef.current ? .25 : .3, 5);
        }
        gesture.current = { x: touch.pageX, y: touch.pageY, count, pinch: span };
      },
      onPanResponderTerminationRequest: () => true,
    }), []);

  const moveTo = (body: BodyId | null, orbitView = false, introView = false, launchHandoff = false) => {
    if (launchLocked.current && !launchHandoff) return;
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
  const openExplorer = (launchHandoff = false) => { if (launchLocked.current && !launchHandoff) return; setGuideVisible(false); setExploring(true); setCandidate(null); moveTo('moon', false, false, launchHandoff); controls.current.revision += 1; controls.current.locked = true; launchLocked.current = true; setLaunchBusy(true); };
  const chooseLanding = (arrival: ArrivalWindow) => {
    if (!candidate || launchLocked.current || selectionMoving.current) return;
    cancelTour();
    chosenLanding.current = candidate;
    chosenArrival.current = arrival;
    setChoosingArrival(false);
    setGuideVisible(false);
    setCandidate(null);
    setLunarPoints([]);
    earthStageRef.current = true; setEarthStage(true);
    moveTo('earth');
    launchLocked.current = true; setLaunchBusy(true);
  };
  const selectLaunchSite = useCallback((id: string) => {
    if (!launchLocked.current && !controls.current.locked) setLaunchSiteId(id);
  }, []);
  const selectCandidate = (site: LunarSite) => {
    cancelTour();
    if (selectionMoving.current || controls.current.locked) return;
    setChoosingArrival(false);
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
    setChoosingArrival(false);
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
      if (controls.current.locked || selectionMoving.current || launchLocked.current || startupBlocked.current) return;
      cancelTour();
      controls.current.zoom = clamp(controls.current.zoom * Math.exp(event.deltaY * .001), earthStageRef.current ? .25 : .3, 5);
    },
  } : {};
  return (
    <View style={styles.screen} onLayout={() => setSplashShown(true)}>
      <View style={[StyleSheet.absoluteFill, sceneTouchStyle, candidate && { right: '46%' }]} {...responder.panHandlers} {...wheelProps} accessibilityLabel="Interactive solar system. Drag to orbit. Select a body to zoom in; reset to return to the Sun-centered overview.">
        <SceneBoundary onError={fail}>
          <Canvas camera={{ position: [0, viewDistance.overview * 2, viewDistance.overview * 5], fov: 43, near: .000001, far: 4000 }}
            frameloop={active && !candidate ? 'always' : 'never'}
            gl={{ antialias: true, alpha: false }}
            >
            <Suspense fallback={null}>
              <SolarScene earthExploring={earthStage} startup={startup} onStartupDone={startupDone} onExplorerArrival={explorerArrival} candidateSelected={candidate !== null} exploring={exploring} onLunarProjection={setLunarPoints} speed={speed} simulationSeconds={simulationSeconds} onMoonIntro={openMoonIntro} systemView={systemView} onSystemFocus={openEarthSystem} intro={intro} controls={controls} selected={selected} paused={paused || !active || startup !== 'done'} onReady={ready} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      </View>
      {startup === 'done' && !exploring && <Animated.View entering={FadeIn.duration(650)} pointerEvents="box-none" style={StyleSheet.absoluteFill}><SpaceHud launchLocked={launchBusy} onRocketLaunchStart={() => { launchLocked.current = true; setLaunchBusy(true); }} onRocketFlightComplete={() => openExplorer(true)} rocketGone={rocketGone} onRocketDeparture={() => setRocketGone(true)} onExplore={openExplorer} speed={speed} onSpeedChange={setSpeed} simulationSeconds={simulationSeconds} selected={requestedBody} onSelect={focus} paused={paused} onTogglePause={() => setPaused(value => !value)}
        onReset={reset} loading={loading} error={error} /></Animated.View>}
      {exploring && <>
        {candidate && <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', backgroundColor: '#03070d' }} pointerEvents="none">{Array.from({ length: 85 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${(i * 73.71) % 100}%`, top: `${(i * 41.13) % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, borderRadius: 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}</Animated.View>}
        {candidate && <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 76, top: 20, width: Math.min(width * .54 - 56, height - 100), height: Math.min(width * .54 - 56, height - 100) + 60 }}><PolarOverview selected={candidate} onSelect={selectCandidate} /></Animated.View>}
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, candidate && { right: '46%' }]}>
          {!candidate && lunarPoints.filter(p => p.visible && p.id !== 'South Pole Surface' && p.id !== 'earth-select-anchor').map(point => point.id.includes('Pole')
            ? <Text key={point.id} pointerEvents="none" style={{ position: 'absolute', left: point.x - 10, top: point.y - 7, width: 20, textAlign: 'center', color: '#fff', fontSize: 11 }}>{point.id === 'North Pole' ? 'N' : 'S'}</Text>
            : <View key={point.id} pointerEvents="box-none" style={{ position: 'absolute', left: point.x - (earthStage ? 65 : 12), top: point.y - 12, width: earthStage ? 130 : 24, height: earthStage ? 64 : 24, zIndex: earthStage && launchSiteId === point.id ? 2 : 1 }}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: earthStage && launchSiteId === point.id }} accessibilityLabel={`Open ${(earthStage ? launchSites : lunarSites).find(s => s.id === point.id)?.name}`} onPress={() => earthStage ? selectLaunchSite(point.id) : selectCandidate(lunarSites.find(s => s.id === point.id)!)} style={{ width: 24, height: 24, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="circle-double" size={16} color={earthStage && launchSiteId === point.id ? NASA_RED : '#fff'} accessible={false} />
                </Pressable>
                {earthStage ? <Pressable accessibilityRole="button" accessibilityLabel={`Select ${launchSites.find(s => s.id === point.id)?.name}`} accessibilityState={{ selected: launchSiteId === point.id }} onPress={() => selectLaunchSite(point.id)} style={{ position: 'absolute', top: 23, left: 0, width: 130, minHeight: 32 }}>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ textAlign: 'center', color: launchSiteId === point.id ? NASA_RED : '#fff', fontSize: 8 }}>{launchSites.find(s => s.id === point.id)?.name}</Text>
                </Pressable> : <Text pointerEvents="none" style={{ position: 'absolute', top: 23, left: -28, width: 80, textAlign: 'center', color: '#fff', fontSize: 9 }}>{lunarSites.find(s => s.id === point.id)?.name}</Text>}
              </View>)}
        </View>
        {candidate && <View style={{ position: 'absolute', right: 16, top: 20, bottom: 20, width: '50%', padding: 12, gap: 12, ...theme.outlineSurface, borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{choosingArrival && <Pressable accessibilityRole="button" accessibilityLabel="Back to panorama" onPress={() => setChoosingArrival(false)} style={{ padding: 8 }}><Ionicons name="arrow-back-outline" size={18} color="#fff" /></Pressable>}<Text style={{ color: '#fff', fontSize: 16 }}>{candidate.name} | {choosingArrival ? 'Arrival Date' : 'DEM 360° Panorama'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close candidate map" onPress={closeCandidate} style={{ padding: 10 }}><Text style={{ color: '#fff' }}>✕</Text></Pressable></View>
          {choosingArrival ? <ArrivalDatePicker key={candidate.id} onConfirm={chooseLanding} /> : <>
          <LunarPanorama key={candidate.id} site={candidate} />
          <Pressable testID="choose-landing-site" accessibilityRole="button" accessibilityLabel="Confirm Landing Site" onPress={() => setChoosingArrival(true)} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', ...theme.outlineSurface, borderWidth: .3, borderRadius: 8, opacity: pressed ? .65 : 1 })}>
            <MaterialCommunityIcons name="bullseye" size={19} color="#fff" accessible={false} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Confirm Landing Site</Text>
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" accessible={false} />
          </Pressable>
          </>}
        </View>}
      </>}
      {earthStage && guideVisible && chosenArrival.current && <LaunchTimeList arrivalAt={chosenArrival.current.arrivalAt} selectedId={launchSiteId} onSelect={selectLaunchSite} />}
      {exploring && !candidate && guideVisible && <LunarGuide key={earthStage ? 'earth' : 'moon'} stage={earthStage ? 'earth' : 'moon'} onReady={guideReady} polePoint={lunarPoints.find(p => p.id === 'South Pole Surface')} clusterPoint={earthStage ? lunarPoints.find(p => p.id === 'earth-select-anchor') : lunarPoints.find(p => p.id === 'Site01')} onSelectCluster={() => { if (earthStage) { const point = lunarPoints.find(p => p.visible && p.id.startsWith('launch-')); if (point) selectLaunchSite(point.id); } else selectCandidate(lunarSites.find(site => site.id === 'Site01') ?? lunarSites[0]); }} />}
      {launchBusy && <View testID="launch-input-lock" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} accessibilityLabel="Launch sequence in progress" accessibilityViewIsModal />}
      {startup !== 'done' && <StartupSplash onBrandReady={brandLoaded} leaving={startup === 'flight'} error={error} />}
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
