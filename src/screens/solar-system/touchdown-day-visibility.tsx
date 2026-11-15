import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { loadTouchdownDay, type TouchdownDay } from './mission-api';

type DailyResult =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; day: TouchdownDay | null };

function percentage(ratio: number | null, knownRatio: number) {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0 || ratio > 1 || knownRatio === 0) return 'Unavailable';
  const rounded = Math.round(ratio * 1000) / 10;
  if (rounded === 0 && ratio > 0) return '<0.1%';
  if (rounded === 100 && ratio < 1) return '>99.9%';
  return `${rounded}%`;
}

function utcLabel(instant: number, date: string) {
  const iso = new Date(instant).toISOString();
  const time = iso.slice(11, 19).replace(/:00$/, '');
  return iso.startsWith(date) ? time : `${iso.slice(0, 10)} ${time}`;
}

function JointWindows({ day }: { day: TouchdownDay }) {
  const intervals: string[] = [];
  const dayStart = Date.parse(day.analysisDate + 'T00:00:00Z');
  let incomplete = !Array.isArray(day.visibilityWindows);
  if (Array.isArray(day.visibilityWindows)) {
    for (const window of day.visibilityWindows) {
      if (window?.celestialBody === 'SUN' || window?.celestialBody === 'EARTH') continue;
      const start = Date.parse(window?.windowStartAt ?? '');
      const end = Date.parse(window?.windowEndAt ?? '');
      if (window?.celestialBody !== 'JOINT' || !(start >= dayStart && start < end && end <= dayStart + 86_400_000)) {
        incomplete = true;
        continue;
      }
      intervals.push(`${utcLabel(start, day.analysisDate)} – ${utcLabel(end, day.analysisDate)}`);
    }
  }
  const confirmedNone = !incomplete && day.jointVisibleTimeRatio === 0 && day.jointKnownTimeRatio === 1;
  return <View style={styles.windows}>
    <Text style={styles.label}>Joint visibility (UTC)</Text>
    {intervals.map((interval, index) => <Text key={index} selectable style={styles.time}>{interval}</Text>)}
    {intervals.length === 0 && <Text style={styles.time}>{confirmedNone ? 'No joint visibility windows' : 'Unavailable'}</Text>}
    {intervals.length > 0 && incomplete && <Text style={styles.note}>Some window details are unavailable.</Text>}
  </View>;
}

export function TouchdownDayVisibility({ runId, touchdownUtc }: { runId: string; touchdownUtc: string }) {
  const [result, setResult] = useState<DailyResult>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    loadTouchdownDay(runId, touchdownUtc, controller.signal)
      .then(day => { if (active) setResult({ status: 'ready', day }); })
      .catch(() => { if (active) setResult({ status: 'error' }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [runId, touchdownUtc, attempt]);

  const day = result.status === 'ready' ? result.day : null;
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.heading}>Touchdown day visibility</Text>
    {result.status === 'loading' && <Text accessibilityLiveRegion="polite" style={styles.note}>Loading daily visibility…</Text>}
    {result.status === 'error' && <>
      <Text accessibilityLiveRegion="polite" style={styles.note}>Could not load daily visibility.</Text>
      <Pressable accessibilityRole="button" onPress={() => { setResult({ status: 'loading' }); setAttempt(n => n + 1); }} style={styles.retry}>
        <Text style={styles.retryLabel}>Retry daily visibility</Text>
      </Pressable>
    </>}
    {result.status === 'ready' && !day && <Text style={styles.note}>No daily result for this UTC date.</Text>}
    {day && <>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.label}>Sunlight</Text>
          <Text selectable style={[styles.value, { color: theme.colors.sun }]}>{percentage(day.sunVisibleTimeRatio, day.sunKnownTimeRatio)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.label}>Earth communication</Text>
          <Text selectable style={[styles.value, { color: theme.colors.earth }]}>{percentage(day.earthVisibleTimeRatio, day.earthKnownTimeRatio)}</Text>
        </View>
      </View>
      <JointWindows day={day} />
      {[day.sunKnownTimeRatio, day.earthKnownTimeRatio, day.jointKnownTimeRatio].some(known => known < 1) &&
        <Text style={styles.note}>Coverage is incomplete. Percentages use observed time.</Text>}
      {day.terrainCoverageStatus === 'LOCAL_HORIZON_ONLY'
        ? <Text style={styles.note}>Local horizon only. Distant terrain was not evaluated.</Text>
        : day.resultStatus === 'PARTIAL' && <Text style={styles.note}>Partial daily result.</Text>}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.sm, padding: theme.spacing.md, gap: theme.spacing.sm },
  heading: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8 },
  metric: { flexGrow: 1, flexBasis: 110, gap: 2 },
  label: { color: theme.colors.muted, fontSize: 12 },
  value: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  windows: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingTop: 8, gap: 3 },
  time: { color: theme.colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  note: { color: theme.colors.muted, fontSize: 11 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryLabel: { color: theme.colors.accent, fontSize: 13 },
});
