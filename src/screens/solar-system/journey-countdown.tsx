import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, runOnJS, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function JourneyArrow({ active }: { active: boolean }) {
  const x = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (active && !reducedMotion) x.set(withRepeat(withSequence(
      withDelay(1000, withTiming(6, { duration: 150 })), withTiming(0, { duration: 150 }),
      withDelay(100, withTiming(6, { duration: 150 })), withTiming(0, { duration: 150 }),
    ), -1));
    else { cancelAnimation(x); x.set(0); }
    return () => cancelAnimation(x);
  }, [active, reducedMotion, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return <Animated.View pointerEvents="none" style={style}><Ionicons name="arrow-forward-outline" size={18} color="#fff" accessible={false} /></Animated.View>;
}

export function JourneyCountdown({ active, reserveText, onComplete }: { active: boolean; reserveText: string; onComplete: () => void }) {
  const elapsed = useRef(0), finished = useRef(false);
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!active || finished.current) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(); elapsed.current += now - last; last = now;
      setTime(Math.min(2999, elapsed.current));
      if (elapsed.current >= 3000 && !finished.current) {
        finished.current = true; clearInterval(timer); onComplete();
      }
    }, 80);
    return () => clearInterval(timer);
  }, [active, onComplete]);
  const number = 3 - Math.floor(time / 1000);
  const dots = '.'.repeat(Math.min(number, 1 + Math.floor((time % 1000) / (1000 / number))));
  return <View testID="journey-countdown" pointerEvents="none" accessibilityLiveRegion="polite" style={{ flex: 1, paddingLeft: 16, paddingRight: 42, paddingVertical: 14, borderWidth: .7, borderColor: '#fff', borderRadius: 12, backgroundColor: '#03070dcc' }}>
    <Text accessible={false} style={{ opacity: 0, color: '#fff', fontStyle: 'italic', fontSize: 12, lineHeight: 19 }}>{reserveText}</Text>
    <View style={{ position: 'absolute', left: 16, top: 14, flexDirection: 'row' }}>
      <Text testID="countdown-number" style={{ color: '#fff', fontSize: 24, lineHeight: 32, fontStyle: 'italic' }}>{number}</Text>
      <Text testID="countdown-dots" style={{ color: '#fff', fontSize: 24, lineHeight: 32, fontStyle: 'italic' }}>{dots}</Text>
    </View>
    <View style={{ position: 'absolute', left: -5, bottom: 25, width: 8, height: 8, backgroundColor: '#03070d', borderLeftWidth: .7, borderBottomWidth: .7, borderColor: '#fff', transform: [{ rotate: '45deg' }] }} />
  </View>;
}

export function JourneyVideoFade({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    opacity.set(withTiming(1, { duration: 350 }, finished => { if (finished) runOnJS(onComplete)(); }));
    return () => cancelAnimation(opacity);
  }, [active, onComplete, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View testID="journey-video-fade" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 850 }, style]} />;
}
