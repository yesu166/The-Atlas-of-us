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

- A wide, dreamy dusk meadow with a readable third-person traveller, rolling terrain, flower fields, moonlit water, lanterns and distant landmarks
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

The custom C++ simulation lives in `src/three/atlas_engine.cpp` and is compiled to WebAssembly by `.github/workflows/build-atlas-engine.yml`. The generated asset is served from `public/engine/atlas-engine.wasm`.

The C++ simulation owns movement smoothing, collision checks, jump buffering and gravity, turn smoothing, region lookup, and nearest-interactable selection. It exchanges state through a versioned ABI and persistent linear-memory buffers. Before gameplay uses the Wasm module, the TypeScript bridge validates required exports, the ABI version, and the state pointer. The native path avoids allocating a result object every frame. A JavaScript fallback is retained only as a recovery path if the shipped Wasm asset is unavailable or fails validation.

Three.js/WebGL still handles drawing, materials, cameras, scene composition, UI, save data, puzzles, and story interactions. Replacing the renderer itself with C++ would be a separate engineering project requiring a graphics pipeline and browser WebGL bindings; changing the movement implementation alone does not make a browser renderer native C++.

Repeated grass, tree parts, flowers, butterflies, and particles use instancing or batched point geometry to keep draw calls controlled. The engine workflow compiles with `-O3` and smoke-tests exports, movement, region queries, collision, proximity lookup, and jump buffering. Build success is not proof of visual correctness or frame rate: the avatar framing and low-end mobile performance still need a real browser playtest.
