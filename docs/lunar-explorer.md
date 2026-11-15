# Lunar explorer prototype

Open the home Menu button to enter an independent Moon view. Drag the globe to rotate; select a surface pin or a location card to open the flat surface atlas. Back returns to the globe, then the solar system. All UI is English.

## Backend handoff

`src/screens/solar-system/lunar-sites.ts` contains the temporary `LunarSite[]` dataset (four illustrative sites). Replace this dataset with the backend response when an endpoint is defined. Required fields: `id`, `name`, `latitude`, `longitude`, `description`. Coordinates are degrees, north/east positive; latitude -90…90, longitude -180…180. No backend connection exists yet. Validate/normalize incoming coordinates at that future API boundary.

Both views use the same coordinates. Globe pins project onto the sphere, hide on its far side and remain selectable through native overlay buttons. The flat map centers on the selected site and supports drag, zoom buttons and tile retry. Longitude does not wrap at the map edges. Zooming recenters the selected site. The initial prototype uses buttons for zoom, not pinch gestures.

## NASA imagery

- [NASA Open APIs: Trek WMTS documentation](https://api.nasa.gov/)
- [LRO WAC capabilities](https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml)
- Layer: `LRO_WAC_Mosaic_Global_303ppd_v02`
- Matrix set: `default028mm`; lunar EQ CRS `EPSG:104903`.
- Top-left: longitude -180°, latitude +90°. Tile size 256×256. Level z has 2^(z+1) columns and 2^z rows. This is an equirectangular lunar grid, not Earth Web Mercator.
- URL: `https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{row}/{column}.jpg`
- Imagery credit: NASA / GSFC / ASU, LRO WAC.

Capabilities XML was read and a level-zero JPEG returned HTTP 200 on 2026-11-14. Eight level-one images are bundled under `assets/textures/lunar-{row}-{column}.jpg` for the globe. Their matching longitude/latitude patches keep texture and pin coordinates aligned. The atlas requests only visible tiles directly from NASA; it requires a network connection. Loading and failed tiles have feedback and a Retry button. No API key or new dependency is required.

## Validation

Typecheck, coordinate assertions (corners/center, mock coordinate ranges, tile URL order), browser menu→globe→pin→map→back flow, pin movement during globe rotation, zoom and simulated tile failure/retry passed. No browser runtime errors observed. Native device execution is unverified.

- [Globe screenshot](evidence/lunar-explorer-globe.png)
- [Surface atlas screenshot](evidence/lunar-explorer-map.png)

## South-pole handoff metadata (2026-11-14)

`HORIZON_METADATA.md` is the handoff source. The explorer now opens toward the south pole. Site01 is a metadata reference, separate from the four demonstration locations. Its latitude/longitude are -89.6307206°, -129.9644390° and ground elevation is 863.783 m. Display precision retains seven decimal places from the handoff; this is source precision, not a claim of map registration accuracy.

The source frame is MOON_ME / JPL DE421, planetocentric latitude and east-positive longitude. Reference sphere radius is 1,737,400 m. All candidate observers stand 1.0 m above ground. `observerLocation` returns Horizons input order fields longitude, latitude, height in km; Site01 height is (863.783 + 1) / 1000 = 0.864783 km. Ground elevation must never be confused with observer height above ground.

Actual candidates/profile CSVs are absent. Site01 and the mock entries retain `METADATA_INCOMPLETE`; the UI shows a pending-profile label for Site01. No DEM computation, profile loading, Horizons request or visibility calculation is implemented. The other 26 candidates are not fabricated. The WAC map remains a visual preview; precise registration to the source MOON_ME frame has not been independently verified. EQ tiles are highly distorted near the pole, so this preview does not replace a polar DEM map.

Future import contract:

- Use `candidates.csv` as authority; join `site` to `<site>_horizon.csv`. Map `latitude_deg`, `longitude_deg`, `elevation_5m_m` without replacing missing elevation with zero. Keep `square_side_m` and `screened` as terrain-screening fields, not proof of mission suitability. GeoJSON uses [longitude, latitude].
- A complete profile has 3,600 finite rows: `azimuth_deg` 0…359.9 in 0.1° steps and `horizon_deg`. Azimuth starts at local north and increases clockwise; horizon elevation is positive above the local horizontal, and negative values remain valid.
- Preserve `blocker_horizontal_distance_m` (local tangent-plane distance) and `searched_ground_distance_m` (reference-sphere arc). Never conflate them or fill unavailable angles with zero. Retain actual searched range; 1,000 km is a maximum, not coverage guaranteed in every direction.
- Validate site files, coordinate frame, observer height and grid before clearing `METADATA_INCOMPLETE`. An observer-height/location change requires a new profile.
- Future solar/Earth visibility uses Horizons targets 10/399 and observer table quantity 4 after confirming output frame/reference. Margin = apparent body-center elevation minus horizon at its azimuth, wrapping continuously across 359.9°→0°. Positive means center visible within sampled terrain coverage; zero/negative means blocked. This does not evaluate the solar disc or link conditions.
- Site01 reference: azimuth 220° → horizon 8.1972760°, blocker horizontal distance 5,730.6 m, searched ground distance 311,785 m. Use only as an import regression reference once the actual file arrives.

Updated validation: typecheck and assertions for Site01 source coordinates, 0.864783 km height, absent demo elevation and incomplete status passed. Browser south-pole pin→atlas metadata display passed without runtime errors; native device unverified.

## Wrapped atlas view

Atlas selection now keeps the NASA equirectangular imagery wrapped around the Moon by default. A selected site's longitude/latitude rotates to the front center, with a white selected marker. Globe / Flat map buttons switch between the spherical surface and the existing WMTS atlas. This is textured sphere rendering, not a terrain-elevation mesh. Browser default globe, selected marker and flat/globe switching passed; typecheck passed.

## Current flow: integrated south-pole candidates

Supersedes the standalone explorer above. Home Menu focuses the existing animated simulation Moon, with physical body sizes (no overview exaggeration in exploration). Three white mock candidate pins are attached to its actual surface coordinates and projected to native hit targets. A white axis crosses the Moon with North Pole / South Pole labels. Dragging and simulation motion keep overlays attached. Selecting a pin narrows the existing Canvas to the left and opens a right-side south-pole map panel; closing restores the viewport. No second Moon/Canvas is created. The exploration axis is the current scene Moon's rotation axis, not a new physical lunar-pole orientation model.

Only three explicitly mock south-pole sites are displayed, not the 27 scientific candidates. No elevation/profile/visibility claim is made for these sites. HORIZON_METADATA remains the source for future import rules.

Polar imagery: NASA official catalog product `LRO_WAC_Mosaic_SPole60_100m_v02`, south-pole photographic mosaic (not illumination percentage). Capabilities: https://trek.nasa.gov/tiles/Moon/SP/LRO_WAC_Mosaic_SPole60_100m_v02/1.0.0/WMTSCapabilities.xml . ResourceURL uses PNG, default/default028mm, levels 0–5. Origin is (-1095930,1095930) m, level-zero scale denominator 30578404.017857101 (pixel resolution ×0.00028). Matrix width 2^(z+1), height 2^z. Catalog projection is IAU2000:30120; XML declares EPSG:0, so projection is taken from catalog metadata, not assumed from that placeholder. Spherical south polar stereographic: radius1737400 m, central longitude0, latitude -90, scale1. Site coordinates convert to projected meters before tile pixels. The selected site starts at level5 and maps load/retry only visible tiles. Map attribution remains NASA/GSFC/ASU.

Checks: typecheck, south-pole origin and hemisphere projection assertions, three southern mock sites, browser menu→existing Moon→candidate→polar panel passed. Screenshot confirmed white pins, axis/pole names and photographic polar tiles with no tile failures/runtime errors. Native execution remains unverified.

## Mean axial tilt

The Moon mesh now uses a 1.542° constant tilt to the scene ecliptic normal; local spin is applied before the fixed tilt so pole labels, axis, equator and candidate projections share the transform. NASA HLS Lunar Thermal Analysis Guidebook gives 1.542° to the ecliptic (https://ntrs.nasa.gov/api/citations/20210010030/downloads/HLS-UG-001%20Lunar%20Thermal%20Analysis%20Guidebook%20Baseline_STI.pdf). This is a mean visualization: absolute pole direction, precession, libration and the 5.145° lunar orbital inclination are not implemented. It is not a dated DE421 orientation solution. The detached equatorial ring is now opaque white.

## CSV candidate snapshot

All 27 rows of the user-provided `landing_screen/candidates.csv` are now bundled as `assets/lunar-candidates.json`; this remains a local preview pending backend integration. Site IDs, latitude/longitude, ground elevation, square_side_m and screening status are preserved. Horizon profiles remain incomplete. The earlier three mock candidates are replaced.

The selected candidate uses NASA RED #FC3D21 on globe, atlas and the accessible horizontal selection list. The selected square is centered on the candidate and uses square_side_m as its physical side length, adjusted for the local stereographic scale factor 2/(1-sin(latitude)). CSV has no corner coordinates/orientation, so the preview square is aligned to projected map axes; it is not the verified original screening footprint. At default effective zoom11, source level5 tiles are enlarged: this increases display scale, not native imagery detail. Red outline is one display point, unfilled. NASA mosaic NoData/shadow areas may remain dark.

Explorer opens south-facing with additional camera zoom; selecting a candidate restores the south-facing angle. Pole label occlusion uses the underlying lunar surface normal so the far-side N label is hidden. Overlapping physical sites remain selectable from the bottom list. Typecheck/browser checks passed for 27 selection entries, N hidden/S visible and a square DM1 outline (about64.7px for270m at initial map scale). Native unverified.

## High-resolution atlas tiles

Atlas now selects NASA `LRO_NAC_Mosaic_1mpp_SP` and requests original levels up to12, with no display overzoom on NAC. Its official WMTS capabilities preserve the existing origin/projection and provide levels0–12 (level12 pixel spacing about2.09m). Product is cataloged as1mpp; served WMTS spacing should not be confused with native source resolution. Verified level12 Site01 tile returned200; DM1 returned404. Before displaying each site, Image.prefetch checks its central level12 tile. Failed availability check uses WAC overview with explicit high-resolution-unavailable feedback rather than presenting enlarged WAC as detailed imagery. Retry repeats availability check; adjacent missing NAC tiles still expose tile error feedback. A failed network probe also falls back, not proof of spatial absence. Browser Site01 NAC mode and DM1 fallback feedback passed. All27 sites are not guaranteed NAC coverage.

Capabilities: https://trek.nasa.gov/tiles/Moon/SP/LRO_NAC_Mosaic_1mpp_SP/1.0.0/WMTSCapabilities.xml

Final source correction: level12 `LRO_NAC_Mosaic_1mpp_SP` tiles returned200 but visual inspection found near-black stripe-pattern imagery at Site01. The average-merge `LRO_NAC_AvgMosaic_SPole855_1mp` provides visibly detailed terrain there. Use that checked source at its actual maximum level11 (about4.18m per served pixel), without overzoom; source catalog designation remains1mpp. Site01 average tile visually inspected; DM1 still404. Availability probes/default zoom/max zoom now11. Supersedes the level12 source choice above.

## Overview touch controls

The circular candidate overview supports one-finger pan and two-finger pinch (0.5–8×), plus web drag/wheel. Image and pins share a Reanimated transform so coordinates remain attached without React rerenders during gesture updates. Existing PanResponder integration is reused; gesture recognition still runs on JS. This manipulates the bundled overview display, not progressive network tile detail. Right-hand NAC atlas remains independent. Typecheck passed; native multitouch unverified.

## Candidate panel and reveal

The left overview is now a rectangular panel titled Candidate Sites · 27. Pin buttons counter-scale the parent zoom so icon and hit target size remain fixed while geographic positions pan/zoom. First candidate selection eases the 3D camera toward the south pole and zooms in over800ms before revealing the overview with350ms fade. Gestures and duplicate selection are blocked during the camera phase; exit/unmount cancels it. Existing selection in the flat map directly updates the detailed candidate. Browser check confirmed delayed reveal, title/count and20px pin hit target before/after wheel zoom. Typecheck passed; native gesture/transition feel unverified.

## Current source: offline user TIFF (supersedes WMTS)

Both current atlas views now use the supplied `/Users/kimjin/Downloads/SP_Mosaic.tif`. No NASA tile API or remote image request remains in the active map code. Native TIFF decoding is avoided by bundling a2048px JPEG overview and27 per-site256px crops at the original source pixel spacing. Local assets total about2.1MB. `assets/lunar-local/metadata.json` records the original SHA-256 and calibration assumptions; the35MB source TIFF is not copied into the app.

The6082×6082 grayscale TIFF has no GeoTIFF CRS/geotransform tags. Its printed legend explicitly reads Polar Stereographic,100m/pixel, Arizona State University. Source coordinates are calibrated with pixel center(3041,3041),100m/source pixel and the south-polar stereographic assumptions used in the handoff. This is visual calibration, not independently verified geodetic registration. The centered image diameter corresponds to roughly80°S; longitude0 is up,90E right,180 down,90W left. Surface grid lines already printed into the TIFF also appear in detail crops.

All27 candidate coordinates fall within the circular image footprint under this calibration; none were excluded. The user's expected two outside points were not observed, and valid sites were not arbitrarily removed. At source resolution200m spans about2 original pixels. Zoom makes these pixels larger and cannot restore NAC-level detail or verify the exact flat-area footprint. The red square remains an axis-aligned preview with side square_side_m, including local stereographic scale adjustment; orientation/corner geometry is absent from the CSV.

The full-site panel adds longitude meridians,85S latitude ring, Nearside/Farside, South Pole and fixed-size candidate name/icon annotations. These are geographic longitude references, not local celestial azimuth readings. Selected sites remain NASA RED. Existing overview drag/pinch and constant pin sizes are retained. Detail view uses the selected local TIFF crop, drag/pinch and zoom buttons; no availability probes, fallback layers or network retry are needed.

Checks: all27 footprint/side-length assertions, typecheck, browser with NASA requests intercepted/blocked:0 map requests,27 overview pins, square outline and zoom action passed; no runtime errors. Native device unverified. Screenshot: evidence/local-tiff-atlas.png.

## Crisp square overview

Overview panel now has equal width/height and no Solar system back button. Minimum zoom1 fits the whole source; pan is clamped to the zoomed footprint and resets to center when fully zoomed out. Maximum display zoom is bounded by source resolution and device pixel ratio (also capped8×).

Four lossless3041×3041 local PNG quadrants preserve all6082 source pixels, replacing the2048 overview for this view. Images resize directly, pin/name positions update directly at constant screen size, and the SVG grid changes its viewBox instead of scaling a rasterized parent. SVG wrapper flattens style arrays for web compatibility. Native source100m/pixel detail remains a real limit, not restored by interpolation. Browser min-zoom/fixed-pin/back-button/runtime checks and typecheck passed; native unverified.

## iPhone candidate-entry crash mitigation

User reported termination in iPhone Expo Go immediately after the full-resolution overview change. No device crash log is available, so root cause remains unconfirmed. Removed animated Svg/viewBox bridge updates and suppress SVG until its viewport dimensions are positive. Grid now uses normal React SVG props; Reanimated bridges a bounded numeric view snapshot for the grid/tile selection. Replaced simultaneous four3041px image mounts (about148MB decoded RGBA before GPU/caches) with local512px multiresolution tiles. Only intersecting tiles from the selected2048/full6082 source level are mounted. Screen imagery preserves source detail without mounting a full-resolution bitmap pyramid at once.

Typecheck, browser entry/zoom (no runtime errors), visible image counts17→5 including the one detail image, and iOS production bundle export passed. Actual iPhone retest/crash-log confirmation remains outstanding; these checks do not prove native crash resolution.

## Real multitouch fix

User confirmed the previous PanResponder pinch did not work on iPhone. Replaced overview responder recognition with Expo SDK58-compatible react-native-gesture-handler3.3.0, GestureHandlerRootView at root, simultaneous native one-finger pan and two-finger pinch via Reanimated worklets. Pinch uses focal-point anchored zoom, fixed pin sizes and existing minimum/maximum zoom limits. Web still supports wheel. Real two-contact browser touch events (not wheel) changed DM1 screen position442.1→509.6 while pin size stayed fixed; no runtime errors. Native iPhone interaction is still not directly verified.

Panel moved right from8px to32px, with its outer border removed. A thin white circle follows the geographic mosaic circumference through pan/zoom. Title and local imagery attribution remain outside the map gesture region.

SDK-matched iOS bundle export passed after the native gesture change. Expo Go includes gesture-handler; reload the Expo Go project to load the new import/root wrapper. No rebuild is required for Expo Go. Actual iPhone interaction still needs confirmation.

## Circular map and direct gesture reversal

Map viewport now clips all content to a fixed circular mask with a thin fixed circular border; outer panel background is transparent. Left overview moved right to56px, with responsive width preserving separation from detail panel. Incremental pan changes and incremental pinch scale changes replace start-relative deltas. Pinch focal point updates every event, eliminating the accumulated dead zone when reversing at min/max zoom; positions remain clamped and pins stay fixed size. Browser genuine two-touch test contracted at minimum then reversed within the same gesture: zoom responded, fixed pins preserved, circular overflow clip confirmed, no runtime errors. Typecheck passed; iPhone feel still unverified.

## Per-candidate DEM panorama

The detail panel is now a vertically scrollable stack: existing local map (roughly half its old height), then DEM Panorama. All27 user images from Downloads/sphere match candidate IDs and are bundled unchanged. `lunar-panorama-assets.ts` is the static mapping boundary; no network request is used.

The2:1 panoramas render inside a reflected sphere with a centered65° camera. North is the image seam(u0/u1), initially facing+X; east u.25 faces+Z. One-finger horizontal drag changes heading continuously through360° using native Gesture Handler and a shared value. A vertical movement fails that gesture early to allow parent ScrollView scrolling. Map responder also yields primarily vertical drags to scrolling. Selecting another candidate remounts the stack and resets its panorama to north/scroll to top. A loading indicator and error boundary cover local texture load/render errors. Panorama texture and sphere geometry are disposed when unmounted to limit GPU memory.

Checks: all27 assets match the supplied originals byte-for-byte and each is2048×1024. Browser horizontal touch changed the panorama screenshot, vertical touch over the viewer scrolled the panel69px, no runtime errors. Typecheck and iOS bundle export passed. Actual iPhone rendering/gesture smoothness remains unverified. Source DEM observer height/vertical-angle calibration was not independently verified.

## Panorama free look

Panorama drag now controls both heading and elevation. Heading wraps around360°; elevation stops just short of±90° to avoid pole flips. The right ScrollView is registered as a native gesture and the panorama pan blocks it while active; outside the viewer the panel still scrolls normally. Browser diagonal two-axis look test changed the scene while parent scroll position stayed69px and no runtime errors occurred. Typecheck passed; actual iPhone gesture arbitration remains unverified.

## Panorama minimap and view cone

Removed the large red-square map section from the active detail panel. Panorama now fills the right panel's main area and carries a136px local-crop minimap at its upper left. It retains the physical candidate-square outline and red position marker. A translucent NASA RED sector plus center ray follows the same displayed heading used by the panorama camera, including80ms easing. The sector angle uses the camera horizontal FOV derived from65° vertical FOV and actual viewer aspect ratio. This is a horizontal bearing indicator, not a ray-traced ground footprint or visibility result.

On a south-polar map local north is radially outward: minimap cone orientation is source longitude + camera azimuth, and N is labeled accordingly. The minimap is pointer-transparent so it does not interrupt panorama dragging. Sensitivity increased .004→.0055radians/px (37.5%) with80ms quadratic ease-out following. Both vertical and horizontal look share the new response. Map source remains100m/px and very close minimap crops cannot create additional terrain detail.

Typecheck and real browser touch passed: old large map section absent, minimap mounted, cone transform changed with camera heading, no runtime errors. Screenshot evidence/panorama-radar.png. Actual iPhone smoothness remains unverified.

## Candidate-only north-up minimap

Minimap is now112px and flush to panorama top-left. A fixed red frame clips both imagery and view cone. N is fixed top-center. Local north-up candidate-square crops are precomputed into224px JPEGs, so rendering does not create oversized image surfaces on iPhone. Camera heading rotates the cone directly from north, rather than adding site longitude. The crop transform rotates source coordinates by inverse site longitude; candidate area is aligned to local north/east (CSV has no original rectangle orientation). Source100m/pixel means a200m crop contains only about2 source pixels per side; the thumbnail is an enlarged visualization, not finer geographic detail. Typecheck passed; visual/native confirmation not performed for this final crop adjustment.

## Radar reaches square boundary

The rotated sector previously clipped to its own88px SVG viewport before the outer square clipped it, shortening the diagonal ray/sector. Its drawing canvas is now3× the minimap with an offset viewBox; only the final minimap boundary clips the sector and white ray. Browser rotated minimap screenshot confirmed both reach the square edges. Lower-left text displays square_side_m in meters (candidate side length, not radar range). Drag sensitivity is now.0072rad/px and follow easing45ms. Typecheck and browser touch/runtime checks passed; iPhone feel remains unverified.

## Live camera angles

Replaced the fixed cardinal-direction legend with Azimuth / Elevation values sampled from the displayed panorama camera shared values at10Hz. Sampling is isolated in a small readout component and does not rerender the Canvas. Azimuth is north0°, clockwise east90° through360° wrapping to0; elevation is horizon0°, positive upward. Decimal display uses0.1° precision without implying source calibration accuracy. Initial north/horizon and touch movement to28.9° /11.6° passed in browser; typecheck passed.

## South-pole guide overlay

After the automatic south-pole camera tour completes and unlocks, show the user's English command at upper left and WHY THE LUNAR SOUTH POLE? explanation at upper right with staggered fades. A narrator rocket portrait sits at bottom left with a thin white speech bubble. `RocketDialogue` centralizes italic rocket-speech typography, reserves full message height to avoid typing reflow, and reveals one character every18ms after a450ms lead-in. Reduced-motion mode displays the whole line. Pointer-transparent overlay leaves the scene selectable; choosing a candidate hides the guide.

Browser verified delayed appearance after tour, growing text length, computed italic typography and final placement; no runtime errors. Typecheck passed. Actual iPhone layout/animation unverified. Screenshot evidence/lunar-guide.png.

## Interactive narrator and wide dialogue

Guide narrator now reuses RocketCompanion in narrator mode: shared floating, eye motion and happy/body response on tap, without launch/caption. Narrator reaction can repeat; ordinary home mascot launch behavior is unchanged. Overlay is box-none and only narrator receives pointer input; speech and other guide copy pass touches through. Dialogue fills the remaining safe width to the right screen edge. Browser checked floating position change, happy-eye visibility after actual click, no launch/lock after reaction, and bubble right edge at1076px in1100px viewport (24px safe margin); no runtime errors. Typecheck passed; native feel unverified.

## Paged rocket speech

Guide callout text is Lunar South Pole. RocketDialogue accepts a page array with reusable italic typewriter styling. Page1 explains the noncoincidental cluster; page2 contains the user's water-ice/sunlit-hills explanation. After a page finishes, a lower-right > nudges periodically only if another page exists. Tapping the bubble/arrow advances and restarts typing. The final page has no next hint. Longest-page layout reserves stable bubble height; reduced motion shows full text without nudge. Browser first-page text, hidden cue during typing, completed-page tap advance and final-page stopping passed; typecheck passed. Native unverified.

## Selection cue and pole callout

Guide title now uses STEP01, NASA RED divider and23px bold brand-style type. Dialogue has two user-specified pages; > moves horizontally only once typing finishes. The final page reveals a small NASA RED SELECT button below the candidate cluster; it opens the Site01 overview/detail flow. It shares the Lunar South Pole callout's early zoom-out fade and does not intercept taps when invisible.

Callout starts on the upper-right peripheral south-polar surface rather than the axis. Its local surface direction follows the screen upper-right tangent; label/leader follow projected coordinates. Opacity uses apparent lunar radius so a small zoom-out fades it away. Guide narrator is smaller/lower, floating and clickable for repeat smiles without flight. Bubble spans remaining safe width and all speech remains italic. Typecheck passed. Prior screenshot evidence is historical and predates the final page/callout layout.

## Arrival date selection (mock)

`Confirm Landing Site` now keeps the selected lunar site and overview in place, replacing the right-hand panorama with eight preset arrival date/time options. All options display UTC. The user must select one before `Confirm Arrival Date` can start the existing locked transition to Earth / STEP 02. Back returns to the panorama; changing candidates clears the pending date selection. The confirmed site and arrival window stay together in screen refs for the demo session.

`arrival-windows.ts` contains the typed mock options, shared across sites for now. These dates are demo values, not calculated mission opportunities. Replace them with the selected site's backend response when available. `arrival-date-picker.tsx` renders the selection UI using the existing transparent background and thin white outlines.

Validation: TypeScript and whitespace checks passed. Browser flow verified eight options, disabled confirmation before selection, enabled confirmation after selection, back-to-panorama reset, and arrival confirmation reaching Earth / STEP 02 without runtime errors. Native iPhone / Expo Go was not directly tested for this change.
