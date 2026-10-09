# A World Waiting For You

A small interactive universe built by Yesu for a future chapter that is intentionally unwritten.

This is a React + TypeScript + Vite + Three.js / React Three Fiber project. The experience uses game-like exploration, collectible discoveries, small puzzles and a locked final chapter instead of a conventional romantic landing page.

## Run

npm install
npm run dev

Open the local Vite URL shown by the terminal.

## Interaction

Desktop
- WASD / arrow keys — move the player
- Mouse — shift the camera view
- Click glowing objects — discover them
- / — terminal
- Esc — close an overlay

Mobile
- Left thumb joystick — movement
- Drag the scene — look around
- Interact button — contextual hint
- Touch-first drawer and story cards

## Systems

- 3D night world with moon, trees, water, path, lanterns, landmarks and technology orbs
- Persistent localStorage save state
- Heart collectibles
- Chapter progression
- Locked future chapter after three discoveries
- Heart Catcher mini-game
- Constellation mini-game
- The Choice mini-game
- Hidden developer terminal
- Optional Web Audio interaction chimes
- Reduced-motion setting
- Mobile performance mode

## Content philosophy

The story deliberately does not invent a future partner’s identity, personality, memories or feelings. The final chapter stays empty because it is supposed to be unknown.

> I can build the world around the future. I cannot write the future for someone I have not met.

## Project shape

src/
├── App.tsx
├── data.ts
├── main.tsx
├── components/
│   └── TouchControls.tsx
├── lib/
│   ├── sound.ts
│   └── storage.ts
└── three/
    └── World.tsx

The rendering layer and story/state data are separated so the experience can keep evolving without turning the scene into one giant component.

## Status

Experimental / personal project

Built to be explored, replayed and gradually expanded.

## Runtime engine

The simulation core lives in `src/three/atlas_engine.cpp` and is compiled to WebAssembly with `-O3` by `.github/workflows/build-atlas-engine.yml`. The generated asset is served from `public/engine/atlas-engine.wasm`.

The native frame step owns movement smoothing, collision checks, progression gates, jumping/gravity, turning, region lookup and nearest-interactable selection. The engine uses a persistent linear-memory state buffer; the TypeScript bridge writes into it and reads results in place, avoiding a result-object allocation per frame. The current native math path is self-contained rather than importing JavaScript `Math` callbacks on every frame. The engine includes a short jump buffer and coyote-time window; the JavaScript fallback mirrors that forgiving input behavior.

The scene uses instanced meshes for repeated blossom-tree parts, garden flowers and butterflies. Fireflies are batched into one colored point field that drifts across the route. The avatar, ambience and mobile touch controls respect the reduced-motion and overlay-lock states.

React and Three.js still own rendering, camera control, interactions, save data, puzzles and story/UI state. The C++ engine is deliberately a simulation core rather than a replacement for WebGL. FPS improvement must be measured on the target device; compilation with `-O3` alone is not a benchmark.
