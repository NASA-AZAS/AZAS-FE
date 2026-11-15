import conditions from '../../../assets/lunar-site-conditions.json';

export type SiteConditions = { sunlight: number; earthCommunication: number };

// candidates.csv: mean daily Sun/Earth visibility percentages over 2027–2029.
export const siteConditions: Record<string, SiteConditions> = conditions;
