import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { theme } from '../../theme';
import { defaultDeadline, FailedAnalysis, loadLaunchPlan, startAnalysis, type LaunchPlan } from './mission-api';
import { TouchdownDayVisibility } from './touchdown-day-visibility';

type Result =
  | { status: 'idle' | 'loading' | 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; plan: LaunchPlan };

function validDeadline(date: string) {
  if (!/^202[7-9]-\d\d-\d\d$/.test(date)) return false;
  const utc = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(utc) && new Date(utc).toISOString().slice(0, 10) === date;
}

export function ArrivalDatePicker({ siteId, onConfirm }: { siteId: number; onConfirm: (plan: LaunchPlan) => void }) {
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const runId = useRef<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  const search = async () => {
    if (active.current || !validDeadline(deadline)) return;
    const controller = new AbortController();
    active.current = controller;
    const timer = setTimeout(() => controller.abort(), 150_000);
    setResult({ status: 'loading' });
    try {
      // Retrying a failed read can reuse the accepted analysis. A new deadline starts a new run.
      const id = runId.current ?? await startAnalysis(siteId, deadline, controller.signal);
      if (active.current !== controller) return;
      runId.current = id;
      const plan = await loadLaunchPlan(id, controller.signal);
      if (active.current === controller) setResult(plan ? { status: 'ready', plan } : { status: 'empty' });
    } catch (error) {
      if (active.current !== controller) return;
      if (error instanceof FailedAnalysis) runId.current = null;
      const message = controller.signal.aborted ? 'The search timed out. Try again.' :
        error instanceof Error ? error.message : 'Unable to reach the mission service.';
      setResult({ status: 'error', message });
    } finally {
      clearTimeout(timer);
      if (active.current === controller) active.current = null;
    }
  };
  const busy = result.status === 'loading';
  const valid = validDeadline(deadline);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
    <Text style={styles.title}>First available touchdown</Text>
    <Text style={styles.caption}>Search from 2027-01-01 for 48 hours of sunlight and Earth visibility.</Text>
    <Text style={styles.label}>Mission deadline (UTC)</Text>
    <TextInput accessibilityLabel="Mission deadline in UTC" value={deadline} editable={!busy} maxLength={10}
      autoCapitalize="none" autoCorrect={false} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.muted}
      onChangeText={text => { setDeadline(text); runId.current = null; setResult({ status: 'idle' }); }} style={styles.input} />
    {!valid && <Text style={styles.caption}>Enter a date from 2027 to 2029 as YYYY-MM-DD.</Text>}
    {result.status === 'empty' && <Text accessibilityLiveRegion="polite" style={styles.label}>No valid touchdown by this deadline. Try a later date or another landing site.</Text>}
    {result.status === 'error' && <Text accessibilityRole="alert" style={styles.label}>{result.message}</Text>}
    {result.status === 'ready' ? <>
      <Text testID="first-touchdown" style={styles.title}>{result.plan.touchdownUtc.replace('T', ' ').slice(0, 19)} UTC</Text>
      <TouchdownDayVisibility key={result.plan.runId + result.plan.touchdownUtc} runId={result.plan.runId} touchdownUtc={result.plan.touchdownUtc} />
      {result.plan.sites.every(site => !site.launchAt) && <Text style={styles.caption}>No launch opportunities for this touchdown.</Text>}
      {result.plan.sites.length > 0 && <Pressable accessibilityRole="button" onPress={() => onConfirm(result.plan)} style={styles.button}>
        <Text style={styles.label}>View launch sites</Text>
      </Pressable>}
    </> : <Pressable accessibilityRole="button" disabled={busy || !valid}
      accessibilityState={{ disabled: busy || !valid, busy }} onPress={search}
      style={[styles.button, (busy || !valid) && { opacity: .6 }]}>
      <Text accessibilityLiveRegion="polite" style={styles.label}>{busy ? 'Finding first touchdown…' : result.status === 'error' ? 'Retry search' : 'Find first touchdown'}</Text>
    </Pressable>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  label: { color: theme.colors.text, fontSize: 13 },
  caption: { color: theme.colors.muted, fontSize: 11 },
  input: { ...theme.outlineSurface, color: theme.colors.text, paddingHorizontal: 12, minHeight: 40, borderRadius: 7 },
  button: { ...theme.outlineSurface, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
});
