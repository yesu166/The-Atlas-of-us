import {useEffect,useRef,useState} from "react";
import type {MutableRefObject} from "react";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {Html,Sparkles,Stars,Float} from "@react-three/drei";
import * as THREE from "three";
import type {ChapterId} from "../data";

type MoveRef=MutableRefObject<{x:number;y:number}>;
type WorldProps={mobile:boolean;moveRef:MoveRef;collected:string[];activeChapter:ChapterId;onDiscover:(id:string)=>void;onMessage:(message:string)=>void};

const theme:{[K in ChapterId]:string}={origins:"#b6a0ff",curiosity:"#67e8ff",building:"#7eb7ff",dreams:"#f5c0da",quiet:"#e9d9b0",future:"#f0a8bd"};

function Ground(){return <group>
  <mesh position={[0,-.72,0]} rotation={[-Math.PI/2,0,0]}>
    <circleGeometry args={[8,64]}/><meshStandardMaterial color="#111020" roughness={.86} metalness={.08}/>
  </mesh>
  <mesh position={[0,-.69,0]} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[2.15,2.34,64]}/><meshBasicMaterial color="#8f6eaa" transparent opacity={.28} side={THREE.DoubleSide}/>
  </mesh>
  <mesh position={[0,-.675,0]} rotation={[-Math.PI/2,0,0]}>
    <circleGeometry args={[2.1,64]}/><meshStandardMaterial color="#1a1730" roughness={.25} metalness={.45}/>
  </mesh>
</group>}

function Trees(){const trees=Array.from({length:11},(_,i)=>{const a=i*.57;return [Math.cos(a)*4.8,-.05,Math.sin(a)*4.8] as [number,number,number]});return <group>{trees.map((p,i)=><group key={i} position={p}>
  <mesh position={[0,.65,0]}><cylinderGeometry args={[.11,.16,1.2,7]}/><meshStandardMaterial color="#1a1217" roughness={1}/></mesh>
  <mesh position={[0,1.45,0]}><coneGeometry args={[.72,1.9,8]}/><meshStandardMaterial color={i%3===0?"#1c2533":"#17201f"} roughness={1}/></mesh>
  <mesh position={[0,2.1,0]}><coneGeometry args={[.5,1.25,8]}/><meshStandardMaterial color="#1c2523" roughness={1}/></mesh>
</group>)}</group>}

function Lantern({position,index,onDiscover}:{position:[number,number,number];index:number;onDiscover:(id:string)=>void}){const light=useRef<THREE.PointLight>(null);const mesh=useRef<THREE.Mesh>(null);useFrame((state)=>{if(light.current)light.current.intensity=1.8+Math.sin(state.clock.elapsedTime*2+index)*.45;if(mesh.current)mesh.current.rotation.y+=.002});return <group position={position} onClick={()=>onDiscover("lantern-"+index)}>
  <mesh ref={mesh} position={[0,.55,0]}><cylinderGeometry args={[.13,.17,.7,8]}/><meshStandardMaterial color="#241a1e" roughness={.8}/></mesh>
  <mesh position={[0,1.02,0]}><sphereGeometry args={[.18,12,12]}/><meshStandardMaterial color="#ffd7ad" emissive="#ff8d67" emissiveIntensity={1.8}/></mesh>
  <pointLight ref={light} position={[0,1.02,0]} distance={3.3} color="#ff9f77" intensity={2}/>
  <Html position={[0,1.35,0]} center distanceFactor={11}><span className="world-label">lantern</span></Html>
</group>}

function TechOrb({position,label,color,onDiscover}:{position:[number,number,number];label:string;color:string;onDiscover:(id:string)=>void}){const ref=useRef<THREE.Group>(null);useFrame((state)=>{if(ref.current){ref.current.rotation.y=state.clock.elapsedTime*.35;ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*1.4+position[0])*.08}});return <group ref={ref} position={position} onClick={()=>onDiscover(label.toLowerCase().replace(/[^a-z]+/g,"-"))}>
  <Float speed={1.8} rotationIntensity={.3} floatIntensity={.2}><mesh><icosahedronGeometry args={[.33,1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.32} metalness={.35} roughness={.34}/></mesh>
  <mesh scale={1.55}><ringGeometry args={[.43,.46,32]}/><meshBasicMaterial color={color} transparent opacity={.36} side={THREE.DoubleSide}/></mesh></Float>
  <Html position={[0,.65,0]} center distanceFactor={10}><span className="world-label">{label}</span></Html>
</group>}

