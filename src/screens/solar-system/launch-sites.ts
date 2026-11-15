import sites from '../../../assets/ground-launch-sites.json';
export type LaunchSite = { id: string; name: string; latitude: number; longitude: number };
// Local CSV snapshot, north/east positive degrees; replace at the backend boundary later.
export const launchSites: LaunchSite[] = sites;

export type LaunchWindow = { site: LaunchSite; launchAt: string };
// Demo assignments only, not calculated launch opportunities. Replace with API data.
export function getMockLaunchWindows(arrivalAt: string): LaunchWindow[] {
  const arrival = Date.parse(arrivalAt);
  return launchSites.map((site, index) => ({
    site,
    launchAt: new Date(arrival - (72 + index * 3) * 3600000).toISOString(),
  })).sort((a, b) => a.launchAt.localeCompare(b.launchAt));
}
