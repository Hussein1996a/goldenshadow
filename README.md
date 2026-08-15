# Golden Shadow — GitHub Pages Edition

A browser-based 3D open-world action prototype built with Three.js.

## GitHub Pages

Upload the **contents of this folder** to the root of a GitHub repository (the `index.html` file must be in the repository root), then enable:

**Settings → Pages → Deploy from a branch → `main` → `/ (root)`**

No Node.js, PHP, database, or local server is required for GitHub Pages.

## Local test

```bash
python -m http.server 8080
```

Open `http://localhost:8080/`.

## Controls

- WASD — movement / driving
- Mouse — camera / aim
- Left mouse — fire
- Right mouse — aim / ADS
- R — reload
- E — interact / enter vehicle
- Space — jump / handbrake depending on context
- B — police bribe
- Esc — pause

## Build notes

This edition includes a high-fidelity renderer configuration, cinematic UI treatment, responsive HUD, adaptive pixel ratio, ACES tone mapping where supported, soft shadows, and GitHub Pages-ready relative paths.
