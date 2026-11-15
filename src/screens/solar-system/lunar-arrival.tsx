import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { theme } from '../../theme';
import { JourneyVideoFade } from './journey-countdown';
import { MoonLaunchVideo } from './moon-launch-video';
import { LunarPanorama } from './lunar-panorama';
import { RocketCompanion } from './rocket-companion';
import { RocketDialogue } from './rocket-dialogue';
import type { LunarSite } from './lunar-sites';
import { loadSurfaceSky, type LaunchPlan } from './mission-api';
import type { SurfaceTrack } from './surface-sky-data';
import type { SiteConditions } from './site-conditions';

const arrivalPages = [
  "Touchdown! We've made it to the Moon!",
  "Move the timeline to see where the Sun and Earth are from this landing site.",
];

type SkyState = { status: 'loaded'; track: SurfaceTrack | null; conditions?: SiteConditions } | { status: 'loading' } | { status: 'error'; message: string };

export function LunarArrival({ site, plan, active, onReady }: {
  site: LunarSite; plan: LaunchPlan; active: boolean; onReady: () => void;
}) {
  const [sky, setSky] = useState<SkyState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const timeout = setTimeout(() => controller.abort(), 45000);
    setSky({ status: 'loading' });
    loadSurfaceSky(plan, site.id, controller.signal)
      .then(result => {
        if (current) setSky({ status: 'loaded', ...result });
      })
      .catch((error: unknown) => {
        if (current) setSky({ status: 'error', message: controller.signal.aborted ? 'Sky request timed out.' :
          error instanceof Error ? error.message : 'Unable to load sky observations.' });
      })
      .finally(() => clearTimeout(timeout));
    return () => { current = false; clearTimeout(timeout); controller.abort(); };
  }, [plan, site.id, attempt]);
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
  const surface = sky.status === 'loaded' ? sky : undefined;
  return <>
    {!(stage === 'panorama' && loaded) && <JourneyVideoFade active={active && stage === 'fade'} onComplete={play} />}
    <MoonLaunchVideo source={require('../../../KakaoTalk_Video_2026-11-15-15-26-33.mp4')} visible={stage === 'video' || (stage === 'panorama' && !loaded)} active={active && stage === 'video'} onComplete={finish} onError={finish} />
    {stage === 'panorama' && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 880, backgroundColor: '#03070d' }]}>
      {Array.from({ length: 85 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${(i * 73.71) % 100}%`, top: `${(i * 41.13) % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, borderRadius: 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}
    </Animated.View>}
    {stage === 'panorama' && <Animated.View testID="arrival-panorama-modal" style={[{ position: 'absolute', left: '7%', right: '7%', top: 20, bottom: 20, zIndex: 910, ...theme.outlineSurface, borderRadius: 14, padding: 12, gap: 12 }, fade]}>
      <Text style={{ color: '#fff', fontSize: 16 }}>Welcome to Lunar 「{site.name.replace(/^Site(?=\d)/, 'Site ')}」 !</Text>
      <View style={{ flex: 1, minHeight: 0 }}>
        <LunarPanorama site={site} onReady={panoramaReady} landed surfaceActive={active && loaded} track={surface?.track ?? undefined} conditions={surface?.conditions} />
        {loaded && !surface?.track && <View style={{ position: 'absolute', bottom: 12, left: 16, right: 16, alignItems: 'center' }}>
          <Text accessibilityLiveRegion="polite" style={{ color: '#fff', fontSize: 11 }}>
            {sky.status === 'error' ? sky.message : surface ? 'No sky observations for this touchdown.' : 'Loading sky observations…'}
          </Text>
          {sky.status === 'error' && <Pressable accessibilityRole="button" onPress={() => setAttempt(n => n + 1)} hitSlop={8}>
            <Text style={{ color: '#fff', textDecorationLine: 'underline', padding: 4, fontSize: 12 }}>Retry</Text>
          </Pressable>}
        </View>}
        {loaded && <View testID="arrival-dialogue" pointerEvents="box-none" style={{ position: 'absolute', left: 12, top: 12, right: 116, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 64, height: 80 }} pointerEvents="box-none"><View style={{ position: 'absolute', left: -48, top: -30, transform: [{ scale: .48 }] }}><RocketCompanion narrator outlined onSmile={replay} /></View></View>
          {speechVisible && <Animated.View key={speechKey} entering={FadeIn.duration(250)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}><RocketDialogue autoDismissMs={3000} compact pages={arrivalPages} onDismiss={() => setSpeechVisible(false)} /></Animated.View>}
        </View>}
      </View>
    </Animated.View>}
  </>;
}
