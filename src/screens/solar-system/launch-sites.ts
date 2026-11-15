import sites from '../../../assets/ground-launch-sites.json';
export type LaunchSite = { id: string; name: string; latitude: number; longitude: number };
// Local CSV snapshot, north/east positive degrees; replace at the backend boundary later.
export const launchSites: LaunchSite[] = sites;
