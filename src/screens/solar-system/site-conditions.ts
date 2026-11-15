import { lunarSites } from './lunar-sites';

export type SiteConditions = { sunlight: number; earthCommunication: number; power: number };

// Demo percentages only; replace with site conditions from the API later.
export const mockSiteConditions: Record<string, SiteConditions> = Object.fromEntries(
  lunarSites.map((site, i) => [site.id, {
    sunlight: 55 + (i * 7) % 40,
    earthCommunication: 45 + (i * 11) % 50,
    power: 50 + (i * 13) % 45,
  }]),
);
