import { avatarFrame, type AvatarDefinition } from 'open-bot-avatar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, useDerivedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { theme } from '../../theme';
import Svg, { G, Path, Rect } from 'react-native-svg';

const SIZE = 160;
// Two visible stretches of the same slender tilted ellipse; the right-hand turn is offscreen.
function orbitPose(width: number, height: number, theta: number) {
  'worklet';
  const c = Math.cos(theta), s = Math.sin(theta);
  return {
    x: width * (.86 + .65 * c + .065 * s),
    y: height * (.72 - .90 * c + .11 * s),
    angle: Math.atan2(height * (-.90 * s - .11 * c), width * (.65 * s - .065 * c)) * 180 / Math.PI,
  };
}

const definition: AvatarDefinition = {
  version: 1, id: 'azas-rocket', name: 'AZAS rocket',
  body: { path: 'M10 10 H90 V90 H10 Z' },
  eyes: { x: 66.5, y: 39.7, spacing: 7.2, scale: .6 },
};
const matrix = (value: number[]) => `matrix(${value.join(' ')})`;
// Package geometry is static. Native transforms animate it without JS frame-by-frame renders.
const frames = {
  idle: avatarFrame(definition, { depth: 0, eyeColor: '#fff0d8', time: 0, motion: 'idle', reducedMotion: true, view: { yaw: 0, pitch: 0 } }),
  happy: avatarFrame(definition, { depth: 0, eyeColor: '#fff0d8', time: 0, motion: 'happy', reducedMotion: true, view: { yaw: 0, pitch: 0 } }),
};
function Eyes({ mood }: { mood: keyof typeof frames }) {
  const frame = frames[mood];
  return <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100" aria-hidden={true}>
    <G transform={matrix(frame.root)}><G transform="rotate(-4 66.5 39.7) translate(66.5 39.7) scale(0.8) translate(-66.5 -39.7)">
      {frame.shapes.map(shape => {
        if (shape.kind !== 'eye') return null;
        const mark = shape.mark;
        return <G key={shape.key} transform={matrix(shape.matrix)}><G transform={`rotate(16 ${shape.key.endsWith('0') ? 62.9 : 70.1} 39.7)`}>
          {mark.shape === 'pill'
            ? <Rect x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx={mark.radius} fill={frame.ink} />
            : <Path d={mark.d} stroke={frame.ink} strokeWidth={mark.strokeWidth} strokeLinecap="round" fill="none" />}
        </G></G>;
      })}
    </G></G>
  </Svg>;
}

export function RocketPortrait() {
  return <View style={styles.visual} pointerEvents="none">
    <Image source={require('../../../assets/rocket-neon-dark.png')} style={styles.body} resizeMode="contain" />
    <View style={styles.eyes}><Eyes mood="idle" /></View>
  </View>;
}

