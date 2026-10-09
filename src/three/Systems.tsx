import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { letters, regions, type ChapterId } from "../data";

type Vec3 = [number, number, number];

const regionKey = (chapter: ChapterId) => {
  if (chapter === "origins") return "garden";
  if (chapter === "curiosity") return "workshop";
  if (chapter === "building") return "city";
  if (chapter === "dreams") return "lake";
  if (chapter === "quiet") return "mountain";
  return "house";
};

export function RegionChunk({ center, range = 36, children }: { center: number; range?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current) ref.current.visible = Math.abs(camera.position.z - center) < range;
  });
  return <group ref={ref}>{children}</group>;
}

export function LetterMarkers({ discovered, onInteract }: { discovered: string[]; onInteract: (id: string) => void }) {
  return (
    <group>
      {letters.map((letter) => {
        if (discovered.includes(letter.id)) return null;
        return (
          <group key={letter.id} position={letter.position as Vec3} onClick={() => onInteract(letter.id)}>
            <mesh rotation={[0, 0.18, -0.12]}>
              <boxGeometry args={[0.5, 0.7, 0.06]} />
              <meshStandardMaterial color="#e8dcc8" roughness={0.9} emissive="#ba8d78" emissiveIntensity={0.08} />
            </mesh>
            <mesh position={[0, 0.42, 0.04]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshBasicMaterial color="#edb2c8" />
            </mesh>
            <pointLight position={[0, 0.45, 0.1]} distance={1.3} intensity={0.18} color="#e7adc7" />
          </group>
        );
      })}
    </group>
  );
}

export function ThreadContinuity({ discovered }: { discovered: string[] }) {
  const geometry = useMemo(() => {
    const points = letters.filter((l) => discovered.includes(l.id)).sort((a, b) => b.position[2] - a.position[2]);
    const data: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i].position;
      const b = points[i + 1].position;
      data.push(a[0], a[1] + 0.1, a[2], b[0], b[1] + 0.1, b[2]);
    }
    const g = new THREE.BufferGeometry();
    if (data.length) g.setAttribute("position", new THREE.Float32BufferAttribute(data, 3));
    return g;
  }, [discovered]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (discovered.length < 2) return null;
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#e7a8c7" transparent opacity={0.22} depthWrite={false} />
    </lineSegments>
  );
}

const REGION_WEATHER: Record<string, {
  type: "clear" | "mist" | "dust" | "rain" | "snow" | "particles" | "overcast" | "foggy";
  color: string;
  density: number;
  particleColor: string;
  particleCount: number;
}> = {
  garden: { type: "particles", color: "#1a1228", density: 0.0001, particleColor: "#e8c868", particleCount: 100 },
  workshop: { type: "dust", color: "#101a22", density: 0.0002, particleColor: "#7ed8dc", particleCount: 150 },
  city: { type: "particles", color: "#181228", density: 0.00015, particleColor: "#9b8ff4", particleCount: 120 },
  lake: { type: "mist", color: "#0e1a28", density: 0.0003, particleColor: "#78c5df", particleCount: 80 },
  mountain: { type: "snow", color: "#101220", density: 0.00025, particleColor: "#f0c69c", particleCount: 200 },
  house: { type: "clear", color: "#281820", density: 0.00005, particleColor: "#eaaac6", particleCount: 50 },
};

interface QualitySettings {
  particleMultiplier: number;
  atmosphereEnabled: boolean;
  vegetationDensity: number;
}

function getQualitySettings(): QualitySettings {
  if (typeof window !== "undefined") {
    const isMobile = window.matchMedia("(max-width: 820px)").matches;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory;
    const isLowEnd = cores <= 4 || (memory && memory <= 4);
    if (isMobile) return isLowEnd ? { particleMultiplier: 0.3, atmosphereEnabled: false, vegetationDensity: 0.5 } : { particleMultiplier: 0.6, atmosphereEnabled: true, vegetationDensity: 0.7 };
    return isLowEnd ? { particleMultiplier: 0.6, atmosphereEnabled: true, vegetationDensity: 0.7 } : { particleMultiplier: 1.0, atmosphereEnabled: true, vegetationDensity: 1.0 };
  }
  return { particleMultiplier: 1.0, atmosphereEnabled: true, vegetationDensity: 1.0 };
}

