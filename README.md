# AZAS · Orbital Explorer

A landscape-first Expo / React Native start screen featuring an interactive Three.js Sun, Earth, and Moon.

```sh
npm install
npm start
```

Open the project in Expo Go on a physical iOS or Android device. For a browser preview, run `npm run web` or open the running server at http://localhost:8081.

- Drag to orbit around the Sun. The overview is Sun-centered. Pinch or use the mouse wheel to zoom.
- Select Sun, Earth, or Moon to highlight it immediately and fly to it along a continuous curved path with a single camera interpolation and no final catch-up adjustment. The object buttons are ordered Moon, Earth, Sun. Earth ↔ Moon flights widen only to a local Earth–Moon orbit view; other body-to-body flights use a system-wide range. Reset widens from the current body and finishes at the Sun-centered overview. All automatic flights use the fixed Reset View angle, use a low arc, and zoom directly from overview to Sun. They keep drag / pinch / wheel locked until the camera settles. The Sun view gently orbits the camera while its surface does not rotate. Camera tracking follows orbital position independently of body rotation.
- In the system overview, tap the enlarged Earth or Moon to open an Earth-centered view that keeps both enlarged bodies and the Moon’s orbit visible. Tap the Moon in this orbit view to return to the enlarged, phase-changing Moon introduction. Object buttons still open individual close-ups.
- Pause / resume orbital motion, or reset to the overview.
- All interface text is in English. Textures are bundled for offline use after the app is loaded.

The app declares landscape orientation and requests a runtime landscape lock. In portrait browser windows or OS windows that override orientation locks, it displays a rotate-device prompt. iOS 27 resizable windows may ignore orientation locks.

Body mean radii and mean orbital distances are converted from km at half scale, using one scene unit per million km. The Sun is about 109 Earth diameters across. The app starts with a separate enlarged Moon introduction, using the same exaggerated body sizes as the overview and the Earth-facing observation direction so its daylight phases change during the accelerated orbit; use the body buttons for close views, and Reset for a system overview. For introduction and overview legibility, body sizes and the Moon’s separation are visually exaggerated. Body-button focus views restore the physical half-scale model; the initial Moon introduction is intentionally enlarged. Circular orbits and accelerated motion are illustrative, not a live ephemeris. Only the Sun illuminates the bodies, with a faint ambient fill on the night side.

Validation: `npm run typecheck`. App source lives under `src/`; project harness instructions are in `AGENTS.md` and `docs/hackathon-harness.md`.

## Collaboration

Follow the organization [contribution guide](https://github.com/NASA-AZAS/.github/blob/main/CONTRIBUTING.md) and [shared PR template](https://github.com/NASA-AZAS/.github/blob/main/pull_request_template.md).

Use branches such as `feat/solar-system` or `fix/native-three-entry`, and commit / PR titles such as `feat: add solar system screen`. Describe API compatibility, environment variables, dependency changes, and actual validation results in PRs. Use the organization PR template without adding a competing local template.
