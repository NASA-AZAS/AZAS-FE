# STEP 02 · Select a Launch Site

The lunar candidate detail title is now `{site} | DEM 360° Panorama`. The confirmation button has a0.3pt white outline. Pressing Choose this landing site? retains the chosen lunar site in root state, closes its map/panorama, then flies the existing simulation camera to Earth. Input is blocked through arrival and the guide's entrance; no additional globe/Canvas is created.

Ground sites are the13 rows of the supplied `/Users/kimjin/Downloads/ground_launch_sites.csv`, snapshotted to `assets/ground-launch-sites.json`. `launch-sites.ts` exposes the future backend replacement boundary. Latitude is north-positive and longitude east-positive, in degrees. Coordinates/ranges validated during import; geographic accuracy is inherited from the supplied CSV rather than independently surveyed.

Earth uses the existing physical scale. White rotation-axis and detached equatorial-ring children share the globe transform with the ground-site coordinates. Axis visualization uses a constant23.44° ecliptic obliquity with local spin applied before tilt; this is a simplified orientation, not a dated Earth-orientation solution. Site pins on the far side are occluded; drag freely around Earth to inspect other sites. Pins/names follow the animated Earth. Selecting a visible site marks its pin NASA RED; subsequent mission planning is not connected yet.

The existing LunarGuide layout is parameterized for STEP02 with the user-provided two-page English copy. Rocket speech stays italic and types in; > nudges horizontally after page1 and red SELECT appears after final text. SELECT highlights a currently visible site, and individual pins can be selected directly. Narrator still floats and smiles without launch.

Validation: imported13 ranged coordinates; typecheck and browser complete lunar detail→confirmation→locked Earth flight→STEP02 pages→SELECT passed, no runtime errors. Screenshot evidence/earth-step2.png. iPhone execution/gesture feel unverified.

Final polish: Earth N/S labels remain visible even on the far side; launch-site pins still occlude normally. STEP02 SELECT uses a separate screen-projected lower-right anchor at roughly1.4 Earth radii horizontally and.95 vertically, floating off the surface rather than tracking a ground site. Typecheck passed after these adjustments.
