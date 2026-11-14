import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { localMinimaps } from './local-minimap-assets';
import { NASA_RED, type LunarSite } from './lunar-sites';

const SIZE = 88, CENTER = SIZE / 2;
export function PanoramaMinimap({ site, heading, horizontalFov }: { site: LunarSite; heading: SharedValue<number>; horizontalFov: number }) {
  // Rotate imagery into local north-up; the overlay heading is then geographic azimuth.
  const cone = useAnimatedStyle(() => ({ transform: [{ rotate: `${heading.get()}rad` }] }));
  const half = horizontalFov / 2, r = SIZE * Math.SQRT2;
  const x1 = CENTER - Math.sin(half) * r, y = CENTER - Math.cos(half) * r;
  const x2 = CENTER + Math.sin(half) * r;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 11.5, top: 11.5, width: SIZE + 1, height: SIZE + 1, borderWidth: .5, borderColor: '#fff' }}>
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
    </View>
  </View>;
}
const styles = StyleSheet.create({ map: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, overflow: 'hidden', borderWidth: 1, borderColor: NASA_RED, borderRadius: 0, backgroundColor: '#111' } });
