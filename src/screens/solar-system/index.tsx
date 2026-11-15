import { theme } from '../../theme';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, PanResponder, Platform, StyleSheet, Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas } from './render-surface';
import { SolarScene, type LunarProjection, type ViewControls } from './scene';
import { SpaceHud, type BodyId } from './space-hud';
import { loadLandingSites, loadTrajectory, type LaunchPlan } from './mission-api';
import type { LaunchSite } from './launch-sites';
import { LaunchOverview } from './launch-overview';
import { LaunchSiteInfo } from './launch-site-info';
import { LunarArrival } from './lunar-arrival';
import { MoonLaunchVideo } from './moon-launch-video';
import { TransferGuide } from './transfer-guide';
import { MoonFlightHud, FlightSiteMarkers } from './moon-flight-hud';
import { createTransferRoute, initialFlightTelemetry, type TransferRoute, type FlightPlayback, type FlightMarkers } from './transfer-route';
import { JourneyArrow, JourneyVideoFade } from './journey-countdown';
import { hasLaunchCallout, LaunchSiteCallout } from './launch-site-callout';
import { LaunchTimeList } from './launch-time-list';
import { LunarGuide } from './lunar-guide';
import { StartupSplash } from './startup-splash';
import { overviewTiles } from './local-overview-tiles';
import { localLunarAssets } from './local-lunar-assets';
import { localMinimaps } from './local-minimap-assets';
import { lunarPanoramas } from './lunar-panorama-assets';
import { LandingSitePreview } from './lunar-panorama';
import { ArrivalDatePicker } from './arrival-date-picker';
import { PolarOverview } from './polar-overview';
import { NASA_RED, type LunarSite } from './lunar-sites';
import { viewDistance, INITIAL_MOON_ANGLE, introMoonDistance } from './scale';

