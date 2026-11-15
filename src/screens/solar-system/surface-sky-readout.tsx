import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { emptySkyMarkers, type SkyMarkers } from './surface-sky';

export function SurfaceSkyReadout({ markers }: { markers: SharedValue<SkyMarkers> }) {
  const [sky, setSky] = useState(emptySkyMarkers);
  useEffect(() => { const timer = setInterval(() => setSky(markers.get()), 100); return () => clearInterval(timer); }, [markers]);
  return <View testID="surface-sky-readout" style={{ gap: 7 }}>
    {(['sun', 'earth'] as const).map(body => {
      const point = sky[body];
      const color = point.visible ? body === 'sun' ? '#FFD166' : '#74B9FF' : '#858b94';
      return <View key={body} testID={`sky-readout-${body}`} style={{ gap: 2 }}>
        <Text style={{ color, fontSize: 9, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 3 }}>● {body === 'sun' ? 'Sun' : 'Earth'}</Text>
        <Text style={{ color, fontSize: 8, fontVariant: ['tabular-nums'], textShadowColor: '#000', textShadowRadius: 3 }}>Azimuth {point.azimuth.toFixed(1)}°</Text>
        <Text style={{ color, fontSize: 8, fontVariant: ['tabular-nums'], textShadowColor: '#000', textShadowRadius: 3 }}>Elevation {point.elevation.toFixed(1)}°</Text>
      </View>;
    })}
  </View>;
}
