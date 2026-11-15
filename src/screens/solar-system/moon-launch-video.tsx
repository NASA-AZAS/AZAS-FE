import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function MoonLaunchVideo({ active, visible, onComplete, onError }: { active: boolean; visible: boolean; onComplete: () => void; onError: () => void }) {
  const [ready, setReady] = useState(false);
  const opacity = useSharedValue(0);
  useEffect(() => { opacity.set(withTiming(visible && ready ? 1 : 0, { duration: 350 })); }, [visible, ready, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const player = useVideoPlayer(require('../../../KakaoTalk_Video_2026-11-15-12-41-13.mp4'), player => {
    player.loop = false;
  });
  useEffect(() => {
    const ended = player.addListener('playToEnd', onComplete);
    const status = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true);
      if (status === 'error') onError();
    });
    if (player.status === 'readyToPlay') setReady(true);
    if (player.status === 'error') onError();
    return () => { ended.remove(); status.remove(); };
  }, [player, onComplete, onError]);
  useEffect(() => { if (active && player.status === 'error') onError(); else if (active && ready) player.play(); else player.pause(); }, [active, ready, player, onError]);
  return <Animated.View testID="moon-launch-video" pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 900, backgroundColor: '#000' }, fade]}>
    <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} playsInline surfaceType="textureView" />
    {!ready && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />}
  </Animated.View>;
}
