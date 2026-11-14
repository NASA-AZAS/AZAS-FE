import { useEffect, useState, type MutableRefObject } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';

export const SIMULATION_RATE = 86_400; // At 1x, one real second advances one simulation day.
export const SIMULATION_START = Date.parse('2026-11-14T00:00:00+09:00');
export function formatSimulationTime(seconds: number, compact = false) {
  const date = new Date(SIMULATION_START + Math.floor(seconds) * 1000 + 9 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}${compact ? '\n' : ' '}${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
export function SimulationClock({ elapsed, compact, style }: {
  elapsed: MutableRefObject<number>; compact: boolean; style: StyleProp<TextStyle>;
}) {
  const [label, setLabel] = useState(() => formatSimulationTime(elapsed.current, compact));
  useEffect(() => {
    setLabel(formatSimulationTime(elapsed.current, compact));
    const timer = setInterval(() => setLabel(formatSimulationTime(elapsed.current, compact)), 100);
    return () => clearInterval(timer);
  }, [elapsed, compact]);
  return <Text testID="simulation-clock" style={[style, { fontVariant: ['tabular-nums'] }]} accessibilityLabel={`Simulation time, Korea Standard Time: ${label}`}>{label}</Text>;
}
