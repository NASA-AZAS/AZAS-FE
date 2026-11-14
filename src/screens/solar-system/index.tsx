import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, PanResponder, Platform, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Canvas } from './render-surface';
import { SolarScene, type ViewControls } from './scene';
import { SpaceHud, type BodyId } from './space-hud';
import { viewDistance, INITIAL_MOON_ANGLE } from './scale';

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
  const [selected, setSelected] = useState<BodyId | null>('moon');
  const [requestedBody, setRequestedBody] = useState<BodyId | null>('moon');
  const [systemView, setSystemView] = useState(false);
  const [intro, setIntro] = useState(true);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const { width, height } = useWindowDimensions();
  const controls = useRef({ ...initialView(), yaw: Math.atan2(-Math.cos(INITIAL_MOON_ANGLE), -Math.sin(INITIAL_MOON_ANGLE)), pitch: 0 });
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
      onStartShouldSetPanResponder: () => !controls.current.locked,
      onMoveShouldSetPanResponder: () => !controls.current.locked,
      onPanResponderGrant: (event) => {
        const touch = event.nativeEvent.touches[0];
        gesture.current = { x: touch?.pageX ?? 0, y: touch?.pageY ?? 0, count: event.nativeEvent.touches.length, pinch: pinch(event) };
      },
      onPanResponderMove: (event) => {
        if (controls.current.locked) { gesture.current.count = 0; return; }
        const touch = event.nativeEvent.touches[0];
        if (!touch) return;
        const count = event.nativeEvent.touches.length;
        const previous = gesture.current;
        if (count === 1 && previous.count === 1) {
          controls.current.yaw -= (touch.pageX - previous.x) * .006;
          controls.current.pitch = clamp(controls.current.pitch + (touch.pageY - previous.y) * .006, -.85, 1.35);
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
    if (selected !== null || intro || controls.current.locked) return;
    moveTo('earth', true);
  };
  const openMoonIntro = () => {
    if (!systemView || controls.current.locked) return;
    moveTo('moon', false, true);
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
      if (controls.current.locked) return;
      controls.current.zoom = clamp(controls.current.zoom * Math.exp(event.deltaY * .001), .3, 5);
    },
  } : {};
  return (
    <View style={styles.screen}>
      <View style={[StyleSheet.absoluteFill, sceneTouchStyle]} {...responder.panHandlers} {...wheelProps} accessibilityLabel="Interactive solar system. Drag to orbit. Select a body to zoom in; reset to return to the Sun-centered overview.">
        <SceneBoundary onError={fail}>
          <Canvas camera={{ position: [-Math.cos(INITIAL_MOON_ANGLE) * viewDistance.moon * 1200, 0, -Math.sin(INITIAL_MOON_ANGLE) * viewDistance.moon * 1200], fov: 43, near: .000001, far: 4000 }}
            frameloop={active ? 'always' : 'never'}
            gl={{ antialias: true, alpha: false }}
            >
            <Suspense fallback={null}>
              <SolarScene onMoonIntro={openMoonIntro} systemView={systemView} onSystemFocus={openEarthSystem} intro={intro} controls={controls} selected={selected} paused={paused || !active} onReady={ready} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      </View>
      <SpaceHud selected={requestedBody} onSelect={focus} paused={paused} onTogglePause={() => setPaused(value => !value)}
        onReset={reset} loading={loading} error={error} />
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
