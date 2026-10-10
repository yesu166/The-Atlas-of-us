import {useEffect,useMemo,useRef} from "react";
import type {ReactNode} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import * as THREE from "three";
import {letters,regions,type ChapterId} from "../data";

type Vec3=[number,number,number];

const regionKey=(chapter:ChapterId)=>{
  if(chapter==="origins")return "garden";
  if(chapter==="curiosity")return "workshop";
  if(chapter==="building")return "city";
  if(chapter==="dreams")return "lake";
  if(chapter==="quiet")return "mountain";
  return "house";
};

export function RegionChunk({center,range=36,children}:{center:number;range?:number;children:ReactNode}){
  const ref=useRef<THREE.Group>(null);
  const {camera}=useThree();
  useFrame(()=>{
    if(ref.current)ref.current.visible=Math.abs(camera.position.z-center)<range;
  });
  return <group ref={ref}>{children}</group>;
}

export function LetterMarkers({discovered,onInteract}:{discovered:string[];onInteract:(id:string)=>void}){
  return <group>
    {letters.map(letter=>{
      if(discovered.includes(letter.id))return null;
      return <group key={letter.id} position={letter.position as Vec3} onClick={()=>onInteract(letter.id)}>
        <mesh rotation={[0,.18,-.12]}>
          <boxGeometry args={[.5,.7,.06]}/>
          <meshStandardMaterial color="#e8dcc8" roughness={.9} emissive="#ba8d78" emissiveIntensity={.08}/>
        </mesh>
        <mesh position={[0,.42,.04]}>
          <sphereGeometry args={[.06,10,10]}/>
          <meshBasicMaterial color="#edb2c8"/>
        </mesh>
        <mesh position={[0,.88,-.025]}>
          <cylinderGeometry args={[.012,.025,.92,5,1,true]}/>
          <meshBasicMaterial color="#ffe4b7" transparent opacity={.16} depthWrite={false}/>
        </mesh>
        <mesh position={[0,1.38,-.025]}>
          <coneGeometry args={[.16,.34,6]}/>
          <meshBasicMaterial color="#ffe0ae" transparent opacity={.72}/>
        </mesh>
        <mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]}>
          <ringGeometry args={[.34,.47,24]}/>
          <meshBasicMaterial color="#efb9d4" transparent opacity={.75} side={THREE.DoubleSide}/>
        </mesh>
        <pointLight position={[0,.72,.1]} distance={4.2} intensity={.3} color="#e7adc7"/>
      </group>;
    })}
  </group>;
}

