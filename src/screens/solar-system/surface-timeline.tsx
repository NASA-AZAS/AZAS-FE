import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { surfaceDuration, surfaceSkyData } from './surface-sky-data';

const utc = (seconds: number) => new Date(Date.parse(surfaceSkyData.touchdownUtc) + seconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
export function SurfaceTimeline({ elapsed, autoRotate, scrubbing }: { elapsed: SharedValue<number>; autoRotate: SharedValue<boolean>; scrubbing: SharedValue<boolean> }) {
  const width = useSharedValue(1);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { const timer = setInterval(() => setSeconds(elapsed.get()), 100); return () => clearInterval(timer); }, [elapsed]);
  const scrub = useMemo(() => Gesture.Pan().minDistance(0).shouldCancelWhenOutside(false)
    .onBegin(e => { scrubbing.set(true); autoRotate.set(false); elapsed.set(Math.max(0, Math.min(1, e.x / width.get())) * surfaceDuration); })
    .onUpdate(e => elapsed.set(Math.max(0, Math.min(1, e.x / width.get())) * surfaceDuration))
    .onEnd(e => elapsed.set(Math.max(0, Math.min(1, e.x / width.get())) * surfaceDuration))
    .onFinalize(() => scrubbing.set(false)), [elapsed, width, autoRotate, scrubbing]);
  const fill = useAnimatedStyle(() => ({ width: `${elapsed.get() / surfaceDuration * 100}%` }));
  const thumb = useAnimatedStyle(() => ({ left: `${elapsed.get() / surfaceDuration * 100}%` }));
  return <View testID="surface-timeline" style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 58, paddingHorizontal: 8,  borderRadius: 6 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5 }}>
      <Text testID="surface-time" style={{ color: '#fff', fontSize: 9, fontVariant: ['tabular-nums'] }}>{utc(seconds)}</Text>
      <Text style={{ color: '#fff', fontSize: 9 }}>{(seconds / 3600).toFixed(1)} / 48 h</Text>
    </View>
    <GestureDetector gesture={scrub} touchAction="none">
      <View testID="surface-time-slider" accessible accessibilityRole="adjustable" accessibilityLabel="Surface time, 48 hours" accessibilityValue={{ min: 0, max: 48, now: seconds / 3600 }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={e => elapsed.set(Math.max(0, Math.min(surfaceDuration, elapsed.get() + (e.nativeEvent.actionName === 'increment' ? 3600 : -3600))))} onLayout={e => width.set(e.nativeEvent.layout.width)} style={{ height: 24, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 3, backgroundColor: '#ffffff55', borderRadius: 2 }}>
          <Animated.View style={[{ position: 'absolute', height: 3, backgroundColor: '#FC3D21', borderRadius: 2 }, fill]} />
          <Animated.View style={[{ position: 'absolute', top: -4, marginLeft: -5, width: 11, height: 11, borderRadius: 6, backgroundColor: '#fff' }, thumb]} />
        </View>
      </View>
    </GestureDetector>

  </View>;
}
