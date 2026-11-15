# AZAS · Orbital Explorer

A landscape-first Expo / React Native start screen featuring an interactive Three.js Sun, Earth, and Moon.

```sh
npm install
npm start
```

Open the project in Expo Go on a physical iOS or Android device. For a browser preview, run `npm run web` or open the running server at http://localhost:8081.

The lunar explorer loads landing sites from `https://api.azas.n-e.kr/api/v1`. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_BASE_URL` to the full API base URL (including `/api/v1`) before starting Expo or building the web app. The address must be reachable from the device. Do not use the Swagger UI URL as the API base URL. Local env files are ignored; configure the same public variable in Vercel before rebuilding. The backend must allow the web app's origin in CORS (`https://azas-app.vercel.app` for production).

Select a landing site and enter a UTC mission deadline (default `2027-01-31`). The search finds the first touchdown that supports 48 hours of sunlight and Earth visibility. The Earth map and launch list show the launch options calculated for that touchdown.

Choose a launch option and press **Next Stop The Moon** to calculate its preliminary transfer from Earth orbit to lunar arrival. **Start the Journey** plays the launch sequence, then follows the returned trajectory samples. The preview, flight map, distance and speed all use the selected candidate's trajectory.

After landing, drag the panorama to look around or move the timeline to a UTC time. The Sun and Earth positions and terrain visibility come from the selected site's first valid touchdown and cover its surface activity period.

- Drag to orbit around the Sun. The overview is Sun-centered. Pinch or use the mouse wheel to zoom.
- Select Sun, Earth, or Moon to highlight it immediately and fly to it along a continuous curved path with a single camera interpolation and no final catch-up adjustment. The object buttons are ordered Moon, Earth, Sun. Earth ↔ Moon flights widen only to a local Earth–Moon orbit view; other body-to-body flights use a system-wide range. Reset widens from the current body and finishes at the Sun-centered overview. All automatic flights use the fixed Reset View angle, use a low arc, and zoom directly from overview to Sun. They keep drag / pinch / wheel locked until the camera settles. The Sun view gently orbits the camera while its surface does not rotate. Camera tracking follows orbital position independently of body rotation.
- In the system overview, tap the enlarged Earth or Moon to open an Earth-centered view that keeps both enlarged bodies and the Moon’s orbit visible. Tap the Moon in this orbit view to return to the enlarged, phase-changing Moon introduction. Tap Earth from that Moon view to return to the enlarged Earth-centered orbit. Object buttons still open individual close-ups.
- Pause / resume orbital motion, or reset to the overview. The outlined fast-forward button opens 0.25× / 0.5× / 1× / 1.5× / 2× speeds. Current speed appears beside the simulation date. The calendar starts at 2026-11-14 00:00 KST; at 1×, one simulation-loop second represents one day. Earth and Moon orbits share this time source and mean periods from the NASA fact sheets. Pause freezes both date and orbit; speed changes do not restart time. Initial phases are artistic presets, not ephemerides for the displayed date.
- Pause / reset controls are in the upper-right header. Tap the rocket companion in the lower-right corner to make it smile (Open Bot Avatar eye renderer; see `docs/rocket-companion.md`).
- All interface text is in English. Textures are bundled for offline use after the app is loaded.

The app declares landscape orientation and requests a runtime landscape lock. In portrait browser windows or OS windows that override orientation locks, it displays a rotate-device prompt. iOS 27 resizable windows may ignore orientation locks.

Body mean radii and mean orbital distances are converted from km at half scale, using one scene unit per million km. The Sun is about 109 Earth diameters across. The app starts with a separate enlarged Moon introduction, using the same exaggerated body sizes as the overview and the Earth-facing observation direction so its daylight phases change during the accelerated orbit; use the body buttons for close views, and Reset for a system overview. For introduction and overview legibility, body sizes and the Moon’s separation are visually exaggerated. Body-button focus views restore the physical half-scale model; the initial Moon introduction is intentionally enlarged. Circular orbits and accelerated motion are illustrative, not a live ephemeris. Only the Sun illuminates the bodies, with a faint ambient fill on the night side.

Validation: `npm run typecheck`. App source lives under `src/`; project harness instructions are in `AGENTS.md` and `docs/hackathon-harness.md`.

## Collaboration

Follow the organization [contribution guide](https://github.com/NASA-AZAS/.github/blob/main/CONTRIBUTING.md) and [shared PR template](https://github.com/NASA-AZAS/.github/blob/main/pull_request_template.md).

Use branches such as `feat/solar-system` or `fix/native-three-entry`, and commit / PR titles such as `feat: add solar system screen`. Describe API compatibility, environment variables, dependency changes, and actual validation results in PRs. Use the organization PR template without adding a competing local template.
