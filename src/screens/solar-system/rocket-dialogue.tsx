import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function RocketDialogue({ pages, onFinished }: { pages: string[]; onFinished?: () => void }) {
  const [page, setPage] = useState(0);
  if (!pages.length) return null;
  const reserveText = pages.reduce((a, b) => a.length > b.length ? a : b);
  return <DialoguePage key={page} text={pages[page]} reserveText={reserveText} hasNext={page < pages.length - 1} onFinished={onFinished} onNext={() => setPage(value => Math.min(value + 1, pages.length - 1))} />;
}
// All rocket speech shares italic typography and a stable-height typewriter bubble.
function DialoguePage({ text, reserveText, hasNext, onNext, onFinished }: { text: string; reserveText: string; hasNext: boolean; onNext: () => void; onFinished?: () => void }) {
  const [count, setCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const nudge = useSharedValue(0);
  const complete = count >= text.length;
  useEffect(() => {
    let alive = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const app = AppState.addEventListener('change', value => setActive(value === 'active'));
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!alive) return;
      setReducedMotion(reduce);
      if (reduce) { setCount(text.length); return; }
      timeout = setTimeout(() => {
        let index = 0;
        interval = setInterval(() => {
          index += 1; setCount(Math.min(index, text.length));
          if (index >= text.length) clearInterval(interval);
        }, 10);
      }, 450);
    });
    return () => { alive = false; app.remove(); clearTimeout(timeout); clearInterval(interval); };
  }, [text]);
  useEffect(() => {
    if (complete && hasNext && active && !reducedMotion) {
      nudge.set(withRepeat(withSequence(withDelay(800, withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 160 })), -1, false));
    } else nudge.set(0);
    return () => cancelAnimation(nudge);
  }, [complete, hasNext, active, reducedMotion, nudge]);
  useEffect(() => { if (complete && !hasNext) onFinished?.(); }, [complete, hasNext, onFinished]);
  const hintStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.get() * 6 }] }));
  return <Pressable testID="rocket-dialogue-bubble" accessibilityRole="button" accessibilityLabel={hasNext ? 'Next rocket message' : 'Rocket message'} accessibilityState={{ disabled: !complete || !hasNext }} disabled={!complete || !hasNext} onPress={onNext} style={styles.bubble}>
    <Text accessible={false} style={[styles.speech, { opacity: 0 }]}>{reserveText}</Text>
    <Text testID="rocket-dialogue-text" accessibilityLabel={text} style={[styles.speech, styles.typing]}>{text.slice(0, count)}</Text>
    {complete && hasNext && <Animated.Text testID="rocket-next-page" accessible={false} style={[styles.next, hintStyle]}>{'>'}</Animated.Text>}
    <View pointerEvents="none" style={styles.tail} />
  </Pressable>;
}
const styles = StyleSheet.create({
  bubble: { flex: 1, paddingLeft: 16, paddingRight: 42, paddingVertical: 14, borderWidth: .7, borderColor: '#fff', borderRadius: 12, backgroundColor: '#03070dcc' },
  speech: { color: '#f0f5fc', fontStyle: 'italic', fontSize: 12, lineHeight: 19 },
  typing: { position: 'absolute', left: 16, right: 42, top: 14 },
  next: { position: 'absolute', right: 15, bottom: 8, color: '#fff', fontSize: 22, fontWeight: '300' },
  tail: { position: 'absolute', left: -5, bottom: 25, width: 8, height: 8, backgroundColor: '#03070d', borderLeftWidth: .7, borderBottomWidth: .7, borderColor: '#fff', transform: [{ rotate: '45deg' }] },
});
