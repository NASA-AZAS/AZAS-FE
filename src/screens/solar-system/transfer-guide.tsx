import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RocketCompanion } from './rocket-companion';
import { RocketDialogue } from './rocket-dialogue';
import { JourneyCountdown } from './journey-countdown';
import { moonFlightStories } from './moon-flight-stories';

const pages = [
  "See how the path curves between Earth and the Moon? Gravity shapes our journey, so we carefully plan our trajectory to save fuel and reach the Moon safely!",
  "That loop around Earth is called a parking orbit! It gives us time to check our spacecraft and wait for the right moment to fire our engines toward the Moon!",
  "And the loop around the Moon? We slow down to enter lunar orbit instead of flying past it! This lets us prepare for a controlled descent under the right sunlight and communication conditions. Safety first!",
];
export function TransferGuide({ flight = false, countdown = false, active, onCountdownComplete }: { flight?: boolean; countdown?: boolean; active: boolean; onCountdownComplete: () => void }) {
  const { width } = useWindowDimensions();
  const speech = flight ? moonFlightStories : pages;
  const insets = useSafeAreaInsets();
  const left = Math.max(24, insets.left), right = Math.max(24, insets.right);
  return <Animated.View entering={FadeIn.duration(700).delay(150)} testID="transfer-guide" pointerEvents="box-none" style={{ position: 'absolute', left, bottom: Math.max(24, insets.bottom), width: width - left - right, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
    <View pointerEvents="box-none" style={{ width: 90, height: 100 }}>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: -35, top: -8, transform: [{ scale: .58 }] }}><RocketCompanion narrator /></View>
    </View>
    {countdown ? <JourneyCountdown reserveText={speech.reduce((a, b) => a.length > b.length ? a : b)} active={active} onComplete={onCountdownComplete} /> : <RocketDialogue pages={speech} showPageNumber={flight} />}
  </Animated.View>;
}
