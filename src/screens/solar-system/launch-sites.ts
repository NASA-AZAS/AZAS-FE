import profiles from '../../../assets/ground-launch-sites.json';

export type LaunchSite = {
  id: string; profileId?: string; name: string; latitude: number; longitude: number;
  candidateId: string | null; launchAt: string | null;
  tliUtc: string | null; lunarArrivalUtc: string | null; proposedLandingUtc: string | null;
};

export function launchSiteLabel(code: string) {
  const profile = profiles.find(site => site.code === code);
  return { profileId: profile?.id, name: profile?.name ?? code };
}