export function WeatherAtmosphere({ chapter, mobile }: { chapter: ChapterId; mobile: boolean }) {
  const { scene } = useThree();
  const key = regionKey(chapter);
  const weather = REGION_WEATHER[key] || REGION_WEATHER.garden;
  const quality = getQualitySettings();
  const particleCount = Math.floor(weather.particleCount * quality.particleMultiplier);
  const atmosphereEnabled = quality.atmosphereEnabled;

  const particlesRef = useRef<THREE.Points | null>(null);
  const fogColorRef = useRef<THREE.Color>(new THREE.Color(weather.color));
  const targetFogColor = useMemo(() => new THREE.Color(weather.color), [weather.color]);

  useEffect(() => {
    if (!atmosphereEnabled || particleCount === 0) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 40;
      const height = Math.random() * 15;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      sizes[i] = 0.02 + Math.random() * 0.08;
      alphas[i] = 0.1 + Math.random() * 0.4;
      phases[i] = Math.random() * Math.PI * 2;

      switch (weather.type) {
        case "mist":
          velocities[i * 3] = (Math.random() - 0.5) * 0.1;
          velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
          break;
        case "dust":
          velocities[i * 3] = (Math.random() - 0.5) * 0.3;
          velocities[i * 3 + 1] = Math.random() * 0.1;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
          break;
        case "snow":
          velocities[i * 3] = (Math.random() - 0.5) * 0.2;
          velocities[i * 3 + 1] = -0.1 - Math.random() * 0.3;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
          break;
        case "rain":
          velocities[i * 3] = 0;
          velocities[i * 3 + 1] = -1 - Math.random() * 2;
          velocities[i * 3 + 2] = 0;
          break;
        default:
          velocities[i * 3] = (Math.random() - 0.5) * 0.05;
          velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      color: weather.particleColor,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      vertexColors: false,
      depthWrite: false,
    });

    particlesRef.current = new THREE.Points(geometry, material);
    particlesRef.current.name = `weather-${key}`;

    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [key, particleCount, atmosphereEnabled, weather.type, weather.particleColor]);

  useFrame((state, dt) => {
    const fog = scene.fog;
    if (fog instanceof THREE.Fog) {
      const regionWeather = regions[key].weather;
      const near = regionWeather === "foggy" ? 17 : regionWeather === "overcast" ? 20 : 26;
      const far = regionWeather === "foggy" ? 72 : regionWeather === "overcast" ? 96 : 138;
      fog.near = THREE.MathUtils.lerp(fog.near, near, 1 - Math.exp(-dt * 1.6));
      fog.far = THREE.MathUtils.lerp(fog.far, far, 1 - Math.exp(-dt * 1.2));
    }

    fogColorRef.current.lerp(targetFogColor, dt * 0.5);
    if (fog instanceof THREE.Fog) {
      fog.color.lerp(fogColorRef.current, dt * 0.5);
    }

    if (!particlesRef.current || !atmosphereEnabled) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = particlesRef.current.geometry.attributes.velocity.array as Float32Array;
    const phases = particlesRef.current.geometry.attributes.phase.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i * 3] * dt * 60;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt * 60;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt * 60;

      phases[i] += dt * 0.5;
      positions[i * 3] += Math.sin(phases[i]) * 0.01;
      positions[i * 3 + 2] += Math.cos(phases[i]) * 0.01;

      const playerZ = state.camera?.position.z || 0;
      const playerX = state.camera?.position.x || 0;

      if (weather.type === "snow" || weather.type === "rain") {
        if (positions[i * 3 + 1] < -2) {
          positions[i * 3] = playerX + (Math.random() - 0.5) * 80;
          positions[i * 3 + 1] = 15 + Math.random() * 20;
          positions[i * 3 + 2] = playerZ + (Math.random() - 0.5) * 80;
        }
      } else {
        const dist = Math.sqrt(Math.pow(positions[i * 3] - playerX, 2) + Math.pow(positions[i * 3 + 2] - playerZ, 2));
        if (dist > 60) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 40 + Math.random() * 20;
          positions[i * 3] = playerX + Math.cos(angle) * radius;
          positions[i * 3 + 2] = playerZ + Math.sin(angle) * radius;
          positions[i * 3 + 1] = Math.random() * 15;
        }
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    if (particlesRef.current.material) {
      (particlesRef.current.material as THREE.PointsMaterial).opacity = 0.4 + Math.sin(time * 2) * 0.1;
    }
  });

  if (!atmosphereEnabled || particleCount === 0) return null;

  return (
    <group name="weather-atmosphere">
      {particlesRef.current && <primitive object={particlesRef.current} />}
    </group>
  );
}

