import { useState, type MutableRefObject } from 'react';
import { SimulationClock } from './simulation-clock';
import { SvgXml } from 'react-native-svg';
import { spaceAppsLogo } from '../../../assets/space-apps-logo';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { RocketCompanion, RocketFlyby } from './rocket-companion';


export type BodyId = 'sun' | 'earth' | 'moon';

export type SpaceHudProps = {
  launchLocked: boolean;
  onRocketLaunchStart: () => void;
  onRocketFlightComplete: () => void;
  rocketGone: boolean;
  onRocketDeparture: () => void;
  onExplore: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  simulationSeconds: MutableRefObject<number>;
  selected: BodyId | null;
  onSelect: (body: BodyId) => void;
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  loading: boolean;
  error: string | null;
};

const bodies: { id: BodyId; label: string; category: string; description: string }[] = [
  { id: 'moon', label: 'Moon', category: 'A DREAM\nAS OLD AS HUMANITY', description: 'The beginning of our journey\namong the stars.' },
  { id: 'earth', label: 'Earth', category: 'OUR HOME PLANET', description: 'A small blue world.\nAn extraordinary place to call home.' },
  { id: 'sun', label: 'Sun', category: 'OUR HOME STAR', description: 'The light at the center\nof our solar system.' },
];

export function SpaceHud({ launchLocked, onRocketLaunchStart, onRocketFlightComplete, rocketGone, onRocketDeparture, onExplore, speed, onSpeedChange, simulationSeconds, selected, onSelect, paused, onTogglePause, onReset, loading, error }: SpaceHudProps) {
  const [flyby, setFlyby] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 760;
  const body = bodies.find((item) => item.id === selected);
  const disabled = loading || !!error || launchLocked;

  return (
    <View pointerEvents={launchLocked ? 'none' : 'box-none'} style={[StyleSheet.absoluteFill, {
      paddingTop: Math.max(insets.top, 24),
      paddingBottom: Math.max(insets.bottom, 24),
      paddingLeft: Math.max(insets.left, compact ? 24 : 32),
      paddingRight: Math.max(insets.right, compact ? 24 : 32),
    }]}>
      {flyby && <RocketFlyby onComplete={onRocketFlightComplete} />}
      {speedMenuOpen && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss playback speed menu"
        onPress={() => setSpeedMenuOpen(false)} style={[StyleSheet.absoluteFill, { zIndex: 5 }]} />}
      <View pointerEvents="box-none" style={[styles.header, { zIndex: 10 }]}>
        <View pointerEvents="none" style={styles.brand}>
          <View style={styles.brandMark}>
            <SvgXml xml={spaceAppsLogo} width={52} height={52} />
          </View>
          <Text style={styles.wordmark}>AZAS</Text>
          <View style={styles.brandDivider} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SimulationClock elapsed={simulationSeconds} compact={compact} style={styles.eyebrow} />
            {speed !== 1 && <View testID="simulation-speed-tag" style={styles.speedTag}><Text style={styles.speedTagText}>{speed}×</Text></View>}
          </View>
        </View>
        <View pointerEvents="box-none" style={styles.playback}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Play simulation' : 'Pause simulation'}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => { setSpeedMenuOpen(false); onTogglePause(); }}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Ionicons name={paused ? 'play-outline' : 'pause-outline'} size={18} color={theme.colors.text} accessible={false} />
          </Pressable>
          <View>
            <Pressable accessibilityRole="button" accessibilityLabel="Playback speed"
              accessibilityValue={{ text: `${speed} times` }} accessibilityState={{ expanded: speedMenuOpen, disabled }}
              disabled={disabled} onPress={() => setSpeedMenuOpen(value => !value)} style={styles.playButton}>
              <Ionicons name="play-forward-outline" size={18} color={theme.colors.text} />
            </Pressable>
            {speedMenuOpen && <View style={styles.speedMenu}>
              {[.25, .5, 1, 1.5, 2].map(value => <Pressable key={value}
                accessibilityRole="button" accessibilityLabel={`Set playback speed to ${value}x`}
                accessibilityState={{ selected: value === speed }}
                onPress={() => { onSpeedChange(value); setSpeedMenuOpen(false); }}
                style={[styles.speedOption, value === speed && { backgroundColor: theme.colors.activeSurface }]}>
                <Text style={{ color: value === speed ? theme.colors.accent : theme.colors.text, fontSize: 11 }}>{value}×</Text>
              </Pressable>)}
            </View>}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Menu" disabled={disabled}
            onPress={() => { setSpeedMenuOpen(false); onExplore(); }} style={[styles.playButton, { width: 60 }]}>
            <Ionicons name="menu-outline" size={23} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {body && !disabled && height >= 340 && (
        <View pointerEvents="none" style={[styles.detail, { left: Math.max(insets.left, compact ? 24 : 32) }]} accessibilityLiveRegion="polite">
          <View style={styles.detailHeading}>
            <View style={[styles.detailLine, { backgroundColor: theme.colors[body.id] }]} />
            <Text style={styles.eyebrow}>{body.category}</Text>
          </View>
          <Text style={styles.bodyTitle}>{body.label}</Text>
          <Text style={styles.description}>{body.description}</Text>
        </View>
      )}

      {(loading || error) && (
        <View pointerEvents="none" style={styles.feedback}>
          {loading && !error && <ActivityIndicator size="small" color={theme.colors.accent} />}
          <Text accessibilityRole={error ? 'alert' : 'text'} style={[styles.feedbackText, error && styles.error]}>
            {error || 'Preparing your view of the universe…'}
          </Text>
        </View>
      )}

      <View pointerEvents="box-none" style={styles.footer}>
        <View pointerEvents="box-none" style={styles.selectorSection}>
          <Text pointerEvents="none" style={styles.sectionLabel}>EXPLORE THE SYSTEM</Text>
          <View pointerEvents="box-none" style={styles.selector}>
            {bodies.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Focus on ${item.label}`}
                accessibilityState={{ selected: selected === item.id, disabled }}
                disabled={disabled}
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [styles.objectButton, selected === item.id && styles.objectSelected, pressed && styles.pressed, disabled && styles.disabled]}
              >
                <View style={[styles.objectDot, { backgroundColor: selected === item.id ? theme.colors[item.id] : '#8A8A8A' }]} />
                <Text style={[styles.objectLabel, selected === item.id && styles.selectedText]}>{item.label.toUpperCase()}</Text>
              </Pressable>
            ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset camera view"
            accessibilityState={{ selected: selected === null, disabled }}
            disabled={disabled}
            onPress={() => { setSpeedMenuOpen(false); onReset(); }}
            style={({ pressed }) => [styles.playButton, { borderColor: selected === null ? '#ffffff' : '#8A8A8A' }, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Ionicons name="scan-outline" size={17} color={selected === null ? theme.colors.text : '#8A8A8A'} accessible={false} />
          </Pressable>
          </View>
        </View>

        <RocketCompanion onLaunchStart={onRocketLaunchStart} departed={rocketGone} onDeparture={() => { setFlyby(true); onRocketDeparture(); }} />


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  speedTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  speedTagText: { color: theme.colors.text, fontSize: 10, fontWeight: '500' },
  speedMenu: { position: 'absolute', top: 56, right: 0, width: 76, padding: 3, backgroundColor: '#0b1725', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, zIndex: 30 },
  speedOption: { minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  brandOrbit: { position: 'absolute', width: 25, height: 11, borderWidth: 1, borderColor: theme.colors.accent, borderRadius: 20, transform: [{ rotate: '-40deg' }] },
  brandCore: { width: 6, height: 6, backgroundColor: theme.colors.accent, borderRadius: 3 },
  wordmark: { color: theme.colors.text, fontSize: 23, fontWeight: '700', letterSpacing: 4 },
  brandDivider: { width: 1, height: 20, backgroundColor: theme.colors.border, marginHorizontal: 4 },
  eyebrow: { color: theme.colors.muted, fontSize: theme.type.micro, letterSpacing: 2, lineHeight: 15, fontWeight: '500' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { color: theme.colors.muted, fontSize: theme.type.micro, fontWeight: '500', letterSpacing: 1.4 },
  detail: { position: 'absolute', left: 32, top: 114, maxWidth: 208 },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLine: { width: 16, height: 1 },
  bodyTitle: { color: theme.colors.text, fontSize: 32, fontWeight: '300', marginTop: 10, letterSpacing: -0.7 },
  description: { color: theme.colors.muted, fontSize: theme.type.caption, lineHeight: 19, marginTop: 8 },
  footer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  selectorSection: { gap: 12 },
  sectionLabel: { color: theme.colors.muted, fontSize: theme.type.micro, letterSpacing: 2 },
  selector: { flexDirection: 'row', gap: 8 },
  objectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderRadius: theme.radius.sm, borderWidth: 0.5, borderColor: '#8A8A8A', backgroundColor: 'transparent' },
  objectSelected: { borderColor: '#ffffff', backgroundColor: 'transparent' },
  objectDot: { width: 6, height: 6, borderRadius: 3 },
  objectLabel: { color: '#8A8A8A', fontSize: theme.type.micro, fontWeight: '600', letterSpacing: 1 },
  selectedText: { color: theme.colors.text },
  playback: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, backgroundColor: 'transparent', borderWidth: 0.5, borderColor: '#ffffff' },
  resetButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: theme.radius.sm, backgroundColor: 'transparent', borderWidth: 0.5, borderColor: '#ffffff' },
  resetLabel: { fontSize: theme.type.micro, letterSpacing: 1.2, fontWeight: '500', color: theme.colors.text },
  hints: { minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center' },
  hintText: { color: theme.colors.muted, fontSize: theme.type.caption, lineHeight: 19 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
  feedback: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 48 },
  feedbackText: { color: theme.colors.muted, fontSize: theme.type.body, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  error: { color: theme.colors.error },
});
