import { memo } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import type { LaunchSite } from './launch-sites';
import { NASA_RED } from './lunar-sites';

type LaunchTimeListProps = {
  sites: LaunchSite[];
  touchdownUtc: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChangeLanding: () => void;
};

const formatUtc = (value: string) => ({ date: value.slice(0, 10).replaceAll('-', '.'), time: value.slice(11, 16) });

export const LaunchTimeList = memo(function LaunchTimeList({ sites, touchdownUtc, selectedId, onSelect, onChangeLanding }: LaunchTimeListProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const top = Math.max(24, insets.top);
  const panelHeight = (height - top - Math.max(150, insets.bottom + 130)) * .9;
  const available = sites.filter(site => site.launchAt !== null).sort((a, b) => a.launchAt!.localeCompare(b.launchAt!));
  const unavailable = sites.filter(site => site.launchAt === null);
  const touchdown = formatUtc(touchdownUtc);

  return <View testID="launch-time-list" style={{ position: 'absolute', right: Math.max(24, insets.right), top, height: panelHeight, width: '25.2%', ...theme.outlineSurface, borderRadius: 12, padding: 12, gap: 10 }}>
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Choose by Launch Time</Text>
      <Pressable accessibilityRole="button" onPress={onChangeLanding} style={{ paddingVertical: 5 }}>
        <Text style={{ color: theme.colors.text, fontSize: 11 }}>Change landing site</Text>
      </Pressable>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator>
      <View style={{ ...theme.outlineSurface, borderRadius: 7, padding: 10, gap: 5 }}>
        <Text style={{ color: theme.colors.muted, fontSize: 9, letterSpacing: 1 }}>TOUCHDOWN</Text>
        <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '500' }}>{touchdown.date}  {touchdown.time} UTC</Text>
      </View>
      {available.map(site => {
        const selected = selectedId === site.id;
        const color = selected ? NASA_RED : theme.colors.text;
        const { date, time } = formatUtc(site.launchAt!);
        return <Pressable key={site.id} accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={`Launch ${date} ${time} UTC from ${site.name}`} onPress={() => onSelect(site.id)}
          style={({ pressed }) => ({ ...theme.outlineSurface, borderColor: selected ? NASA_RED : '#fff', borderRadius: 7, padding: 10, gap: 5, opacity: pressed ? .65 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={13} color={color} accessible={false} />
            <Text style={{ color, fontSize: 12, fontWeight: '500', flexShrink: 1 }}>{date}  {time} UTC</Text>
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: selected ? NASA_RED : theme.colors.muted, fontSize: 10 }}>{site.name}</Text>
        </Pressable>;
      })}
      {unavailable.length > 0 && <Text style={{ color: theme.colors.muted, fontSize: 9, letterSpacing: 1, marginTop: 5 }}>NO LAUNCH OPPORTUNITY</Text>}
      {unavailable.map(site => <Pressable key={site.id} accessibilityRole="button" accessibilityState={{ selected: selectedId === site.id }}
        accessibilityLabel={`${site.name}: no launch opportunity available`} onPress={() => onSelect(site.id)}
        style={({ pressed }) => ({ ...theme.outlineSurface, borderRadius: 7, padding: 10, gap: 4, opacity: pressed ? .65 : 1 })}>
        <Text numberOfLines={1} style={{ color: theme.colors.muted, fontSize: 10 }}>{site.name}</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 9 }}>No launch opportunity</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
});
