import {useEffect,useMemo,useRef,useState} from "react";
import type {MutableRefObject} from "react";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import * as THREE from "three";
import type {ChapterId} from "../data";

type MoveRef=MutableRefObject<{x:number;y:number}>;
type Vec3=[number,number,number];
type WorldProps={
  mobile:boolean;
  moveRef:MoveRef;
  collected:string[];
  activeChapter:ChapterId;
  onDiscover:(id:string)=>void;
  onMessage:(message:string)=>void;
};

const theme:{[K in ChapterId]:string}={
  origins:"#d9a4c6",
  curiosity:"#73def0",
  building:"#9eb3ff",
  dreams:"#efb5d0",
  quiet:"#e4cf9c",
  future:"#f2a9c4",
};

const clamp=(v:number,min:number,max:number)=>THREE.MathUtils.clamp(v,min,max);

function Backdrop(){
  return <div className="world-backdrop" aria-hidden="true">
    <div className="backdrop-stars"/>
    <div className="backdrop-horizon"/>
    <div className="backdrop-glow"/>
  </div>;
}

function Starfield({mobile}:{mobile:boolean}){
  const geometry=useMemo(()=>{
    const count=mobile?170:420;
    const g=new THREE.BufferGeometry();
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=(i*2.39996)%(Math.PI*2);
      const radius=10+(i%23)*.52;
      positions[i*3]=Math.cos(a)*radius;
      positions[i*3+1]=2.2+(i%19)*.32;
      positions[i*3+2]=-11-(i%27)*.55;
    }
    g.setAttribute("position",new THREE.BufferAttribute(positions,3));
    return g;
  },[mobile]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <points geometry={geometry}>
    <pointsMaterial color="#efe8ff" size={mobile?.045:.06} sizeAttenuation transparent opacity={.68}/>
  </points>;
}

function Fireflies({mobile}:{mobile:boolean}){
  const geometry=useMemo(()=>{
    const count=mobile?20:42;
    const g=new THREE.BufferGeometry();
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=i*2.13;
      const radius=1.8+(i%8)*.36;
      positions[i*3]=Math.cos(a)*radius;
      positions[i*3+1]=.15+(i%7)*.31;
      positions[i*3+2]=.3-Math.sin(a)*(1.7+(i%6)*.5);
    }
    g.setAttribute("position",new THREE.BufferAttribute(positions,3));
    return g;
  },[mobile]);
  const ref=useRef<THREE.Points>(null);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((state)=>{
    if(ref.current)ref.current.rotation.y=state.clock.elapsedTime*.014;
  });
  return <points ref={ref} geometry={geometry}>
    <pointsMaterial color="#ffd8b8" size={mobile?.09:.115} sizeAttenuation transparent opacity={.72}/>
  </points>;
}

function Moon({onDiscover}:{onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current)ref.current.rotation.y=state.clock.elapsedTime*.012;
  });
  return <group ref={ref} position={[4.15,5.25,-7.2]}>
    <mesh
      onClick={()=>onDiscover("moon")}
      onPointerOver={()=>{document.body.style.cursor="pointer"}}
      onPointerOut={()=>{document.body.style.cursor=""}}
    >
      <sphereGeometry args={[.86,32,32]}/>
      <meshStandardMaterial color="#fff4df" emissive="#c98fb1" emissiveIntensity={.11} roughness={.92}/>
    </mesh>
    <mesh scale={1.035}>
      <sphereGeometry args={[.86,24,24]}/>
      <meshBasicMaterial color="#f4c6d9" transparent opacity={.07}/>
    </mesh>
    <pointLight position={[0,0,0]} distance={7} intensity={3.4} color="#f0dfff"/>
  </group>;
}

