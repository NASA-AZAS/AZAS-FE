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

## Launch-site information

The detail panel now shows a square, cover-cropped local photo beside its country flag/name and an expanded English summary of up to six lines, constrained to the photo's height. Below it, the assigned launch date and time are shown prominently in UTC using the same `getMockLaunchWindows` value as the selection list. Photos and their supplied credits/licenses are stored in `assets/launch-site-photos`; the photo credit opens its original source. The `Let's Launch!` button remains at the bottom with no next-stage action yet.

Profiles use the site's geographic country: Baikonur is Kazakhstan; Kourou is France (French Guiana). Descriptive background was checked against [NASA launch sites](https://www.nasa.gov/kennedy/launch-services-program/launch-services-program-launch-sites/), [NASA launch operations](https://public.ksc.nasa.gov/lspeducation/launch-operations/), [NASA Baikonur background](https://www.nasa.gov/wp-content/uploads/2024/04/exp11-presskit.pdf?emrc=b0e481), [JAXA Tanegashima](https://global.jaxa.jp/about/centers/tnsc/index.html?level=1), [JAXA Uchinoura](https://www.jaxa.jp/about/centers/usc/), [ISRO SDSC](https://www.isro.gov.in/SDSC.html), [ESA Kourou](https://www.esa.int/ESA_Multimedia/Images/2024/06/Where_on_Earth_Kourou), [China launch-center background](https://english.www.gov.cn/news/202402/04/content_WS65bf341bc6d0868f4e8e3c71.html), [Rocket Lab launch sites](https://rocketlabcorp.com/launch/launch-with-us/), and [Vostochny geographic background](https://en.wikipedia.org/wiki/Vostochny_Cosmodrome).

Validation: typecheck passed. Browser confirmed the selected photo/country, the launch time matching the list, square photo dimensions, and summary/button bounds at 1100×650 and 844×390. Native hardware was not tested.

Photo/summary refinement: photos are larger (144px at 844×390, up to 190px on larger views), and each site introduction is roughly twice its previous length. Summaries remain constrained to the photo height.

Detail refinement: launch time now has a thin white vertical separator and geographic coordinates on its right, shown to three decimal places with N/S/E/W. The world map starts at 3× and allows up to 12× zoom.

Florida label separation: Kennedy Space Center and Cape Canaveral Space Force Station retain their exact pin coordinates, but use opposite screen-sized bent leader lines (Kennedy upper-left, Cape lower-right). The shared callout is used on both the globe and flat map, keeps selected NASA RED styling, and provides a separate press target for each displaced name.

Callout validation: typecheck passed. Browser confirmed the two displaced names have non-overlapping bounds, the Cape name selects its site, and no runtime errors occur. Native hardware was not directly tested.

## Next Stop The Moon

The launch confirmation button is now `Next Stop The Moon`. It plays the user-supplied `KakaoTalk_Video_2026-11-15-12-41-13.mp4` (about five seconds, H.264/AAC) through SDK-compatible `expo-video`, with no playback controls, fullscreen, picture-in-picture or touch interaction. Playback pauses while the app is inactive. The existing global input lock spans playback and the entire Earth return move.

The real `playToEnd` event starts a 1.6-second Earth zoom from 3× view distance to the standard axis/equator view, followed by a short camera settling interval. Earth rotation and orbital simulation stay paused. Only the confirmed launch-site pin/name remain, in NASA RED; axis N/S labels remain. The STEP 02 guide, time list and detail panel are hidden. Camera orbit/zoom controls unlock after arrival. Video errors restore the detail view and previous pause state so the same button can retry. No API or trajectory calculation is added.

`expo-video` is included in Expo Go; a custom native runtime needs rebuilding after adding this dependency. Playback uses the original video in the repository root.

Validation: typecheck passed. Browser played the actual MP4, verified hidden playback controls and input lock, waited for its real end event and Earth arrival, confirmed exactly one stationary launch-site pin, and verified camera input unlocks afterward. No page runtime errors. Native iPhone / Expo Go playback was not directly tested.

## Earth–Moon transfer preview

The post-video destination is now a top-down Earth–Moon preview rather than a close Earth view. The existing physical Earth/Moon sizes and half-scale mean separation (`scale.moonOrbit`, 384,400 km × 0.5 in scene units) remain unchanged. The camera fits both bodies horizontally, and rotation/orbital simulation remains paused.

`transfer-trajectory.tsx` draws a presentation-only mock route: two expanding parking loops near Earth, a curved transfer segment, then a shrinking lunar approach spiral. A white dashed line reveals progressively after the 1.8-second camera move. This is not a gravity integration, computed mission trajectory, or Lambert solution. Reduced motion shows the final route without progressive drawing.

The selected launch-site marker remains red and Moon has a label. All orbit/zoom input stays blocked in this preview. Once drawing finishes, a transparent white-outline `Let's go!` button appears at bottom right; it is UI only, with no next action yet.