const noLaunchSites: LaunchSite[] = [];
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
  const [returnCover, setReturnCover] = useState(false);
  const returnOpacity = useSharedValue(0);
  useEffect(() => { returnOpacity.set(withTiming(returnCover ? 1 : 0, { duration: returnCover ? 180 : 450 })); }, [returnCover, returnOpacity]);
  const returnStyle = useAnimatedStyle(() => ({ opacity: returnOpacity.get() }));
  const prepareReturnHome = useCallback(() => setReturnCover(true), []);
  const [returningHome, setReturningHome] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
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
  const startupDone = useCallback(() => { startupBlocked.current = false; setStartup('done'); setReturningHome(false); launchLocked.current = false; setLaunchBusy(false); controls.current.locked = false; }, []);
  const launchLocked = useRef(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [rocketGone, setRocketGone] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [earthStage, setEarthStage] = useState(false);
  const earthStageRef = useRef(false);
  const chosenLanding = useRef<LunarSite | null>(null);
  const [launchPlan, setLaunchPlan] = useState<LaunchPlan | null>(null);
  const [showSiteList, setShowSiteList] = useState(false);
  const [trajectory, setTrajectory] = useState<{ runId: string; candidateId: string; route: TransferRoute } | null>(null);
  const savedTrajectoryIds = useRef(new Map<string, string>());
  const [trajectoryBusy, setTrajectoryBusy] = useState(false);
  const [trajectoryError, setTrajectoryError] = useState('');
  const trajectoryRequest = useRef<AbortController | null>(null);
  const cancelTrajectory = useCallback(() => {
    trajectoryRequest.current?.abort();
    trajectoryRequest.current = null;
    setTrajectoryBusy(false);
    setTrajectoryError('');
  }, []);
  useEffect(() => () => { trajectoryRequest.current?.abort(); trajectoryRequest.current = null; }, []);
  const launchSites = launchPlan?.sites ?? noLaunchSites;
  const [lunarSites, setLunarSites] = useState<LunarSite[]>([]);
  const [catalogMessage, setCatalogMessage] = useState('Loading landing sites…');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalogPending, setCatalogPending] = useState(true);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    setCatalogPending(true);
    setCatalogMessage('Loading landing sites…');
    loadLandingSites(controller.signal).then(sites => {
      if (!current) return;
      setLunarSites(sites);
      setCatalogMessage(sites.length ? '' : 'No landing sites are available.');
    }).catch(() => {
      if (current) setCatalogMessage('Unable to load landing sites.');
    }).finally(() => {
      clearTimeout(timer);
      if (current) setCatalogPending(false);
    });
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [catalogAttempt]);
  const [choosingArrival, setChoosingArrival] = useState(false);
  const [launchSiteId, setLaunchSiteId] = useState<string | null>(null);
  const [launchDetail, setLaunchDetail] = useState<string | null>(null);
  const detailSite = launchSites.find(site => site.id === launchDetail);
  const [missionStage, setMissionStage] = useState<'idle' | 'countdown' | 'fade' | 'video' | 'return' | 'ready' | 'flight' | 'arrived'>('idle');
  const missionStageRef = useRef<'idle' | 'countdown' | 'fade' | 'video' | 'return' | 'ready' | 'flight' | 'arrived'>('idle');
  const previewVisible = missionStage === 'ready' || missionStage === 'countdown' || missionStage === 'fade';
  const missionFlying = missionStage === 'flight' || missionStage === 'arrived';
  const flightTelemetry = useRef(initialFlightTelemetry());
  const flightMarkers = useSharedValue<FlightMarkers>({ earthX: 0, earthY: 0, earthVisible: false, moonX: 0, moonY: 0, moonVisible: false, sunX: 0, sunY: 0, sunVisible: false });
  const flightPlayback = useRef<FlightPlayback>({ speed: 1, paused: false, skip: false });
  const confirmedLaunch = useRef<string | null>(null);
  const previousPause = useRef(false);
  const [launchVideoError, setLaunchVideoError] = useState(false);
  const earthReturnView = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const [exploring, setExploring] = useState(false);
  const [lunarSiteId, setLunarSiteId] = useState<string | null>(null);
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
  const insets = useSafeAreaInsets();
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
  const ready = useCallback(() => { setLoading(false); requestAnimationFrame(() => requestAnimationFrame(() => setReturnCover(false))); }, []);
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
  const chooseLanding = (plan: LaunchPlan) => {
    if (!candidate || launchLocked.current || selectionMoving.current) return;
    cancelTour();
    chosenLanding.current = candidate;
    savedTrajectoryIds.current.clear();
    setLaunchPlan(plan);
    setChoosingArrival(false);
    setGuideVisible(false);
    setCandidate(null);
    setLunarPoints([]);
    earthStageRef.current = true; setEarthStage(true);
    moveTo('earth');
    launchLocked.current = true; setLaunchBusy(true);
  };
  const changeLandingSite = () => {
    if (launchLocked.current || selectionMoving.current) return;
    earthStageRef.current = false; setEarthStage(false);
    setLaunchPlan(null); setTrajectory(null); setLaunchSiteId(null); setLunarPoints([]);
    chosenLanding.current = null;
    openExplorer();
  };
  const selectLaunchSite = useCallback((id: string) => {
    if (missionStageRef.current !== 'idle' || launchLocked.current || controls.current.locked || selectionMoving.current) return;
    if (launchDetail === id) return;
    cancelTrajectory();
    setLaunchSiteId(id);
    if (launchDetail) { setLaunchDetail(id); return; }
    const { yaw, pitch, zoom } = controls.current;
    earthReturnView.current = { yaw, pitch, zoom };
    controls.current.surfaceFocus = { siteId: id, startYaw: yaw, startPitch: pitch, progress: 0 };
    selectionMoving.current = true;
    launchLocked.current = true; setLaunchBusy(true);
    let start: number | null = null;
    const advance = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 1000), eased = t * t * (3 - 2 * t);
      if (controls.current.surfaceFocus) controls.current.surfaceFocus.progress = eased;
      controls.current.zoom = zoom + (.25 - zoom) * eased;
      if (t < 1) selectionFrame.current = requestAnimationFrame(advance);
      else {
        selectionMoving.current = false;
        setLaunchDetail(id);
        launchLocked.current = false; setLaunchBusy(false);
      }
    };
    selectionFrame.current = requestAnimationFrame(advance);
  }, [launchDetail, cancelTrajectory]);
  const closeLaunchDetail = () => {
    cancelTrajectory();
    setLaunchDetail(null);
    controls.current.surfaceFocus = undefined;
    const { yaw, pitch, zoom } = controls.current;
    const target = earthReturnView.current;
    const delta = Math.atan2(Math.sin(target.yaw - yaw), Math.cos(target.yaw - yaw));
    selectionMoving.current = true;
    launchLocked.current = true; setLaunchBusy(true);
    let start: number | null = null;
    const restore = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 800), eased = t * t * (3 - 2 * t);
      controls.current.yaw = yaw + delta * eased;
      controls.current.pitch = pitch + (target.pitch - pitch) * eased;
      controls.current.zoom = zoom + (target.zoom - zoom) * eased;
      if (t < 1) selectionFrame.current = requestAnimationFrame(restore);
      else { selectionMoving.current = false; launchLocked.current = false; setLaunchBusy(false); }
    };
    selectionFrame.current = requestAnimationFrame(restore);
  };
  const openTransferPreview = async () => {
    const candidateId = detailSite?.candidateId;
    if (!launchDetail || !launchPlan || !candidateId || trajectoryRequest.current || launchLocked.current || missionStageRef.current !== 'idle') return;
    const runId = launchPlan.runId;
    if (trajectory?.runId !== runId || trajectory.candidateId !== candidateId) {
      const controller = new AbortController();
      trajectoryRequest.current = controller;
      const timeout = setTimeout(() => controller.abort(), 150_000);
      setTrajectoryBusy(true); setTrajectoryError('');
      try {
        const saved = await loadTrajectory(runId, candidateId, controller.signal, savedTrajectoryIds.current.get(candidateId));
        if (trajectoryRequest.current !== controller) return;
        const route = createTransferRoute(saved.samples);
        savedTrajectoryIds.current.set(candidateId, saved.trajectoryId);
        setTrajectory({ runId, candidateId, route });
      } catch (error) {
        if (trajectoryRequest.current === controller) {
          savedTrajectoryIds.current.delete(candidateId);
          setTrajectoryError(controller.signal.aborted ? 'Trajectory request timed out. Try again.'
            : error instanceof Error ? error.message : 'Unable to load the transfer trajectory.');
        }
        return;
      } finally {
        clearTimeout(timeout);
        if (trajectoryRequest.current === controller) { trajectoryRequest.current = null; setTrajectoryBusy(false); }
      }
    }
    confirmedLaunch.current = launchDetail;
    setLaunchSiteId(launchDetail);
    previousPause.current = paused;
    setPaused(true); setLaunchVideoError(false);
    launchLocked.current = true; setLaunchBusy(true);
    missionStageRef.current = 'return'; setMissionStage('return');
    setGuideVisible(false); setLaunchDetail(null); setLunarPoints([]);
    controls.current.surfaceFocus = undefined; controls.current.locked = false;
    selectionMoving.current = true;
  };
  const startJourney = () => {
    if (missionStageRef.current !== 'ready' || !confirmedLaunch.current) return;
    setLaunchVideoError(false);
    launchLocked.current = true; setLaunchBusy(true);
    missionStageRef.current = 'countdown'; setMissionStage('countdown');
  };
  const countdownFinished = useCallback(() => {
    if (missionStageRef.current !== 'countdown') return;
    missionStageRef.current = 'fade'; setMissionStage('fade');
  }, []);
  const fadeFinished = useCallback(() => {
    if (missionStageRef.current !== 'fade') return;
    missionStageRef.current = 'video'; setMissionStage('video');
  }, []);
  const backToLaunchSite = () => {
    if (missionStageRef.current !== 'ready' || !confirmedLaunch.current) return;
    missionStageRef.current = 'idle'; setMissionStage('idle');
    setLaunchDetail(confirmedLaunch.current); setGuideVisible(true); setLunarPoints([]);
    setPaused(previousPause.current); setLaunchVideoError(false);
    controls.current.snapView = true;
    launchLocked.current = false; setLaunchBusy(false);
  };
  const videoFailed = useCallback(() => {
    if (missionStageRef.current !== 'video') return;
    missionStageRef.current = 'ready'; setMissionStage('ready');
    setLaunchVideoError(true); setLaunchBusy(false);
  }, []);
  const videoFinished = useCallback(() => {
    if (missionStageRef.current !== 'video' || !confirmedLaunch.current) return;
    controls.current.yaw = .35; controls.current.pitch = .4; controls.current.zoom = 1;
    controls.current.locked = false; controls.current.surfaceFocus = undefined;
    flightTelemetry.current = initialFlightTelemetry(trajectory?.route);
    flightPlayback.current = { speed: 1, paused: false, skip: false };
    missionStageRef.current = 'flight'; setMissionStage('flight');
    selectionMoving.current = false;
    launchLocked.current = false; setLaunchBusy(false);
  }, [trajectory]);
  const flightArrived = useCallback(() => {
    if (missionStageRef.current !== 'flight') return;
    controls.current.locked = true;
    launchLocked.current = true; setLaunchBusy(true);
    missionStageRef.current = 'arrived'; setMissionStage('arrived');
  }, []);
  const arrivalReady = useCallback(() => { setLaunchBusy(false); }, []);
  const returnHome = useCallback(() => {
    cancelTour(); cancelAnimationFrame(selectionFrame.current);
    startupBlocked.current = true; launchLocked.current = true; selectionMoving.current = false;
    setReturnCover(true); setLaunchBusy(true); setReturningHome(true);
    missionStageRef.current = 'idle'; setMissionStage('idle');
    chosenLanding.current = null; confirmedLaunch.current = null;
    setLaunchPlan(null); setTrajectory(null); setTrajectoryError(''); savedTrajectoryIds.current.clear(); setShowSiteList(false);
    earthStageRef.current = false; setEarthStage(false); setExploring(false); setGuideVisible(false);
    setCandidate(null); setLunarSiteId(null); setLaunchSiteId(null); setLaunchDetail(null); setChoosingArrival(false);
    setRocketGone(false); setLaunchVideoError(false); setLunarPoints([]);
    setSelected('moon'); setRequestedBody('moon'); setIntro(true); setSystemView(false);
    setPaused(false); setSpeed(1); simulationSeconds.current = 0;
    flightPlayback.current = { speed: 1, paused: false, skip: false }; flightTelemetry.current = initialFlightTelemetry();
    controls.current = { ...initialView(), yaw: Math.atan2(-Math.cos(INITIAL_MOON_ANGLE), -Math.sin(INITIAL_MOON_ANGLE)), pitch: 0, locked: true };
    setSceneKey(key => key + 1); setStartup('flight');
  }, []);
  const transferReady = useCallback(() => {
    if (missionStageRef.current !== 'return') return;
    missionStageRef.current = 'ready'; setMissionStage('ready');
    selectionMoving.current = false;
    setLaunchBusy(false);
    // The transfer preview stays non-interactive; only the next-step UI is available.
  }, []);
  const selectCandidate = (site: LunarSite) => {
    cancelTour();
    if (selectionMoving.current || controls.current.locked) return;
    setShowSiteList(false);
    setChoosingArrival(false);
    setLunarSiteId(site.id);
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
    setLunarSiteId(null);
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
            frameloop={active && !candidate && !launchDetail ? 'always' : 'never'}
            gl={{ antialias: true, alpha: false }}
            >
            <Suspense fallback={null}>
              <SolarScene key={sceneKey} flightRoute={trajectory?.route ?? null} lunarSites={lunarSites} launchSites={launchSites} missionFlight={missionFlying} flightActive={active && missionStage === 'flight'} flightTelemetry={flightTelemetry} flightPlayback={flightPlayback} flightMarkers={flightMarkers} flightLaunchId={confirmedLaunch.current ?? undefined} flightLandingId={chosenLanding.current?.id} onFlightArrived={flightArrived} missionTransfer={missionStage !== 'idle'} onTransferReady={transferReady} earthExploring={earthStage} startup={startup} onStartupDone={startupDone} onExplorerArrival={explorerArrival} candidateSelected={candidate !== null} exploring={exploring} onLunarProjection={setLunarPoints} speed={speed} simulationSeconds={simulationSeconds} onMoonIntro={openMoonIntro} systemView={systemView} onSystemFocus={openEarthSystem} onOverviewFocus={reset} intro={intro} controls={controls} selected={selected} paused={paused || !active || startup !== 'done'} onReady={ready} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      </View>
      {startup === 'done' && !exploring && <Animated.View entering={FadeIn.duration(650)} pointerEvents="box-none" style={StyleSheet.absoluteFill}><SpaceHud launchLocked={launchBusy} onRocketLaunchStart={() => { launchLocked.current = true; setLaunchBusy(true); }} onRocketFlightComplete={() => openExplorer(true)} rocketGone={rocketGone} onRocketDeparture={() => setRocketGone(true)} onExplore={openExplorer} speed={speed} onSpeedChange={setSpeed} simulationSeconds={simulationSeconds} selected={requestedBody} onSelect={focus} paused={paused} onTogglePause={() => setPaused(value => !value)}
        onReset={reset} loading={loading} error={error} /></Animated.View>}
      {exploring && <>
        {(candidate || launchDetail) && <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', backgroundColor: '#03070d' }} pointerEvents="none">{Array.from({ length: 85 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${(i * 73.71) % 100}%`, top: `${(i * 41.13) % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, borderRadius: 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}</Animated.View>}
        {candidate && <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 76, top: 20, width: Math.min(width * .54 - 56, height - 100), height: Math.min(width * .54 - 56, height - 100) + 60 }}><PolarOverview lunarSites={lunarSites} selected={candidate} onSelect={selectCandidate} /></Animated.View>}
        <Animated.View key={previewVisible ? 'transfer-labels' : 'explorer-labels'} entering={previewVisible ? FadeIn.duration(650) : undefined} pointerEvents="box-none" style={[StyleSheet.absoluteFill, candidate && { right: '46%' }]}>
          {!candidate && !launchDetail && (missionStage === 'idle' || previewVisible) && lunarPoints.filter(p => p.visible && p.id !== 'South Pole Surface' && p.id !== 'earth-select-anchor' && (missionStage === 'idle' || p.id === 'transfer-moon' || p.id === 'transfer-earth')).map(point => {
            if (point.id === 'transfer-earth' || point.id === 'transfer-moon') return <View key={point.id} pointerEvents="none" style={{ position: 'absolute', left: point.x - 70, top: point.y - 38, width: 140, height: 110, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, transform: [{ translateY: point.id === 'transfer-earth' ? -8 : 0 }] }}>{point.id === 'transfer-earth' ? 'Departure' : 'Destination'}</Text>
              <MaterialCommunityIcons name="circle-double" size={14} color={NASA_RED} accessible={false} style={{ position: 'absolute', top: 31 }} />
              <Text testID={point.id === 'transfer-moon' ? 'transfer-landing-site' : 'transfer-launch-site'} numberOfLines={1} style={{ position: 'absolute', top: 57, width: 140, color: NASA_RED, fontSize: 9, textAlign: 'center' }}>{point.id === 'transfer-earth' ? launchSites.find(site => site.id === confirmedLaunch.current)?.name ?? 'Launch Site' : chosenLanding.current?.name ?? 'Landing Site'}</Text>
              <Text style={{ position: 'absolute', top: 72, color: '#fff', fontSize: 10 }}>{point.id === 'transfer-earth' ? 'Earth' : 'Moon'}</Text>
            </View>;
            if (point.id.includes('Pole')) return <Text key={point.id} pointerEvents="none" style={{ position: 'absolute', left: point.x - 10, top: point.y - 7, width: 20, textAlign: 'center', color: '#fff', fontSize: 11 }}>{point.id === 'North Pole' ? 'N' : 'S'}</Text>;
            const site = earthStage ? launchSites.find(s => s.id === point.id) : lunarSites.find(s => s.id === point.id);
            if (!site) return null;
            const isLunar = 'landingSiteId' in site;
            const callout = !isLunar && hasLaunchCallout(site);
            const selected = isLunar ? lunarSiteId === site.id : launchSiteId === site.id;
            return <View key={site.id} pointerEvents="box-none" style={{ position: 'absolute', left: point.x - (callout ? 175 : earthStage ? 65 : 12), top: point.y - (callout ? 50 : 12), width: callout ? 350 : earthStage ? 130 : 24, height: callout ? 100 : earthStage ? 64 : 24, zIndex: selected ? 2 : 1 }}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Open ${site.name}`} onPress={() => isLunar ? selectCandidate(site) : selectLaunchSite(site.id)} style={[{ width: 24, height: 24, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, callout && { position: 'absolute', left: 163, top: 38 }]}>
                  <MaterialCommunityIcons name="circle-double" size={16} color={selected ? NASA_RED : '#fff'} accessible={false} />
                </Pressable>
                {callout ? <LaunchSiteCallout site={site} selected={selected} onSelect={selectLaunchSite} /> : !isLunar ? <Pressable accessibilityRole="button" accessibilityLabel={`Select ${site.name}`} accessibilityState={{ selected }} onPress={() => selectLaunchSite(site.id)} style={{ position: 'absolute', top: 23, left: 0, width: 130, minHeight: 32 }}>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ textAlign: 'center', color: selected ? NASA_RED : '#fff', fontSize: 8 }}>{site.name}</Text>
                </Pressable> : <Text pointerEvents="none" style={{ position: 'absolute', top: 23, left: -28, width: 80, textAlign: 'center', color: selected ? NASA_RED : '#fff', fontSize: 9 }}>{site.name}</Text>}
              </View>;
          })}
        </Animated.View>
        {candidate && <View style={{ position: 'absolute', right: 16, top: 20, bottom: 20, width: '50%', padding: 12, gap: 12, ...theme.outlineSurface, borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{choosingArrival && <Pressable accessibilityRole="button" accessibilityLabel="Back to panorama" onPress={() => setChoosingArrival(false)} style={{ padding: 8 }}><Ionicons name="arrow-back-outline" size={18} color="#fff" /></Pressable>}<Text style={{ color: '#fff', fontSize: 16 }}>{candidate.name} | {choosingArrival ? 'Touchdown' : 'DEM 360° Panorama'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close candidate map" onPress={closeCandidate} style={{ padding: 10 }}><Text style={{ color: '#fff' }}>✕</Text></Pressable></View>
          {choosingArrival ? <ArrivalDatePicker siteId={candidate.landingSiteId} key={candidate.landingSiteId} onConfirm={chooseLanding} /> : <>
          <LandingSitePreview key={candidate.landingSiteId} site={candidate} />
          <Pressable testID="choose-landing-site" accessibilityRole="button" accessibilityLabel="Confirm Landing Site" onPress={() => setChoosingArrival(true)} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', ...theme.outlineSurface, borderWidth: .3, borderRadius: 8, opacity: pressed ? .65 : 1 })}>
            <MaterialCommunityIcons name="bullseye" size={19} color="#fff" accessible={false} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Confirm Landing Site</Text>
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" accessible={false} />
          </Pressable>
          </>}
        </View>}
      </>}
      {detailSite && <>
        <Animated.View entering={FadeIn.duration(350)} style={{ position: 'absolute', left: 76, top: 20, width: Math.min(width * .5 - 108, height - 100), height: Math.min(width * .5 - 108, height - 100) + 60 }}>
          <LaunchOverview launchSites={launchSites} selected={detailSite} onSelect={selectLaunchSite} />
        </Animated.View>
        <View testID="launch-detail-panel" style={{ position: 'absolute', right: 16, top: 20, bottom: 20, width: '50%', padding: 12, ...theme.outlineSurface, borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text numberOfLines={2} style={{ flex: 1, color: '#fff', fontSize: 16 }}>{detailSite.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close launch site" onPress={closeLaunchDetail} style={{ padding: 10 }}><Text style={{ color: '#fff' }}>✕</Text></Pressable>
          </View>
          <LaunchSiteInfo site={detailSite} />
          {trajectoryError !== '' && <Text accessibilityRole="alert" style={{ color: theme.colors.error, fontSize: 12 }}>{trajectoryError}</Text>}
          {launchVideoError && <Text style={{ color: theme.colors.error, fontSize: 11, marginBottom: 6 }}>Unable to play the video. Please try again.</Text>}
          <Pressable testID="confirm-launch-site" accessibilityRole="button" accessibilityLabel="Next Stop The Moon" disabled={!detailSite.candidateId || trajectoryBusy} accessibilityState={{ disabled: !detailSite.candidateId || trajectoryBusy, busy: trajectoryBusy }} onPress={openTransferPreview} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', ...theme.outlineSurface, borderWidth: .3, borderRadius: 8, opacity: !detailSite.candidateId || trajectoryBusy ? .4 : pressed ? .65 : 1 })}>
            <Ionicons name="rocket-outline" size={19} color="#fff" accessible={false} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{trajectoryBusy ? 'Calculating trajectory…' : 'Next Stop, The Moon !'}</Text>
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" accessible={false} />
          </Pressable>
        </View>
      </>}
      {exploring && !earthStage && guideVisible && catalogMessage !== '' && <View style={{ position: 'absolute', zIndex: 2, top: 24, right: 24, padding: 12, gap: 8, ...theme.outlineSurface, borderRadius: 8 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.text }}>{catalogMessage}</Text>
        {!catalogPending && <Pressable accessibilityRole="button" onPress={() => setCatalogAttempt(value => value + 1)} style={{ paddingVertical: 8 }}>
          <Text style={{ color: theme.colors.text }}>Retry landing sites</Text>
        </Pressable>}
      </View>}
      {exploring && !earthStage && !candidate && guideVisible && lunarSites.length > 0 && <View style={{ position: 'absolute', zIndex: 2, right: 24, top: 24, width: Math.min(230, width * .29), padding: 10, ...theme.outlineSurface, backgroundColor: theme.colors.surface, borderRadius: 10 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSiteList }} onPress={() => setShowSiteList(value => !value)} style={{ paddingVertical: 8 }}>
          <Text style={{ color: theme.colors.text }}>Choose landing site ({lunarSites.length})</Text>
        </Pressable>
        {showSiteList && <ScrollView style={{ maxHeight: height * .46 }}>
          {lunarSites.map(site => <Pressable key={site.landingSiteId} accessibilityRole="button" accessibilityLabel={`Choose ${site.name}`} onPress={() => selectCandidate(site)} style={{ paddingVertical: 9, borderTopWidth: .5, borderColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.text }}>{site.name}</Text>
          </Pressable>)}
        </ScrollView>}
      </View>}
      {missionStage === 'idle' && earthStage && !launchDetail && guideVisible && launchPlan && <LaunchTimeList onChangeLanding={changeLandingSite} sites={launchSites} touchdownUtc={launchPlan.touchdownUtc} selectedId={launchSiteId} onSelect={selectLaunchSite} />}
      {missionStage === 'idle' && exploring && !candidate && !launchDetail && guideVisible && <LunarGuide canSelect={earthStage ? launchSites.length > 0 : lunarSites.length > 0} key={earthStage ? 'earth' : 'moon'} stage={earthStage ? 'earth' : 'moon'} onReady={guideReady} polePoint={lunarPoints.find(p => p.id === 'South Pole Surface')} clusterPoint={lunarPoints.find(p => p.id === (earthStage ? 'earth-select-anchor' : 'South Pole Surface'))} onSelectCluster={() => { if (earthStage) { const point = lunarPoints.find(p => p.visible && p.id.startsWith('launch-')); if (point) selectLaunchSite(point.id); } else setShowSiteList(true); }} />}
      {(missionStage === 'fade' || missionStage === 'video') && <JourneyVideoFade active={active && missionStage === 'fade'} onComplete={fadeFinished} />}
      {(missionStage === 'countdown' || missionStage === 'fade' || missionStage === 'video') && <MoonLaunchVideo visible={missionStage === 'video'} active={active && missionStage === 'video'} onComplete={videoFinished} onError={videoFailed} />}
      {previewVisible && <Animated.View entering={FadeIn.duration(650)} testID="mission-transfer-ready" pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to launch site" onPress={backToLaunchSite} style={({ pressed }) => ({ position: 'absolute', left: Math.max(24, insets.left), top: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', ...theme.outlineSurface, borderWidth: .3, borderRadius: 8, opacity: pressed ? .65 : 1 })}>
          <Ionicons name="arrow-back-outline" size={21} color="#fff" accessible={false} />
        </Pressable>
        <Text pointerEvents="none" style={{ position: 'absolute', left: Math.max(80, insets.left + 56), top: 40, color: '#fff', fontSize: 12 }}>Preliminary transfer · Earth orbit to lunar arrival</Text>
        {launchVideoError && <Text style={{ position: 'absolute', right: 24, top: 80, color: theme.colors.error, fontSize: 11 }}>Unable to play the video. Please try again.</Text>}
        <Pressable testID="transfer-next" accessibilityRole="button" accessibilityLabel="Start the Journey" onPress={startJourney} style={({ pressed }) => ({ position: 'absolute', right: Math.max(24, insets.right), top: 24, minHeight: 48, paddingHorizontal: 24, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', ...theme.outlineSurface, borderWidth: .3, borderRadius: 8, opacity: pressed ? .65 : 1 })}>
          <Ionicons name="rocket-outline" size={19} color="#fff" accessible={false} />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Start the Journey</Text>
          <JourneyArrow active={active} />
        </Pressable>
      </Animated.View>}
      {previewVisible && <TransferGuide countdown={missionStage === 'countdown' || missionStage === 'fade'} active={active} onCountdownComplete={countdownFinished} />}
      {missionStage === 'flight' && <Animated.View testID="moon-flight-screen" entering={FadeIn.duration(600)} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <FlightSiteMarkers positions={flightMarkers} launchName={launchSites.find(site => site.id === confirmedLaunch.current)?.name ?? 'Launch Site'} landingName={chosenLanding.current?.name ?? 'Landing Site'} />
        {trajectory && <MoonFlightHud route={trajectory.route} telemetry={flightTelemetry} playback={flightPlayback} />}
        <TransferGuide flight active={active} onCountdownComplete={countdownFinished} />
      </Animated.View>}
      {missionStage === 'arrived' && chosenLanding.current && launchPlan && <LunarArrival key={launchPlan.runId} site={chosenLanding.current} plan={launchPlan} active={active} onReady={arrivalReady} onHome={returnHome} onPrepareHome={prepareReturnHome} />}
      {launchBusy && <View testID="launch-input-lock" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} accessibilityLabel="Launch sequence in progress" accessibilityViewIsModal />}
      {startup !== 'done' && !returningHome && <StartupSplash onBrandReady={brandLoaded} leaving={startup === 'flight'} error={error} />}
      <Animated.View testID="return-transition-cover" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, returnStyle, { zIndex: 1200, backgroundColor: '#03070d', alignItems: 'center', justifyContent: 'center' }]}>
        {Array.from({ length: 90 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${i * 73.71 % 100}%`, top: `${i * 41.13 % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}
        <Text style={{ color: '#fff', fontSize: Math.min(width * .055, 54), fontWeight: '700', letterSpacing: 6 }}>NEXT MISSION?</Text>
      </Animated.View>
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