export function RocketCompanion({ onDeparture = () => {}, onLaunchStart = () => {}, departed = false, narrator = false, outlined = false, onSmile, smileTrigger = 0 }: { onDeparture?: () => void; onLaunchStart?: () => void; departed?: boolean; narrator?: boolean; outlined?: boolean; onSmile?: () => void; smileTrigger?: number }) {
  const { width, height } = useWindowDimensions();
  const [launched, setLaunched] = useState(false);
  const flight = useSharedValue(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const gaze = useSharedValue(0);
  const joy = useSharedValue(0);
  const shake = useSharedValue(0);
  const pressed = useSharedValue(1);
  const emphasis = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);

  useEffect(() => {
    if (active && !reducedMotion) {
      float.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
      gaze.set(withRepeat(withSequence(withDelay(1800, withTiming(2.5, { duration: 550 })), withDelay(1400, withTiming(-2, { duration: 650 })), withTiming(0, { duration: 400 })), -1, false));
      blink.set(withRepeat(withSequence(withDelay(3200, withTiming(.08, { duration: 85 })), withTiming(1, { duration: 110 })), -1, false));
    } else { float.set(0); gaze.set(0); blink.set(1);  }
    return () => { [float, gaze, blink, pressed].forEach(cancelAnimation); };
  }, [active, reducedMotion, float, gaze, blink, joy, shake, pressed, emphasis]);

  const smile = () => {
    onSmile?.();
    if (launched || departed) return;
    if (!narrator) { setLaunched(true); onLaunchStart(); }
    emphasis.set(0);
    emphasis.set(withSequence(
      withTiming(1, { duration: 85 }), withTiming(0, { duration: 130 }),
      withDelay(120, withSequence(withTiming(1, { duration: 85 }), withTiming(0, { duration: 130 }))),
    ));
    shake.set(withSequence(withTiming(-1, { duration: 90 }),
      withRepeat(withTiming(1, { duration: 110, easing: Easing.inOut(Easing.sin) }), 6, true),
      withTiming(0, { duration: 120 })));
    joy.set(withSequence(withSpring(1, { duration: 220, dampingRatio: .8 }),
      withDelay(1100, withSpring(0, { duration: 400, dampingRatio: .8 }, finished => {
        if (!finished || narrator) return;
        flight.set(withTiming(1, { duration: reducedMotion ? 120 : 140, easing: Easing.in(Easing.cubic) }, done => {
          if (done) runOnJS(onDeparture)();
        }));
      }))));
  };
  useEffect(() => { if (smileTrigger > 0) smile(); }, [smileTrigger]);
  const bodyStyle = useAnimatedStyle(() => ({ transform: [
    { translateY: reducedMotion ? 0 : -joy.get() * 8 },
    { translateX: reducedMotion ? 0 : shake.get() * 1.2 },
    { rotate: `${reducedMotion ? 0 : shake.get() * 3}deg` },
    { scale: pressed.get() * (1 + (reducedMotion ? 0 : joy.get() * .07)) },
  ] }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: reducedMotion ? 0 : float.get() * -12 }] }));
  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, joy.get()), transform: [{ translateX: gaze.get() }, { scaleY: blink.get() }] }));
  const happyStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, joy.get()), transform: [{ translateX: gaze.get() }] }));

  useEffect(() => () => { [joy, shake, emphasis, flight].forEach(cancelAnimation); }, [joy, shake, emphasis, flight]);
  const flightStyle = useAnimatedStyle(() => {
    const start = orbitPose(width, height, Math.PI / 2);
    const current = orbitPose(width, height, Math.PI / 2 - flight.get() * .8);
    return {
      opacity: departed ? 0 : reducedMotion ? 1 - flight.get() : flight.get() < 1 ? 1 : 0,
      transform: [{ translateX: reducedMotion ? 0 : current.x - start.x }, { translateY: reducedMotion ? 0 : current.y - start.y }],
    };
  });
  const questionStyle = useAnimatedStyle(() => ({
    opacity: launched || departed ? 0 : 1,
    transform: [{ translateX: reducedMotion ? 0 : Math.sin(float.get() * Math.PI * 2) * 1.5 }, { rotate: `${reducedMotion ? 0 : Math.sin(float.get() * Math.PI * 2) * 9}deg` }],
  }));
  const exclamationStyle = useAnimatedStyle(() => ({
    opacity: launched || departed ? 1 : 0,
    transform: [{ translateY: reducedMotion ? 0 : -emphasis.get() * 4 }, { scale: reducedMotion ? 1 : 1 + emphasis.get() * .08 }],
  }));

  return <Pressable accessibilityRole="button" accessibilityLabel="Make the rocket smile"
    accessibilityHint={narrator ? 'Tap to make your rocket companion smile' : 'Tap to make your rocket companion happy and launch it'} accessibilityState={{ disabled: launched || departed }} disabled={launched || departed} style={[styles.rocket, narrator && { height: SIZE, marginBottom: 0, marginRight: 0 }]}
    onPress={smile} onPressIn={() => pressed.set(withTiming(.97, { duration: 100 }))}
    onPressOut={() => pressed.set(withSpring(1, { duration: 300, dampingRatio: 1 }))}>
    <Animated.View style={floatStyle} pointerEvents="none">
    <Animated.View testID="rocket-launch-flight" style={flightStyle}>
    {!narrator && <Animated.View testID="home-mission-bubble" pointerEvents="none" style={[{ position: 'absolute', left: 6, top: -26, width: SIZE - 12, height: 36 }, bodyStyle]}>
      <Svg width={SIZE - 12} height={36} viewBox="0 0 160 36" preserveAspectRatio="none">
        <Path d="M8 .5 H152 Q159.5 .5 159.5 8 V21 Q159.5 29 152 29 H114 L108 35 L102 29 H8 Q.5 29 .5 21 V8 Q.5 .5 8 .5 Z" fill="none" stroke="#fff" strokeWidth={.6} />
      </Svg>
      <Text style={{ position: 'absolute', top: 7, left: 0, width: SIZE - 12, textAlign: 'center', color: theme.colors.text, fontSize: 11, fontWeight: '600', fontStyle: 'italic' }}>Mission to the Moon!</Text>
    </Animated.View>}
    <Animated.View testID="rocket-visual" style={[styles.visual, bodyStyle]}>
      {outlined && [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y], i) => <Image key={i} source={require('../../../assets/rocket-neon-dark.png')} resizeMode="contain" accessible={false} style={[styles.body, { tintColor: '#000', left: x, top: y }]} />)}
      <Image source={require('../../../assets/rocket-neon-dark.png')} style={styles.body} resizeMode="contain" accessible={false} />
      <Animated.View testID="rocket-idle-eyes" style={[styles.eyes, idleStyle]}><Eyes mood="idle" /></Animated.View>
      <Animated.View testID="rocket-happy-eyes" style={[styles.eyes, happyStyle]}><Eyes mood="happy" /></Animated.View>
    </Animated.View>
    </Animated.View>
    {!narrator && <Animated.View pointerEvents="none" style={styles.launchRow}>
      <Text style={styles.launchText}>LAUNCH</Text>
      <View style={styles.mark}>
        <Animated.Text testID="launch-question" style={[styles.launchText, styles.markText, questionStyle]}>?</Animated.Text>
        <Animated.Text testID="launch-exclamation" style={[styles.launchText, styles.markText, exclamationStyle]}>!</Animated.Text>
      </View>
    </Animated.View>}
    </Animated.View>
  </Pressable>;
}
export function RocketFlyby({ onComplete }: { onComplete: () => void }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  useEffect(() => { let alive = true; AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); }); return () => { alive = false; }; }, []);
  useEffect(() => {
    if (reducedMotion === true) { onComplete(); return; }
    if (reducedMotion === false) progress.set(withDelay(1000, withTiming(1, { duration: 180, easing: Easing.linear }, finished => { if (finished) runOnJS(onComplete)(); })));
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);
  const pose = useDerivedValue(() => orbitPose(width, height, -1.18 - progress.get() * .86));
  const style = useAnimatedStyle(() => ({
    opacity: progress.get() > 0 && progress.get() < 1 ? 1 : 0,
    transform: [{ translateX: pose.get().x }, { translateY: pose.get().y }],
  }));
  const trailStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${pose.get().angle}deg` }] }));
  const rocketStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${pose.get().angle - 135}deg` }, { scaleX: -1 }, { scaleY: -1 }] }));
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
    <Animated.View testID="rocket-distant-flyby" style={[{ position: 'absolute', left: 0, top: 0, width: 16, height: 16 }, style]}>
      <Animated.View style={[{ position: 'absolute', right: 8, top: 8, width: 35, height: .8, backgroundColor: '#fff', opacity: .55, transformOrigin: 'right center' }, trailStyle]} />
      <Animated.Image source={require('../../../assets/rocket-neon-dark.png')} style={[{ width: 16, height: 16 }, rocketStyle]} resizeMode="contain" />
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  rocket: { width: SIZE, height: SIZE + 16, marginBottom: -10, marginRight: -8 },
  launchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 34, marginTop: -18 },
  launchText: { color: theme.colors.text, fontSize: 23, fontWeight: '700', letterSpacing: 4 },
  mark: { marginLeft: -2, width: 16, height: 32 },
  markText: { position: 'absolute', left: 0, top: 2 },
  visual: { width: SIZE, height: SIZE },
  eyes: { position: 'absolute', left: -2.64, top: 1.648, zIndex: 1, transformOrigin: '66.5% 39.7%' },
  body: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transform: [{ scale: .9 }] },
});
