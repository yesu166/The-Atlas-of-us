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