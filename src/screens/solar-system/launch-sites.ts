import profiles from '../../../assets/ground-launch-sites.json';

export type LaunchSite = { id: string; name: string; latitude: number; longitude: number; launchAt: string | null };

export function launchSiteLabel(code: string) {
  const profile = profiles.find(site => site.code === code);
  return { id: profile?.id ?? `launch-site-${code}`, name: profile?.name ?? code };
}
