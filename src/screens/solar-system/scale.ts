// Mean radii and mean center-to-center distances in km, all reduced by 1/2.
// One scene unit represents one million km. Sizes and distances use the same conversion.
// Sources: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
const toScene = (km: number) => km * .5 / 1_000_000;
export const scale = {
  sunRadius: toScene(695_700),
  earthRadius: toScene(6_371),
  moonRadius: toScene(1_737.4),
  earthOrbit: toScene(149_597_870.7),
  moonOrbit: toScene(384_400),
};
export const viewDistance = {
  overview: scale.earthOrbit * 2.5,
  sun: scale.sunRadius * 4.8,
  earth: scale.earthRadius * 5.2,
  moon: scale.moonRadius * 5.2,
};

// Enlarged intro starts roughly two-thirds illuminated, then evolves with the orbit.
export const INITIAL_MOON_ANGLE = 1.68;
