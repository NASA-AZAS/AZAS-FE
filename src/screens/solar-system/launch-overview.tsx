import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDecay, withTiming, type SharedValue } from 'react-native-reanimated';
import type { LaunchSite } from './launch-sites';
import { NASA_RED } from './lunar-sites';
import { hasLaunchCallout, LaunchSiteCallout } from './launch-site-callout';

type MapView = { size: number; zoom: SharedValue<number>; panX: SharedValue<number>; panY: SharedValue<number> };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
function WorldImage({ size, zoom, panX, panY, wrap }: MapView & { wrap: number }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.get() + wrap * size * 2 * zoom.get() }, { translateY: panY.get() }, { scale: zoom.get() }],
  }));
  return <Animated.Image source={require('../../../assets/textures/earth.jpg')} resizeMode="stretch" style={[{ position: 'absolute', left: -size / 2, top: 0, width: size * 2, height: size }, style]} />;
}
function LaunchPin({ site, selected, onSelect, size, zoom, panX, panY, wrap }: MapView & { site: LaunchSite; selected: boolean; onSelect: (id: string) => void; wrap: number }) {
  const callout = hasLaunchCallout(site.id);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: size / 2 + site.longitude / 180 * size * zoom.get() + panX.get() + wrap * size * 2 * zoom.get() - (callout ? 175 : 70) },
      { translateY: size / 2 - site.latitude / 180 * size * zoom.get() + panY.get() - (callout ? 50 : 12) },
    ],
  }));
  const color = selected ? NASA_RED : '#fff';
  if (callout) return <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, top: 0, width: 350, height: 100, zIndex: selected ? 2 : 1 }, style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Map ${site.name}`} onPress={() => onSelect(site.id)} style={{ position: 'absolute', left: 163, top: 38, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="circle-double" size={17} color={color} accessible={false} />
    </Pressable>
    <LaunchSiteCallout site={site} selected={selected} onSelect={onSelect} />
  </Animated.View>;
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Map ${site.name}`} accessibilityState={{ selected }} onPress={() => onSelect(site.id)} style={[{ position: 'absolute', left: 0, top: 0, width: 140, height: 44, alignItems: 'center', paddingTop: 3, zIndex: selected ? 2 : 1 }, style]}>
    <MaterialCommunityIcons name="circle-double" size={17} color={color} accessible={false} />
    <Text pointerEvents="none" numberOfLines={1} style={{ position: 'absolute', top: 24, width: 140, textAlign: 'center', color, fontSize: 8, textShadowColor: '#000', textShadowRadius: 3 }}>{site.name}</Text>
  </AnimatedPressable>;
}

export function LaunchOverview({ launchSites, selected, onSelect }: { launchSites: LaunchSite[]; selected: LaunchSite; onSelect: (id: string) => void }) {
  const [size, setSize] = useState(0);
  const zoom = useSharedValue(3), panX = useSharedValue(0), panY = useSharedValue(0);
  const focalX = useSharedValue(0), focalY = useSharedValue(0);
  const pinching = useSharedValue(false), focalReady = useSharedValue(false);
  const initialized = useRef(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!size) return;
    const z = Math.max(3, zoom.get()), limit = size * (z - 1) / 2;
    const x = -selected.longitude / 180 * size * z;
    const y = Math.max(-limit, Math.min(limit, selected.latitude / 180 * size * z));
    if (!initialized.current || reducedMotion) { zoom.set(z); panX.set(x); panY.set(y); }
    else { zoom.set(withTiming(z, { duration: 500 })); panX.set(withTiming(x, { duration: 500 })); panY.set(withTiming(y, { duration: 500 })); }
    initialized.current = true;
  }, [selected.id, selected.latitude, selected.longitude, size, zoom, panX, panY, reducedMotion]);
  const limitPan = () => {
    'worklet';
    const limit = size * (zoom.get() - 1) / 2;
    panY.set(Math.max(-limit, Math.min(limit, panY.get())));
    const width = size * 2 * zoom.get();
    if (width > 0) panX.set(((panX.get() + width / 2) % width + width) % width - width / 2);
  };
  const stopFocus = () => { 'worklet'; cancelAnimation(zoom); cancelAnimation(panX); cancelAnimation(panY); };
  const gesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan().maxPointers(1).minDistance(2).onTouchesDown(stopFocus).onStart(stopFocus)
      .onChange(e => { if (pinching.get()) return; panX.set(panX.get() + e.changeX); panY.set(panY.get() + e.changeY); limitPan(); })
      .onEnd(e => {
        if (reducedMotion || pinching.get()) return;
        const horizontal = size * zoom.get(), vertical = size * (zoom.get() - 1) / 2;
        panX.set(withDecay({ velocity: e.velocityX, deceleration: .994, clamp: [-horizontal, horizontal] }));
        panY.set(withDecay({ velocity: e.velocityY, deceleration: .994, clamp: [-vertical, vertical] }));
      }),
    Gesture.Pinch().onTouchesDown(stopFocus).onStart(() => { stopFocus(); pinching.set(true); focalReady.set(false); })
      .onChange(e => {
        if (e.numberOfPointers < 2) return;
        // Use the first active focal point, not the unstable activation/lift coordinates.
        if (!focalReady.get()) { focalX.set(e.focalX); focalY.set(e.focalY); focalReady.set(true); return; }
        const next = Math.max(1, Math.min(12, zoom.get() * e.scaleChange)), ratio = next / zoom.get();
        zoom.set(next);
        panX.set(e.focalX - size / 2 - (focalX.get() - size / 2 - panX.get()) * ratio);
        panY.set(e.focalY - size / 2 - (focalY.get() - size / 2 - panY.get()) * ratio);
        focalX.set(e.focalX); focalY.set(e.focalY); limitPan();
      }).onFinalize(() => { pinching.set(false); focalReady.set(false); }),
  ), [size, zoom, panX, panY, focalX, focalY, pinching, focalReady, reducedMotion]);
  const wheel = Platform.OS === 'web' ? { onWheel: (e: { deltaY: number }) => {
    stopFocus(); const next = Math.max(1, Math.min(12, zoom.get() * Math.exp(-e.deltaY * .001))), ratio = next / zoom.get();
    zoom.set(next); panX.set(panX.get() * ratio); panY.set(panY.get() * ratio); limitPan();
  } } : {};
  const view = { size, zoom, panX, panY };
  return <View style={{ flex: 1, gap: 12 }}>
    <Text style={{ color: '#fff', fontSize: 16 }}>Earth Launch Sites</Text>
    <View testID="launch-world-map" onLayout={e => setSize(e.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: 1, overflow: 'hidden', borderWidth: .5, borderColor: '#fff', backgroundColor: '#03070d' }}>
      <GestureDetector gesture={gesture} touchAction="none"><View collapsable={false} style={StyleSheet.absoluteFill} {...wheel}>
        {size > 0 && <>
          {[-1, 0, 1].map(wrap => <WorldImage key={wrap} {...view} wrap={wrap} />)}
          {[-1, 0, 1].flatMap(wrap => launchSites.map(site => <LaunchPin key={`${wrap}-${site.id}`} {...view} wrap={wrap} site={site} selected={site.id === selected.id} onSelect={onSelect} />))}
        </>}
      </View></GestureDetector>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: '#fff', fontSize: 11 }}>Explore another site!</Text>
      <Text style={{ color: '#fff', fontSize: 11 }}>Launch Sites · {launchSites.length}</Text>
    </View>
  </View>;
}