Validation: typecheck passed. Browser played the actual video through to the preview, confirmed the selected pin/Moon label/next button, and verified orbit drag and wheel zoom leave the view unchanged. The dashed route and top-down composition were visually checked; native hardware was not tested.

## Transfer-preview guide

The lunar destination uses the previously selected lunar site's name in NASA RED, with a mock red marker over the Moon. EARTH and MOON labels sit above their bodies/trajectory loops. The upper-right button is now `Start the Journey` with a rocket icon, still UI only. Beneath it, the existing floating narrator and italic typewriter dialogue present the two user-supplied lunar-orbit explanation pages with the standard next-page cue.

The camera framing reserves the upper band for this UI without changing Earth/Moon size or distance ratios. Preview orbit/zoom remains locked; only narrator/dialogue and button UI accept touches.

Validation: typecheck passed. Browser verified the selected Site01 label, top-right journey button, both dialogue pages, locked camera, and no Moon-label/dialogue overlap at 844×390. Layout was visually checked; native hardware was not tested.

Placement correction: transfer narration now uses the standard bottom-of-screen mascot and full-width dialogue layout, matching STEP 01/02. The journey button remains top right. Earth/Moon framing shifts upward to leave the bottom conversation area clear. Typecheck passed; this placement correction was not rechecked on native hardware.

## Preview/video order and back navigation

`Next Stop The Moon` now opens the locked Earth–Moon route preview directly, without playing video. `Start the Journey` in the top-right corner starts the supplied MP4. Playback remains input-locked and returns to the same paused route preview when finished; a playback error stays on the preview and allows retry. The top-left outlined back arrow returns to the selected launch-site detail, restoring the prior simulation pause state. Re-entering redraws the preview route.

EARTH and MOON text move down by 10px; lunar destination marker/name positions are retained. The mascot and dialogue remain in their standard bottom-of-screen layout.

Header alignment: the back button's left edge and journey button's right edge use `max(24, safeAreaInset)`, matching the bottom mascot/dialogue section. Video playback waits for the player's ready state before starting, avoiding the first play request being lost before the view attaches.

Validation: typecheck passed. Browser confirmed Next Stop opens the preview with no video, Journey starts real playback, playback returns to the preview, and back/re-enter/close restores the site detail and list without runtime errors. Header/button margins share the same safe-area calculation as the bottom guide. Native safe-area rendering was not directly tested.

## Three-page transfer narration and fade-in

Transfer narration now uses the three supplied English messages in order: why a curved route is used, why spacecraft first circle Earth, and why lunar orbit precedes descent. The existing bottom-positioned italic typewriter bubble and next-page cue are reused; the last page has no next cue.

The dashed route fades in over its first 600ms of drawing. Moving transfer labels/markers stay hidden until the route completes, then their stable keyed overlay fades in over 650ms. Header buttons fade in for 650ms, and the bottom narrator/dialogue fade in for 700ms with a short delay. Projection updates retain component identity, so they do not restart the fade on every frame.

