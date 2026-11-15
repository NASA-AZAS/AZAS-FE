import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function RocketDialogue({ pages, onFinished, showPageNumber = false, onDismiss, compact = false, autoDismissMs }: { pages: string[]; onFinished?: () => void; showPageNumber?: boolean; onDismiss?: () => void; compact?: boolean; autoDismissMs?: number }) {
  const [page, setPage] = useState(0);
  if (!pages.length) return null;
  const reserveText = pages.reduce((a, b) => a.length > b.length ? a : b);
  return <DialoguePage autoDismissMs={autoDismissMs} onAutoDismiss={onDismiss} compact={compact} key={page} pageLabel={showPageNumber ? `${page + 1}/${pages.length}` : undefined} text={pages[page]} reserveText={reserveText} hasNext={page < pages.length - 1 || !!onDismiss} onFinished={onFinished} onNext={() => { if (page === pages.length - 1 && onDismiss) onDismiss(); else setPage(value => Math.min(value + 1, pages.length - 1)); }} />;
}
// All rocket speech shares italic typography and a stable-height typewriter bubble.
function DialoguePage({ text, reserveText, hasNext, onNext, onFinished, pageLabel, compact, autoDismissMs, onAutoDismiss }: { autoDismissMs?: number; onAutoDismiss?: () => void; compact?: boolean; pageLabel?: string; text: string; reserveText: string; hasNext: boolean; onNext: () => void; onFinished?: () => void }) {
  const [count, setCount] = useState(0);
  const [revealAll, setRevealAll] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const nudge = useSharedValue(0);
  const complete = revealAll || count >= text.length;
  useEffect(() => {
    let alive = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const app = AppState.addEventListener('change', value => setActive(value === 'active'));
    if (revealAll) return () => app.remove();
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
  }, [text, revealAll]);
  useEffect(() => {
    if (complete && hasNext && active && !reducedMotion) {
      nudge.set(withRepeat(withSequence(withDelay(800, withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 160 })), -1, false));
    } else nudge.set(0);
    return () => cancelAnimation(nudge);
  }, [complete, hasNext, active, reducedMotion, nudge]);
  useEffect(() => { if (complete && !hasNext) onFinished?.(); }, [complete, hasNext, onFinished]);
  useEffect(() => {
    if (!complete || !active || !autoDismissMs || !onAutoDismiss) return;
    const timer = setTimeout(onAutoDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [complete, active, autoDismissMs, onAutoDismiss]);
  const hintStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.get() * 6 }] }));
  return <Pressable testID="rocket-dialogue-bubble" accessibilityRole="button" accessibilityLabel={!complete ? 'Complete rocket message' : hasNext ? 'Next rocket message' : 'Rocket message'} accessibilityState={{ disabled: complete && !hasNext }} disabled={complete && !hasNext} onPress={() => { if (!complete) setRevealAll(true); else onNext(); }} style={[styles.bubble, compact && { flex: 0, flexGrow: 0, flexShrink: 0, paddingVertical: 4 }]}>
    <Text accessible={false} style={[styles.speech, compact && { lineHeight: 17 }, { opacity: 0 }]}>{compact ? text : reserveText}</Text>
    <Text testID="rocket-dialogue-text" accessibilityLabel={text} style={[styles.speech, styles.typing, compact && { top: 4, lineHeight: 17 }]}>{revealAll ? text : text.slice(0, count)}</Text>
    {pageLabel && <Text testID="rocket-page-number" pointerEvents="none" style={{ position: 'absolute', right: 12, top: 10, color: '#9AABBE', fontSize: 9 }}>{pageLabel}</Text>}
    {complete && hasNext && <Animated.Text testID="rocket-next-page" accessible={false} style={[styles.next, compact && { fontSize: 18, lineHeight: 22, bottom: 4 }, hintStyle]}>{'>'}</Animated.Text>}
    <View pointerEvents="none" style={[styles.tail, compact && { bottom: '50%', marginBottom: -4 }]} />
  </Pressable>;
}
const styles = StyleSheet.create({
  bubble: { flex: 1, paddingLeft: 16, paddingRight: 42, paddingVertical: 14, borderWidth: .7, borderColor: '#fff', borderRadius: 12, backgroundColor: '#03070dcc' },
  speech: { color: '#f0f5fc', fontStyle: 'italic', fontSize: 12, lineHeight: 19 },
  typing: { position: 'absolute', left: 16, right: 42, top: 14 },
  next: { position: 'absolute', right: 15, bottom: 8, color: '#fff', fontSize: 22, fontWeight: '300' },
  tail: { position: 'absolute', left: -5, bottom: 25, width: 8, height: 8, backgroundColor: '#03070d', borderLeftWidth: .7, borderBottomWidth: .7, borderColor: '#fff', transform: [{ rotate: '45deg' }] },
});
