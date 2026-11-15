import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const source = Asset.fromModule(require('../../../KakaoTalk_Video_2026-11-15-15-26-33.mp4')).uri;

export function ArrivalVideo({ active, visible, onComplete, onError }: {
  active: boolean; visible: boolean; onComplete: () => void; onError: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const coverOpacity = useSharedValue(1);
  useEffect(() => { coverOpacity.set(withTiming(playing ? 0 : 1, { duration: 350 })); }, [playing, coverOpacity]);
  const cover = useAnimatedStyle(() => ({ opacity: coverOpacity.get() }));

  useEffect(() => {
    const element = video.current;
    if (!element || !active) return;
    let cancelled = false, finished = false;
    const finish = (callback: () => void) => {
      if (cancelled || finished) return;
      finished = true;
      element.pause();
      callback();
    };
    const started = () => setPlaying(true);
    const ended = () => finish(onComplete);
    const failed = () => finish(onError);
    element.addEventListener('playing', started);
    element.addEventListener('ended', ended);
    element.addEventListener('error', failed);
    element.defaultMuted = true;
    element.muted = true;
    element.playsInline = true;
    // iPhone may defer canplay until play(); Expo's web player discards play()'s rejection.
    if (element.error) failed();
    else element.play().catch(failed);

    let lastTime = element.currentTime, stalledFor = 0;
    const watchdog = setInterval(() => {
      if (document.hidden || element.ended || finished) return;
      const current = element.currentTime;
      stalledFor = current > lastTime ? 0 : stalledFor + 1;
      lastTime = current;
      if (stalledFor >= 8) failed();
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(watchdog);
      element.removeEventListener('playing', started);
      element.removeEventListener('ended', ended);
      element.removeEventListener('error', failed);
      element.pause();
    };
  }, [active, onComplete, onError]);

  return <View testID="arrival-video" pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 900, backgroundColor: '#000', display: visible ? 'flex' : 'none' }]}>
    <video ref={video} src={source} muted playsInline preload="auto" controls={false} disablePictureInPicture
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
    {/* Fade a cover instead of the video/compositing layer inside the scaled mobile iframe. */}
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, cover]} />
    {active && !playing && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />}
  </View>;
}