export function Fireflies({ chapter, mobile, active = true }: { chapter: ChapterId; mobile: boolean; active?: boolean }) {
  const key = regionKey(chapter);
  if (key !== "garden" && key !== "lake") return null;
  if (!active) return null;

  const quality = getQualitySettings();
  const count = Math.floor(30 * quality.particleMultiplier);
  const firefliesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const basePositions = new Float32Array(count * 3);

    const centerX = key === "garden" ? 0 : -3;
    const centerZ = key === "garden" ? 2 : -66;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 10;
      const height = 0.5 + Math.random() * 4;

      basePositions[i * 3] = centerX + Math.cos(angle) * radius;
      basePositions[i * 3 + 1] = height;
      basePositions[i * 3 + 2] = centerZ + Math.sin(angle) * radius;

      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
      positions[i * 3 + 2] = basePositions[i * 3 + 2];

      sizes[i] = 0.03 + Math.random() * 0.05;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("basePosition", new THREE.BufferAttribute(basePositions, 3));

    const material = new THREE.PointsMaterial({
      color: key === "garden" ? "#f0c868" : "#88ffcc",
      size: 0.06,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    firefliesRef.current = new THREE.Points(geometry, material);
    firefliesRef.current.name = `fireflies-${key}`;

    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [key, count]);

  useFrame((state) => {
    if (!firefliesRef.current) return;

    const positions = firefliesRef.current.geometry.attributes.position.array as Float32Array;
    const basePositions = firefliesRef.current.geometry.attributes.basePosition.array as Float32Array;
    const phases = firefliesRef.current.geometry.attributes.phase.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      phases[i] += 0.01;
      positions[i * 3] = basePositions[i * 3] + Math.sin(time * 0.5 + phases[i]) * 0.5;
      positions[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(time * 0.7 + phases[i]) * 0.3;
      positions[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(time * 0.5 + phases[i]) * 0.5;
    }

    firefliesRef.current.geometry.attributes.position.needsUpdate = true;

    if (firefliesRef.current.material) {
      (firefliesRef.current.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(time * 3) * 0.2;
    }
  });

  return firefliesRef.current ? <primitive object={firefliesRef.current} /> : null;
}

export function Butterflies({ chapter, mobile }: { chapter: ChapterId; mobile: boolean }) {
  const key = regionKey(chapter);
  if (key !== "garden" && key !== "lake" && key !== "mountain") return null;

  const quality = getQualitySettings();
  const count = Math.floor(8 * quality.particleMultiplier);
  if (count === 0) return null;

  const butterfliesRef = useRef<THREE.InstancedMesh | null>(null);
  const geometry = useMemo(() => {
    const wingGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(4 * 3);
    positions[0] = -0.15; positions[1] = 0; positions[2] = 0;
    positions[3] = 0; positions[4] = 0.02; positions[5] = 0;
    positions[6] = 0.15; positions[7] = 0; positions[8] = 0;
    positions[9] = 0; positions[10] = -0.02; positions[11] = 0;
    wingGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    wingGeo.setIndex([0, 1, 2, 2, 1, 3]);
    wingGeo.computeVertexNormals();
    return wingGeo;
  }, []);

  const bodyGeometry = useMemo(() => new THREE.CapsuleGeometry(0.02, 0.06, 4, 4), []);

  useEffect(() => {
    const wingMat = new THREE.MeshStandardMaterial({
      color: key === "garden" ? "#ffb5d0" : key === "lake" ? "#a2ebe3" : "#f0c69c",
      emissive: key === "garden" ? "#e68c9e" : key === "lake" ? "#7ed8dc" : "#efc795",
      emissiveIntensity: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const bodyMat = new THREE.MeshStandardMaterial({ color: "#30283b", roughness: 0.9 });

    const dummy = new THREE.Object3D();
    const basePositions: THREE.Vector3[] = [];
    const phases: number[] = [];
    const wingPhases: number[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 12;
      const centerX = key === "garden" ? 0 : key === "lake" ? -3 : 0;
      const centerZ = key === "garden" ? 2 : key === "lake" ? -66 : -92;
      const height = 1.5 + Math.random() * 5;

      basePositions.push(new THREE.Vector3(centerX + Math.cos(angle) * radius, height, centerZ + Math.sin(angle) * radius));
      phases.push(Math.random() * Math.PI * 2);
      wingPhases.push(Math.random() * Math.PI * 2);
    }

    const mesh = new THREE.InstancedMesh(geometry, wingMat, count * 2);
    const bodyMesh = new THREE.InstancedMesh(bodyGeometry, bodyMat, count);

    for (let i = 0; i < count; i++) {
      const pos = basePositions[i];
      dummy.position.copy(pos);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);

      dummy.rotation.y += Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2, dummy.matrix);
      dummy.rotation.y += Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2 + 1, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    bodyMesh.instanceMatrix.needsUpdate = true;

    butterfliesRef.current = mesh;
    (butterfliesRef.current as any).userData = { bodyMesh, basePositions, phases, wingPhases, count, key };

    return () => {
      geometry.dispose();
      bodyGeometry.dispose();
      wingMat.dispose();
      bodyMat.dispose();
    };
  }, [key, count, geometry, bodyGeometry]);

  useFrame((state) => {
    if (!butterfliesRef.current) return;

    const mesh = butterfliesRef.current;
    const userData = mesh.userData as { bodyMesh: THREE.InstancedMesh; basePositions: THREE.Vector3[]; phases: number[]; wingPhases: number[]; count: number; key: string };
    const { bodyMesh, basePositions, phases, wingPhases, count } = userData;
    const time = state.clock.elapsedTime;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      phases[i] += 0.005;
      wingPhases[i] += 0.15;

      const wanderX = Math.sin(time * 0.3 + phases[i]) * 0.8;
      const wanderZ = Math.cos(time * 0.25 + phases[i]) * 0.8;
      const hoverY = Math.sin(time * 0.7 + phases[i]) * 0.3;

      const pos = basePositions[i].clone();
      pos.x += wanderX;
      pos.y += hoverY;
      pos.z += wanderZ;

      dummy.position.copy(pos);
      dummy.rotation.y = Math.atan2(wanderX, wanderZ) + Math.sin(time * 0.4 + phases[i]) * 0.3;
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);

      const wingAngle = Math.sin(wingPhases[i]) * 0.8;
      dummy.rotation.y += Math.PI / 2;
      dummy.rotation.z = wingAngle;
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2, dummy.matrix);
      dummy.rotation.z = -wingAngle;
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2 + 1, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    bodyMesh.instanceMatrix.needsUpdate = true;
  });

  return butterfliesRef.current ? (
    <group name="butterflies">
      <primitive object={butterfliesRef.current} />
      <primitive object={(butterfliesRef.current as any).userData?.bodyMesh} />
    </group>
  ) : null;
}