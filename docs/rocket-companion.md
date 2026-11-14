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
