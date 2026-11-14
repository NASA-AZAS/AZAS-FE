import { avatarFrame, type AvatarDefinition } from 'open-bot-avatar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Pressable, StyleSheet } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';

const SIZE = 160;
const definition: AvatarDefinition = {
  version: 1, id: 'azas-rocket', name: 'AZAS rocket',
  body: { path: 'M50 8 C30 20 28 45 33 69 Q50 77 67 69 C72 45 70 20 50 8 Z' },
  eyes: { x: 49, y: 43, spacing: 15, scale: .8 },
};
const matrix = (value: number[]) => `matrix(${value.join(' ')})`;
// Package geometry is static. Native transforms animate it without JS frame-by-frame renders.
const frames = {
  idle: avatarFrame(definition, { depth: 0, eyeColor: '#111820', time: 0, motion: 'idle', reducedMotion: true }),
  happy: avatarFrame(definition, { depth: 0, eyeColor: '#111820', time: 0, motion: 'happy', reducedMotion: true }),
};
function Eyes({ mood }: { mood: keyof typeof frames }) {
  const frame = frames[mood];
  return <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100" aria-hidden={true}>
    <G transform={matrix(frame.root)}>
      {frame.shapes.map(shape => {
        if (shape.kind !== 'eye') return null;
        const mark = shape.mark;
        return <G key={shape.key} transform={matrix(shape.matrix)}>
          {mark.shape === 'pill'
            ? <Rect x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx={mark.radius} fill={frame.ink} />
            : <Path d={mark.d} stroke={frame.ink} strokeWidth={mark.strokeWidth} strokeLinecap="round" fill="none" />}
        </G>;
      })}
    </G>
  </Svg>;
}

export function RocketCompanion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const gaze = useSharedValue(0);
  const joy = useSharedValue(0);
  const pressed = useSharedValue(1);

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
    } else { float.set(0); gaze.set(0); blink.set(1); joy.set(0); }
    return () => { [float, gaze, blink, joy, pressed].forEach(cancelAnimation); };
  }, [active, reducedMotion, float, gaze, blink, joy, pressed]);

  const smile = () => {
    joy.set(withSequence(withSpring(1, { duration: 220, dampingRatio: .8 }),
      withDelay(1100, withSpring(0, { duration: 400, dampingRatio: .8 }))));
  };
  const bodyStyle = useAnimatedStyle(() => ({ transform: [
    { translateY: reducedMotion ? 0 : float.get() * -12 - joy.get() * 16 },
    { rotate: `${12 + (reducedMotion ? 0 : float.get() * 3 - joy.get() * 8)}deg` },
    { scale: pressed.get() * (1 + (reducedMotion ? 0 : joy.get() * .07)) },
  ] }));
  const idleStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, joy.get()), transform: [{ translateX: gaze.get() }, { scaleY: blink.get() }] }));
  const happyStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, joy.get()), transform: [{ translateX: gaze.get() }] }));

  return <Pressable accessibilityRole="button" accessibilityLabel="Make the rocket smile"
    accessibilityHint="Tap to make your rocket companion happy" style={styles.rocket}
    onPress={smile} onPressIn={() => pressed.set(withTiming(.97, { duration: 100 }))}
    onPressOut={() => pressed.set(withSpring(1, { duration: 300, dampingRatio: 1 }))}>
    <Animated.View testID="rocket-visual" style={[styles.visual, bodyStyle]} pointerEvents="none">
      <Image source={require('../../../assets/rocket-body.png')} style={styles.body} resizeMode="contain" accessible={false} />
      <Animated.View testID="rocket-idle-eyes" style={[styles.eyes, idleStyle]}><Eyes mood="idle" /></Animated.View>
      <Animated.View testID="rocket-happy-eyes" style={[styles.eyes, happyStyle]}><Eyes mood="happy" /></Animated.View>
    </Animated.View>
  </Pressable>;
}
const styles = StyleSheet.create({
  rocket: { width: SIZE, height: SIZE, marginBottom: -10, marginRight: -8 },
  visual: { width: SIZE, height: SIZE },
  eyes: { position: 'absolute', left: 0, top: 0, zIndex: 1, transformOrigin: '49% 43%' },
  body: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
});
