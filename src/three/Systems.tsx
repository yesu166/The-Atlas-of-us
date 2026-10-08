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
        <pointLight position={[0,.45,.1]} distance={1.3} intensity={.18} color="#e7adc7"/>
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
      const near=weather==="foggy"?9:weather==="overcast"?13:17;
      const far=weather==="foggy"?50:weather==="overcast"?70:92;
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
    <pointsMaterial color="#adc5ea" size={mobile?.028:.038} transparent opacity={.32} sizeAttenuation/>
  </points>;
}

export function Fireflies({mobile}:{mobile:boolean}){
  const ref=useRef<THREE.Points>(null);
  const geometry=useMemo(()=>{
    const count=mobile?26:52;
    const g=new THREE.BufferGeometry();
    const arr=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=i*2.17,r=2+(i%9)*.48;
      arr[i*3]=Math.cos(a)*r;
      arr[i*3+1]=.15+(i%8)*.33;
      arr[i*3+2]=1.8-Math.sin(a)*(1.5+(i%6)*.55);
    }
    g.setAttribute("position",new THREE.BufferAttribute(arr,3));
    return g;
  },[mobile]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((state)=>{
    if(ref.current)ref.current.rotation.y=state.clock.elapsedTime*.012;
  });
  return <points ref={ref} geometry={geometry}><pointsMaterial color="#ffd7b3" size={mobile?.08:.1} transparent opacity={.48} sizeAttenuation/></points>;
}