function HeartPickup({position,id,hidden,onDiscover}:{position:[number,number,number];id:string;hidden:boolean;onDiscover:(id:string)=>void}){const ref=useRef<THREE.Group>(null);useFrame((state)=>{if(ref.current){ref.current.rotation.y=state.clock.elapsedTime*.9;ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*2.2+position[0])*.12}});if(hidden)return null;return <group ref={ref} position={position} onClick={()=>onDiscover(id)}>
  <mesh position={[-.13,.04,0]}><sphereGeometry args={[.17,16,16]}/><meshStandardMaterial color="#f08db1" emissive="#8c3659" emissiveIntensity={1.5}/></mesh>
  <mesh position={[.13,.04,0]}><sphereGeometry args={[.17,16,16]}/><meshStandardMaterial color="#f08db1" emissive="#8c3659" emissiveIntensity={1.5}/></mesh>
  <mesh position={[0,-.11,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.23,.46,16]}/><meshStandardMaterial color="#e881aa" emissive="#78304f" emissiveIntensity={1.3}/></mesh>
  <Html position={[0,.5,0]} center distanceFactor={11}><span className="world-label heart-label">♡</span></Html>
</group>}

function Portal({unlocked,onDiscover}:{unlocked:boolean;onDiscover:(id:string)=>void}){const ref=useRef<THREE.Group>(null);useFrame((state)=>{if(ref.current)ref.current.rotation.z=Math.sin(state.clock.elapsedTime*.55)*.045});return <group ref={ref} position={[4.1,.1,-.8]} onClick={()=>onDiscover("future-portal")}>
  <mesh><torusGeometry args={[1.05,.08,12,64]}/><meshStandardMaterial color={unlocked?"#f0a9c2":"#514150"} emissive={unlocked?"#8a375e":"#1c1520"} emissiveIntensity={unlocked?1.2:.2}/></mesh>
  <mesh><circleGeometry args={[.9,64]}/><meshBasicMaterial color={unlocked?"#e7a6c3":"#201725"} transparent opacity={unlocked?.12:.05}/></mesh>
  <Html position={[0,1.35,0]} center distanceFactor={10}><span className="world-label">{unlocked?"enter":"locked"}</span></Html>
</group>}

