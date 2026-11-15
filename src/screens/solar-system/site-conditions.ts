export type SiteConditions = { sunlight: number; earthCommunication: number };
export type MeanDailyVisibility = { sunMeanDailyVisiblePct: number; earthMeanDailyVisiblePct: number };

export function siteConditionsFromMean(mean?: MeanDailyVisibility | null): SiteConditions | undefined {
  if (!mean) return undefined;
  const { sunMeanDailyVisiblePct: sunlight, earthMeanDailyVisiblePct: earthCommunication } = mean;
  if (![sunlight, earthCommunication].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) return undefined;
  return { sunlight, earthCommunication };
}
