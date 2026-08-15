# Golden Shadow — Final Integrated Build

This build uses the more complete `golden-shadow-updated` project as the runtime base and integrates the useful concepts from the incomplete `HUSSEIN_FULL_GAME` package instead of replacing the working architecture with its incompatible ES-module stubs.

## Included improvements

- Advanced third-person / ADS aiming:
  - shoulder offset while aiming
  - tighter ADS camera and FOV
  - camera collision against city buildings
  - existing hitscan, recoil, reload, weapon spread and muzzle/tracer effects retained
- Improved driving:
  - smoothed steering
  - speed-sensitive handling
  - visual front-wheel steering
  - suspension roll/pitch
  - handbrake lateral slip / drift behavior
  - traffic lane and queue logic retained
- Advanced enemy AI:
  - line-of-sight checks
  - hard-cover selection using city colliders
  - seek-cover / hold-cover states
  - peek-and-fire behavior
  - tactical retreat after taking damage
- Existing systems retained:
  - missions and mission data
  - police / wanted system
  - NPC pedestrians
  - interiors
  - minimap/HUD
  - save/settings
  - Arabic/English UI
  - mobile touch controls
  - Three.js bundled locally

## Run

Serve this folder from a local web server. Do not open `index.html` directly with `file://`, because browser security restrictions can interfere with the game runtime.

Example:

```bash
python -m http.server 8080
```

Then open:

`http://localhost:8080/`

## Controls

- WASD / Arrow keys: movement / driving
- Mouse: camera
- Right mouse: ADS / aim
- Left mouse: fire
- Shift: sprint
- Space: jump on foot / handbrake-brake in vehicle
- R: reload
- 1/2/3: weapon selection
- E: interact / enter / exit vehicle
- B: bribe police
- Esc: pause

The build was syntax-checked across all JavaScript files after integration.
