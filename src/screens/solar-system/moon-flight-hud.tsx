import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline, Path, Text as SvgText } from 'react-native-svg';
import * as THREE from 'three';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { NASA_RED } from './lunar-sites';
import { requestFlightSkip, type TransferRoute, type FlightPlayback, type FlightTelemetry, type FlightMarkers } from './transfer-route';

const shadow = { textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } };

export function MoonFlightHud({ telemetry, playback, route }: { telemetry: MutableRefObject<FlightTelemetry>; playback: MutableRefObject<FlightPlayback>; route: TransferRoute }) {
  const [flight, setFlight] = useState(telemetry.current);
  const [settings, setSettings] = useState({ ...playback.current });
  const autoSkipped = useRef(false);
  const insets = useSafeAreaInsets();
  useEffect(() => { const timer = setInterval(() => setFlight({ ...telemetry.current }), 150); return () => clearInterval(timer); }, [telemetry]);
  const seconds = Math.ceil(flight.remainingSeconds);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const missionTime = `${(flight.progress * route.durationSeconds / 86400).toFixed(1).replace(/\.0$/, '')}d`;
  const bounds = useMemo(() => {
    const all = [...route.points, new THREE.Vector3(0, 0, 0), route.moonPosition];
    return { minX: Math.min(...all.map(p => p.x)), maxX: Math.max(...all.map(p => p.x)), minZ: Math.min(...all.map(p => p.z)), maxZ: Math.max(...all.map(p => p.z)) };
  }, [route]);
  const project = (p: THREE.Vector3) => {
    const spanX = Math.max(bounds.maxX - bounds.minX, 1e-9), spanZ = Math.max(bounds.maxZ - bounds.minZ, 1e-9);
    const fit = Math.min(132 / spanX, 54 / spanZ);
    const ox = (156 - spanX * fit) / 2, oy = (78 - spanZ * fit) / 2;
    return { x: ox + (p.x - bounds.minX) * fit, y: oy + (p.z - bounds.minZ) * fit };
  };
  const path = useMemo(() => route.points.map(p => { const v = project(p); return `${v.x},${v.y}`; }).join(' '), [route]);
  const earth = project(new THREE.Vector3(0, 0, 0)), moon = project(route.moonPosition);
  const marker = project(route.sample(flight.progress, new THREE.Vector3()));
  const update = useCallback((action: 'speed' | 'pause' | 'skip') => {
    if (telemetry.current.arrived) return;
    if (action === 'speed') { const speeds = [.25, .5, 1, 1.5, 2]; playback.current.speed = speeds[(speeds.indexOf(playback.current.speed) + 1) % speeds.length]; }
    if (action === 'pause') playback.current.paused = !playback.current.paused;
    if (action === 'skip') requestFlightSkip(playback.current);
    setSettings({ ...playback.current });
  }, [playback, telemetry]);
  useEffect(() => {
    if (autoSkipped.current || flight.arrived || playback.current.paused || flight.remainingSeconds > 3 || flight.remainingSeconds <= 0) return;
    autoSkipped.current = true;
    update('skip');
  }, [flight, playback, update]);
  return <>
    <View testID="flight-minimap" pointerEvents="none" style={{ position: 'absolute', top: Math.max(24, insets.top), left: Math.max(24, insets.left), width: 166, padding: 8, gap: 4, ...theme.outlineSurface, borderRadius: 10 }}>
      <Text style={{ ...shadow, color: theme.colors.muted, fontSize: 8, letterSpacing: 1.3 }}>TRANSFER MAP</Text>
      <Svg width="100%" height={64} viewBox="0 0 156 78">
        <Polyline points={path} fill="none" stroke="#fff" strokeWidth={.8} strokeDasharray="3 3" />
        <Circle cx={earth.x} cy={earth.y} r={3} fill={theme.colors.earth} /><SvgText x={earth.x} y={Math.min(75, earth.y + 13)} fill="#fff" fontSize={8} textAnchor="middle">Earth</SvgText>
        <Circle cx={moon.x} cy={moon.y} r={3} fill={theme.colors.moon} /><SvgText x={moon.x} y={Math.min(75, moon.y + 13)} fill={theme.colors.moon} fontSize={8} textAnchor="middle">Moon</SvgText>
        <Circle testID="flight-map-position" cx={marker.x} cy={marker.y} r={3.5} fill="#FFD166" stroke="#fff" strokeWidth={1} />
      </Svg>
      <Text testID="flight-time" style={{ ...shadow, color: theme.colors.muted, fontSize: 8, alignSelf: 'flex-end' }}>Time remaining {time}</Text>
    </View>
    <View testID="moon-flight-hud" pointerEvents="box-none" style={{ position: 'absolute', top: Math.max(24, insets.top), right: Math.max(24, insets.right), width: 196, gap: 7 }}>
      <View pointerEvents="none" style={{ padding: 10, gap: 7, ...theme.outlineSurface, borderRadius: 10 }}>
        <Text style={{ ...shadow, color: theme.colors.muted, fontSize: 8, letterSpacing: .8 }}>{flight.arrived ? 'LUNAR ORBIT REACHED' : 'JOURNEY TO THE MOON'}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ ...shadow, color: theme.colors.muted, fontSize: 10 }}>Mission time</Text><Text testID="flight-mission-time" style={{ ...shadow, color: '#fff', fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{missionTime}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ ...shadow, color: theme.colors.muted, fontSize: 10 }}>Distance remaining</Text><Text testID="flight-distance" style={{ ...shadow, color: '#fff', fontSize: 13, fontVariant: ['tabular-nums'] }}>{Math.ceil(flight.remainingKm).toLocaleString('en-US')} km</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <Text style={{ ...shadow, color: theme.colors.muted, fontSize: 10 }}>Instant speed</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text testID="flight-velocity" style={{ ...shadow, color: '#fff', fontSize: 12, fontVariant: ['tabular-nums'] }}>{Math.round(flight.speedKmh).toLocaleString('en-US')} km/h</Text>
            {settings.speed !== 1 && <Text testID="flight-speed-tag" style={{ ...shadow, color: '#fff', fontSize: 9, paddingHorizontal: 4, paddingVertical: 2, borderWidth: .3, borderColor: '#fff', borderRadius: 3 }}>{settings.speed}x</Text>}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable testID="flight-speed" accessibilityRole="button" accessibilityLabel={`Flight speed ${settings.speed}x`} disabled={flight.arrived} onPress={() => update('speed')} style={({ pressed }) => ({ flex: 1, height: 44, ...theme.outlineSurface, borderRadius: 7, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', opacity: flight.arrived ? .35 : pressed ? .6 : 1 })}><Ionicons name="play-forward-outline" size={17} color="#fff" /></Pressable>
        <Pressable testID="flight-pause" accessibilityRole="button" accessibilityLabel={settings.paused ? 'Resume flight' : 'Pause flight'} disabled={flight.arrived} onPress={() => update('pause')} style={({ pressed }) => ({ flex: 1, height: 44, ...theme.outlineSurface, borderRadius: 7, alignItems: 'center', justifyContent: 'center', opacity: flight.arrived ? .35 : pressed ? .6 : 1 })}><Ionicons name={settings.paused ? 'play-outline' : 'pause-outline'} size={18} color="#fff" /></Pressable>
        <Pressable testID="flight-skip" accessibilityRole="button" accessibilityLabel="Skip to Moon" disabled={flight.arrived} onPress={() => update('skip')} style={({ pressed }) => ({ flex: 1, height: 44, ...theme.outlineSurface, borderRadius: 7, alignItems: 'center', justifyContent: 'center', opacity: flight.arrived ? .35 : pressed ? .6 : 1 })}><Ionicons name="play-skip-forward-outline" size={18} color="#fff" /></Pressable>
      </View>
    </View>
  </>;
}

export function FlightSiteMarkers({ positions, launchName, landingName }: { positions: SharedValue<FlightMarkers>; launchName: string; landingName: string }) {
  const earth = useAnimatedStyle(() => ({ opacity: positions.get().earthVisible ? 1 : 0, transform: [{ translateX: positions.get().earthX - 75 }, { translateY: positions.get().earthY - 8 }] }));
  const moon = useAnimatedStyle(() => ({ opacity: positions.get().moonVisible ? 1 : 0, transform: [{ translateX: positions.get().moonX - 75 }, { translateY: positions.get().moonY - 8 }] }));
  const sun = useAnimatedStyle(() => ({ opacity: positions.get().sunVisible ? 1 : 0, transform: [{ translateX: positions.get().sunX - 75 }, { translateY: positions.get().sunY - 8 }] }));
  return <>
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 150 }, sun]}>
      <Svg pointerEvents="none" width={150} height={82} viewBox="0 -28 150 82" style={{ position: 'absolute', left: 0, top: -28 }}><Path d="M75 8 L55 -12 L10 -12" fill="none" stroke="#fff" strokeWidth={.8} /></Svg>
      <Text style={{ ...shadow, color: '#fff', position: 'absolute', left: 10, top: -29, fontSize: 10 }}>SUN</Text>
    </Animated.View>
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 150, alignItems: 'center' }, earth]}>
      <Svg pointerEvents="none" width={150} height={82} viewBox="0 -28 150 82" style={{ position: 'absolute', left: 0, top: -28 }}><Path d="M75 8 L55 -12 L10 -12" fill="none" stroke="#fff" strokeWidth={.8} /></Svg>
      <MaterialCommunityIcons name="circle-double" size={16} color="#fff" /><Text style={{ ...shadow, color: '#fff', position: 'absolute', left: 10, top: -29, fontSize: 10 }}>EARTH</Text><Text numberOfLines={2} style={{ ...shadow, color: NASA_RED, fontSize: 9, textAlign: 'center' }}>{launchName}</Text>
    </Animated.View>
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 150, alignItems: 'center' }, moon]}>
      <Svg pointerEvents="none" width={150} height={82} viewBox="0 -28 150 82" style={{ position: 'absolute', left: 0, top: -28 }}><Path d="M75 8 L55 -12 L10 -12" fill="none" stroke="#fff" strokeWidth={.8} /></Svg>
      <MaterialCommunityIcons name="circle-double" size={16} color="#fff" /><Text style={{ ...shadow, color: '#fff', position: 'absolute', left: 10, top: -29, fontSize: 10 }}>MOON</Text><Text numberOfLines={2} style={{ ...shadow, color: NASA_RED, fontSize: 9, textAlign: 'center' }}>{landingName}</Text>
    </Animated.View>
  </>;
}