function Ground(){
  return <group>
    <mesh position={[0,-.79,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[8.2,72]}/>
      <meshStandardMaterial color="#171426" roughness={.94} metalness={.03}/>
    </mesh>
    <mesh position={[0,-.745,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.1,2.26,72]}/>
      <meshBasicMaterial color="#bd86b6" transparent opacity={.18} side={THREE.DoubleSide}/>
    </mesh>
    <mesh position={[0,-.73,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[2.02,72]}/>
      <meshStandardMaterial color="#21192d" roughness={.38} metalness={.34}/>
    </mesh>
  </group>;
}

function Lake({accent}:{accent:string}){
  const ref=useRef<THREE.Mesh>(null);
  useFrame((state)=>{
    if(ref.current){
      const material=ref.current.material as THREE.MeshStandardMaterial;
      material.opacity=.28+Math.sin(state.clock.elapsedTime*.55)*.025;
    }
  });
  return <group>
    <mesh ref={ref} position={[0,-.61,-4.65]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[3.65,64]}/>
      <meshStandardMaterial color="#0b1725" metalness={.78} roughness={.15} transparent opacity={.28}/>
    </mesh>
    <mesh position={[0,-.59,-4.65]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[3.45,3.7,64]}/>
      <meshBasicMaterial color={accent} transparent opacity={.18} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

function Path(){
  const points:Vec3[]=useMemo(()=>[
    [0,-.62,2.75],
    [.05,-.62,2.18],
    [.08,-.62,1.61],
    [.04,-.62,1.05],
    [.0,-.62,.5],
    [-.05,-.62,-.06],
    [-.08,-.62,-.62],
    [-.05,-.62,-1.18],
  ],[]);
  return <group>
    {points.map((p,i)=><mesh key={i} position={p} rotation={[-Math.PI/2,0,.025*i]}>
      <planeGeometry args={[.98-(i*.025),.5]}/>
      <meshBasicMaterial color={i%2===0?"#b17eb0":"#896da0"} transparent opacity={.11+i*.014}/>
    </mesh>)}
  </group>;
}

function Trees(){
  const trees=useMemo<Vec3[]>(()=>[
    [-5,-.08,.9],[-4.6,-.08,-2.3],[-4.3,-.08,-4.5],[-2.9,-.08,-5.2],
    [4.8,-.08,.75],[4.55,-.08,-2.0],[4.0,-.08,-4.15],[2.85,-.08,-5.05],
  ],[]);
  return <group>
    {trees.map((p,i)=><group key={i} position={p} rotation={[0,i*.41,0]}>
      <mesh position={[0,.62,0]}>
        <cylinderGeometry args={[.11,.17,1.23,7]}/>
        <meshStandardMaterial color="#151116" roughness={1}/>
      </mesh>
      <mesh position={[0,1.47,0]}>
        <coneGeometry args={[.7,1.86,8]}/>
        <meshStandardMaterial color={i%2?"#1a2332":"#1a2220"} roughness={1}/>
      </mesh>
      <mesh position={[0,2.08,0]}>
        <coneGeometry args={[.48,1.18,8]}/>
        <meshStandardMaterial color="#202926" roughness={1}/>
      </mesh>
    </group>)}
  </group>;
}

function Lantern({position,index,accent,onDiscover}:{position:Vec3;index:number;accent:string;onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current)ref.current.scale.setScalar(1+Math.sin(state.clock.elapsedTime*2+index)*.035);
  });
  return <group
    ref={ref}
    position={position}
    onClick={()=>onDiscover("lantern-"+index)}
    onPointerOver={()=>{document.body.style.cursor="pointer"}}
    onPointerOut={()=>{document.body.style.cursor=""}}
  >
    <mesh position={[0,.53,0]}>
      <cylinderGeometry args={[.12,.16,.68,8]}/>
      <meshStandardMaterial color="#281c21" roughness={.82}/>
    </mesh>
    <mesh position={[0,.99,0]}>
      <sphereGeometry args={[.165,16,16]}/>
      <meshStandardMaterial color="#ffe0b8" emissive={accent} emissiveIntensity={2.0} roughness={.24}/>
    </mesh>
    <mesh position={[0,.99,0]} scale={1.9}>
      <sphereGeometry args={[.16,12,12]}/>
      <meshBasicMaterial color={accent} transparent opacity={.055}/>
    </mesh>
    <pointLight position={[0,1,0]} distance={2.5} intensity={1.15} color={accent}/>
  </group>;
}

function Bench(){
  return <group position={[-2.35,-.55,.15]} rotation={[0,.22,0]}>
    <mesh position={[0,.37,0]}>
      <boxGeometry args={[1.25,.11,.34]}/>
      <meshStandardMaterial color="#4a2d2d" roughness={.8}/>
    </mesh>
    <mesh position={[-.47,.1,0]}>
      <boxGeometry args={[.1,.48,.27]}/>
      <meshStandardMaterial color="#2c1d21"/>
    </mesh>
    <mesh position={[.47,.1,0]}>
      <boxGeometry args={[.1,.48,.27]}/>
      <meshStandardMaterial color="#2c1d21"/>
    </mesh>
  </group>;
}

function TechOrb({position,label,color,onDiscover}:{position:Vec3;label:string;color:string;onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(!ref.current)return;
    ref.current.rotation.y=state.clock.elapsedTime*.24;
    ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*1.25+position[0])*.075;
  });
  const id=label.toLowerCase().replace(/[^a-z]+/g,"-");
  return <group
    ref={ref}
    position={position}
    onClick={()=>onDiscover(id)}
    onPointerOver={()=>{document.body.style.cursor="pointer"}}
    onPointerOut={()=>{document.body.style.cursor=""}}
  >
    <mesh>
      <icosahedronGeometry args={[.3,1]}/>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.5} metalness={.35} roughness={.32}/>
    </mesh>
    <mesh scale={1.45}>
      <torusGeometry args={[.37,.025,8,28]}/>
      <meshBasicMaterial color={color} transparent opacity={.58}/>
    </mesh>
    <pointLight position={[0,0,0]} distance={1.7} intensity={.35} color={color}/>
  </group>;
}

