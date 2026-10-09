import * as THREE from "three";

export type QualityLevel = "high" | "medium" | "low" | "lowest";

export interface PerformanceConfig {
  targetFPS: number;
  minFPS: number;
  maxFPS: number;
  sampleSize: number;
  adaptInterval: number;
  hysteresisFrames: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  minFPS: 45,
  maxFPS: 60,
  sampleSize: 120,
  adaptInterval: 2000,
  hysteresisFrames: 60,
};

export interface QualitySettings {
  dpr: { min: number; max: number };
  particleMultiplier: number;
  shadowEnabled: boolean;
  postProcessingEnabled: boolean;
  farDetailEnabled: boolean;
  waterQuality: "high" | "medium" | "low" | "off";
  vegetationDensity: number;
  atmosphereEnabled: boolean;
  maxLights: number;
  maxTransparentObjects: number;
  animationQuality: "full" | "reduced" | "minimal";
}

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  high: {
    dpr: { min: 1, max: 1.5 },
    particleMultiplier: 1.0,
    shadowEnabled: true,
    postProcessingEnabled: true,
    farDetailEnabled: true,
    waterQuality: "high",
    vegetationDensity: 1.0,
    atmosphereEnabled: true,
    maxLights: 8,
    maxTransparentObjects: 50,
    animationQuality: "full",
  },
  medium: {
    dpr: { min: 1, max: 1.2 },
    particleMultiplier: 0.6,
    shadowEnabled: true,
    postProcessingEnabled: false,
    farDetailEnabled: true,
    waterQuality: "medium",
    vegetationDensity: 0.7,
    atmosphereEnabled: true,
    maxLights: 5,
    maxTransparentObjects: 30,
    animationQuality: "reduced",
  },
  low: {
    dpr: { min: 1, max: 1.0 },
    particleMultiplier: 0.3,
    shadowEnabled: false,
    postProcessingEnabled: false,
    farDetailEnabled: false,
    waterQuality: "low",
    vegetationDensity: 0.5,
    atmosphereEnabled: false,
    maxLights: 3,
    maxTransparentObjects: 15,
    animationQuality: "reduced",
  },
  lowest: {
    dpr: { min: 1, max: 1.0 },
    particleMultiplier: 0.15,
    shadowEnabled: false,
    postProcessingEnabled: false,
    farDetailEnabled: false,
    waterQuality: "off",
    vegetationDensity: 0.25,
    atmosphereEnabled: false,
    maxLights: 2,
    maxTransparentObjects: 8,
    animationQuality: "minimal",
  },
};

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  usedTextureMemory: number;
  gpuMemory: number;
}

export class PerformanceManager {
  private config: PerformanceConfig;
  private currentQuality: QualityLevel = "high";
  private targetQuality: QualityLevel = "high";

  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;
  private avgFrameTime = 16.67;

  private adaptTimer = 0;
  private lowPerfFrames = 0;
  private highPerfFrames = 0;
  private qualityChangeCallbacks: Set<(quality: QualityLevel, settings: QualitySettings) => void> = new Set();