function Path(){
 const points=[[-1.7,-.63,2.7],[-1.25,-.63,2.05],[-.72,-.63,1.4],[-.25,-.63,.75],[0,-.63,.2]] as [number,number,number][];
 return <group>{points.map((p,i)=><mesh key={i} position={p} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.8,.42]}/><meshBasicMaterial color="#8b6aab" transparent opacity={.10+(i*.018)} /></mesh>)}</group>
}
function Water(){
 const ref=useRef<THREE.Mesh>(null);
 useFrame((state)=>{if(ref.current){const m=ref.current.material as THREE.MeshStandardMaterial;m.opacity=.42+Math.sin(state.clock.elapsedTime*.7)*.03}});
 return <mesh ref={ref} position={[0,-.59,-4.7]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[4.6,64]}/><meshStandardMaterial color="#0b1624" metalness={.65} roughness={.18} transparent opacity={.42}/></mesh>
}
function Bench({position}:{position:[number,number,number]}){
 return <group position={position} rotation={[0,.35,0]}><mesh position={[0,.38,0]}><boxGeometry args={[1.25,.12,.34]}/><meshStandardMaterial color="#3a2524" roughness={.82}/></mesh><mesh position={[-.47,.12,0]}><boxGeometry args={[.1,.48,.28]}/><meshStandardMaterial color="#2d1e20"/></mesh><mesh position={[.47,.12,0]}><boxGeometry args={[.1,.48,.28]}/><meshStandardMaterial color="#2d1e20"/></mesh></group>
}
function Book({onDiscover}:{onDiscover:(id:string)=>void}){
 const ref=useRef<THREE.Group>(null);useFrame((state)=>{if(ref.current){ref.current.rotation.y=.15+Math.sin(state.clock.elapsedTime*.5)*.18;ref.current.position.y=1.2+Math.sin(state.clock.elapsedTime*.9)*.08}});
 return <group ref={ref} position={[-1.9,1.2,-.9]} onClick={()=>onDiscover("book")}><mesh rotation={[0,0,.12]}><boxGeometry args={[.72,.12,.48]}/><meshStandardMaterial color="#8c5b77" roughness={.78}/></mesh><mesh position={[0,.08,0]} rotation={[0,0,-.12]}><boxGeometry args={[.64,.06,.43]}/><meshStandardMaterial color="#f0dcc4" roughness={1}/></mesh><Html position={[0,.42,0]} center distanceFactor={10}><span className="world-label">book</span></Html></group>
}
function Telescope({onDiscover}:{onDiscover:(id:string)=>void}){
 return <group position={[2.1,.35,-1.1]} rotation={[0,-.45,.15]} onClick={()=>onDiscover("telescope")}><mesh><cylinderGeometry args={[.17,.21,.92,10]}/><meshStandardMaterial color="#5f4b76" metalness={.5} roughness={.32}/></mesh><mesh position={[0,.47,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.23,.13,.5,12]}/><meshStandardMaterial color="#c9b8d8" metalness={.25}/></mesh><mesh position={[0,-.6,0]} rotation={[0,0,.05]}><cylinderGeometry args={[.07,.16,.9,8]}/><meshStandardMaterial color="#30202b"/></mesh><Html position={[0,1.05,0]} center distanceFactor={10}><span className="world-label">telescope</span></Html></group>
}
function SkyConstellation(){
 const pts: [number,number,number][] = [[0,4.25,-4.8],[.55,4.65,-4.4],[1.05,4.25,-4.65],[.72,3.85,-4.2],[.05,3.88,-4.35]];
 return <group>{pts.map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[.035,8,8]}/><meshBasicMaterial color={i===2?"#ffdcae":"#9eb7ff"}/></mesh>)}</group>
}
function Player({moveRef,mobile,onMessage}:{moveRef:MoveRef;mobile:boolean;onMessage:(message:string)=>void}){const ref=useRef<THREE.Group>(null);const keys=useRef<Record<string,boolean>>({});const {camera,clock,pointer}=useThree();const bounds=5.5;useEffect(()=>{const kd=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true};const ku=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku)}},[]);
useFrame((_,dt)=>{if(!ref.current)return;let x=moveRef.current.x;let y=moveRef.current.y;if(!mobile){x+=(keys.current.d||keys.current.arrowright?1:0)-(keys.current.a||keys.current.arrowleft?1:0);y+=(keys.current.s||keys.current.arrowdown?1:0)-(keys.current.w||keys.current.arrowup?1:0)}const len=Math.hypot(x,y)||1;x/=len;y/=len;const speed=mobile?2.05:2.55;ref.current.position.x=THREE.MathUtils.clamp(ref.current.position.x+x*speed*dt,-bounds,bounds);ref.current.position.z=THREE.MathUtils.clamp(ref.current.position.z+y*speed*dt,-bounds,bounds);ref.current.position.y=.18+Math.sin(clock.elapsedTime*5)*.035;ref.current.rotation.y=THREE.MathUtils.lerp(ref.current.rotation.y,Math.atan2(x,y),Math.min(1,dt*8));const targetX=ref.current.position.x+pointer.x*1.15;const targetY=3.55+pointer.y*.55;const targetZ=ref.current.position.z+8.0;camera.position.lerp(new THREE.Vector3(targetX,targetY,targetZ),1-Math.exp(-dt*2.7));camera.lookAt(ref.current.position.x,1.05,ref.current.position.z);});
return <group ref={ref} position={[0,.18,1.8]}><mesh castShadow><sphereGeometry args={[.25,18,18]}/><meshStandardMaterial color="#f0d9e7" emissive="#74506e" emissiveIntensity={.45}/></mesh><mesh position={[0,-.14,0]}><ringGeometry args={[.34,.4,28]}/><meshBasicMaterial color="#f0a8c6" transparent opacity={.32} side={THREE.DoubleSide}/></mesh></group>}

