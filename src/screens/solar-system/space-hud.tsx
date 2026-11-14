import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export type BodyId = 'sun' | 'earth' | 'moon';

export type SpaceHudProps = {
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

export function SpaceHud({ selected, onSelect, paused, onTogglePause, onReset, loading, error }: SpaceHudProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 760;
  const body = bodies.find((item) => item.id === selected);
  const disabled = loading || !!error;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, {
      paddingTop: Math.max(insets.top, 24),
      paddingBottom: Math.max(insets.bottom, 24),
      paddingLeft: Math.max(insets.left, compact ? 24 : 32),
      paddingRight: Math.max(insets.right, compact ? 24 : 32),
    }]}>
      <View pointerEvents="none" style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <View style={styles.brandOrbit} />
            <View style={styles.brandCore} />
          </View>
          <Text style={styles.wordmark}>AZAS</Text>
          <View style={styles.brandDivider} />
          <Text style={styles.eyebrow}>ORBITAL{compact ? '\n' : ' '}EXPLORER</Text>
        </View>
        <View style={styles.status} accessible accessibilityLabel={loading ? 'Loading simulation' : error ? 'Simulation unavailable' : paused ? 'Simulation paused' : 'Live simulation'}>
          <View style={[styles.statusDot, { backgroundColor: error ? theme.colors.error : paused || loading ? theme.colors.muted : theme.colors.accent }]} />
          <Text style={styles.statusText}>{loading ? 'INITIALIZING' : error ? 'OFFLINE' : paused ? 'SIMULATION PAUSED' : 'LIVE SIMULATION'}</Text>
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
                <View style={[styles.objectDot, { backgroundColor: theme.colors[item.id] }]} />
                <Text style={[styles.objectLabel, selected === item.id && styles.selectedText]}>{item.label.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View pointerEvents="box-none" style={styles.playback}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Play simulation' : 'Pause simulation'}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onTogglePause}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={18} color={theme.colors.text} accessible={false} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset camera view"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onReset}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Ionicons name="scan-outline" size={17} color={theme.colors.muted} accessible={false} />
          </Pressable>
        </View>


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
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
  objectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  objectSelected: { borderColor: theme.colors.activeBorder, backgroundColor: theme.colors.activeSurface },
  objectDot: { width: 6, height: 6, borderRadius: 3 },
  objectLabel: { color: theme.colors.muted, fontSize: theme.type.micro, fontWeight: '600', letterSpacing: 1 },
  selectedText: { color: theme.colors.text },
  playback: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  resetButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  resetLabel: { fontSize: theme.type.micro, letterSpacing: 1.2, fontWeight: '500', color: theme.colors.text },
  hints: { minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center' },
  hintText: { color: theme.colors.muted, fontSize: theme.type.caption, lineHeight: 19 },
  pressed: { backgroundColor: theme.colors.surfacePressed },
  disabled: { opacity: 0.4 },
  feedback: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 48 },
  feedbackText: { color: theme.colors.muted, fontSize: theme.type.body, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  error: { color: theme.colors.error },
});
