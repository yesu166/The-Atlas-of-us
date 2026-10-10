export type AtlasEngineInput = {
  x: number; y: number; z: number;
  vx: number; vz: number; verticalVelocity: number;
  grounded: boolean; playerYaw: number;
  inputX: number; inputY: number; cameraYaw: number;
  delta: number; maxSpeed: number; controlsLocked: boolean;
  jumpPressed: boolean; elapsedTime: number;
};
export type AtlasEngineResult = {
  x: number; y: number; z: number; vx: number; vz: number;
  verticalVelocity: number; grounded: boolean; yaw: number;
  moving: boolean; jumping: boolean; speed: number; region: number; nearbyIndex: number;
};
export type AtlasEngineInteractable = {
  position: [number, number, number];
  radius: number;
  region: number;
};
export type AtlasEngine = {
  /** Persistent native state buffer. Read directly after step() to avoid per-frame result allocations. */
  state: Float32Array;
  step: (input: AtlasEngineInput) => void;
};
type AtlasWasmExports = {
  memory: WebAssembly.Memory;
  atlas_buffer: () => number;
  atlas_step: (pointer: number) => void;
  atlas_interactable_buffer: () => number;
  atlas_interactable_capacity: () => number;
  atlas_set_interactable_count: (count: number) => void;
  atlas_find_nearest: (x: number, y: number, z: number, region: number) => number;
};
const wasmImports = {
  env: {
    sinf: Math.sin, cosf: Math.cos, sqrtf: Math.sqrt,
    expf: Math.exp, atan2f: Math.atan2, fabsf: Math.abs,
  },
};

export async function loadAtlasEngine(items: AtlasEngineInteractable[]): Promise<AtlasEngine> {
  // CI builds this asset from atlas_engine.cpp. If it is unavailable, World.tsx
  // retains the JS fallback instead of blocking the game.
  const response = await fetch("/engine/atlas-engine.wasm", { cache: "force-cache" });
  if (!response.ok) throw new Error(`C++ engine unavailable (${response.status})`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), wasmImports);
  const wasm = instance.exports as unknown as AtlasWasmExports;
  const pointer = wasm.atlas_buffer();
  const state = new Float32Array(wasm.memory.buffer, pointer, 32);

  const capacity = wasm.atlas_interactable_capacity();
  if (items.length > capacity) throw new Error(`Too many interactables: ${items.length}/${capacity}`);
  const interactionData = new Float32Array(
    wasm.memory.buffer,
    wasm.atlas_interactable_buffer(),
    capacity * 5,
  );
  items.forEach((item, index) => {
    const offset = index * 5;
    interactionData[offset] = item.position[0];
    interactionData[offset + 1] = item.position[1];
    interactionData[offset + 2] = item.position[2];
    interactionData[offset + 3] = item.radius;
    interactionData[offset + 4] = item.region;
  });
  wasm.atlas_set_interactable_count(items.length);

  return {
    state,
    step(input) {
      state[0] = input.x; state[1] = input.y; state[2] = input.z;
      state[3] = input.vx; state[4] = input.vz; state[5] = input.verticalVelocity;
      state[6] = input.grounded ? 1 : 0; state[7] = input.playerYaw;
      state[8] = input.inputX; state[9] = input.inputY; state[10] = input.cameraYaw;
      state[11] = input.delta; state[12] = input.maxSpeed;
      state[13] = input.controlsLocked ? 1 : 0; state[14] = 0;
      state[15] = input.jumpPressed ? 1 : 0; state[16] = input.elapsedTime;
      // Slots 23 and 24 persist natively as the jump buffer/coyote timers.
      wasm.atlas_step(pointer);
    },
  };
}
