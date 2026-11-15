import { memo } from 'react';
import { Image, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { theme } from '../../theme';
import credits from '../../../assets/launch-site-photos/credits.json';
import { launchSiteProfiles } from './launch-site-profiles';
import type { LaunchSite } from './launch-sites';

export const LaunchSiteInfo = memo(function LaunchSiteInfo({ site }: { site: LaunchSite }) {
  const profile = launchSiteProfiles[site.id];
  const credit = credits[site.id.replace('launch-', '') as keyof typeof credits];
  const launchAt = site.launchAt;
  const { height } = useWindowDimensions();
  const side = Math.min(190, Math.max(110, (height - 190) * .72));
  return <View testID="launch-site-info" style={{ flex: 1, gap: 14, paddingTop: 8 }}>
    <View style={{ flexDirection: 'row', gap: 12, height: side }}>
      <View style={{ width: side, height: side, overflow: 'hidden', borderRadius: 6, borderWidth: .5, borderColor: '#fff', backgroundColor: theme.colors.surface }}>
        {profile ? <Image testID="launch-site-photo" source={profile.photo} accessibilityLabel="Launch site photograph" resizeMode="cover" resizeMethod="resize" style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.colors.muted, fontSize: 10 }}>Photo unavailable</Text></View>}
        {profile && credit && <Pressable accessibilityRole="link" accessibilityLabel={`Photo: ${credit.credit}, ${credit.license}. Open source.`} onPress={() => Linking.openURL(credit.source).catch(() => {})} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 3, backgroundColor: '#000b' }}>
          <Text numberOfLines={2} style={{ color: '#fff', fontSize: 6 }}>Photo: {credit.credit} · {credit.license}</Text>
        </Pressable>}
      </View>
      <View style={{ flex: 1, gap: 8, overflow: 'hidden' }}>
        <Text numberOfLines={2} style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>{profile ? `${profile.flag}  ${profile.country}` : site.name}</Text>
        <Text testID="launch-site-summary" numberOfLines={7} style={{ color: theme.colors.muted, fontSize: 11, lineHeight: 16 }}>{profile?.description ?? 'Information for this launch site is not available.'}</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      <View style={{ flexShrink: 1, gap: 3 }}>
        <Text style={{ color: theme.colors.muted, fontSize: 10, letterSpacing: 1.5 }}>LAUNCH TIME</Text>
        {launchAt ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Text testID="launch-date" style={{ color: theme.colors.text, fontSize: 18, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{launchAt.slice(0, 10).replaceAll('-', '.')}</Text>
          <Text testID="launch-time" style={{ color: theme.colors.text, fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{launchAt.slice(11, 16)}</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 11 }}>UTC</Text>
        </View> : <Text testID="launch-unavailable" style={{ color: theme.colors.muted, fontSize: 12 }}>No launch opportunity available</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 24, alignItems: 'center' }}><View style={{ width: .5, flex: 1, backgroundColor: '#fff', transform: [{ translateX: 6 }] }} /></View>
      <View testID="launch-coordinates" style={{ width: 106, gap: 3 }}>
        <Text style={{ color: theme.colors.muted, fontSize: 10, letterSpacing: 1 }}>COORDINATES</Text>
        <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] }}>Lat {Math.abs(site.latitude).toFixed(3)}° {site.latitude >= 0 ? 'N' : 'S'}</Text>
        <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] }}>Lon {Math.abs(site.longitude).toFixed(3)}° {site.longitude >= 0 ? 'E' : 'W'}</Text>
      </View>
    </View>
  </View>;
});
