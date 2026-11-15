import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type LaunchSite } from './launch-sites';
import { NASA_RED } from './lunar-sites';

export const hasLaunchCallout = (id: string) => id === 'launch-1' || id === 'launch-2';

// Both globe and flat map use the same screen-sized labels around an unchanged pin.
export function LaunchSiteCallout({ site, selected, onSelect }: { site: LaunchSite; selected: boolean; onSelect: (id: string) => void }) {
  const left = site.id === 'launch-1';
  const color = selected ? NASA_RED : '#fff';
  return <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, width: 350, height: 100 }}>
    <Svg pointerEvents="none" width={350} height={100}>
      <Path d={left ? 'M175 50 L153 25 L143 25' : 'M175 50 L197 75 L207 75'} fill="none" stroke={color} strokeWidth={.7} strokeLinejoin="round" />
    </Svg>
    <Pressable accessibilityRole="button" accessibilityLabel={`Select ${site.name}`} onPress={() => onSelect(site.id)} style={{ position: 'absolute', left: left ? 0 : 210, top: left ? 13 : 63, width: 140, height: 24, justifyContent: 'center' }}>
      <Text numberOfLines={2} style={{ color, fontSize: 8, lineHeight: 11, textAlign: left ? 'right' : 'left', textShadowColor: '#000', textShadowRadius: 3 }}>{site.name}</Text>
    </Pressable>
  </View>;
}