function HeartPickup({position,id,hidden,onDiscover}:{position:Vec3;id:string;hidden:boolean;onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current){
      ref.current.rotation.y=state.clock.elapsedTime*.75;
      ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*2.1+position[0])*.1;
    }
  });
  if(hidden)return null;
  return <group
    ref={ref}
    position={position}
    onClick={()=>onDiscover(id)}
    onPointerOver={()=>{document.body.style.cursor="pointer"}}
    onPointerOut={()=>{document.body.style.cursor=""}}
  >
    <mesh position={[-.12,.035,0]}>
      <sphereGeometry args={[.15,16,16]}/>
      <meshStandardMaterial color="#f59abd" emissive="#9b3d64" emissiveIntensity={1.7}/>
    </mesh>
    <mesh position={[.12,.035,0]}>
      <sphereGeometry args={[.15,16,16]}/>
      <meshStandardMaterial color="#f59abd" emissive="#9b3d64" emissiveIntensity={1.7}/>
    </mesh>
    <mesh position={[0,-.1,0]} rotation={[0,0,Math.PI]}>
      <coneGeometry args={[.21,.42,16]}/>
      <meshStandardMaterial color="#ed84ac" emissive="#84304f" emissiveIntensity={1.45}/>
    </mesh>
  </group>;
}

function Portal({unlocked,accent,onDiscover}:{unlocked:boolean;accent:string;onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current){
      ref.current.rotation.z=Math.sin(state.clock.elapsedTime*.45)*.045;
      ref.current.rotation.y=state.clock.elapsedTime*(unlocked?.08:.02);
    }
  });
  return <group
    ref={ref}
    position={[3.55,.45,-1.35]}
    onClick={()=>onDiscover("future-portal")}
    onPointerOver={()=>{document.body.style.cursor="pointer"}}
    onPointerOut={()=>{document.body.style.cursor=""}}
  >
    <mesh>
      <torusGeometry args={[.93,.07,12,48]}/>
      <meshStandardMaterial color={unlocked?accent:"#4b3a4a"} emissive={unlocked?accent:"#171018"} emissiveIntensity={unlocked?1.55:.3} metalness={.45} roughness={.32}/>
    </mesh>
    <mesh scale={.82}>
      <circleGeometry args={[1,48]}/>
      <meshBasicMaterial color={unlocked?accent:"#15101c"} transparent opacity={unlocked?.11:.035}/>
    </mesh>
    {unlocked&&<pointLight distance={3.3} intensity={1.4} color={accent}/>}
  </group>;
}

