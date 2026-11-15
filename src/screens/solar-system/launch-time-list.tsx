import { memo, useMemo } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { getMockLaunchWindows } from './launch-sites';
import { NASA_RED } from './lunar-sites';

export const LaunchTimeList = memo(function LaunchTimeList({ arrivalAt, selectedId, onSelect }: {
  arrivalAt: string; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const windows = useMemo(() => getMockLaunchWindows(arrivalAt), [arrivalAt]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const top = Math.max(24, insets.top);
  const panelHeight = (height - top - Math.max(150, insets.bottom + 130)) * .9;
  return <View testID="launch-time-list" style={{ position: 'absolute', right: Math.max(24, insets.right), top, height: panelHeight, width: '25.2%', ...theme.outlineSurface, borderRadius: 12, padding: 12, gap: 10 }}>
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Choose by Launch Time</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 10 }}>All times in UTC · Demo</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator>
      {windows.map(({ site, launchAt }) => {
        const selected = selectedId === site.id;
        const color = selected ? NASA_RED : theme.colors.text;
        const date = launchAt.slice(0, 10).replaceAll('-', '.');
        const time = launchAt.slice(11, 16);
        return <Pressable key={site.id} accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={`Launch ${date} ${time} UTC from ${site.name}`} onPress={() => onSelect(site.id)}
          style={({ pressed }) => ({ ...theme.outlineSurface, borderColor: selected ? NASA_RED : '#fff', borderRadius: 7, padding: 10, gap: 5, opacity: pressed ? .65 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={13} color={color} accessible={false} />
            <Text style={{ color, fontSize: 12, fontWeight: '500', flexShrink: 1 }}>{date}  {time}</Text>
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: selected ? NASA_RED : theme.colors.muted, fontSize: 10 }}>{site.name}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
});
