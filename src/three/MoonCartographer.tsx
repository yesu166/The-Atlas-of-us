import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type MotionRef = MutableRefObject<boolean>;

/**
 * The little Wayfinder: an intentionally abstract, storybook avatar.
 * Built from a handful of primitives so it stays crisp, lightweight, and fast on phones.
 * Its face is deliberately minimal: two dark dot eyes, no uncanny human detail.
 */
export function MoonCartographer({
  movingRef,
  jumpingRef,
  reducedMotion = false,
}: {
  movingRef: MotionRef;
  jumpingRef: MotionRef;
  reducedMotion?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const cape = useRef<THREE.Group>(null);
  const leftFoot = useRef<THREE.Mesh>(null);
  const rightFoot = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: "#f4d8cb", roughness: 0.86 }),
    face: new THREE.MeshStandardMaterial({ color: "#ffe9dc", roughness: 0.9 }),
    ink: new THREE.MeshBasicMaterial({ color: "#30283b" }),
    glint: new THREE.MeshBasicMaterial({ color: "#fffaf4" }),
    coat: new THREE.MeshStandardMaterial({ color: "#35445f", roughness: 0.92 }),
    coatLight: new THREE.MeshStandardMaterial({ color: "#52617e", roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: "#f4d49c", emissive: "#8d633a", emissiveIntensity: 0.18, roughness: 0.52 }),
    boot: new THREE.MeshStandardMaterial({ color: "#665063", roughness: 0.95 }),
    blush: new THREE.MeshBasicMaterial({ color: "#eaa1ad", transparent: true, opacity: 0.55 }),
  }), []);


  // A draped cloth silhouette, attached to the body's shoulder pivot.
  // ShapeGeometry avoids the detached cone/pyramid silhouette of the old cape.
  const capeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.255, 0.005);
    shape.quadraticCurveTo(0, -0.025, 0.255, 0.005);
    shape.bezierCurveTo(0.285, -0.20, 0.365, -0.47, 0.435, -0.625);
    shape.quadraticCurveTo(0.19, -0.685, 0, -0.655);
    shape.quadraticCurveTo(-0.19, -0.685, -0.435, -0.625);
    shape.bezierCurveTo(-0.365, -0.47, -0.285, -0.20, -0.255, 0.005);
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 8);
  }, []);

  const capeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: "#28364f",
      roughness: 0.96,
      side: THREE.DoubleSide,
      flatShading: true,
    }),
    [],
  );

  useEffect(() => () => {
    Object.values(materials).forEach((material) => material.dispose());
    capeGeometry.dispose();
    capeMaterial.dispose();
  }, [materials, capeGeometry, capeMaterial]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime * (reducedMotion ? 0.45 : 1);
    const motionScale = reducedMotion ? 0.24 : 1;
    const moving = movingRef.current;
    const jumping = jumpingRef.current;
    const blend = 1 - Math.exp(-Math.min(delta, 0.05) * 9);
    if (body.current) {
      body.current.position.y = (jumping ? 0.08 : 0) + (moving ? Math.abs(Math.sin(time * 8.5)) * 0.055 : Math.sin(time * 1.6) * 0.018) * motionScale;
      body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, moving ? Math.sin(time * 4.25) * 0.055 * motionScale : 0, 7, delta);
      body.current.rotation.x = THREE.MathUtils.damp(body.current.rotation.x, jumping ? 0.12 : moving ? 0.025 * motionScale : 0, 8, delta);
    }
    if (cape.current) {
      const capeTarget = jumping ? 0.3 + Math.sin(time * 10) * 0.035 : moving ? (-0.12 + Math.sin(time * 8) * 0.08) * motionScale : Math.sin(time * 1.5) * 0.035 * motionScale;
      cape.current.rotation.x = THREE.MathUtils.damp(cape.current.rotation.x, capeTarget, 7, delta);
      cape.current.rotation.z = Math.sin(time * (moving ? 5 : 1.3)) * (moving ? 0.045 : 0.018) * motionScale;
    }
    if (leftFoot.current) leftFoot.current.rotation.x = jumping ? -0.42 : moving ? Math.sin(time * 8.5) * 0.28 * motionScale : 0;
    if (rightFoot.current) rightFoot.current.rotation.x = jumping ? -0.42 : moving ? Math.sin(time * 8.5 + Math.PI) * 0.28 * motionScale : 0;
    if (leftArm.current) {
      leftArm.current.rotation.z = THREE.MathUtils.damp(leftArm.current.rotation.z, jumping ? -2.25 : moving ? Math.sin(time * 8.5) * 0.12 * motionScale : 0.08 * motionScale, 8, delta);
    }
    if (rightArm.current) {
      rightArm.current.rotation.z = THREE.MathUtils.damp(rightArm.current.rotation.z, jumping ? 2.25 : moving ? -Math.sin(time * 8.5) * 0.12 * motionScale : -0.08 * motionScale, 8, delta);
    }
    if (root.current) root.current.rotation.y += (0 - root.current.rotation.y) * blend * 0.015;
  });

  return (
    <group ref={root}>
      {/* Short rounded coat/body: a little traveller, not a realistic human. */}
      <group ref={body}>
        <mesh position={[0, 0.49, 0]} scale={[0.36, 0.43, 0.29]} material={materials.coat}>
          <sphereGeometry args={[1, 16, 14]} />
        </mesh>
        <mesh position={[0, 0.79, 0.015]} scale={[0.34, 0.33, 0.3]} material={materials.face}>
          <sphereGeometry args={[1, 20, 16]} />
        </mesh>

        {/* Dot eyes, tiny highlights, and quiet blush: readable even on a phone. */}
        <mesh position={[-0.115, 0.82, 0.287]} scale={[0.038, 0.052, 0.022]} material={materials.ink}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
        <mesh position={[0.115, 0.82, 0.287]} scale={[0.038, 0.052, 0.022]} material={materials.ink}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
        <mesh position={[-0.125, 0.842, 0.307]} scale={[0.011, 0.014, 0.006]} material={materials.glint}>
          <sphereGeometry args={[1, 8, 8]} />
        </mesh>
        <mesh position={[0.105, 0.842, 0.307]} scale={[0.011, 0.014, 0.006]} material={materials.glint}>
          <sphereGeometry args={[1, 8, 8]} />
        </mesh>
        <mesh position={[-0.205, 0.735, 0.257]} scale={[0.055, 0.025, 0.012]} material={materials.blush}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        <mesh position={[0.205, 0.735, 0.257]} scale={[0.055, 0.025, 0.012]} material={materials.blush}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>

        {/* Little scarf, like a ribbon marking the start of the journey. */}
        <mesh position={[0, 0.585, 0.265]} rotation={[0.1, 0, -0.04]} scale={[0.28, 0.075, 0.045]} material={materials.gold}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        <mesh position={[0.12, 0.49, 0.28]} rotation={[0, 0, -0.55]} scale={[0.075, 0.19, 0.035]} material={materials.gold}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>

        {/* Tiny arms are simple rounded shapes with no joints showing. */}
        <group ref={leftArm} position={[-0.32, 0.52, 0]}>
          <mesh position={[-0.055, -0.13, 0]} rotation={[0, 0, -0.25]} scale={[0.105, 0.22, 0.11]} material={materials.face}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.32, 0.52, 0]}>
          <mesh position={[0.055, -0.13, 0]} rotation={[0, 0, 0.25]} scale={[0.105, 0.22, 0.11]} material={materials.face}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
        </group>

        {/* Two little boots make the walk cycle visible without heavy rigging. */}
        <mesh ref={leftFoot} position={[-0.15, 0.12, 0.015]} scale={[0.13, 0.12, 0.18]} material={materials.boot}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
        <mesh ref={rightFoot} position={[0.15, 0.12, 0.015]} scale={[0.13, 0.12, 0.18]} material={materials.boot}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </group>

      {/* The cloak shares the body transform, so it cannot lag behind while bobbing or jumping. */}
      <group ref={cape} position={[0, 0.69, -0.315]} rotation={[0.025, 0, 0]}>
        <mesh geometry={capeGeometry} material={capeMaterial} position={[0, 0, -0.012]} />
        <mesh position={[0.045, -0.34, -0.022]} rotation={[0, 0, Math.PI / 8]} scale={[0.075, 0.075, 0.018]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#f4d49c" emissive="#c28a4d" emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
