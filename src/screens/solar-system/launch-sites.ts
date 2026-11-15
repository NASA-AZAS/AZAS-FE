import profiles from '../../../assets/ground-launch-sites.json';

export type LaunchSite = { id: string; profileId?: string; name: string; latitude: number; longitude: number; launchAt: string | null; candidateId: string | null };

export function launchSiteLabel(code: string) {
  const profile = profiles.find(site => site.code === code);
  return { profileId: profile?.id, name: profile?.name ?? code };
}