Validation: typecheck passed. Browser verified all three exact English messages, both page advances, no next cue on the final page, and the standard bottom layout at 844×390 without runtime errors. Native animation feel was not directly tested.

## Journey countdown

The journey arrow periodically nudges forward twice, stopping when inactive or reduced motion is enabled. Pressing `Start the Journey` immediately locks input and shows a large centered countdown: dots build to `3...`, then `2..`, then `1.` over about three seconds. The video mounts only after the countdown finishes; input remains locked across countdown and playback. Backgrounding pauses countdown progress. Existing preview return and back navigation are unchanged.

Validation: typecheck passed. Browser verified the exact `3...` → `2..` → `1.` sequence, input lock at each step, no video before countdown completion, real playback afterward, and preview/back navigation without runtime errors. Native hardware was not tested.

## Countdown-to-video handoff refinement

The countdown no longer dims the screen. Preview labels, header and the bottom guide remain visible beneath the input lock, and the centered digit is about 25% smaller. After the countdown, a 480ms camera dive recenters on Earth and rapidly closes the distance before playback begins. Reduced motion skips that camera motion. The video preloads invisibly while counting down, stays paused until the dive finishes, then fades in over 180ms when ready. The Earth close view stays behind the fade to avoid flashing the wide preview during the handoff.

## Speech countdown and fade transition (supersedes Earth dive)

The countdown now replaces the narration inside the existing bottom rocket speech bubble; no centered numeral or full-screen countdown dimmer is used. On completion, a 350ms black fade covers the unchanged route preview, then the preloaded video fades in over 350ms. The Earth camera dive has been removed. Input remains locked continuously from button press through countdown, transition, and playback. The arrow cue and subsequent preview/back behavior are retained.

Validation: typecheck passed. Browser confirmed the countdown stays inside the bottom speech bubble, the preloaded video stays paused while counting, the fade leads to real playback, and preview/back navigation work without runtime errors. The countdown layout was visually checked; native hardware was not tested.

## Third-person flight after the video

The video now finishes into a followed rocket flight, rather than returning to the route preview. The same sampled mock route drives both the dashed preview and the rocket, including Earth departure loops, the curved transfer and lunar approach. `transfer-route.ts` provides cumulative arc-length sampling; moving by route length avoids speed jumps at boundaries between densely and sparsely sampled sections.

The flight is a 120-second active demo. Time pauses while the app is inactive. Remaining distance is the unflown arc length converted back from half-scale scene coordinates to km (`scene units × 2,000,000`), not a straight-line Earth–Moon distance or a calculated launch opportunity. The HUD samples telemetry at 4Hz and shows remaining time, distance and percentage. On arrival all counters stop at 0:00 / 0 km / 100%; no landing is performed.

Camera yaw/pitch are relative to the moving rocket, with continuous 360-degree orbit and pinch/wheel distance adjustment. The camera follow radius is constrained by Earth/Moon surface clearance to prevent passing through either body. The existing 2D rocket artwork is used as a camera-facing layered card with raised eyes, a shadow layer and a small exhaust effect. Its size stays readable as the follow camera distance changes. Reduced motion disables automatic heading turns, while user camera control remains available.

