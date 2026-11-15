import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { overviewTiles } from './local-overview-tiles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { PixelRatio, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, useAnimatedReaction, runOnJS, withTiming, Easing, cancelAnimation, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { mosaicPoint, NASA_RED, type LunarSite } from './lunar-sites';

function MapTile({ source, x, y, width, height, cx, cy, zoom }: { source: number; x: number; y: number; width: number; height: number; cx: number; cy: number; zoom: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ left: cx + (x - cx) * zoom.get(), top: cy + (y - cy) * zoom.get(), width: width * zoom.get(), height: height * zoom.get() }));
  return <Animated.Image source={source} resizeMode="stretch" resizeMethod="scale" style={[{ position: 'absolute' }, style]} />;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
function OverviewPin({ site, selected, zoom, x, y, cx, cy, onSelect }: { site: LunarSite; selected: boolean; zoom: SharedValue<number>; x: number; y: number; cx: number; cy: number; onSelect: (site: LunarSite) => void }) {
  const fixedSize = useAnimatedStyle(() => ({ left: cx + (x - cx) * zoom.get() - 10, top: cy + (y - cy) * zoom.get() - 10 }));
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Overview pin ${site.name}`} onPress={() => onSelect(site)} style={[{ position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', zIndex: selected ? 100 : 0 }, fixedSize]}>
    <MaterialCommunityIcons name="circle-double" size={14} color={selected ? NASA_RED : '#fff'} accessible={false} />
    <Text pointerEvents="none" style={{ position: 'absolute', top: 20, color: selected ? NASA_RED : '#fff', fontSize: 9, width: 90, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 3 }}>{site.name}</Text>
  </AnimatedPressable>;
}

export function PolarOverview({ lunarSites, selected, onSelect }: { lunarSites: LunarSite[]; selected: LunarSite; onSelect: (site: LunarSite) => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const zoom = useSharedValue(1), panX = useSharedValue(0), panY = useSharedValue(0);
  const [viewportState, setViewportState] = useState({ zoom: 1, x: 0, y: 0 });
  useAnimatedReaction(() => ({ zoom: Math.round(zoom.get() * 100) / 100, x: Math.round(panX.get()), y: Math.round(panY.get()) }), (next, prev) => {
    if (!prev || next.zoom !== prev.zoom || next.x !== prev.x || next.y !== prev.y) runOnJS(setViewportState)(next);
  });
  const diameter = Math.max(0, Math.min(size.width, size.height));
  const maxZoom = Math.max(1, Math.min(8, 6082 / Math.max(1, diameter * PixelRatio.get())));
  const focalX = useSharedValue(0), focalY = useSharedValue(0);
  const limitPan = () => {
    'worklet';
    zoom.set(Math.max(1, Math.min(maxZoom, zoom.get())));
    const limit = diameter * (zoom.get() - 1) / 2;
    panX.set(Math.max(-limit, Math.min(limit, panX.get())));
    panY.set(Math.max(-limit, Math.min(limit, panY.get())));
  };
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().maxPointers(1).minDistance(3)
      .onStart(() => { cancelAnimation(zoom); cancelAnimation(panX); cancelAnimation(panY); })
      .onChange(e => { panX.set(panX.get() + e.changeX); panY.set(panY.get() + e.changeY); limitPan(); });
    const pinch = Gesture.Pinch()
      .onStart(e => { cancelAnimation(zoom); cancelAnimation(panX); cancelAnimation(panY); focalX.set(e.focalX); focalY.set(e.focalY); })
      .onChange(e => {
        const next = Math.max(1, Math.min(maxZoom, zoom.get() * e.scaleChange));
        const ratio = next / zoom.get();
        zoom.set(next);
        panX.set(e.focalX - size.width / 2 - (focalX.get() - size.width / 2 - panX.get()) * ratio);
        panY.set(e.focalY - size.height / 2 - (focalY.get() - size.height / 2 - panY.get()) * ratio);
        focalX.set(e.focalX); focalY.set(e.focalY);
        limitPan();
      });
    return Gesture.Simultaneous(pan, pinch);
  }, [diameter, maxZoom, size.width, size.height, zoom, panX, panY, focalX, focalY]);
  const transform = useAnimatedStyle(() => ({ transform: [{ translateX: panX.get() }, { translateY: panY.get() }] }));
  const wheel = Platform.OS === 'web' ? { onWheel: (e: { deltaY: number }) => { zoom.set(Math.max(1, Math.min(8, zoom.get() * Math.exp(-e.deltaY * .001)))); limitPan(); } } : {};
  const factor = diameter / 6082;
  const cx = size.width / 2, cy = size.height / 2, radius = diameter / 2;
  const focusSite = (site: LunarSite) => {
    const point = mosaicPoint(site.latitude, site.longitude);
    const targetZoom = Math.min(maxZoom, Math.max(2.5, zoom.get() * 1.25));
    const limit = diameter * (targetZoom - 1) / 2;
    const clamp = (v: number) => Math.max(-limit, Math.min(limit, v));
    const timing = { duration: 650, easing: Easing.inOut(Easing.cubic) };
    zoom.set(withTiming(targetZoom, timing));
    panX.set(withTiming(clamp(-(point.x - 3041) * factor * targetZoom), timing));
    panY.set(withTiming(clamp(-(point.y - 3041) * factor * targetZoom), timing));
    onSelect(site);
  };
  const gridZoom = viewportState.zoom;
  const level = diameter * gridZoom * PixelRatio.get() > 2048 ? 1 : 0;
  const visibleTiles = overviewTiles.filter(tile => {
    if (tile.level !== level || diameter === 0) return false;
    const x = cx + (tile.x / tile.side * diameter - radius) * gridZoom + viewportState.x;
    const y = cy + (tile.y / tile.side * diameter - radius) * gridZoom + viewportState.y;
    return x < size.width && y < size.height && x + tile.width / tile.side * diameter * gridZoom > 0 && y + tile.height / tile.side * diameter * gridZoom > 0;
  });
  return <View style={{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, borderColor: '#fff', borderRadius: 14, overflow: 'hidden' }}>
    <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
      <Text style={{ color: '#fff', fontSize: 14 }}>Lunar South Pole</Text>

    </View>
    <View testID="overview-square-viewport" style={{ alignSelf: 'stretch', aspectRatio: 1, borderRadius: size.width / 2, overflow: 'hidden' }} onLayout={e => setSize(e.nativeEvent.layout)}>
    <GestureDetector gesture={gesture} touchAction="none"><View collapsable={false} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} {...wheel}>
    <Animated.View style={[StyleSheet.absoluteFill, transform]}>
    {visibleTiles.map(tile => <MapTile key={`${tile.level}-${tile.x}-${tile.y}`} source={tile.source} x={cx - radius + tile.x / tile.side * diameter} y={cy - radius + tile.y / tile.side * diameter} width={tile.width / tile.side * diameter} height={tile.height / tile.side * diameter} cx={cx} cy={cy} zoom={zoom} />)}
    {size.width > 0 && size.height > 0 && <Svg viewBox={`${cx - size.width / (2 * gridZoom)} ${cy - size.height / (2 * gridZoom)} ${size.width / gridZoom} ${size.height / gridZoom}`} pointerEvents="none" width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
      {[0, 45, 90, 135].map(deg => { const a = deg * Math.PI / 180; return <Line key={deg} x1={cx - Math.sin(a) * radius} y1={cy + Math.cos(a) * radius} x2={cx + Math.sin(a) * radius} y2={cy - Math.cos(a) * radius} stroke="#fff" strokeWidth={.5} opacity={.35} />; })}
      <Circle cx={cx} cy={cy} r={(3041 - mosaicPoint(-85, 0).y) * factor} stroke="#fff" strokeWidth={.6} fill="none" opacity={.65} />
      <SvgText x={cx + 6} y={cy - radius + 16} fill="#fff" fontSize={11}>0° · Nearside</SvgText>
      <SvgText x={cx + 6} y={cy + radius - 8} fill="#fff" fontSize={11}>180° · Farside</SvgText>
      <SvgText x={cx - radius + 8} y={cy - 8} fill="#fff" fontSize={10}>90° W</SvgText>
      <SvgText x={cx + radius - 8} y={cy - 8} textAnchor="end" fill="#fff" fontSize={10}>90° E</SvgText>
      <SvgText x={cx + 8} y={cy - (3041 - mosaicPoint(-85, 0).y) * factor + 14} fill="#fff" fontSize={10}>85° S</SvgText>
      <SvgText x={cx + 8} y={cy + 16} fill="#fff" fontSize={10}>South Pole</SvgText>
    </Svg>}
    {[...lunarSites.filter(site => site.id !== selected.id), selected].map(site => {
      const point = mosaicPoint(site.latitude, site.longitude);
      return <OverviewPin key={site.id} site={site} selected={selected.id === site.id} zoom={zoom} cx={cx} cy={cy} x={size.width / 2 + (point.x - 3041) * factor} y={size.height / 2 + (point.y - 3041) * factor} onSelect={focusSite} />;
    })}
    </Animated.View>
    </View></GestureDetector>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size.width / 2, borderWidth: .7, borderColor: '#fff' }]} />
    </View>
    <Text pointerEvents="none" style={{ position: 'absolute', left: 8, bottom: 2, maxWidth: '68%', color: '#fff', fontSize: 11 }}>Explore another site!</Text>
    <Text pointerEvents="none" style={{ position: 'absolute', right: 8, bottom: 2, color: '#fff', fontSize: 11 }}>Candidate Sites · {lunarSites.length}</Text>
  </View>;
}
