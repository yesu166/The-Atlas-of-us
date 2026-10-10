import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PerspectiveCamera, Object3D, Vector3 } from "three";

const worldSource = readFileSync(new URL("../src/three/World.tsx", import.meta.url), "utf8");
assert.match(
  worldSource,
  /cameraLookRig\s*=\s*useMemo\(\(\)\s*=>\s*new THREE\.PerspectiveCamera\(\),\s*\[\]\s*\)/,
  "The TPP look rig must use camera forward-axis semantics, not a generic Object3D.",
);

const cameraPosition = new Vector3(0, 1.5, 14);
const lookTarget = new Vector3(0, 0.5, 8);
const towardTarget = lookTarget.clone().sub(cameraPosition).normalize();

const camera = new PerspectiveCamera();
camera.position.copy(cameraPosition);
camera.lookAt(lookTarget);
const cameraForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
assert.ok(
  cameraForward.dot(towardTarget) > 0.999,
  "A PerspectiveCamera must point its -Z axis at the follow target.",
);

// Regression proof: a generic Object3D faces +Z toward lookAt(), so treating
// its quaternion as a camera quaternion points the camera away from the target.
const genericRig = new Object3D();
genericRig.position.copy(cameraPosition);
genericRig.lookAt(lookTarget);
const wronglyUsedCameraForward = new Vector3(0, 0, -1)
  .applyQuaternion(genericRig.quaternion)
  .normalize();
assert.ok(
  wronglyUsedCameraForward.dot(towardTarget) < -0.999,
  "The regression setup should reproduce the opposite-facing camera.",
);

console.log("TPP camera orientation regression checks passed.");
