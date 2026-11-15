import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { coordinates, mosaicPoint, NASA_RED, type LunarSite } from './lunar-sites';
import { localLunarAssets } from './local-lunar-assets';

export function LunarMap({ lunarSites, site, onSelect }: { lunarSites: LunarSite[]; site: LunarSite; onSelect: (site: LunarSite) => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ zoom: 8, x: 0, y: 0 });
  const current = useRef(view); current.current = view;
  const previous = useRef({ x: 0, y: 0, span: 0, count: 0 });
  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length > 1 || (Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2),
    onPanResponderGrant: () => { previous.current.count = 0; },
    onPanResponderMove: e => {
      const t = e.nativeEvent.touches; if (!t[0]) return;
      const x = t[1] ? (t[0].pageX + t[1].pageX) / 2 : t[0].pageX;
      const y = t[1] ? (t[0].pageY + t[1].pageY) / 2 : t[0].pageY;
      const span = t[1] ? Math.hypot(t[1].pageX - t[0].pageX, t[1].pageY - t[0].pageY) : 0;
      const p = previous.current, v = current.current;
      if (p.count === t.length) setView({ x: v.x + x - p.x, y: v.y + y - p.y, zoom: span && p.span ? Math.max(1, Math.min(24, v.zoom * span / p.span)) : v.zoom });
      previous.current = { x, y, span, count: t.length };
    },
  }), []);
  const asset = localLunarAssets[site.id];
  if (!asset) return <Text style={{ color: '#fff' }}>Local imagery unavailable.</Text>;
  const center = mosaicPoint(site.latitude, site.longitude);
  const factor = Math.max(size.width, size.height) / asset.size * view.zoom;
  const left = size.width / 2 - center.x * factor + view.x;
  const top = size.height / 2 - center.y * factor + view.y;
  const projectionScale = 2 / (1 - Math.sin(site.latitude * Math.PI / 180));
  const squareSize = (site.squareSideM ?? 0) / 100 * projectionScale * factor;
  return <View style={styles.map} onLayout={e => setSize(e.nativeEvent.layout)} {...gesture.panHandlers}>
    <Image source={asset.image} style={{ position: 'absolute', left: left + asset.left * factor, top: top + asset.top * factor, width: asset.size * factor, height: asset.size * factor }} />
    <View pointerEvents="none" testID="candidate-square" style={{ position: 'absolute', left: left + center.x * factor - squareSize / 2, top: top + center.y * factor - squareSize / 2, width: squareSize, height: squareSize, borderWidth: 1, borderColor: NASA_RED }} />
    {[...lunarSites.filter(pin => pin.id !== site.id), site].map(pin => { const p = mosaicPoint(pin.latitude, pin.longitude); return <Pressable key={pin.id} accessibilityRole="button" accessibilityLabel={`Map pin ${pin.name}`} onPress={() => { setView({ zoom: 8, x: 0, y: 0 }); onSelect(pin); }} style={{ position: 'absolute', left: left + p.x * factor - 12, top: top + p.y * factor - 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', zIndex: pin.id === site.id ? 100 : 0 }}><MaterialCommunityIcons name="circle-double" size={16} color={pin.id === site.id ? NASA_RED : '#fff'} /></Pressable>; })}
    <View pointerEvents="none" style={styles.caption}><Text style={styles.text}>{site.name} · {site.squareSideM} m × {site.squareSideM} m</Text><Text style={styles.muted}>{coordinates(site)}</Text><Text style={styles.muted}>Local mosaic · 100 m/pixel source</Text></View>
    <View style={styles.controls}>{[1, -1].map(delta => <Pressable key={delta} accessibilityRole="button" accessibilityLabel={delta > 0 ? 'Zoom in' : 'Zoom out'} onPress={() => setView(v => ({ ...v, zoom: Math.max(1, Math.min(24, v.zoom * (delta > 0 ? 1.5 : 1 / 1.5))) }))} style={styles.button}><Text style={styles.text}>{delta > 0 ? '+' : '−'}</Text></Pressable>)}</View>
    <Text style={styles.credit}>LROC WAC · Arizona State University · Local imagery</Text>
  </View>;
}
const styles = StyleSheet.create({
  map: { flex: 1, overflow: 'hidden', borderRadius: 12, backgroundColor: '#060a10', borderWidth: .5, borderColor: '#454c57' },
  caption: { position: 'absolute', left: 12, top: 12, gap: 5, padding: 12, borderRadius: 8, backgroundColor: '#070d16dd' },
  text: { color: '#fff', fontSize: 12 }, muted: { color: '#aab5c4', fontSize: 10 },
  controls: { position: 'absolute', right: 12, top: 12, gap: 8 }, button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: .5, borderColor: '#fff', borderRadius: 8, backgroundColor: '#070d16dd' },
  credit: { position: 'absolute', left: 12, bottom: 10, color: '#aab5c4', fontSize: 9 },
});
