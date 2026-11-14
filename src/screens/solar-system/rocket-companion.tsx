import { avatarFrame, type AvatarDefinition } from 'open-bot-avatar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme';
import Svg, { G, Path, Rect } from 'react-native-svg';

const SIZE = 160;
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

export function RocketCompanion() {
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
    } else { float.set(0); gaze.set(0); blink.set(1); joy.set(0); shake.set(0); emphasis.set(0); }
    return () => { [float, gaze, blink, joy, shake, pressed, emphasis].forEach(cancelAnimation); };
  }, [active, reducedMotion, float, gaze, blink, joy, shake, pressed, emphasis]);

  const smile = () => {
    emphasis.set(0);
    emphasis.set(withSequence(
      withTiming(1, { duration: 85 }), withTiming(0, { duration: 130 }),
      withDelay(120, withSequence(withTiming(1, { duration: 85 }), withTiming(0, { duration: 130 }))),
    ));
    shake.set(withSequence(withTiming(-1, { duration: 90 }),
      withRepeat(withTiming(1, { duration: 110, easing: Easing.inOut(Easing.sin) }), 6, true),
      withTiming(0, { duration: 120 })));
    joy.set(withSequence(withSpring(1, { duration: 220, dampingRatio: .8 }),
      withDelay(1100, withSpring(0, { duration: 400, dampingRatio: .8 }))));
  };
  const bodyStyle = useAnimatedStyle(() => ({ transform: [
    { translateY: reducedMotion ? 0 : -joy.get() * 8 },
    { translateX: reducedMotion ? 0 : shake.get() * 1.2 },
    { rotate: `${reducedMotion ? 0 : shake.get() * 3}deg` },
    { scale: pressed.get() * (1 + (reducedMotion ? 0 : joy.get() * .07)) },
  ] }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: reducedMotion ? 0 : float.get() * -12 }] }));
  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, joy.get()), transform: [{ translateX: gaze.get() }, { scaleY: blink.get() }] }));
  const happyStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, joy.get()), transform: [{ translateX: gaze.get() }] }));

  const questionStyle = useAnimatedStyle(() => ({
    opacity: joy.get() > .15 ? 0 : 1,
    transform: [{ translateX: reducedMotion ? 0 : Math.sin(float.get() * Math.PI * 2) * 1.5 }, { rotate: `${reducedMotion ? 0 : Math.sin(float.get() * Math.PI * 2) * 9}deg` }],
  }));
  const exclamationStyle = useAnimatedStyle(() => ({
    opacity: joy.get() > .15 ? 1 : 0,
    transform: [{ translateY: reducedMotion ? 0 : -emphasis.get() * 4 }, { scale: reducedMotion ? 1 : 1 + emphasis.get() * .08 }],
  }));

  return <Pressable accessibilityRole="button" accessibilityLabel="Make the rocket smile"
    accessibilityHint="Tap to make your rocket companion happy" style={styles.rocket}
    onPress={smile} onPressIn={() => pressed.set(withTiming(.97, { duration: 100 }))}
    onPressOut={() => pressed.set(withSpring(1, { duration: 300, dampingRatio: 1 }))}>
    <Animated.View style={floatStyle} pointerEvents="none">
    <Animated.View testID="rocket-visual" style={[styles.visual, bodyStyle]}>
      <Image source={require('../../../assets/rocket-neon-dark.png')} style={styles.body} resizeMode="contain" accessible={false} />
      <Animated.View testID="rocket-idle-eyes" style={[styles.eyes, idleStyle]}><Eyes mood="idle" /></Animated.View>
      <Animated.View testID="rocket-happy-eyes" style={[styles.eyes, happyStyle]}><Eyes mood="happy" /></Animated.View>
    </Animated.View>
    <View pointerEvents="none" style={styles.launchRow}>
      <Text style={styles.launchText}>LAUNCH</Text>
      <View style={styles.mark}>
        <Animated.Text testID="launch-question" style={[styles.launchText, styles.markText, questionStyle]}>?</Animated.Text>
        <Animated.Text testID="launch-exclamation" style={[styles.launchText, styles.markText, exclamationStyle]}>!</Animated.Text>
      </View>
    </View>
    </Animated.View>
  </Pressable>;
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
