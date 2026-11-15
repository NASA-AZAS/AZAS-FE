import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from '../../theme';
import { JourneyVideoFade } from './journey-countdown';
import { MoonLaunchVideo } from './moon-launch-video';
import { LunarPanorama } from './lunar-panorama';
import { RocketCompanion } from './rocket-companion';
import { RocketDialogue } from './rocket-dialogue';
import type { LunarSite } from './lunar-sites';

const arrivalPages = [
  "Touchdown! We've made it to the Moon! We'll have continuous sunlight and Earth communication for the next 48 hours!",
  "That means reliable solar power and a steady connection to Earth! Now, take your time and look around!",
];

export function LunarArrival({ site, active, onReady }: { site: LunarSite; active: boolean; onReady: () => void }) {
  const [stage, setStage] = useState<'fade' | 'video' | 'panorama'>('fade');
  const [loaded, setLoaded] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(true);
  const [speechKey, setSpeechKey] = useState(0);
  const replay = () => { setSpeechKey(key => key + 1); setSpeechVisible(true); };
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
      <Text style={{ color: '#fff', fontSize: 16 }}>Welcome to Lunar 「{site.name.replace(/^Site(?=\d)/, 'Site ')}」 !</Text>
      <View style={{ flex: 1, minHeight: 0 }}>
        <LunarPanorama site={site} onReady={panoramaReady} landed surfaceActive={active && loaded} />
        {loaded && <View testID="arrival-dialogue" pointerEvents="box-none" style={{ position: 'absolute', left: 12, top: 12, right: 116, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 64, height: 80 }} pointerEvents="box-none"><View style={{ position: 'absolute', left: -48, top: -30, transform: [{ scale: .48 }] }}><RocketCompanion narrator outlined onSmile={replay} /></View></View>
          {speechVisible && <Animated.View key={speechKey} entering={FadeIn.duration(250)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}><RocketDialogue autoDismissMs={3000} compact pages={arrivalPages} onDismiss={() => setSpeechVisible(false)} /></Animated.View>}
        </View>}
      </View>
    </Animated.View>}
  </>;
}
