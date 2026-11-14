import candidates from '../../../assets/lunar-candidates.json';
export const NASA_RED = '#FC3D21';
// Candidate coordinates: MOON_ME (DE421), planetocentric latitude and east-positive longitude.
export const lunarReference = {
  frame: 'MOON_ME (DE421)', radiusM: 1_737_400, observerHeightM: 1,
  profileSamples: 3600, azimuthStepDeg: .1,
} as const;
export type LunarSite = {
  id: string; name: string; latitude: number; longitude: number; description: string;
  source: 'metadata' | 'mock' | 'csv'; groundElevationM?: number; squareSideM?: number; screeningStatus?: string;
  profileStatus: 'METADATA_INCOMPLETE';
};
// Local CSV snapshot; horizon profiles are not imported.

export const lunarSites = candidates as LunarSite[];
export const mosaic = { width: 6082, height: 6082, center: 3041, metersPerPixel: 100 } as const;
// TIFF has no GeoTIFF tags. Calibrated from its printed 100m/px label,
// centered south-pole stereographic graticule and 6082px diameter.
export const mosaicPoint = (latitude: number, longitude: number) => {
  const lat = latitude * Math.PI / 180, lon = longitude * Math.PI / 180;
  const rho = 2 * lunarReference.radiusM * Math.tan(Math.PI / 4 + lat / 2);
  return { x: mosaic.center + rho * Math.sin(lon) / 100,
    y: mosaic.center - rho * Math.cos(lon) / 100 };
};
export const coordinates = (site: LunarSite) => `${Math.abs(site.latitude).toFixed(7)}° ${site.latitude < 0 ? 'S' : 'N'}  ·  ${Math.abs(site.longitude).toFixed(7)}° ${site.longitude < 0 ? 'W' : 'E'}`;

// Horizons custom observer input: longitude, latitude, height above reference sphere (km).
export const observerLocation = (site: LunarSite) => site.groundElevationM === undefined ? null : {
  longitudeDeg: site.longitude, latitudeDeg: site.latitude,
  heightKm: (site.groundElevationM + lunarReference.observerHeightM) / 1000,
};
