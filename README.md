# AZAS · Orbital Explorer

A landscape-first Expo / React Native start screen featuring an interactive Three.js Sun, Earth, and Moon.

```sh
npm install
npm start
```

Open the project in Expo Go on a physical iOS or Android device. For a browser preview, run `npm run web` or open the running server at http://localhost:8081.

- Drag to orbit around the Sun. The overview is Sun-centered. Pinch or use the mouse wheel to zoom.
- Select Sun, Earth, or Moon to zoom in and track that body. Switching bodies first zooms out while tracking the current body, then shifts to the new body at wide distance and zooms in around it, using the reset viewing angle. The zoom-out leg does not recenter on the Sun. The Sun view gently orbits the camera; its surface does not rotate. Camera tracking follows orbital position independently of body rotation. Drag, pinch, and wheel input stay locked across the complete automatic transition, including the intermediate wide-view stage, and unlock after the destination camera settles. Reset zooms out from the current body and viewing angle.
- Pause / resume orbital motion, or reset to the overview.
- All interface text is in English. Textures are bundled for offline use after the app is loaded.

The app declares landscape orientation and requests a runtime landscape lock. In portrait browser windows or OS windows that override orientation locks, it displays a rotate-device prompt. iOS 27 resizable windows may ignore orientation locks.

Body mean radii and mean orbital distances are converted from km at half scale, using one scene unit per million km. The Sun is about 109 Earth diameters across. The app starts in the wide system overview; use the body buttons for close views, and Reset for a system overview. For overview legibility only, body sizes and the Moon’s separation are visually exaggerated. Focused views restore the physical half-scale model. Circular orbits and accelerated motion are illustrative, not a live ephemeris. Only the Sun illuminates the bodies, with a faint ambient fill on the night side.

Validation: `npm run typecheck`. App source lives under `src/`; project harness instructions are in `AGENTS.md` and `docs/hackathon-harness.md`.

## Collaboration

Follow the organization [contribution guide](https://github.com/NASA-AZAS/.github/blob/main/CONTRIBUTING.md) and [shared PR template](https://github.com/NASA-AZAS/.github/blob/main/pull_request_template.md).

Use branches such as `feat/solar-system` or `fix/native-three-entry`, and commit / PR titles such as `feat: add solar system screen`. Describe API compatibility, environment variables, dependency changes, and actual validation results in PRs. Use the organization PR template without adding a competing local template.