The standard bottom floating narrator and typewriter bubble stay visible throughout the trip and after arrival. Twenty English cards can be advanced manually, with a page counter. Educational material is paraphrased from [NASA Moon Facts](https://science.nasa.gov/moon/facts/), [NASA Moon Phases](https://science.nasa.gov/moon/moon-phases/) and [NASA Moon Exploration](https://science.nasa.gov/moon/exploration/).

Flight timing uses active wall-clock elapsed time, independent of render frame rate. Camera heading favors an Earth backdrop during parking loops, blends toward the travel direction during cruise, then favors a lunar backdrop during approach; manual orbit offsets remain under user control. A modest flight-only ambient fill keeps body silhouettes readable.

Validation: TypeScript and whitespace checks passed. A pure route check covered cumulative lengths, finite samples, Earth/Moon surface clearance, departure/arrival radii, and km conversion at four lunar directions. Browser E2E played the real video, entered the followed rocket scene, exercised orbit gestures, advanced all 20 fact pages, checked landscape phone bounds, and completed the full demo with 0:00 / 0 km / 100% and a stopped rocket. No page runtime errors. Departure, cruise and arrival frames were inspected. iPhone / Expo Go was not directly tested.

## Flight map and playback controls

The default trip is now 60 active seconds. A compact upper-left route schematic uses the same arc-length sampler and a live cyan location marker. Red Earth/Moon endpoint labels show the selected launch and landing names. Projected red pin/name labels also appear on the corresponding 3D body when their positions are within the usable screen area.

The smaller upper-right HUD has three outlined controls beneath it: speed cycles 0.25× / 0.5× / 1× / 1.5× / 2×, pause/resume freezes route progress, and skip jumps to the lunar endpoint even while paused. ETA accounts for speed; arrival still stops at 0:00 / 0 km / 100% and disables playback controls.

Rocket scale is derived from camera distance and viewport height to stay at approximately 100 screen pixels regardless of zoom. The route now projects into clip-space line segments and uses screen-linear dash distances (8px on / 6px off), so perspective/zoom cannot stretch dash lengths. Depth testing is retained against the planetary geometry. These remain mock route measurements, not a solved lunar trajectory.

Validation: typecheck/whitespace checks passed. A route initialization check confirms the 60-second default. Browser verified live minimap movement, frozen progress when paused, resume, 2× ETA, skip while paused reaching 0 km / 100%, endpoint labels, phone landscape layout, and no runtime/shader compilation errors. Zoom-before/after and lunar arrival frames were visually inspected. Native iPhone / Expo Go remains unverified.

## Flight HUD and zoom-size correction

Rocket world size now uses the nominal follow distance before the user zoom multiplier: zooming in enlarges the rocket and zooming out shrinks it. This supersedes the fixed-pixel rocket behavior. Screen-space dash sizing remains unchanged.

The transfer minimap now contains only its title, white route and yellow current-position dot; red endpoint text/pins and the cyan trail are removed from the minimap. Red geographic labels in the 3D scene remain. The HUD replaces the percentage/progress bar with speed in km/h, derived from mock route length and compressed demo time, multiplied by playback speed. Pause/arrival show 0 km/h. The multiplier appears as a white tag beside velocity only when not 1×; the fast-forward button is icon-only.

Validation: typecheck passed. Browser verified the minimap contains no endpoint labels, its marker is yellow, the multiplier is beside velocity and absent from the speed button, pause/arrival show zero velocity, and resume/skip still work. Zoom screenshots confirm the rocket grows when zooming in. Native hardware remains unverified.

## Four-day mission clock and reference average

The prominent HUD clock now shows `Mission time`, advancing from 0d to 4d with route progress. This is the user-selected four-day mission timeline, compressed into the existing one-minute playback. Travel duration depends on the real mission; four days is a representative demo assumption rather than a universal lunar flight time.

`Avg. speed` is now a constant reference average of about 4,004 km/h: [NASA's mean Earth–Moon separation of 384,400 km](https://spaceplace.nasa.gov/moon-distance/en/) divided by 96 hours. It is not a measured instantaneous rocket velocity, nor a speed calculated from the mock spiral route. Playback speed changes how quickly the visualization runs, not this average value, including while paused or after arrival. The multiplier remains beside average speed.

Small remaining playback time moves to the lower-right of the transfer-map card. The map adds blue Earth and gray Moon endpoint dots with labels beneath them while retaining the yellow current-position dot. 3D site callouts use white bent leaders, white planet names and white pin outlines; only site-name text is NASA RED.

Validation: typecheck passed. Browser verified the fixed 4,004 km/h reference remains unchanged at 2× and while paused, remaining playback time lives in the map, skip ends at 4d / 0 km, and controls still work without runtime errors. The updated landscape layout was visually checked; native hardware remains unverified.
