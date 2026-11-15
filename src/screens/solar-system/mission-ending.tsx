import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { scheduleOnRN } from 'react-native-worklets';

const credits = [
  ['THE JOURNEY CONTINUES', 'Every landing begins with a decision.'],
  ['NASA SPACE APPS CHALLENGE 2026 SEOUL', 'LAMP', 'Lunar Access and Mission Planning'],
  ['CREATED BY', 'TEAM AZAS', 'Astro-Zonal Assessment & Scheduling', 'Inha University, Republic of Korea'],
  ['TEAM MEMBERS', 'Hun-yeop Choi', 'Jin Kim', 'Jiwon Lee', 'Min-seok Sung', 'Min-hyeok Bae'],
  ['DATA & SCIENTIFIC RESOURCES', 'NASA Lunar Orbiter Laser Altimeter (LOLA)', 'NASA JPL Horizons System', 'NASA Moon Trek'],
  ['OPEN SOURCE', 'Three.js', 'JavaScript 3D library · MIT License', 'github.com/mrdoob/three.js'],
  ['BUILT WITH', 'React · React Native · Expo', 'React Three Fiber', 'Reanimated · Gesture Handler · React Native SVG'],
  ['OUR ROCKET COMPANION', 'Open Bot Avatar', 'Dominik Scholz · MIT License', 'github.com/DominikScholz/open-bot-avatar'],
  ['LUNAR IMAGERY', 'NASA · LROC · Arizona State University'],
  ['SPECIAL THANKS', 'NASA Space Apps Challenge 2026', 'Inha University'],
  ['Exploration never ends.', 'Your Moon. Your Mission.'],
];
export function MissionEnding({ active, onHome, onPrepareHome }: { active: boolean; onHome: () => void; onPrepareHome: () => void }) {
  const [phase, setPhase] = useState<'complete' | 'credits' | 'next'>('complete');
  const [held, setHeld] = useState(false);
  useEffect(() => { if (phase === 'next') onPrepareHome(); }, [phase, onPrepareHome]);
  const advance = useCallback(() => setPhase(p => p === 'complete' ? 'credits' : 'next'), []);
  return <View testID="mission-ending" accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 1100 }]} onStartShouldSetResponder={() => true} onResponderGrant={() => setHeld(true)} onResponderRelease={() => setHeld(false)} onResponderTerminate={() => setHeld(false)}>
    {phase === 'complete' && <Animated.View pointerEvents="none" entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill}>
      <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0007' }]} />
    </Animated.View>}
    {phase !== 'complete' && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#03070d' }]}>{Array.from({ length: 90 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${i * 73.71 % 100}%`, top: `${i * 41.13 % 100}%`, width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, backgroundColor: '#fff', opacity: .2 + (i % 4) * .15 }} />)}</View>}
    <EndingPhase speed={phase === 'credits' && held ? 2 : 1} key={phase} phase={phase} active={active} onComplete={phase === 'next' ? onHome : advance} />
  </View>;
}
function EndingPhase({ phase, active, onComplete, speed }: { speed: number; phase: 'complete' | 'credits' | 'next'; active: boolean; onComplete: () => void }) {
  const progress = useSharedValue(0);
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [creditHeight, setCreditHeight] = useState(1100);
  const duration = phase === 'complete' ? 2000 : phase === 'credits' ? 17000 : 1000;
  useEffect(() => {
    if (!active) return;
    progress.set(withTiming(1, { duration: duration * (1 - progress.get()) / speed, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, finished => { if (finished) scheduleOnRN(onComplete); }));
    return () => cancelAnimation(progress);
  }, [active, duration, progress, onComplete, speed]);
  const titleStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get() * 5), transform: [{ scale: reduce || phase === 'next' ? 1 : 1.65 - Math.min(1, progress.get() * 2) * .65 }] }));
  const crawlStyle = useAnimatedStyle(() => ({ transform: [{ translateY: height - progress.get() * (height + creditHeight + 160) }] }));
  return phase === 'credits' ? <View testID="mission-credits" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 100%', transform: [{ perspective: 800 }, { rotateX: reduce ? '0deg' : '23deg' }] }]}>
      <Animated.View onLayout={e => setCreditHeight(e.nativeEvent.layout.height)} style={[{ position: 'absolute', top: 0, left: '12%', width: '76%', alignItems: 'center', gap: 38, paddingBottom: 35 }, crawlStyle]}>
        <Text style={{ color: '#e9c874', fontSize: 38, fontWeight: '700', letterSpacing: 8 }}>LAMP</Text>
        {credits.map(([heading, ...lines]) => <View key={heading} style={{ alignItems: 'center', gap: 8 }}>
          {heading === 'NASA SPACE APPS CHALLENGE 2026 SEOUL' && <CreditSplashLogo variant="space-apps" />}
          {heading === 'CREATED BY' && <CreditSplashLogo variant="azas" />}
          <Text style={{ color: heading === 'Exploration never ends.' ? '#efd99c' : '#b7a16c', fontSize: heading === 'Exploration never ends.' ? 30 : 10, lineHeight: heading === 'Exploration never ends.' ? 38 : undefined, fontWeight: heading === 'Exploration never ends.' ? '600' : '400', letterSpacing: heading === 'Exploration never ends.' ? 1 : 3, textAlign: 'center' }}>{heading}</Text>
          {lines.map((line, i) => <Text key={line} style={{ color: '#efd99c', fontSize: heading === 'Exploration never ends.' ? 28 : heading === 'TEAM MEMBERS' ? 20 : i === 0 ? 22 : 13, lineHeight: heading === 'Exploration never ends.' ? 36 : heading === 'TEAM MEMBERS' ? 29 : i === 0 ? 29 : 20, fontWeight: heading === 'TEAM MEMBERS' ? '500' : i === 0 ? '600' : '400', textAlign: 'center' }}>{line}</Text>)}
        </View>)}
      </Animated.View>
    </View>
  </View> : <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
    <Animated.Text testID={phase === 'complete' ? 'mission-complete' : 'next-mission'} style={[{ color: '#fff', fontSize: Math.min(width * .055, 54), fontWeight: '700', letterSpacing: phase === 'complete' ? 3 : 6, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 12 }, titleStyle]}>{phase === 'complete' ? 'Mission Complete' : 'NEXT MISSION?'}</Animated.Text>
  </View>;
}

// Reuse the already-loaded splash bitmap; raster logos remain intact inside the 3D crawl.
function CreditSplashLogo({ variant }: { variant: 'space-apps' | 'azas' }) {
  const nasa = variant === 'space-apps';
  return <View testID={nasa ? 'credits-space-apps-logo' : 'credits-azas-logo'} collapsable={false} shouldRasterizeIOS renderToHardwareTextureAndroid style={{ width: nasa ? 260 : 160, height: nasa ? 112 : 188, flexShrink: 0, overflow: 'hidden', marginBottom: 12 }}>
    <Image accessibilityLabel={nasa ? 'NASA Space Apps Challenge logo' : 'AZAS rocket logo'} source={require('../../../assets/startup-brand.png')} resizeMode="stretch" fadeDuration={0} style={{ position: 'absolute', width: 496, height: 188, left: nasa ? -236 : 0, top: nasa ? -34 : 0 }} />
  </View>;
}
