import * as THREE from "three";

export interface CameraConfig {
  defaultDistance: number;
  defaultHeight: number;
  defaultFov: number;
  minDistance: number;
  maxDistance: number;
  minHeight: number;
  maxHeight: number;
  minFov: number;
  maxFov: number;
  followLerp: number;
  lookLerp: number;
  rotationLerp: number;
  verticalClampMin: number;
  verticalClampMax: number;
  collisionRadius: number;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  defaultDistance: 5.0,
  defaultHeight: 2.5,
  defaultFov: 55,
  minDistance: 2.5,
  maxDistance: 10,
  minHeight: 1.0,
  maxHeight: 5,
  minFov: 40,
  maxFov: 70,
  followLerp: 0.15,
  lookLerp: 0.2,
  rotationLerp: 0.08,
  verticalClampMin: -Math.PI / 4,
  verticalClampMax: Math.PI / 3,
  collisionRadius: 0.3,
};

export type CameraMode = "follow" | "cinematic" | "focus" | "orbit";

export interface CameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

export class CameraController {
  private config: CameraConfig;
  private camera: THREE.Camera;
  private target: THREE.Object3D | null = null;

  private currentDistance: number;
  private currentHeight: number;
  private currentFov: number;
  private currentYaw = 0;
  private currentPitch = 0.3;

  private targetDistance: number;
  private targetHeight: number;
  private targetFov: number;
  private targetYaw = 0;
  private targetPitch = 0.3;

  private mode: CameraMode = "follow";
  private cinematicTarget: CameraTarget | null = null;
  private cinematicProgress = 0;
  private cinematicDuration = 0;
  private cinematicStartPosition = new THREE.Vector3();
  private cinematicStartLookAt = new THREE.Vector3();
  private cinematicEasing: (t: number) => number = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  private followOffset = new THREE.Vector3();
  private lookAtOffset = new THREE.Vector3(0, 1.3, 0);
  private shoulderOffset = 0.6;

  private shakeIntensity = 0;
  private shakeDecay = 0;
  private shakeOffset = new THREE.Vector3();

  private collisionObjects: THREE.Object3D[] = [];

  private mouseSensitivity = 0.002;
  private gamepadSensitivity = 1.5;

  private reducedMotion = false;