export function ThreadContinuity({discovered}:{discovered:string[]}){
  const geometry=useMemo(()=>{
    const points=letters.filter(l=>discovered.includes(l.id)).sort((a,b)=>b.position[2]-a.position[2]);
    const data:number[]=[];
    for(let i=0;i<points.length-1;i++){
      const a=points[i].position,b=points[i+1].position;
      data.push(a[0],a[1]+.1,a[2],b[0],b[1]+.1,b[2]);
    }
    const g=new THREE.BufferGeometry();
    if(data.length)g.setAttribute("position",new THREE.Float32BufferAttribute(data,3));
    return g;
  },[discovered]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  if(discovered.length<2)return null;
  return <lineSegments geometry={geometry}>
    <lineBasicMaterial color="#e7a8c7" transparent opacity={.22} depthWrite={false}/>
  </lineSegments>;
}

export function Atmosphere({chapter,mobile}:{chapter:ChapterId;mobile:boolean}){
  const {scene}=useThree();
  const key=regionKey(chapter);
  const weather=regions[key].weather;
  const rainRef=useRef<THREE.Points>(null);
  const geometry=useMemo(()=>{
    const count=mobile?90:150;
    const g=new THREE.BufferGeometry();
    const arr=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      arr[i*3]=(i%25-12)*1.25;
      arr[i*3+1]=2+(i%16)*.62;
      arr[i*3+2]=-10-(i%22)*1.25;
    }
    g.setAttribute("position",new THREE.BufferAttribute(arr,3));
    return g;
  },[mobile]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((_,dt)=>{
    const fog=scene.fog;
    if(fog instanceof THREE.Fog){
      const near=weather==="foggy"?16:weather==="overcast"?22:30;
      const far=weather==="foggy"?88:weather==="overcast"?154:208;
      fog.near=THREE.MathUtils.lerp(fog.near,near,1-Math.exp(-dt*1.6));
      fog.far=THREE.MathUtils.lerp(fog.far,far,1-Math.exp(-dt*1.2));
    }
    if(weather==="rain"&&rainRef.current){
      const attr=rainRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      for(let i=0;i<attr.count;i++){
        const y=attr.getY(i)-dt*8;
        attr.setY(i,y<-.3?11:y);
      }
      attr.needsUpdate=true;
    }
  });
  if(weather!=="rain")return null;
  return <points ref={rainRef} geometry={geometry}>
    <pointsMaterial color="#adc5ea" size={mobile?.018:.026} transparent opacity={.22} sizeAttenuation/>
  </points>;
}

type FireflyField = {
  geometry: THREE.BufferGeometry;
  base: Float32Array;
  phase: Float32Array;
  sway: Float32Array;
};

export function Fireflies({mobile,reducedMotion=false}:{mobile:boolean;reducedMotion?:boolean}){
  const ref=useRef<THREE.Points>(null);
  const field=useMemo<FireflyField>(()=>{
    const count=mobile?28:64;
    const geometry=new THREE.BufferGeometry();
    const positions=new Float32Array(count*3);
    const colors=new Float32Array(count*3);
    const base=new Float32Array(count*3);
    const phase=new Float32Array(count);
    const sway=new Float32Array(count);
    const palette=["#ffd6a1","#ffe8bd","#b9f2e8","#d7c5ff","#ffc7e5"].map(hex=>new THREE.Color(hex));
    for(let i=0;i<count;i++){
      const a=i*2.399963229728653;
      // Scatter insects through the side meadows as well as the central trail.
      const radius=4.5+((i*17)%31)*.88;
      const z=7-((i*29)%122);
      const x=Math.sin(a)*radius;
      const y=.22+((i*7)%11)*.19;
      const p=i*3;
      base[p]=x;base[p+1]=y;base[p+2]=z;
      positions[p]=x;positions[p+1]=y;positions[p+2]=z;
      phase[i]=(i*1.61803398875)%6.28318530718;
      sway[i]=.18+(i%5)*.055;
      const color=palette[i%palette.length];
      colors[p]=color.r;colors[p+1]=color.g;colors[p+2]=color.b;
    }
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
    geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
    geometry.computeBoundingSphere();
    return {geometry,base,phase,sway};
  },[mobile]);
  useEffect(()=>()=>field.geometry.dispose(),[field]);
  useFrame((state)=>{
    const points=ref.current;
    if(!points)return;
    const attr=field.geometry.getAttribute("position") as THREE.BufferAttribute;
    const time=state.clock.elapsedTime*(reducedMotion?.12:1);
    for(let i=0;i<field.phase.length;i++){
      const p=i*3,phase=field.phase[i];
      const x=field.base[p]+Math.sin(time*.43+phase)*field.sway[i];
      const y=field.base[p+1]+Math.sin(time*.9+phase*1.7)*(reducedMotion?.025:.12);
      const z=field.base[p+2]+Math.cos(time*.31+phase)*field.sway[i]*1.25;
      attr.setXYZ(i,x,y,z);
    }
    attr.needsUpdate=true;
  });
  return <points ref={ref} geometry={field.geometry} frustumCulled={false}>
    <pointsMaterial
      size={mobile?.026:.036}
      transparent
      opacity={reducedMotion?.48:.76}
      vertexColors
      depthWrite={false}
      sizeAttenuation
      blending={THREE.AdditiveBlending}
    />
  </points>;
}

type ButterflySeed={x:number;y:number;z:number;yaw:number;phase:number;speed:number};
const BUTTERFLY_SPAWNS:ButterflySeed[]=[
  {x:-3.2,y:1.08,z:3.1,yaw:-.18,phase:.3,speed:.74},
  {x:4.4,y:1.42,z:-2.5,yaw:.42,phase:1.7,speed:.88},
  {x:-5.1,y:1.25,z:-9.8,yaw:-.62,phase:2.8,speed:.68},
  {x:4.1,y:1.65,z:-16.4,yaw:.35,phase:3.9,speed:.79},
  {x:-2.9,y:1.22,z:-25.5,yaw:-.28,phase:4.4,speed:.65},
  {x:5.0,y:1.75,z:-38.8,yaw:.25,phase:5.2,speed:.83},
  {x:-4.1,y:1.35,z:-47.2,yaw:-.48,phase:2.1,speed:.70},
  {x:3.3,y:1.28,z:-62.0,yaw:.66,phase:1.1,speed:.72},
  {x:-5.1,y:1.15,z:-72.5,yaw:-.34,phase:4.8,speed:.76},
  {x:2.4,y:1.7,z:-88.0,yaw:.16,phase:3.1,speed:.62},
  {x:-3.6,y:1.4,z:-99.5,yaw:-.22,phase:5.7,speed:.69},
];

export function Butterflies({mobile,reducedMotion=false}:{mobile:boolean;reducedMotion?:boolean}){
  const leftWing=useRef<THREE.InstancedMesh>(null);
  const rightWing=useRef<THREE.InstancedMesh>(null);
  const bodies=useRef<THREE.InstancedMesh>(null);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const colors=useMemo(()=>["#ffd6e7","#b8e8e1","#d9c4ff","#ffe4b6","#f4c6ee"].map(hex=>new THREE.Color(hex)),[]);
  const seeds=useMemo(()=>BUTTERFLY_SPAWNS.slice(0,mobile?4:9),[mobile]);
  const wingGeometry=useMemo(()=>{
    const shape=new THREE.Shape();
    shape.moveTo(0,0);
    shape.quadraticCurveTo(.075,.025,.13,.105);
    shape.bezierCurveTo(.235,.13,.305,.235,.205,.285);
    shape.quadraticCurveTo(.09,.29,.018,.105);
    shape.quadraticCurveTo(.005,.045,0,0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape,6);
  },[]);
  const bodyGeometry=useMemo(()=>new THREE.SphereGeometry(1,8,6),[]);
  const wingMaterial=useMemo(()=>new THREE.MeshStandardMaterial({
    color:"#ffffff",roughness:.72,metalness:0,side:THREE.DoubleSide,
    emissive:"#38253e",emissiveIntensity:.12,
  }),[]);
  const bodyMaterial=useMemo(()=>new THREE.MeshStandardMaterial({
    color:"#6b526f",roughness:.82,emissive:"#25172c",emissiveIntensity:.08,
  }),[]);
  useEffect(()=>{
    const left=leftWing.current,right=rightWing.current,body=bodies.current;
    if(!left||!right||!body)return;
    const white=new THREE.Color("#ffffff");
    for(let i=0;i<seeds.length;i++){
      const color=colors[i%colors.length];
      left.setColorAt(i,color);
      right.setColorAt(i,color);
      body.setColorAt(i,white);
    }
    if(left.instanceColor)left.instanceColor.needsUpdate=true;
    if(right.instanceColor)right.instanceColor.needsUpdate=true;
    if(body.instanceColor)body.instanceColor.needsUpdate=true;
    left.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    right.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return ()=>{};
  },[seeds,colors]);
  useEffect(()=>()=>{wingGeometry.dispose();bodyGeometry.dispose();wingMaterial.dispose();bodyMaterial.dispose();},[wingGeometry,bodyGeometry,wingMaterial,bodyMaterial]);
  useFrame((state)=>{
    const left=leftWing.current,right=rightWing.current,body=bodies.current;
    if(!left||!right||!body)return;
    const time=state.clock.elapsedTime;
    const motion=reducedMotion?.13:1;
    for(let i=0;i<seeds.length;i++){
      const seed=seeds[i];
      const t=time*seed.speed*motion+seed.phase;
      const x=seed.x+Math.sin(t*.42)*.33;
      const y=seed.y+Math.sin(t*1.15)* (reducedMotion?.025:.12);
      const z=seed.z+Math.cos(t*.31)*.38;
      const flap=Math.sin(time*(reducedMotion?2.0:8.2)*seed.speed+seed.phase)*(reducedMotion?.07:.46);
      dummy.position.set(x-.018,y,z);
      dummy.rotation.set(0,seed.yaw-flap,-.06);
      dummy.scale.set(-1,1,1);
      dummy.updateMatrix();
      left.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x+.018,y,z);
      dummy.rotation.set(0,seed.yaw+flap,.06);
      dummy.scale.set(1,1,1);
      dummy.updateMatrix();
      right.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x,y,z+.035);
      dummy.rotation.set(0,seed.yaw,0);
      dummy.scale.set(.022,.082,.021);
      dummy.updateMatrix();
      body.setMatrixAt(i,dummy.matrix);
    }
    left.instanceMatrix.needsUpdate=true;
    right.instanceMatrix.needsUpdate=true;
    body.instanceMatrix.needsUpdate=true;
  });
  return <group>
    <instancedMesh ref={leftWing} args={[wingGeometry,wingMaterial,seeds.length]} frustumCulled={false} castShadow={false} receiveShadow={false}/>
    <instancedMesh ref={rightWing} args={[wingGeometry,wingMaterial,seeds.length]} frustumCulled={false} castShadow={false} receiveShadow={false}/>
    <instancedMesh ref={bodies} args={[bodyGeometry,bodyMaterial,seeds.length]} frustumCulled={false} castShadow={false} receiveShadow={false}/>
  </group>;
}