function Player({moveRef,mobile,onMessage}:{moveRef:MoveRef;mobile:boolean;onMessage:(message:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  const keys=useRef<Record<string,boolean>>({});
  const {camera,pointer}=useThree();
  const lookTarget=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true};
    const up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)};
  },[]);
  useFrame((state,dt)=>{
    if(!ref.current)return;
    let x=moveRef.current.x;
    let y=moveRef.current.y;
    if(!mobile){
      x+=(keys.current.d||keys.current.arrowright?1:0)-(keys.current.a||keys.current.arrowleft?1:0);
      y+=(keys.current.s||keys.current.arrowdown?1:0)-(keys.current.w||keys.current.arrowup?1:0);
    }
    const length=Math.hypot(x,y);
    if(length>1){x/=length;y/=length}
    const speed=mobile?1.85:2.35;
    const bounds=5.7;
    const moving=length>.08;
    ref.current.position.x=clamp(ref.current.position.x+x*speed*dt,-bounds,bounds);
    ref.current.position.z=clamp(ref.current.position.z+y*speed*dt,-bounds,bounds);
    ref.current.position.y=.14+Math.sin(state.clock.elapsedTime*4.5)*.025;
    if(moving)ref.current.rotation.y=THREE.MathUtils.lerp(ref.current.rotation.y,Math.atan2(x,y),Math.min(1,dt*8));
    lookTarget.set(
      ref.current.position.x+pointer.x*(mobile?.55:.9),
      .74+pointer.y*(mobile?.3:.44),
      ref.current.position.z-.1
    );
    const desiredZ=ref.current.position.z+(mobile?8.6:7.8);
    const ease=1-Math.exp(-dt*2.8);
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,ref.current.position.x+pointer.x*(mobile?.55:.9),ease);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,2.95+pointer.y*(mobile?.22:.38),ease);
    camera.position.z=THREE.MathUtils.lerp(camera.position.z,desiredZ,ease);
    camera.lookAt(lookTarget);
  });
  return <group ref={ref} position={[0,.14,2.1]}>
    <mesh position={[0,.31,0]}>
      <sphereGeometry args={[.24,18,18]}/>
      <meshStandardMaterial color="#f1d8e6" emissive="#8c5877" emissiveIntensity={.45} roughness={.46}/>
    </mesh>
    <mesh position={[0,.08,0]}>
      <capsuleGeometry args={[.19,.38,4,10]}/>
      <meshStandardMaterial color="#9c6d96" emissive="#5e345d" emissiveIntensity={.28} roughness={.52} metalness={.12}/>
    </mesh>
    <mesh position={[0,-.15,0]}>
      <ringGeometry args={[.3,.36,28]}/>
      <meshBasicMaterial color="#efa7c4" transparent opacity={.28} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

function Scene({mobile,moveRef,collected,activeChapter,onDiscover,onMessage}:{mobile:boolean;moveRef:MoveRef;collected:string[];activeChapter:ChapterId;onDiscover:(id:string)=>void;onMessage:(message:string)=>void}){
  const accent=theme[activeChapter];
  const futureOpen=collected.filter(x=>x.startsWith("heart-")||x.startsWith("game-")).length>=3;
  return <>
    <ambientLight intensity={.56}/>
    <directionalLight position={[-4,7,3]} intensity={1.3} color="#c6b9ff"/>
    <pointLight position={[0,1.8,-3.4]} intensity={mobile?3.5:5.5} distance={10} color={accent}/>
    <Starfield mobile={mobile}/>
    <Fireflies mobile={mobile}/>
    <Moon onDiscover={onDiscover}/>
    <Ground/>
    <Lake accent={accent}/>
    <Path/>
    <Trees/>
    <Bench/>
    <Lantern position={[-2.8,0,.95]} index={1} accent={accent} onDiscover={onDiscover}/>
    <Lantern position={[2.45,0,-1.65]} index={2} accent={accent} onDiscover={onDiscover}/>
    <Lantern position={[-1.1,0,-3.0]} index={3} accent={accent} onDiscover={onDiscover}/>
    <TechOrb position={[-2.45,1.65,-.65]} label="Python" color="#65dff0" onDiscover={onDiscover}/>
    <TechOrb position={[-.55,2.18,-2.2]} label="AI / ML" color="#ae8aff" onDiscover={onDiscover}/>
    <TechOrb position={[1.75,1.6,-3.05]} label="Software" color="#8dbfff" onDiscover={onDiscover}/>
    <TechOrb position={[3.15,1.3,.65]} label="Robotics" color="#72dfbf" onDiscover={onDiscover}/>
    <TechOrb position={[-3.25,1.15,-2.85]} label="Web" color="#f0a2c0" onDiscover={onDiscover}/>
    <HeartPickup position={[-4.15,.85,-1.3]} id="heart-world-1" hidden={collected.includes("heart-world-1")} onDiscover={onDiscover}/>
    <HeartPickup position={[3.45,1.85,-2.05]} id="heart-world-2" hidden={collected.includes("heart-world-2")} onDiscover={onDiscover}/>
    <HeartPickup position={[1.15,1.55,1.55]} id="heart-world-3" hidden={collected.includes("heart-world-3")} onDiscover={onDiscover}/>
    <Portal unlocked={futureOpen} accent={accent} onDiscover={onDiscover}/>
    <Player moveRef={moveRef} mobile={mobile} onMessage={onMessage}/>
  </>;
}

