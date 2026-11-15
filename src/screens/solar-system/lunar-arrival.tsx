import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { cancelAnimation, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from '../../theme';
import { JourneyVideoFade } from './journey-countdown';
import { MoonLaunchVideo } from './moon-launch-video';
import { LunarPanorama } from './lunar-panorama';
import { MissionEnding } from './mission-ending';
import { RocketCompanion } from './rocket-companion';
import { RocketDialogue } from './rocket-dialogue';
import type { LunarSite } from './lunar-sites';

const arrivalPages = [
  "Touchdown! We've made it to the Moon! We'll have continuous sunlight and Earth communication for the next 48 hours!",
  "That means reliable solar power and a steady connection to Earth! Now, take your time and look around!",
];

export function LunarArrival({ site, active, onReady, onHome, onPrepareHome }: { site: LunarSite; active: boolean; onReady: () => void; onHome: () => void; onPrepareHome: () => void }) {
  const [stage, setStage] = useState<'fade' | 'video' | 'panorama'>('fade');
  const [completing, setCompleting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [smileTrigger, setSmileTrigger] = useState(0);
  const [completionSpoken, setCompletionSpoken] = useState(false);
  const showEnding = useCallback(() => setCompletionSpoken(true), []);
  useEffect(() => {
    if (!completionSpoken || !active || ending) return;
    const timer = setTimeout(() => setEnding(true), 1500);
    return () => clearTimeout(timer);
  }, [completionSpoken, active, ending]);
  const [loaded, setLoaded] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(true);
  const [speechKey, setSpeechKey] = useState(0);
  const replay = () => { if (completing) return; setSpeechKey(key => key + 1); setSpeechVisible(true); };
  const opacity = useSharedValue(0);
  const play = useCallback(() => setStage('video'), []);
  const finish = useCallback(() => setStage('panorama'), []);
  const panoramaReady = useCallback(() => setLoaded(true), []);
  useEffect(() => {
    if (stage !== 'panorama' || !loaded || !active) return;
    opacity.set(withTiming(1, { duration: 650, reduceMotion: ReduceMotion.System }, finished => { if (finished) scheduleOnRN(onReady); }));
    return () => cancelAnimation(opacity);
  }, [stage, loaded, active, opacity, onReady]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <>
    {!(stage === 'panorama' && loaded) && <JourneyVideoFade active={active && stage === 'fade'} onComplete={play} />}
    <MoonLaunchVideo source={require('../../../KakaoTalk_Video_2026-11-15-15-26-33.mp4')} visible={stage === 'video' || (stage === 'panorama' && !loaded)} active={active && stage === 'video'} onComplete={finish} onError={finish} />
    {stage === 'panorama' && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 880, backgroundColor: '#03070d' }]}>
      {Array.from({ length: 85 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${(i * 73.71) % 100}%`, top: `${(i * 41.13) % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, borderRadius: 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}
    </Animated.View>}
    {stage === 'panorama' && <Animated.View testID="arrival-panorama-modal" style={[{ position: 'absolute', left: '7%', right: '7%', top: 20, bottom: 20, zIndex: 910, ...theme.outlineSurface, borderRadius: 14, padding: 12, gap: 12 }, fade]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: '#fff', fontSize: 16 }}>Welcome to Lunar 「{site.name.replace(/^Site(?=\d)/, 'Site ')}」 !</Text>
        <Pressable testID="mission-done" accessibilityRole="button" accessibilityLabel="Done" disabled={!loaded || completing} onPress={() => { setCompleting(true); setSpeechVisible(true); setSpeechKey(k => k + 1); setSmileTrigger(k => k + 1); }} style={({ pressed }) => ({ ...theme.outlineSurface, borderRadius: 3, paddingHorizontal: 14, height: 28, alignItems: 'center', justifyContent: 'center', opacity: !loaded || completing ? .4 : pressed ? .6 : 1 })}><Text style={{ color: '#fff', fontSize: 12, letterSpacing: 1 }}>DONE ?</Text></Pressable>
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <LunarPanorama site={site} onReady={panoramaReady} landed surfaceActive={active && loaded && !completing} />
        {loaded && <View testID="arrival-dialogue" pointerEvents="box-none" style={{ position: 'absolute', left: 12, top: 12, right: 116, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 64, height: 80 }} pointerEvents="box-none"><View style={{ position: 'absolute', left: -48, top: -30, transform: [{ scale: .48 }] }}><RocketCompanion narrator outlined onSmile={replay} smileTrigger={smileTrigger} /></View></View>
          {speechVisible && <Animated.View key={speechKey} entering={FadeIn.duration(250)} exiting={FadeOut.duration(300)} style={{ flex: 1, alignSelf: 'center', flexGrow: 1 }}><RocketDialogue autoDismissMs={completing ? undefined : 3000} compact pages={completing ? ["Great work, explorer! Our lunar mission is complete. We're heading back to Earth!"] : arrivalPages} onFinished={completing ? showEnding : undefined} onDismiss={completing ? undefined : () => setSpeechVisible(false)} /></Animated.View>}
        </View>}
      </View>
    </Animated.View>}
    {ending && <View testID="ending-input-lock" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} />}
    {ending && <MissionEnding active={active} onHome={onHome} onPrepareHome={onPrepareHome} />}
  </>;
}
