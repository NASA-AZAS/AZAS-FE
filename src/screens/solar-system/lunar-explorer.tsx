import { Suspense, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Canvas } from './render-surface';
import { LunarMap } from './lunar-map';
import { coordinates, lunarReference, lunarSites, observerLocation, type LunarSite } from './lunar-sites';

function Moon({ yaw, pitch }: { yaw: number; pitch: number }) {
  const textures = useLoader(THREE.TextureLoader, [
    require('../../../assets/textures/lunar-0-0.jpg'), require('../../../assets/textures/lunar-0-1.jpg'),
    require('../../../assets/textures/lunar-0-2.jpg'), require('../../../assets/textures/lunar-0-3.jpg'),
    require('../../../assets/textures/lunar-1-0.jpg'), require('../../../assets/textures/lunar-1-1.jpg'),
    require('../../../assets/textures/lunar-1-2.jpg'), require('../../../assets/textures/lunar-1-3.jpg'),
  ]);
  return <group rotation={[pitch, yaw, 0]}><group rotation={[0, -Math.PI / 2, 0]}>
    {textures.map((texture, index) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return <mesh key={index}><sphereGeometry args={[1.35, 32, 24, index % 4 * Math.PI / 2, Math.PI / 2, Math.floor(index / 4) * Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial map={texture} roughness={1} /></mesh>;
    })}
  </group></group>;
}
export function LunarExplorer({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [site, setSite] = useState<LunarSite | null>(null);
  const [flatMap, setFlatMap] = useState(false);
  const [angle, setAngle] = useState({ yaw: -THREE.MathUtils.degToRad(lunarSites[0].longitude), pitch: -Math.PI / 2 });
  const [size, setSize] = useState({ width: 1, height: 1 });
  const start = useRef(angle);
  const latest = useRef(angle);
  latest.current = angle;
  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 5,
    onPanResponderGrant: () => { start.current = latest.current; },
    onPanResponderMove: (_, g) => setAngle({ yaw: start.current.yaw + g.dx * .006, pitch: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, start.current.pitch + g.dy * .006)) }),
  }), []);
  const selectSite = (target: LunarSite) => {
    setSite(target);
    setAngle({ yaw: -THREE.MathUtils.degToRad(target.longitude), pitch: THREE.MathUtils.degToRad(target.latitude) });
  };
  const goBack = () => { if (site) { setSite(null); setFlatMap(false); } else onClose(); };
  const camera = new THREE.PerspectiveCamera(43, size.width / size.height, .1, 100);
  camera.position.set(0, 0, 4); camera.updateMatrixWorld();
  const pins = lunarSites.map(pin => {
    const lat = THREE.MathUtils.degToRad(pin.latitude), lon = THREE.MathUtils.degToRad(pin.longitude);
    const p = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).multiplyScalar(1.36).applyEuler(new THREE.Euler(angle.pitch, angle.yaw, 0));
    const visible = p.dot(camera.position.clone().sub(p)) > 0;
    p.project(camera);
    return { pin, visible, x: (p.x + 1) * size.width / 2, y: (1 - p.y) * size.height / 2 };
  });
  return <Modal visible animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right']} onRequestClose={goBack}>
    <View style={[styles.screen, { paddingLeft: Math.max(24, insets.left), paddingRight: Math.max(24, insets.right), paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, insets.bottom) }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={site ? 'Back to lunar globe' : 'Back to solar system'} onPress={goBack} style={styles.button}><Text style={styles.text}>← {site ? 'Lunar globe' : 'Solar system'}</Text></Pressable>
        <View><Text style={styles.eyebrow}>AZAS / LUNAR EXPLORER</Text><Text style={styles.title}>{site ? 'Surface atlas' : 'Explore the lunar south pole'}</Text></View>
        <Text style={styles.badge}>SOUTH POLE / PREVIEW</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Show globe" accessibilityState={{ selected: !flatMap }} onPress={() => setFlatMap(false)} style={[styles.button, !flatMap && { borderColor: '#fff' }]}><Text style={styles.text}>Globe</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Show flat map" accessibilityState={{ selected: flatMap }} onPress={() => { if (!site) selectSite(lunarSites[0]); setFlatMap(true); }} style={[styles.button, flatMap && { borderColor: '#fff' }]}><Text style={styles.text}>Flat map</Text></Pressable>
      </View>
      <View style={styles.content}>
        {flatMap && site ? <LunarMap key={site.id} site={site} onSelect={selectSite} /> : <View style={styles.globe} onLayout={e => setSize(e.nativeEvent.layout)} {...gesture.panHandlers}>
          <Canvas camera={{ position: [0, 0, 4], fov: 43 }} gl={{ antialias: true }}>
            <ambientLight intensity={1.2} /><directionalLight position={[3, 4, 5]} intensity={2} />
            <Suspense fallback={null}><Moon yaw={angle.yaw} pitch={angle.pitch} /></Suspense>
          </Canvas>
          {pins.filter(p => p.visible).map(({ pin, x, y }) => <Pressable key={pin.id} accessibilityRole="button" accessibilityLabel={`Open lunar map at ${pin.name}`} onPress={() => selectSite(pin)} style={[styles.pin, { left: x - 20, top: y - 20 }]}><View style={[styles.pinDot, site?.id === pin.id && { backgroundColor: '#fff' }]} /></Pressable>)}
          <Text pointerEvents="none" style={styles.hint}>DRAG TO ROTATE · SELECT A PIN</Text>
        </View>}
        <View style={styles.sidebar}>
          <Text style={styles.eyebrow}>LUNAR LOCATIONS</Text>
          <Text style={styles.subtitle}>{site ? site.name : 'South-pole candidates'}</Text>
          <Text style={styles.muted}>{site ? site.description : 'Site01 is a reference point. The full 27-site dataset is awaiting import.'}</Text>
          <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
            {lunarSites.length === 0 && <Text style={styles.muted}>No lunar locations yet.</Text>}
            {lunarSites.map(pin => <Pressable key={pin.id} accessibilityRole="button" accessibilityLabel={`Explore ${pin.name}`} accessibilityState={{ selected: site?.id === pin.id }} onPress={() => selectSite(pin)} style={[styles.site, site?.id === pin.id && { borderColor: '#fff' }]}><Text style={styles.text}>{pin.name}</Text><Text style={styles.muted}>{coordinates(pin)}</Text><Text style={styles.source}>{pin.source === 'metadata' ? 'REFERENCE POINT · PROFILE PENDING' : 'DEMO LOCATION'}</Text></Pressable>)}
          </ScrollView>
          {site?.source === 'metadata' && <View style={{ gap: 4, paddingVertical: 8 }}>
            <Text selectable style={styles.muted}>Ground elevation: {site.groundElevationM} m</Text>
            <Text selectable style={styles.muted}>Observer: +{lunarReference.observerHeightM.toFixed(1)} m above ground</Text>
            <Text selectable style={styles.muted}>Reference height: {observerLocation(site)?.heightKm.toFixed(6)} km</Text>
            <Text style={styles.source}>Horizon profile pending</Text>
          </View>}
          <Text style={styles.source}>Imagery: NASA · Reference + demo sites</Text>
        </View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#03070d', padding: 24, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  button: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderWidth: .5, borderColor: '#8a8a8a', borderRadius: 8 },
  text: { color: '#fff', fontSize: 12 }, eyebrow: { color: '#aab7c7', fontSize: 10, letterSpacing: 2 },
  title: { color: '#fff', fontSize: 20, fontWeight: '300', marginTop: 5 },
  badge: { color: '#aab7c7', fontSize: 9, letterSpacing: 1, borderWidth: .5, borderColor: '#45505e', padding: 8, borderRadius: 5 },
  content: { flex: 1, flexDirection: 'row', gap: 24 }, globe: { flex: 1, overflow: 'hidden' }, sidebar: { width: 225 },
  subtitle: { color: '#fff', fontSize: 20, fontWeight: '300', marginVertical: 10 }, muted: { color: '#9ba7b8', fontSize: 11, lineHeight: 18 },
  site: { borderWidth: .5, borderColor: '#384454', borderRadius: 9, padding: 12, gap: 4 },
  pin: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#75d9f5', borderWidth: 3, borderColor: '#fff', boxShadow: '0 0 12px #75d9f5' },
  hint: { position: 'absolute', bottom: 8, alignSelf: 'center', color: '#9ba7b8', fontSize: 9, letterSpacing: 2 },
  source: { color: '#68778c', fontSize: 9 },
});
