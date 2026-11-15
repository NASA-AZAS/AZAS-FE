# STEP 02 · Select a Launch Site

The lunar candidate detail title is now `{site} | DEM 360° Panorama`. The confirmation button has a0.3pt white outline. Pressing Choose this landing site? retains the chosen lunar site in root state, closes its map/panorama, then flies the existing simulation camera to Earth. Input is blocked through arrival and the guide's entrance; no additional globe/Canvas is created.

Ground sites are the13 rows of the supplied `/Users/kimjin/Downloads/ground_launch_sites.csv`, snapshotted to `assets/ground-launch-sites.json`. `launch-sites.ts` exposes the future backend replacement boundary. Latitude is north-positive and longitude east-positive, in degrees. Coordinates/ranges validated during import; geographic accuracy is inherited from the supplied CSV rather than independently surveyed.

Earth uses the existing physical scale. White rotation-axis and detached equatorial-ring children share the globe transform with the ground-site coordinates. Axis visualization uses a constant23.44° ecliptic obliquity with local spin applied before tilt; this is a simplified orientation, not a dated Earth-orientation solution. Site pins on the far side are occluded; drag freely around Earth to inspect other sites. Pins/names follow the animated Earth. Selecting a visible site marks its pin NASA RED; subsequent mission planning is not connected yet.

The existing LunarGuide layout is parameterized for STEP02 with the user-provided two-page English copy. Rocket speech stays italic and types in; > nudges horizontally after page1 and red SELECT appears after final text. SELECT highlights a currently visible site, and individual pins can be selected directly. Narrator still floats and smiles without launch.

Validation: imported13 ranged coordinates; typecheck and browser complete lunar detail→confirmation→locked Earth flight→STEP02 pages→SELECT passed, no runtime errors. Screenshot evidence/earth-step2.png. iPhone execution/gesture feel unverified.

Final polish: Earth N/S labels remain visible even on the far side; launch-site pins still occlude normally. STEP02 SELECT uses a separate screen-projected lower-right anchor at roughly1.4 Earth radii horizontally and.95 vertically, floating off the surface rather than tracking a ground site. Typecheck passed after these adjustments.

## Launch-time selection mock

STEP 02 shows a transparent, white-outline `Choose by Launch Time` panel on the right as soon as Earth arrival reveals the guide, before dialogue typing starts. Its vertical list scrolls independently of the globe. Each of the 13 launch sites has one assigned UTC time; rows are ordered by time. The mock assigns times 72–108 hours before the confirmed lunar arrival, at three-hour intervals. These are demo assignments, not calculated trajectory opportunities; replace `getMockLaunchWindows` with backend data later.

The list, globe pin, and name label all select the same site ID. Selected pin/name/list row use NASA RED. Globe name labels have their own press target within the parent bounds for native touch handling, use smaller type, and stay on one line with ellipsis. List names also stay on one line. The existing arrival-transition input lock still covers this panel until STEP 02 is ready.

Validation: typecheck passed. Browser flow confirmed all 13 assigned launch times, scrolling to and selecting the last row, and selecting a visible globe name updating the corresponding time row to NASA RED; no page runtime errors. Screen appearance checked in the browser; iPhone / Expo Go touch behavior remains unverified on hardware.

## Launch-site detail layout

Selecting a launch time, globe pin, or globe name now starts a one-second locked camera move toward that site's rotating surface normal and zooms to 0.25. The detail layout then replaces the guide/list: a square Earth map on the left and an empty transparent white-outline panel on the right with the site name and close button. Selecting another map pin updates the selected site and NASA RED focus. Closing smoothly restores the preceding Earth view and the time list.

The map reuses the local `earth.jpg` equirectangular texture and wraps longitude across the dateline; it is an offline coordinate preview, not a tiled Mercator map service. All 13 pins share the same coordinates as the globe; those outside the square viewport are clipped. Detail content is intentionally empty for the next iteration.

Validation: typecheck and whitespace checks passed. Browser verified the launch-time selection → zoom/detail flow, square map dimensions, clicking a visible alternate map pin updating the panel title, and closing back to the time list without runtime errors. Layout visually checked in the browser; native iPhone hardware was not tested.

## World-map gestures

The square launch-site map now opens at 2.4× around the selected coordinates and supports single-finger dragging and focal-point two-finger pinch from 1× to 8×. Longitude wraps across the dateline; latitude clamps to the image bounds so empty space is not exposed. Selecting another site smoothly recenters the view. Gestures immediately interrupt that focus motion, and drag release has light clamped inertia (disabled with reduced motion). Pin icons and labels retain their screen sizes at every zoom level. Web wheel zoom follows the same limits. The local 2048px texture remains the source, so zoom does not add geographic detail.

Gesture validation: browser touch emulation confirmed two-finger pinch changes map scale, wheel zoom and drag pan work, pin width stays fixed, and no page runtime errors occur. Typecheck passed; iPhone / Expo Go pinch feel was not directly verified on hardware.

Pinch stability correction: the map texture now keeps fixed layout dimensions and uses GPU scale/translation, while pins use translation only. This avoids resizing/repositioning native image layouts on every pinch update. The first active pinch event seeds the focal point, one-finger lift events cannot update scale/pan, and single-finger pan/inertia is suppressed during an active pinch.

Validation: TypeScript passed. Browser two-touch regression verified the geographic point below the pinch midpoint stays stable across successive zoom updates, alongside wheel/drag and constant pin width, without runtime errors. Native device feel remains unverified.
