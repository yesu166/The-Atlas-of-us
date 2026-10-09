type RegionTone = "garden" | "workshop" | "city" | "lake" | "mountain" | "house" | "final";
export type { RegionTone };
type SurfaceType = "grass" | "stone" | "metal" | "wood" | "water" | "snow" | "floor";

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let ambience: GainNode | undefined;
let music: GainNode | undefined;
let musicOscA: OscillatorNode | undefined;
let musicOscB: OscillatorNode | undefined;
let enabled = false;
let currentRegion: RegionTone = "garden";
let musicProgression = 0;
const worldStateFlags: Record<string, boolean> = {};

function get(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

function ensure(): void {
  const c = get();
  if (c.state === "suspended") void c.resume();
  if (master) return;
  master = c.createGain();
  master.gain.value = 0.7;
  master.connect(c.destination);
}

const regionTones: Record<RegionTone, [number, number]> = {
  garden: [196, 293.66],
  workshop: [146.83, 220],
  city: [164.81, 246.94],
  lake: [130.81, 196],
  mountain: [110, 164.81],
  house: [174.61, 261.63],
  final: [220, 329.63],
};

const surfaceFootsteps: Record<SurfaceType, { freq: number; duration: number; type: OscillatorType }> = {
  grass: { freq: 180, duration: 0.08, type: "sine" },
  stone: { freq: 220, duration: 0.06, type: "triangle" },
  metal: { freq: 350, duration: 0.05, type: "square" },
  wood: { freq: 160, duration: 0.07, type: "sine" },
  water: { freq: 120, duration: 0.12, type: "sine" },
  snow: { freq: 100, duration: 0.15, type: "sine" },
  floor: { freq: 200, duration: 0.06, type: "triangle" },
};

function ramp(node: AudioParam, value: number, time: number): void {
  const c = get();
  node.cancelScheduledValues(c.currentTime);
  node.linearRampToValueAtTime(value, c.currentTime + time);
}

function startAmbience(region: RegionTone): void {
  if (!enabled) return;
  ensure();
  const c = get();
  if (!master) return;
  if (!ambience) {
    ambience = c.createGain();
    ambience.gain.value = 0.0001;
    ambience.connect(master);
  }
  const [a, b] = regionTones[region];
  if (!musicOscA || !musicOscB) {
    musicOscA = c.createOscillator();
    musicOscB = c.createOscillator();
    musicOscA.type = "sine";
    musicOscB.type = "triangle";
    musicOscA.connect(ambience);
    musicOscB.connect(ambience);
    musicOscA.start();
    musicOscB.start();
  }
  musicOscA.frequency.setTargetAtTime(a, c.currentTime, 0.8);
  musicOscB.frequency.setTargetAtTime(b, c.currentTime, 1.1);
  ramp(ambience.gain, 0.018, 1.2);
}

function stopAmbience(): void {
  if (!ambience) return;
  ramp(ambience.gain, 0.0001, 0.6);
}

function playFootstep(surface: SurfaceType): void {
  if (!enabled) return;
  try {
    ensure();
    const c = get();
    if (!master) return;

    const o = c.createOscillator();
    const g = c.createGain();
    const { freq, duration, type } = surfaceFootsteps[surface];
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + duration);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + duration);
  } catch {}
}

function playDiscovery(frequency = 660): void {
  if (!enabled) return;
  try {
    ensure();
    const c = get();
    if (!master) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(frequency, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(frequency * 1.5, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.38);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + 0.4);
  } catch {}
}

function playPuzzleComplete(): void {
  if (!enabled) return;
  try {
    ensure();
    const c = get();
    if (!master) return;
    const masterNode = master;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, c.currentTime + i * 0.1);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.04, c.currentTime + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.1 + 0.3);
      o.connect(g);
      g.connect(masterNode);
      o.start();
      o.stop(c.currentTime + i * 0.1 + 0.4);
    });
  } catch {}
}

function playQuestComplete(): void {
  if (!enabled) return;
  try {
    ensure();
    const c = get();
    if (!master) return;
    const masterNode = master;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, c.currentTime + i * 0.15);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + i * 0.15 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.15 + 0.5);
      o.connect(g);
      g.connect(masterNode);
      o.start();
      o.stop(c.currentTime + i * 0.15 + 0.6);
    });
  } catch {}
}

function playCinematicStart(): void {
  if (!enabled) return;
  try {
    ensure();
    const c = get();
    if (!master) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(110, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, c.currentTime + 1.5);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + 2);
  } catch {}
}

function setMusicProgression(stage: number): void {
  musicProgression = Math.max(0, Math.min(6, stage));
}

function onWorldStateChange(key: string, value: boolean): void {
  worldStateFlags[key] = value;
}

export const audioManager = {
  async initialize(): Promise<void> {
    await get().audioWorklet?.addModule?.("data:application/javascript,");
    ensure();
  },

  setEnabled(value: boolean): void {
    enabled = value;
    if (enabled) {
      ensure();
      startAmbience(currentRegion);
    } else {
      stopAmbience();
    }
  },

  setRegionAmbience(region: RegionTone): void {
    currentRegion = region;
    if (enabled) startAmbience(region);
  },

  setRegion(region: RegionTone): void {
    currentRegion = region;
    if (enabled) startAmbience(region);
  },

  setMusicProgression,

  onWorldStateChange,

  playFootstep,

  playDiscovery,

  playPuzzleComplete,

  playQuestComplete,

  playCinematicStart,

  stop(): void {
    stopAmbience();
  },

  update(dt: number): void {
  },
};

export function chime(enabledFlag: boolean, frequency = 640): void {
  if (enabledFlag) audioManager.playDiscovery(frequency);
}