import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinnedScene } from "three/addons/utils/SkeletonUtils.js";

const MODEL_URL = "/models/moon-cartographer.glb";

type MotionRef = MutableRefObject<boolean>;
type ArmRig = {
  left: THREE.Bone;
  right: THREE.Bone;
  leftRest: THREE.Quaternion;
  rightRest: THREE.Quaternion;
};

function makeCapeGeometry() {
  const columns = 9;
  const rows = 7;
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const width = 0.26 + Math.pow(t, 0.82) * 0.19;
    const y = 1.13 - t * 0.59;
    for (let col = 0; col <= columns; col++) {
      const u = col / columns;
      const x = (u - 0.5) * width * 2;
      const wave = Math.sin(u * Math.PI * 2) * 0.025 * t;
      const z = -0.205 - t * t * 0.105 + wave;
      positions.push(x, y, z);
      uvs.push(u, 1 - t);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeStarGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 4;
    const radius = i % 2 === 0 ? 0.062 : 0.027;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.004,
  });
}

function styleMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const recolor = (material: THREE.Material) => {
      const copy = material.clone();
      const paint = copy as THREE.MeshStandardMaterial;
      if (!paint.color) return copy;
      const key = `${object.name} ${copy.name}`.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (/hair|brow|eyebrow/.test(key)) paint.color.set("#70453d");
      else if (/blazer|jacket|coat|outerwear/.test(key)) paint.color.set("#293950");
      else if (/pants|trouser|bottom|skirt/.test(key)) paint.color.set("#8a7ba7");
      else if (/shirt|blouse|top|inner/.test(key)) paint.color.set("#ead6c8");
      else if (/shoe|sneaker|boot/.test(key)) paint.color.set("#685047");
      else if (/bag|satchel/.test(key)) paint.color.set("#79564a");
      return copy;
    };

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(recolor)
      : recolor(mesh.material);
  });
}

function findBone(root: THREE.Object3D, patterns: RegExp[]) {
  let found: THREE.Bone | null = null;
  root.traverse((object) => {
    if (found || !(object as THREE.Bone).isBone) return;
    const key = object.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (patterns.some((pattern) => pattern.test(key))) found = object as THREE.Bone;
  });
  return found;
}

export function MoonCartographer({
  movingRef,
  jumpingRef,
}: {
  movingRef: MotionRef;
  jumpingRef: MotionRef;
}) {
  const gltf = useGLTF(MODEL_URL);
  const animationRoot = useRef<THREE.Group>(null);
  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const armRig = useRef<ArmRig | null>(null);
  const capeGeometry = useMemo(makeCapeGeometry, []);
  const starGeometry = useMemo(makeStarGeometry, []);

  const avatar = useMemo(() => {
    const model = cloneSkinnedScene(gltf.scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const height = Math.max(0.1, bounds.max.y - bounds.min.y);
    const scale = 1.52 / height;
    model.scale.setScalar(scale);
    model.position.y -= bounds.min.y * scale;
    styleMaterials(model);
    return model;
  }, [gltf.scene]);

  const { actions } = useAnimations(gltf.animations, animationRoot);

  const walkName = useMemo(
    () => gltf.animations.find((clip) => /walk/i.test(clip.name))?.name ?? null,
    [gltf.animations],
  );
  const runName = useMemo(
    () => gltf.animations.find((clip) => /run/i.test(clip.name))?.name ?? null,
    [gltf.animations],
  );
  const idleName = useMemo(
    () => gltf.animations.find((clip) => /idle|stand/i.test(clip.name))?.name ?? null,
    [gltf.animations],
  );
  const jumpName = useMemo(
    () => gltf.animations.find((clip) => /jump/i.test(clip.name))?.name ?? null,
    [gltf.animations],
  );

  useEffect(() => {
    const left = findBone(avatar, [/leftarm/, /leftupperarm/, /upperarmleft/, /mixamorigleftarm/]);
    const right = findBone(avatar, [/rightarm/, /rightupperarm/, /upperarmright/, /mixamorigrightarm/]);
    armRig.current = left && right
      ? {
          left,
          right,
          leftRest: left.quaternion.clone(),
          rightRest: right.quaternion.clone(),
        }
      : null;

    return () => {
      activeAction.current?.stop();
      activeAction.current = null;
      capeGeometry.dispose();
      starGeometry.dispose();
      avatar.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material.dispose();
      });
    };
  }, [avatar, capeGeometry, starGeometry]);

  useFrame((_, delta) => {
    const jumping = jumpingRef.current;
    const moving = movingRef.current;
    const desiredName = jumping
      ? jumpName
      : moving
        ? walkName ?? runName
        : idleName;
    const desired = desiredName ? actions[desiredName] ?? null : null;

    if (desired !== activeAction.current) {
      activeAction.current?.fadeOut(0.12);
      if (desired) desired.reset().setEffectiveWeight(1).fadeIn(0.12).play();
      activeAction.current = desired;
    }
    if (desired) desired.setEffectiveTimeScale(moving && !jumping && desiredName === runName ? 1.12 : 1);

    // If the model has no jump clip, briefly lift both upper arms into an open jump pose.
    const rig = armRig.current;
    if (rig && jumping && !jumpName) {
      const open = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.88));
      const leftTarget = rig.leftRest.clone().multiply(open);
      const rightTarget = rig.rightRest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.88)));
      const blend = 1 - Math.exp(-Math.min(delta, 0.05) * 12);
      rig.left.quaternion.slerp(leftTarget, blend);
      rig.right.quaternion.slerp(rightTarget, blend);
    }
  });

  return (
    <group>
      <group ref={animationRoot}>
        <primitive object={avatar} />
      </group>
      {/* One continuous cape sheet, attached to the character root rather than stacked torso primitives. */}
      <mesh geometry={capeGeometry} frustumCulled={false}>
        <meshStandardMaterial color="#25354e" roughness={0.88} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={starGeometry} position={[0, 1.105, 0.205]}>
        <meshStandardMaterial color="#f2d4a0" metalness={0.24} roughness={0.4} emissive="#b48a52" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}
