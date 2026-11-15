import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { TerrainOccultation } from './surface-sky-data';

const bodyLabels = { sun: 'Sun', earth: 'Earth' };
const bodyColors = { sun: '#FFD166', earth: '#74B9FF' };

export function SurfaceTimeline({ touchdownMs, durationSeconds, terrainOccultations = [], elapsed, autoRotate, scrubbing }: {
  touchdownMs: number; durationSeconds: number; elapsed: SharedValue<number>; autoRotate: SharedValue<boolean>; scrubbing: SharedValue<boolean>;
  terrainOccultations?: TerrainOccultation[];
}) {
  const width = useSharedValue(1);
  const [seconds, setSeconds] = useState(0);
  const utc = new Date(touchdownMs + seconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const hours = durationSeconds / 3600;
  useEffect(() => { const timer = setInterval(() => setSeconds(elapsed.get()), 100); return () => clearInterval(timer); }, [elapsed]);
  const scrub = useMemo(() => Gesture.Pan().minDistance(0).shouldCancelWhenOutside(false)
    .onBegin(e => { scrubbing.set(true); autoRotate.set(false); elapsed.set(Math.max(0, Math.min(1, e.x / width.get())) * durationSeconds); })
    .onUpdate(e => elapsed.set(Math.max(0, Math.min(1, e.x / width.get())) * durationSeconds))
    .onEnd(e => elapsed.set(Math.max(0, Math.min(1, e.x / width.get())) * durationSeconds))
    .onFinalize(() => scrubbing.set(false)), [elapsed, width, autoRotate, scrubbing, durationSeconds]);
  const fill = useAnimatedStyle(() => ({ width: `${elapsed.get() / durationSeconds * 100}%` }));
  const thumb = useAnimatedStyle(() => ({ left: `${elapsed.get() / durationSeconds * 100}%` }));
  return <View testID="surface-timeline" style={{ position: 'absolute', bottom: 0, left: 16, right: 16, minHeight: 58, paddingHorizontal: 8, paddingBottom: 8, borderRadius: 6, backgroundColor: '#050a12cc' }}>
    {terrainOccultations.length > 0 && <View pointerEvents="none" style={{ paddingTop: 5, paddingBottom: 5 }}>
      <Text style={{ color: '#c4ceda', fontSize: 9, lineHeight: 12 }}>First terrain occultation · within 48 h</Text>
      {terrainOccultations.map(event => <Text key={event.body} testID={`terrain-occultation-${event.body}-label`} selectable accessibilityLabel={`${bodyLabels[event.body]} first terrain occultation, ${event.utc}`} style={{ color: bodyColors[event.body], fontSize: 10, lineHeight: 16, fontVariant: ['tabular-nums'] }}>
        {bodyLabels[event.body]} · {event.utc.replace('T', ' ').replace('Z', ' UTC')}
      </Text>)}
    </View>}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5 }}>
      <Text testID="surface-time" style={{ color: '#fff', fontSize: 9, fontVariant: ['tabular-nums'] }}>{utc}</Text>
      <Text style={{ color: '#fff', fontSize: 9 }}>{(seconds / 3600).toFixed(1)} / {hours} h</Text>
    </View>
    <GestureDetector gesture={scrub} touchAction="none">
      <View testID="surface-time-slider" accessible accessibilityRole="adjustable" accessibilityLabel={`Surface time, ${hours} hours`} accessibilityValue={{ min: 0, max: hours, now: seconds / 3600 }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={e => elapsed.set(Math.max(0, Math.min(durationSeconds, elapsed.get() + (e.nativeEvent.actionName === 'increment' ? 3600 : -3600))))} onLayout={e => width.set(Math.max(1, e.nativeEvent.layout.width))} style={{ height: 24, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 3, backgroundColor: '#ffffff55', borderRadius: 2 }}>
          <Animated.View style={[{ position: 'absolute', height: 3, backgroundColor: '#FC3D21', borderRadius: 2 }, fill]} />
          <Animated.View style={[{ position: 'absolute', top: -4, marginLeft: -5, width: 11, height: 11, borderRadius: 6, backgroundColor: '#fff' }, thumb]} />
          {terrainOccultations.map(event => <View key={event.body} testID={`terrain-occultation-${event.body}-marker`} style={{ position: 'absolute', left: `${event.elapsedSeconds / durationSeconds * 100}%`, top: event.body === 'sun' ? -8 : 4, marginLeft: -3, width: 6, height: 7, borderRadius: 1, backgroundColor: bodyColors[event.body] }} />)}
        </View>
      </View>
    </GestureDetector>

  </View>;
}
