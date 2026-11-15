import { useCallback, useEffect, useState } from 'react';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { StyleSheet, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RocketCompanion } from './rocket-companion';
import { NASA_RED } from './lunar-sites';
import { RocketDialogue } from './rocket-dialogue';

const SPEECH_PAGES = [
  "See all those landing sites gathered near the Moon's south pole? That's no coincidence!",
  "Some craters may hide water ice, while nearby hills get plenty of sunlight. Both could make lunar landing and exploration easier! Let's take a closer look at where we could land!",
];
const EARTH_SPEECH_PAGES = [
  "Every journey to the Moon starts here on Earth! But where we launch from matters, too. Let's pick our starting point!",
  "The location of a launch site influences a rocket's flight path, launch opportunities, and energy requirements. Choosing the right site is an important first step in planning a lunar mission.",
];
export function LunarGuide({ stage = 'moon', canSelect, onReady, polePoint, clusterPoint, onSelectCluster }: { stage?: 'moon' | 'earth'; canSelect: boolean; onReady: () => void; polePoint?: { x: number; y: number; visible: boolean; opacity?: number }; clusterPoint?: { x: number; y: number }; onSelectCluster: () => void }) {
  useEffect(() => { const timer = setTimeout(onReady, 800); return () => clearTimeout(timer); }, [onReady]);
  const [readyToSelect, setReadyToSelect] = useState(false);
  const finished = useCallback(() => setReadyToSelect(true), []);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const left = Math.max(24, insets.left), right = Math.max(24, insets.right);
  const labelX = Math.min(width - right - 160, (polePoint?.x ?? width / 2) + 140);
  const labelY = Math.max(130, (polePoint?.y ?? height / 2) - 75);
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    {polePoint?.visible && <Animated.View pointerEvents="none" entering={FadeIn.duration(700)} style={[StyleSheet.absoluteFill, { opacity: polePoint.opacity ?? 1 }]}>
      <Svg width={width} height={height}>
        <Circle cx={polePoint.x} cy={polePoint.y} r={2} fill="#fff" />
        <Path d={`M${polePoint.x} ${polePoint.y} L${polePoint.x + 35} ${labelY} L${labelX} ${labelY}`} fill="none" stroke="#fff" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        <SvgText x={labelX + 8} y={labelY + 4} fill="#fff" fontSize={12}>Lunar South Pole</SvgText>
      </Svg>
    </Animated.View>}
    <Animated.View pointerEvents="none" testID="landing-cluster-command" entering={FadeIn.duration(750)} style={[styles.command, { left, top: Math.max(24, insets.top), maxWidth: width * .48 }]}>
      <View style={styles.stepLine} />
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={styles.step}>{stage === 'earth' ? 'STEP 02' : 'STEP 01'}</Text>
        <Text style={styles.commandTitle}>{stage === 'earth' ? 'SELECT A LAUNCH SITE' : 'SELECT THE LANDING\nSITE CLUSTER'}</Text>
      </View>
    </Animated.View>
    {readyToSelect && canSelect && <Animated.View pointerEvents={(stage === 'earth' ? 1 : polePoint?.opacity ?? 0) > .05 ? 'auto' : 'none'} entering={FadeIn.duration(500)} style={{ opacity: stage === 'earth' ? 1 : polePoint?.opacity ?? 0, width: 130, position: 'absolute', left: Math.max(left, Math.min(width - right - 130, (clusterPoint?.x ?? width / 2) - 65)), top: Math.min(height - 160, (clusterPoint?.y ?? height / 2) + (stage === 'earth' ? 0 : 90)) }}>
      <Pressable testID="select-cluster-cue" accessibilityRole="button" accessibilityLabel={stage === 'earth' ? 'Select launch site' : 'Select landing site cluster'} onPress={onSelectCluster} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: NASA_RED, fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textShadowColor: '#000', textShadowRadius: 4 }}>SELECT</Text>
      </Pressable>
    </Animated.View>}
    <Animated.View pointerEvents="box-none" entering={FadeIn.duration(600).delay(200)} style={[styles.conversation, { left, bottom: Math.max(24, insets.bottom), width: width - left - right }]}>
      <View pointerEvents="box-none" style={{ width: 90, height: 100 }}><View pointerEvents="box-none" style={{ position: 'absolute', left: -35, top: -8, transform: [{ scale: .58 }] }}><RocketCompanion narrator /></View></View>
      <RocketDialogue pages={stage === 'earth' ? EARTH_SPEECH_PAGES : SPEECH_PAGES} onFinished={finished} />
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  command: { position: 'absolute', flexDirection: 'row', gap: 14 },
  stepLine: { width: 2, alignSelf: 'stretch', backgroundColor: NASA_RED },
  step: { color: '#aebac9', fontSize: 10, fontWeight: '500', letterSpacing: 2 },
  commandTitle: { color: '#F0F5FC', fontSize: 23, fontWeight: '700', letterSpacing: 4, lineHeight: 32 },
  conversation: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
});
