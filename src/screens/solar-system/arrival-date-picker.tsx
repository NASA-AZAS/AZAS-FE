import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { NASA_RED } from './lunar-sites';
import { mockArrivalWindows, type ArrivalWindow } from './arrival-windows';

export function ArrivalDatePicker({ onConfirm }: { onConfirm: (window: ArrivalWindow) => void }) {
  const [selected, setSelected] = useState<ArrivalWindow | null>(null);
  return <View style={{ flex: 1, gap: 10 }}>
    <View>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Select an Arrival Date</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 4 }}>8 preset options · All times in UTC · Demo</Text>
    </View>
    <View style={{ flex: 1, gap: 6 }}>
      {[0, 2, 4, 6].map(start => <View key={start} style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
        {mockArrivalWindows.slice(start, start + 2).map(window => {
          const active = selected?.id === window.id;
          return <Pressable key={window.id} accessibilityRole="radio" accessibilityState={{ checked: active }}
            accessibilityLabel={window.arrivalAt} onPress={() => setSelected(window)}
            style={({ pressed }) => ({ flex: 1, ...theme.outlineSurface, borderColor: active ? NASA_RED : '#ffffff', borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center', opacity: pressed ? .65 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={15} color={active ? NASA_RED : theme.colors.muted} accessible={false} />
              <Text style={{ color: active ? NASA_RED : theme.colors.text, fontSize: 12, fontWeight: '500' }}>{window.arrivalAt.slice(0, 10).replaceAll('-', '.')}</Text>
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 11, marginLeft: 21, marginTop: 2 }}>{window.arrivalAt.slice(11, 16)} UTC</Text>
          </Pressable>;
        })}
      </View>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Confirm Arrival Date" accessibilityState={{ disabled: !selected }}
      disabled={!selected} onPress={() => { if (selected) onConfirm(selected); }}
      style={({ pressed }) => ({ ...theme.outlineSurface, minHeight: 48, borderWidth: .3, borderRadius: 8, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', opacity: !selected ? .35 : pressed ? .65 : 1 })}>
      <Ionicons name="time-outline" size={18} color={theme.colors.text} accessible={false} />
      <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>Confirm Arrival Date</Text>
      <Ionicons name="arrow-forward-outline" size={18} color={theme.colors.text} accessible={false} />
    </Pressable>
  </View>;
}