function CanvasFallback({contextLost,onReload}:{contextLost:boolean;onReload:()=>void}){
  return <div className="world-fallback">
    <div className="fallback-orbit"/>
    <div className="fallback-content">
      <span className="micro">{contextLost?"WEBGL PAUSED":"3D MODE UNAVAILABLE"}</span>
      <h2>{contextLost?"The world is taking a breath.":"A quieter version is ready."}</h2>
      <p>{contextLost?"Your progress is safe. Reload the scene when you are ready.":"This browser could not start the 3D renderer, so the story stays usable instead of turning into a blank screen."}</p>
      {contextLost&&<button className="primary" onClick={onReload}>Reload 3D world</button>}
      <div className="fallback-points"><span>♡ progress stays local</span><span>✦ mobile safe</span><span>⌁ no account required</span></div>
    </div>
  </div>;
}

export function World({mobile,moveRef,collected,activeChapter,onDiscover,onMessage}:WorldProps){
  const [contextLost,setContextLost]=useState(false);
  useEffect(()=>{
    const onVisibility=()=>{if(document.hidden)moveRef.current={x:0,y:0}};
    document.addEventListener("visibilitychange",onVisibility);
    return()=>document.removeEventListener("visibilitychange",onVisibility);
  },[moveRef]);
  useEffect(()=>{
    if(contextLost)onMessage("3D graphics paused to keep the device responsive.");
  },[contextLost,onMessage]);
  useEffect(()=>()=>{document.body.style.cursor=""},[]);

  return <div className="world-stage">
    <Backdrop/>
    <Canvas
      camera={{position:[0,2.95,7.9],fov:48,near:.1,far:80}}
      dpr={mobile?[1,1.06]:[1,1.45]}
      gl={{antialias:!mobile,powerPreference:mobile?"low-power":"high-performance",alpha:true,preserveDrawingBuffer:false}}
      performance={{min:.55,max:1,debounce:250}}
      shadows={false}
      onCreated={({gl})=>{
        gl.setClearColor(0x000000,0);
        const canvas=gl.domElement;
        const lost=(event:Event)=>{event.preventDefault();setContextLost(true)};
        const restored=()=>setContextLost(false);
        canvas.addEventListener("webglcontextlost",lost,false);
        canvas.addEventListener("webglcontextrestored",restored,false);
      }}
      fallback={<CanvasFallback contextLost={false} onReload={()=>location.reload()}/>}
    >
      <fog attach="fog" args={["#07050d",7,23]}/>
      <Scene mobile={mobile} moveRef={moveRef} collected={collected} activeChapter={activeChapter} onDiscover={onDiscover} onMessage={onMessage}/>
    </Canvas>
    {contextLost&&<CanvasFallback contextLost onReload={()=>location.reload()}/>}
    <div className="world-hint" aria-hidden="true">
      <span className="world-hint-dot"/>
      <span>{mobile?"Move · drag to look · tap to discover":"WASD to move · mouse to look · click to discover"}</span>
    </div>
  </div>;
}
