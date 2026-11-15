import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export function StartupSplash({ leaving, error, onBrandReady }: { leaving: boolean; error: string | null; onBrandReady: () => void }) {
  const { width } = useWindowDimensions();
  const brandWidth = Math.min(width - 48, 510), brandHeight = brandWidth * 188 / 496;
  const opacity = useSharedValue(1);
  useEffect(() => { opacity.set(withTiming(leaving ? 0 : 1, { duration: 220 })); }, [leaving, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View testID="startup-splash" accessibilityLabel="LAMP startup" style={[StyleSheet.absoluteFill, styles.screen, fade]}>
    {Array.from({ length: 100 }, (_, i) => <View key={i} style={{ position: 'absolute', left: `${i * 63.37 % 100}%`, top: `${i * 37.79 % 100}%`, width: i % 7 ? 1 : 2, height: i % 7 ? 1 : 2, backgroundColor: '#fff', opacity: .2 + i % 5 * .12 }} />)}
    <View style={{ width: brandWidth, height: brandHeight }}>
      <Image testID="startup-brand" accessibilityLabel="LAMP and NASA Space Apps" source={require('../../../assets/startup-brand.png')} onLoad={onBrandReady} resizeMode="contain" style={{ width: brandWidth, height: brandHeight }} />
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: brandWidth * .32, height: brandHeight * .21, backgroundColor: '#03070d', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#F0F5FC', fontSize: brandWidth * .061, fontWeight: '700', letterSpacing: brandWidth * .012 }}>LAMP</Text>
      </View>
    </View>
    {!leaving && <View style={styles.status}>{!error && <ActivityIndicator size="small" color="#b6c7da" />}<Text style={styles.note}>{error || 'Preparing your universe'}</Text></View>}
  </Animated.View>;
}
const styles = StyleSheet.create({
  screen: { zIndex: 2000, backgroundColor: '#03070de8', alignItems: 'center', justifyContent: 'center' },
  brand: { flexDirection: 'row-reverse', alignItems: 'center' }, divider: { width: 1, height: 140, backgroundColor: '#ffffff66' },
  mascot: { alignItems: 'center' }, wordmark: { color: '#F0F5FC', fontSize: 32, fontWeight: '700', letterSpacing: 7, marginTop: -10 },
  status: { position: 'absolute', bottom: 32, flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { color: '#97a9be', fontSize: 10, letterSpacing: 1.5 },
});
