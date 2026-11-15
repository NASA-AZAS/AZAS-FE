import { useEffect } from 'react';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { Easing, ReduceMotion, useSharedValue, withTiming, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { localMinimaps } from './local-minimap-assets';
import { NASA_RED, type LunarSite } from './lunar-sites';
import { SurfaceSkyReadout } from './surface-sky-readout';
import type { SkyMarkers } from './surface-sky';
import type { SkyBody } from './surface-sky-data';
import type { SiteConditions } from './site-conditions';

const SIZE = 88, CENTER = SIZE / 2;
const metrics = [
  { key: 'sunlight', label: 'Sunlight', color: '#FFD166' },
  { key: 'earthCommunication', label: 'Earth Communication', color: '#74D9F5' },
] as const;
export function PanoramaMinimap({ site, conditions, heading, horizontalFov, side = 'left', skyMarkers, onFindBody }: { onFindBody?: (body: SkyBody) => void; conditions?: SiteConditions; skyMarkers?: SharedValue<SkyMarkers>; side?: 'left' | 'right'; site: LunarSite; heading: SharedValue<number>; horizontalFov: number }) {
  // Rotate imagery into local north-up; the overlay heading is then geographic azimuth.
  const cone = useAnimatedStyle(() => ({ transform: [{ rotate: `${heading.get()}rad` }] }));
  const half = horizontalFov / 2, r = SIZE * Math.SQRT2;
  const x1 = CENTER - Math.sin(half) * r, y = CENTER - Math.cos(half) * r;
  const x2 = CENTER + Math.sin(half) * r;
  return <View pointerEvents="box-none" style={{ position: 'absolute', ...(side === 'right' ? { right: 11.5 } : { left: 11.5 }), top: 11.5, width: SIZE + 1, gap: 8 }}>
    <View style={{ width: SIZE + 1, height: SIZE + 1, borderWidth: .5, borderColor: '#fff' }}>
    <View testID="panorama-minimap" style={styles.map}>
    <Image source={localMinimaps[site.id]} style={StyleSheet.absoluteFill} />
    <Animated.View testID="panorama-view-cone" style={[StyleSheet.absoluteFill, cone]}>
      <Svg width={SIZE * 3} height={SIZE * 3} viewBox={`${-SIZE} ${-SIZE} ${SIZE * 3} ${SIZE * 3}`} style={{ position: 'absolute', left: -SIZE, top: -SIZE }}>
        <Path d={`M${CENTER} ${CENTER} L${x1} ${y} A${r} ${r} 0 0 1 ${x2} ${y} Z`} fill={NASA_RED} fillOpacity={.25} stroke={NASA_RED} strokeWidth={.7} />
        <Line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER-r} stroke="#fff" strokeWidth={.7} opacity={.8} />
      </Svg>
    </Animated.View>
    <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}><Circle cx={CENTER} cy={CENTER} r={6} fill="#111" stroke={NASA_RED} strokeWidth={2} /><Circle cx={CENTER} cy={CENTER} r={2.5} fill={NASA_RED} /></Svg>
    <Text style={{ position: 'absolute', left: CENTER - 8, top: 3, width: 16, textAlign: 'center', color: '#fff', fontSize: 10, backgroundColor: '#050a12aa' }}>N</Text>
    <Text style={{ position: 'absolute', left: 3, bottom: 2, color: '#fff', fontSize: 8, backgroundColor: '#050a12aa', paddingHorizontal: 2 }}>{site.squareSideM} m</Text>
    {skyMarkers && (['sun', 'earth'] as const).map(body => <MinimapSkyDot key={body} body={body} markers={skyMarkers} onFind={onFindBody} />)}
    </View>
    </View>
    <View testID="panorama-site-conditions" style={{ width: SIZE + 1, gap: 6 }}>
      {metrics.map(metric => <ConditionBar key={`${site.id}-${metric.key}`} label={metric.label} color={metric.color} value={conditions?.[metric.key]} />)}
    </View>
    {skyMarkers && <SurfaceSkyReadout markers={skyMarkers} />}
  </View>;
}
function MinimapSkyDot({ body, markers, onFind }: { body: SkyBody; markers: SharedValue<SkyMarkers>; onFind?: (body: SkyBody) => void }) {
  const position = useAnimatedStyle(() => {
    const azimuth = markers.get()[body].azimuth;
    const az = (azimuth ?? 0) * Math.PI / 180;
    const x = Math.sin(az), y = -Math.cos(az);
    const edge = (CENTER - 3) / Math.max(Math.abs(x), Math.abs(y), .001);
    return { opacity: azimuth == null ? 0 : 1, transform: [{ translateX: CENTER + x * edge - 2.5 }, { translateY: CENTER + y * edge - 2.5 }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 5, height: 5 }, position]}>
    <Pressable testID={`minimap-${body}-direction`} accessibilityRole="button" accessibilityLabel={`Find ${body} from minimap`} onPress={() => onFind?.(body)} hitSlop={8} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: body === 'sun' ? '#FFD166' : '#74B9FF', borderWidth: .5, borderColor: '#111' }} />
  </Animated.View>;
}
function ConditionBar({ label, color, value }: { label: string; color: string; value?: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(0);
    if (value == null) return;
    fill.set(withTiming(value, { duration: 650, easing: Easing.bezier(.23, 1, .32, 1), reduceMotion: ReduceMotion.System }));
  }, [fill, value]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get()}%` }));
  return <View style={{ gap: 3 }}>
    <Text numberOfLines={1} style={{ color: '#fff', fontSize: 8, textShadowColor: '#000', textShadowRadius: 3 }}>{label}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: value, text: value == null ? 'Unavailable' : `${value}%` }} style={{ height: 5, width: '100%', borderWidth: .5, borderColor: color, backgroundColor: '#050a12aa', overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color }, fillStyle]} />
    </View>
  </View>;
}
const styles = StyleSheet.create({ map: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, overflow: 'hidden', borderWidth: 1, borderColor: NASA_RED, borderRadius: 0, backgroundColor: '#111' } });
