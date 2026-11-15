# Rocket companion

The rocket body is the user-provided sticker (`assets/rocket-neon-dark.png`).
Its eye geometry and happy expression come from the DOM-free
`avatarFrame` API from [Open Bot Avatar](https://github.com/DominikScholz/open-bot-avatar),
version 0.2.1, using `react-native-svg` for Expo's native and web targets.
The body paths returned by the package are intentionally omitted so the original
rocket sticker stays visible. The body is scaled to 90% inside its 160pt touch area; eye size is unchanged and its position follows the resized window. The rocket uses the supplied diagonal artwork as-is, with no additional resting rotation, and floats as one body with its eyes. Tap for a happy expression with a whole-body hop and side-to-side shake. Static idle/happy eye frames are blended with Reanimated opacity; native transforms handle gaze and blinking. No 50ms React rerender timer is used. Reanimated and Worklets versions follow Expo SDK 58. Actual device FPS has not been measured.
Background animation stops while the app is inactive and respects reduced motion.

Open Bot Avatar is Copyright (c) 2026 Dominik Scholz, MIT licensed.
See [the included license](licenses/open-bot-avatar-MIT.txt).

## Worklets transform cache

Expo SDK 58 pins Worklets 0.13.0 and Reanimated 4.7.1. If Metro was running while
these packages changed, restart it with a cleared cache (`npm start -- --clear`).
The Metro cache namespace includes both installed versions to prevent stale
plugin output being reused across version changes. Fully close and reopen the
Expo Go app after restarting Metro. A custom development build must also contain
the matching native dependencies.

## Launch sequence

Clicking starts the existing smile/body reaction and two exclamation pops, then launches only after the smile sequence completes. The near rocket exits rapidly to the upper right in210ms with cubic acceleration; LAUNCH fades away. Repeat presses are disabled during the sequence. Once departed, the root solar-system screen keeps its gone state across focus/menu changes until the app/screen is remounted; it does not automatically return.

A separate screen-space overlay starts500ms after departure and crosses from the lower middle toward the upper-right edge in280ms. It uses the same rocket image at16px (one tenth of the160px mascot), plus a thin35px white trail aligned to its travel direction. Reduced-motion users get the near fade instead of travel, and no distant high-speed pass. Unmount cancels the overlay animation.

Browser check: smile/! visible first, near departure completed, far overlay appeared about535ms later, mascot stayed absent after switching body, and no runtime errors. Typecheck passed; native flight timing/feel is unverified. Evidence: evidence/rocket-distant-pass.png.

## Slender orbit pass

Both visible flight stretches now use a shared tilted slender ellipse model. The outgoing rocket follows the near segment; the far pass follows the opposite long flank with its offscreen turn omitted. Far pass enters from right around27.5% screen height and exits below near51% screen width. Curvature is deliberately shallow, not a rounded corner. Far duration is180ms (previous280ms), with the1second after-departure delay unchanged. Rocket and trail face the local path tangent. Geometry assertion confirmed right entry/bottom exit, monotonic left/down motion and deviation from the straight chord below3% of chord length. Typecheck passed; final native/visual pass feel unverified.

## Launch handoff and input lock

Root screen now locks pointer input and orbit/zoom responders as soon as the mascot is pressed. HUD controls are disabled through the smile, near flight,1second gap and far pass. Far animation completion calls the same explorer entry as Menu, then releases the launch lock; normal camera-flight controls handle the subsequent Moon transition. Reduced-motion users skip the far movement but still complete the handoff. Reaction animation cleanup no longer cancels its completion chain just because AppState changes; unmount still cancels it.

Browser check confirmed Menu/Earth disabled after press, lock still present during the far pass, then lock removed and Moon candidate explorer opened without runtime errors. Typecheck passed; actual iPhone interaction unverified.
