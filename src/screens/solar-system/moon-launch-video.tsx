import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export function MoonLaunchVideo({ active, onComplete, onError }: { active: boolean; onComplete: () => void; onError: () => void }) {
  const [ready, setReady] = useState(false);
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
  useEffect(() => { if (active) player.play(); else player.pause(); }, [active, player]);
  return <View testID="moon-launch-video" pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 900, backgroundColor: '#000' }]}>
    <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} playsInline surfaceType="textureView" />
    {!ready && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />}
  </View>;
}
