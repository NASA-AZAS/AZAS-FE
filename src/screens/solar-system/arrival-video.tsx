import { MoonLaunchVideo } from './moon-launch-video';

export function ArrivalVideo(props: { active: boolean; visible: boolean; onComplete: () => void; onError: () => void }) {
  return <MoonLaunchVideo {...props} autoplay source={require('../../../KakaoTalk_Video_2026-11-15-15-26-33.mp4')} />;
}
