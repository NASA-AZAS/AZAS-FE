# AZAS startup

Startup branding uses the user's full NASA Space Apps Color and White SVG on the left, a thin separator, and the existing mascot portrait above AZAS on the right. The landscape overlay covers the initial scene with a star background and loading indicator; normal HUD/inputs remain hidden until arrival.

Readiness gates: local map/crop/minimap/panorama files are cached with expo-asset (not decoded together), icon fonts load, the startup layout is present, and the main scene textures plus two warm rendering frames have completed. A900ms minimum ensures branding is perceptible on a fast device; it never bypasses readiness. Errors retain the splash with feedback. Later panorama GPU textures are created only when that site is opened, not all predecoded on startup.

The single existing solar-system Canvas starts at overview distance×5, the same maximum overview zoom-out scale. After readiness, branding fades in220ms while a1.15second log-distance camera flight moves from the Sun-centered distant overview to the original enlarged intro Moon. Physics/calendar progression is paused through this startup stage. Input remains blocked until flight completion. No second 3D scene is mounted for splash.

expo-splash-screen prevents early native auto-hide until the React root is laid out. Its native plugin uses assets/startup-brand.png over #03070d; that PNG is rendered from the same code layout. OS-native splash configuration requires a new development/production build; Expo Go previews the in-app startup sequence but does not reproduce the standalone app's OS splash artwork.

Browser test delayed an Earth texture request: splash remained and Menu stayed hidden until released, then the Moon intro/HUD appeared without runtime errors. Typecheck passed. Images: evidence/startup-splash.png and evidence/startup-moon.png. Actual iPhone launch visuals/timing unverified.

iOS bundle export also passed with the splash-screen dependency/plugin and all startup assets.

Updated: mascot/AZAS on the left, separator, NASA full logo on the right. Minimum branding duration is1.5seconds (readiness still required). Intro flight is2.8seconds using quintic smoothstep for a gradual start/end, matching existing camera-transition easing. Native brand PNG regenerated from the updated layout; typecheck and browser arrival passed.

Brand-first correction: startup now renders the precomposed local brand image instead of separately loading SVG/mascot layers. Native splash is hidden only after this image's onLoad, not initial layout. The1.5second minimum begins when the branding image is actually ready, and scene/assets readiness are still required. This removes the late logo insertion during the startup reveal. OS artwork in Expo Go remains controlled by Expo Go; standalone native artwork requires rebuilding.