  private isMobile = false;
  private isLowEnd = false;
  private gpuTier: "high" | "medium" | "low" | "unknown" = "unknown";

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.detectDevice();
    this.setInitialQuality();
  }

  private detectDevice(): void {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobileTouch = !!(navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
    this.isMobile = isMobileUA || isMobileTouch;

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (coarsePointer && !this.isMobile) this.isMobile = true;

    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 4) this.isLowEnd = true;

    const memory = (navigator as any).deviceMemory;
    if (memory && memory <= 4) this.isLowEnd = true;

    const pixelCount = window.screen.width * window.screen.height * (window.devicePixelRatio || 1);
    if (pixelCount > 3000000) this.isLowEnd = true;
  }

  private setInitialQuality(): void {
    if (this.isMobile) {
      if (this.isLowEnd) {
        this.currentQuality = "low";
        this.targetQuality = "low";
      } else {
        this.currentQuality = "medium";
        this.targetQuality = "medium";
      }
    } else if (this.isLowEnd) {
      this.currentQuality = "medium";
      this.targetQuality = "medium";
    } else {
      this.currentQuality = "high";
      this.targetQuality = "high";
    }
  }

  setRenderer(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    this.renderer = renderer;
    this.scene = scene;
    this.applyQuality(this.currentQuality);
  }

  getQuality(): QualityLevel {
    return this.currentQuality;
  }

  getSettings(): QualitySettings {
    return QUALITY_PRESETS[this.currentQuality];
  }

  isMobileDevice(): boolean {
    return this.isMobile;
  }

  isLowEndDevice(): boolean {
    return this.isLowEnd;
  }

  beginFrame(): void {
    this.lastFrameTime = performance.now();
  }

  endFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.config.sampleSize) {
      this.frameTimes.shift();
    }

    this.frameCount++;
    this.avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = 1000 / this.avgFrameTime;
  }

  update(dt: number): void {
    this.adaptTimer += dt * 1000;

    if (this.adaptTimer >= this.config.adaptInterval) {
      this.adaptTimer = 0;
      this.evaluatePerformance();
    }
  }

  private evaluatePerformance(): void {
    const fps = this.fps;

    if (fps < this.config.minFPS) {
      this.lowPerfFrames++;
      this.highPerfFrames = 0;
    } else if (fps > this.config.maxFPS * 0.95) {
      this.highPerfFrames++;
      this.lowPerfFrames = 0;
    } else {
      this.lowPerfFrames = 0;
      this.highPerfFrames = 0;
    }

    const framesPerInterval = this.config.adaptInterval / 16.67;
    const hysteresisFrames = this.config.hysteresisFrames / framesPerInterval;

    if (this.lowPerfFrames >= hysteresisFrames) {
      this.downgradeQuality();
      this.lowPerfFrames = 0;
    }

    if (this.highPerfFrames >= hysteresisFrames * 2) {
      this.upgradeQuality();
      this.highPerfFrames = 0;
    }
  }

  private downgradeQuality(): void {
    const levels: QualityLevel[] = ["high", "medium", "low", "lowest"];
    const currentIndex = levels.indexOf(this.currentQuality);
    if (currentIndex < levels.length - 1) {
      this.targetQuality = levels[currentIndex + 1];
      this.applyQuality(this.targetQuality);
      console.log(`[PerformanceManager] Downgraded to ${this.targetQuality} (FPS: ${this.fps.toFixed(1)})`);
    }
  }

  private upgradeQuality(): void {
    const levels: QualityLevel[] = ["high", "medium", "low", "lowest"];
    const currentIndex = levels.indexOf(this.currentQuality);
    if (currentIndex > 0) {
      this.targetQuality = levels[currentIndex - 1];
      this.applyQuality(this.targetQuality);
      console.log(`[PerformanceManager] Upgraded to ${this.targetQuality} (FPS: ${this.fps.toFixed(1)})`);
    }
  }

  private applyQuality(quality: QualityLevel): void {
    if (this.currentQuality === quality) return;

    const prevQuality = this.currentQuality;
    this.currentQuality = quality;
    const settings = QUALITY_PRESETS[quality];

    if (this.renderer) {
      const dpr = Math.min(settings.dpr.max, Math.max(settings.dpr.min, window.devicePixelRatio || 1));
      this.renderer.setPixelRatio(dpr);
    }

    this.qualityChangeCallbacks.forEach((cb) => cb(quality, settings));

    console.log(`[PerformanceManager] Quality changed: ${prevQuality} -> ${quality}`, settings);
  }

  onQualityChange(callback: (quality: QualityLevel, settings: QualitySettings) => void): () => void {
    this.qualityChangeCallbacks.add(callback);
    return () => this.qualityChangeCallbacks.delete(callback);
  }

  forceQuality(quality: QualityLevel): void {
    this.targetQuality = quality;
    this.applyQuality(quality);
  }

  getMetrics(): PerformanceMetrics {
    const info = this.renderer?.info || {
      render: { calls: 0, triangles: 0, points: 0, lines: 0 },
      memory: { geometries: 0, textures: 0 },
      programs: [],
    };

    return {
      fps: this.fps,
      frameTime: this.avgFrameTime,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      usedTextureMemory: 0,
      gpuMemory: 0,
    };
  }

  setMobileMode(mobile: boolean): void {
    this.isMobile = mobile;
    if (mobile && this.currentQuality === "high") {
      this.forceQuality("medium");
    }
  }

  setReducedMotion(enabled: boolean): void {
    if (enabled && this.currentQuality !== "lowest") {
      this.forceQuality(
        this.currentQuality === "high" ? "medium" :
        this.currentQuality === "medium" ? "low" : "lowest"
      );
    }
  }

  onHeavyMovement(): void {
    if (this.currentQuality === "high" && this.renderer) {
      this.renderer.setPixelRatio(Math.min(1.2, window.devicePixelRatio || 1));
    }
  }

  onMovementEnd(): void {
    if (this.renderer) {
      const settings = QUALITY_PRESETS[this.currentQuality];
      const dpr = Math.min(settings.dpr.max, Math.max(settings.dpr.min, window.devicePixelRatio || 1));
      this.renderer.setPixelRatio(dpr);
    }
  }

  dispose(): void {
    this.qualityChangeCallbacks.clear();
    this.renderer = null;
    this.scene = null;
  }
}

export const performanceManager = new PerformanceManager();

export function getQualitySettings(): QualitySettings {
  return performanceManager.getSettings();
}

export function getCurrentQuality(): QualityLevel {
  return performanceManager.getQuality();
}