export function World({mobile,moveRef,collected,activeChapter,onDiscover,onMessage}:WorldProps){
 const moon=useRef<THREE.Group>(null);const [contextLost,setContextLost]=useState(false);
 useEffect(()=>{return()=>setContextLost(false)},[]);
 useEffect(()=>{if(!contextLost)return; onMessage("3D graphics were paused to keep your phone responsive.");},[contextLost,onMessage]);
 useEffect(()=>{const onVisibility=()=>{if(document.hidden)moveRef.current={x:0,y:0}};document.addEventListener("visibilitychange",onVisibility);return()=>document.removeEventListener("visibilitychange",onVisibility)},[moveRef]);
 useFrame((state)=>{if(moon.current)moon.current.rotation.y=state.clock.elapsedTime*.025});
 const accent=theme[activeChapter];const futureOpen=collected.filter(x=>x.startsWith("heart-")||x.startsWith("game-")).length>=3;
 if(contextLost)return <div className="world-fallback"><div className="fallback-orbit"/><div className="fallback-content"><span className="micro">MOBILE SAFE MODE</span><h2>The world is taking a breath.</h2><p>The browser dropped the WebGL context. Your story is safe. Reload this page to try the 3D scene again.</p><button className="primary" onClick={()=>location.reload()}>Reload 3D world</button></div></div>;
 return <Canvas fallback={<div className="world-fallback"><div className="fallback-orbit"/><div className="fallback-content"><span className="micro">3D MODE UNAVAILABLE</span><h2>A quieter version is ready.</h2><p>This device/browser could not start WebGL, so the interface is kept usable instead of showing a black screen.</p></div></div>} dpr={mobile?[1,1.15]:[1,1.6]} camera={{position:[0,3.5,8],fov:50,near:.1,far:60}} gl={{antialias:!mobile,powerPreference:mobile?"low-power":"high-performance",alpha:true}} performance={{min:0.5,max:1,debounce:250}} shadows={!mobile} onCreated={({gl})=>{gl.domElement.addEventListener("webglcontextlost",()=>setContextLost(true),{once:true})}}>
  <color attach="background" args={["#06040b"]}/><fog attach="fog" args={["#06040b",7,24]}/>
  <ambientLight intensity={.34}/><directionalLight position={[-3,6,3]} intensity={1.1} color="#bba9ff"/>
  <pointLight position={[0,2,-4]} intensity={10} distance={11} color={accent}/>
  <Stars radius={40} depth={22} count={mobile?650:1500} factor={2.2} saturation={.12} fade speed={.18}/>
  <Sparkles count={mobile?40:95} scale={[13,5,10]} size={2.1} speed={.22} color="#ffd7bb" opacity={.52}/>
  <group ref={moon} position={[2.7,4.9,-5]}><mesh onClick={()=>onDiscover("moon")}><sphereGeometry args={[1.05,28,28]}/><meshStandardMaterial color="#fff1d2" emissive="#693e64" emissiveIntensity={.11} roughness={.96}/></mesh><pointLight distance={9} intensity={6} color="#eed7ff"/></group>
  <Ground/><Water/><Path/><Trees/><Bench position={[-1.8,-.62,1.15]}/><Book onDiscover={onDiscover}/><Telescope onDiscover={onDiscover}/><SkyConstellation/>
  <Lantern position={[-2.5,.0,1.0]} index={1} onDiscover={onDiscover}/><Lantern position={[1.8,.0,-1.8]} index={2} onDiscover={onDiscover}/><Lantern position={[-1.0,.0,-3.0]} index={3} onDiscover={onDiscover}/>
  <TechOrb position={[-2.5,1.9,-.5]} label="Python" color="#67e8ff" onDiscover={onDiscover}/>
  <TechOrb position={[-.7,2.5,-2.4]} label="AI / ML" color="#aa7aff" onDiscover={onDiscover}/>
  <TechOrb position={[1.8,1.8,-3.3]} label="Software" color="#8fc8ff" onDiscover={onDiscover}/>
  <TechOrb position={[3.2,1.4,1.0]} label="Robotics" color="#75e2bd" onDiscover={onDiscover}/>
  <TechOrb position={[-3.2,1.25,-3.3]} label="Web" color="#f0a1c1" onDiscover={onDiscover}/>
  <HeartPickup position={[-4.3,1.0,-1.6]} id="heart-world-1" hidden={collected.includes("heart-world-1")} onDiscover={onDiscover}/>
  <HeartPickup position={[3.4,2.15,-1.6]} id="heart-world-2" hidden={collected.includes("heart-world-2")} onDiscover={onDiscover}/>
  <HeartPickup position={[1.1,2.0,2.6]} id="heart-world-3" hidden={collected.includes("heart-world-3")} onDiscover={onDiscover}/>
  <Portal unlocked={futureOpen} onDiscover={onDiscover}/>
  <Player moveRef={moveRef} mobile={mobile} onMessage={onMessage}/>
 </Canvas>
}