  constructor(camera: THREE.Camera, config: Partial<CameraConfig> = {}) {
    this.camera = camera;
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.currentDistance = this.config.defaultDistance;
    this.currentHeight = this.config.defaultHeight;
    this.currentFov = this.config.defaultFov;
    this.targetDistance = this.config.defaultDistance;
    this.targetHeight = this.config.defaultHeight;
    this.targetFov = this.config.defaultFov;

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }
  }

  setTarget(target: THREE.Object3D): void {
    this.target = target;
  }

  setConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }

  setGamepadSensitivity(sensitivity: number): void {
    this.gamepadSensitivity = sensitivity;
  }

  addCollisionObject(object: THREE.Object3D): void {
    this.collisionObjects.push(object);
  }

  removeCollisionObject(object: THREE.Object3D): void {
    const idx = this.collisionObjects.indexOf(object);
    if (idx >= 0) this.collisionObjects.splice(idx, 1);
  }

  onMouseMove(deltaX: number, deltaY: number): void {
    if (this.mode !== "follow" && this.mode !== "orbit") return;
    if (this.reducedMotion) return;

    this.targetYaw -= deltaX * this.mouseSensitivity;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch - deltaY * this.mouseSensitivity,
      this.config.verticalClampMin,
      this.config.verticalClampMax
    );
  }

  onGamepadLook(stickX: number, stickY: number, dt: number): void {
    if (this.mode !== "follow" && this.mode !== "orbit") return;
    if (this.reducedMotion) return;

    const deadzone = 0.15;
    if (Math.abs(stickX) < deadzone && Math.abs(stickY) < deadzone) return;

    this.targetYaw -= stickX * this.gamepadSensitivity * dt;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch - stickY * this.gamepadSensitivity * dt,
      this.config.verticalClampMin,
      this.config.verticalClampMax
    );
  }

  onWheel(delta: number): void {
    if (this.mode !== "follow") return;
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance + delta * 0.5,
      this.config.minDistance,
      this.config.maxDistance
    );
  }

  startCinematic(target: CameraTarget): void {
    if (!this.target) return;

    this.mode = "cinematic";
    this.cinematicTarget = target;
    this.cinematicProgress = 0;
    this.cinematicDuration = target.duration || 2000;
    this.cinematicEasing = target.easing || ((t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    this.cinematicStartPosition.copy(this.camera.position);
    this.cinematicStartLookAt.copy(this.getLookAtTarget());
  }

  skipCinematic(): void {
    if (this.cinematicTarget) {
      this.completeCinematic();
    }
  }

  private completeCinematic(): void {
    if (this.cinematicTarget) {
      this.camera.position.copy(this.cinematicTarget.position);
      this.camera.lookAt(this.cinematicTarget.lookAt);
      if (this.cinematicTarget.onComplete) this.cinematicTarget.onComplete();
      this.cinematicTarget = null;
    }
    this.mode = "follow";
  }

  startFocus(position: THREE.Vector3, lookAt: THREE.Vector3, duration = 1000): void {
    this.mode = "focus";
    this.cinematicTarget = { position, lookAt, duration };
    this.cinematicProgress = 0;
    this.cinematicDuration = duration;
    this.cinematicStartPosition.copy(this.camera.position);
    this.cinematicStartLookAt.copy(this.getLookAtTarget());
  }

  endFocus(): void {
    this.mode = "follow";
    this.cinematicTarget = null;
  }

  shake(intensity: number, decay = 0.9): void {
    this.shakeIntensity = intensity;
    this.shakeDecay = decay;
  }

  update(dt: number): void {
    if (!this.target) return;

    if (this.mode === "cinematic" || this.mode === "focus") {
      this.updateCinematic(dt);
      return;
    }

    this.updateFollow(dt);
    this.applyShake(dt);
    this.updateCameraMatrices();
  }

  private updateFollow(dt: number): void {
    if (!this.target) return;
    const targetPos = this.target.position;
    const targetRot = this.target.rotation;

    const yawEase = 1 - Math.exp(-this.config.rotationLerp * 60 * dt);
    const pitchEase = 1 - Math.exp(-this.config.rotationLerp * 60 * dt);

    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, yawEase);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, pitchEase);

    const yaw = this.currentYaw;
    const pitch = this.currentPitch;

    const baseOffset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).multiplyScalar(this.currentDistance);

    baseOffset.y += this.currentHeight;

    const right = new THREE.Vector3(
      Math.cos(yaw) * Math.cos(pitch),
      0,
      -Math.sin(yaw) * Math.cos(pitch)
    ).multiplyScalar(this.shoulderOffset);

    const idealOffset = new THREE.Vector3().copy(baseOffset).add(right);

    const distEase = 1 - Math.exp(-this.config.followLerp * 60 * dt);
    const heightEase = 1 - Math.exp(-this.config.followLerp * 60 * dt);
    const fovEase = 1 - Math.exp(-this.config.followLerp * 60 * dt);

    this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, this.targetDistance, distEase);
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, this.targetHeight, heightEase);
    this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, fovEase);

    const targetPosition = new THREE.Vector3().copy(targetPos).add(this.lookAtOffset);
    const desiredCameraPos = new THREE.Vector3().copy(targetPosition).add(idealOffset);

    const finalCameraPos = this.checkCollision(targetPosition, desiredCameraPos);

    const posEase = 1 - Math.exp(-this.config.followLerp * 60 * dt);
    this.camera.position.lerp(finalCameraPos, posEase);

    const lookTarget = new THREE.Vector3().copy(targetPos).add(this.lookAtOffset);
    const lookEase = 1 - Math.exp(-this.config.lookLerp * 60 * dt);
    this.camera.lookAt(new THREE.Vector3().lerpVectors(this.camera.getWorldDirection(new THREE.Vector3()), lookTarget, lookEase));
  }

  private updateCinematic(dt: number): void {
    if (!this.cinematicTarget) return;

    this.cinematicProgress += dt * 1000;
    const t = Math.min(this.cinematicProgress / this.cinematicDuration, 1);
    const eased = this.cinematicEasing(t);

    this.camera.position.lerpVectors(this.cinematicStartPosition, this.cinematicTarget.position, eased);
    this.camera.lookAt(new THREE.Vector3().lerpVectors(this.cinematicStartLookAt, this.cinematicTarget.lookAt, eased));

    if (t >= 1) {
      this.completeCinematic();
    }
  }

  private checkCollision(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
    if (this.collisionObjects.length === 0) return to;

    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const distance = from.distanceTo(to);

    const ray = new THREE.Raycaster(from, direction, 0, distance);
    ray.near = 0.1;

    const intersects = ray.intersectObjects(this.collisionObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const safeDistance = hit.distance - this.config.collisionRadius;
      if (safeDistance > 0.5) {
        return new THREE.Vector3().copy(from).addScaledVector(direction, safeDistance);
      }
      return from.clone();
    }

    return to;
  }

  private applyShake(dt: number): void {
    if (this.shakeIntensity > 0.01) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity * 0.5,
        (Math.random() - 0.5) * this.shakeIntensity
      );
      this.camera.position.add(this.shakeOffset);
      this.shakeIntensity *= this.shakeDecay;
    }
  }

  private updateCameraMatrices(): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld(true);
  }

  private getLookAtTarget(): THREE.Vector3 {
    if (!this.target) return new THREE.Vector3();
    const target = new THREE.Vector3();
    this.target.getWorldPosition(target);
    target.add(this.lookAtOffset);
    return target;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  getDistance(): number {
    return this.currentDistance;
  }

  getHeight(): number {
    return this.currentHeight;
  }

  getFov(): number {
    return this.currentFov;
  }

  getYaw(): number {
    return this.currentYaw;
  }

  getPitch(): number {
    return this.currentPitch;
  }

  setDistance(distance: number): void {
    this.targetDistance = THREE.MathUtils.clamp(distance, this.config.minDistance, this.config.maxDistance);
  }

  setHeight(height: number): void {
    this.targetHeight = THREE.MathUtils.clamp(height, this.config.minHeight, this.config.maxHeight);
  }

  setFov(fov: number): void {
    this.targetFov = THREE.MathUtils.clamp(fov, this.config.minFov, this.config.maxFov);
  }

  setLookAtOffset(offset: THREE.Vector3): void {
    this.lookAtOffset.copy(offset);
  }

  reset(): void {
    this.currentDistance = this.config.defaultDistance;
    this.currentHeight = this.config.defaultHeight;
    this.currentFov = this.config.defaultFov;
    this.targetDistance = this.config.defaultDistance;
    this.targetHeight = this.config.defaultHeight;
    this.targetFov = this.config.defaultFov;
    this.currentYaw = 0;
    this.currentPitch = 0.3;
    this.targetYaw = 0;
    this.targetPitch = 0.3;
    this.mode = "follow";
    this.cinematicTarget = null;
  }

  dispose(): void {
    this.collisionObjects = [];
    this.cinematicTarget = null;
  }
}