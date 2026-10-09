import { ATLAS_ENGINE_WASM_BASE64 } from "./atlas-engine-wasm";

export type AtlasEngineInput = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  verticalVelocity: number;
  grounded: boolean;
  playerYaw: number;
  inputX: number;
  inputY: number;
  cameraYaw: number;
  delta: number;
  maxSpeed: number;
  controlsLocked: boolean;
  minZ: number;
  jumpPressed: boolean;
  elapsedTime: number;
};

export type AtlasEngineResult = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  verticalVelocity: number;
  grounded: boolean;
  yaw: number;
  moving: boolean;
  jumping: boolean;
  speed: number;
};

export type AtlasEngine = {
  step: (input: AtlasEngineInput) => AtlasEngineResult;
};

type AtlasWasmExports = {
  memory: WebAssembly.Memory;
  atlas_buffer: () => number;
  atlas_step: (pointer: number) => void;
};

const wasmImports = {
  env: {
    sinf: Math.sin,
    cosf: Math.cos,
    sqrtf: Math.sqrt,
    expf: Math.exp,
    atan2f: Math.atan2,
    fabsf: Math.abs,
  },
};

export async function loadAtlasEngine(): Promise<AtlasEngine> {
  const binary = Uint8Array.from(atob(ATLAS_ENGINE_WASM_BASE64), (char) => char.charCodeAt(0));
  const { instance } = await WebAssembly.instantiate(binary, wasmImports);
  const wasm = instance.exports as unknown as AtlasWasmExports;
  const pointer = wasm.atlas_buffer();
  const state = new Float32Array(wasm.memory.buffer, pointer, 32);

  return {
    step(input) {
      state[0] = input.x;
      state[1] = input.y;
      state[2] = input.z;
      state[3] = input.vx;
      state[4] = input.vz;
      state[5] = input.verticalVelocity;
      state[6] = input.grounded ? 1 : 0;
      state[7] = input.playerYaw;
      state[8] = input.inputX;
      state[9] = input.inputY;
      state[10] = input.cameraYaw;
      state[11] = input.delta;
      state[12] = input.maxSpeed;
      state[13] = input.controlsLocked ? 1 : 0;
      state[14] = input.minZ;
      state[15] = input.jumpPressed ? 1 : 0;
      state[16] = input.elapsedTime;

      wasm.atlas_step(pointer);

      return {
        x: state[0],
        y: state[1],
        z: state[2],
        vx: state[3],
        vz: state[4],
        verticalVelocity: state[5],
        grounded: state[6] > 0.5,
        yaw: state[7],
        moving: state[18] > 0.5,
        jumping: state[19] > 0.5,
        speed: state[20],
      };
    },
  };
}
