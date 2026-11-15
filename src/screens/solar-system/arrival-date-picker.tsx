import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { defaultDeadline, loadArrivalOptions, startAnalysis, type LaunchPlan } from './mission-api';

type Options = Awaited<ReturnType<typeof loadArrivalOptions>>;
export function ArrivalDatePicker({ siteId, onConfirm }: { siteId: number; onConfirm: (plan: LaunchPlan) => void }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); active.current = controller;
    let current = true;
    setLoading(true); setOptions(null); setSelected(null); setError('');
    const timer = setTimeout(() => controller.abort(), 150_000);
    (async () => {
      try {
        const runId = await startAnalysis(siteId, defaultDeadline, controller.signal);
        const result = await loadArrivalOptions(runId, controller.signal);
        if (current) { setOptions(result); setSelected(result.firstPlan?.touchdownUtc ?? null); }
      } catch (e) {
        if (current) setError(controller.signal.aborted ? 'The search timed out. Please retry.' : e instanceof Error ? e.message : 'Unable to load arrival dates.');
      } finally { clearTimeout(timer); if (current) { setLoading(false); active.current = null; } }
    })();
    return () => { current = false; clearTimeout(timer); controller.abort(); active.current?.abort(); active.current = null; };
  }, [siteId, attempt]);
  const confirm = async () => {
    if (!selected || !options || active.current) return;
    const plan = options.firstPlan;
    if (!plan || Date.parse(plan.touchdownUtc) !== Date.parse(selected)) return;
    onConfirm(plan);
  };
  const unsupportedDate = selected !== null && Date.parse(selected) !== Date.parse(options?.firstPlan?.touchdownUtc ?? '');

  return <View style={{ flex: 1, minHeight: 0, gap: 10 }}>
    <Text style={styles.title}>Select an Arrival Date</Text>
    <Text style={styles.caption}>48h of simultaneous sunlight & Earth visibility · Through {defaultDeadline} · UTC</Text>
    {loading && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}><ActivityIndicator color="#fff" /><Text style={styles.caption}>Finding available arrival dates…</Text></View>}
    {error !== '' && <Text accessibilityRole="alert" style={styles.caption}>{error}</Text>}
    {!loading && !options && <Pressable accessibilityRole="button" onPress={() => setAttempt(n => n + 1)} style={styles.button}><Text style={styles.label}>Retry search</Text></Pressable>}
    {!loading && options && <>
      {options.dates.length === 0 && <Text style={styles.caption}>No arrival dates meet the 48-hour conditions for this site.</Text>}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
        {options.dates.map(date => <Pressable key={date} accessibilityRole="radio" accessibilityLabel={date} accessibilityState={{ checked: selected === date }} onPress={() => { setSelected(date); setError(''); }} style={[styles.row, selected === date && { borderColor: '#fff' }]}>
          <Ionicons name={selected === date ? 'radio-button-on-outline' : 'radio-button-off-outline'} size={17} color={selected === date ? '#fff' : theme.colors.muted} />
          <Text style={styles.label}>{date.replace('T', ' ').slice(0, 16)} UTC</Text>
        </Pressable>)}
      </ScrollView>
      {unsupportedDate && <Text accessibilityLiveRegion="polite" style={styles.caption}>Launch options are currently available only for the first arrival date.</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Confirm Arrival Date" accessibilityState={{ disabled: !selected || unsupportedDate }} disabled={!selected || unsupportedDate} onPress={confirm} style={[styles.button, (!selected || unsupportedDate) && { opacity: .4 }]}>
        <Ionicons name="time-outline" size={18} color="#fff" /><Text style={styles.label}>Confirm Arrival Date</Text><Ionicons name="arrow-forward-outline" size={17} color="#fff" />
      </Pressable>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  label: { color: theme.colors.text, fontSize: 12 },
  caption: { color: theme.colors.muted, fontSize: 11 },
  row: { width: '49%', ...theme.outlineSurface, borderWidth: .4, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { ...theme.outlineSurface, borderWidth: .3, minHeight: 40, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
});
