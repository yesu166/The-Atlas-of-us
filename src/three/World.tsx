import {useEffect,useMemo,useRef,useState} from "react";
import type {MutableRefObject} from "react";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import * as THREE from "three";
import type {ChapterId} from "../data";

type MoveRef=MutableRefObject<{x:number;y:number}>;
type WorldProps={
  mobile:boolean;
  moveRef:MoveRef;
  collected:string[];
  activeChapter:ChapterId;
  onDiscover:(id:string)=>void;
  onMessage:(message:string)=>void;
};

const theme:{[K in ChapterId]:string}={
  origins:"#b6a0ff",
  curiosity:"#67e8ff",
  building:"#7eb7ff",
  dreams:"#f5c0da",
  quiet:"#e9d9b0",
  future:"#f0a8bd",
};

const clamp=(v:number,min:number,max:number)=>THREE.MathUtils.clamp(v,min,max);

function Backdrop(){
  return <div className="world-backdrop" aria-hidden="true">
    <div className="backdrop-stars"/>
    <div className="backdrop-moon"/>
    <div className="backdrop-horizon"/>
    <div className="backdrop-glow"/>
  </div>;
}

function Ground(){
  return <group>
    <mesh position={[0,-.76,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[8,64]}/>
      <meshStandardMaterial color="#121020" roughness={.92} metalness={.04}/>
    </mesh>
    <mesh position={[0,-.70,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.12,2.40,64]}/>
      <meshBasicMaterial color="#9774b5" transparent opacity={.25} side={THREE.DoubleSide}/>
    </mesh>
    <mesh position={[0,-.685,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[2.08,64]}/>
      <meshStandardMaterial color="#19152d" roughness={.34} metalness={.38}/>
    </mesh>
  </group>;
}

function Path(){
  const points:[[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[
    [-1.75,-.62,2.75],
    [-1.28,-.62,2.08],
    [-.78,-.62,1.44],
    [-.34,-.62,.82],
    [0,-.62,.24],
  ];
  return <group>
    {points.map((p,i)=><mesh key={i} position={p} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.82,.46]}/>
      <meshBasicMaterial color="#9470ad" transparent opacity={.11+i*.025}/>
    </mesh>)}
  </group>;
}

function Trees(){
  const trees=useMemo(()=>Array.from({length:12},(_,i)=>{
    const a=i*(Math.PI*2/12)+.15;
    const r=4.9+(i%2)*.25;
    return [Math.cos(a)*r,-.08,Math.sin(a)*r] as [number,number,number];
  }),[]);
  return <group>
    {trees.map((p,i)=><group key={i} position={p} rotation={[0,i*.31,0]}>
      <mesh position={[0,.62,0]}>
        <cylinderGeometry args={[.12,.18,1.24,7]}/>
        <meshStandardMaterial color="#171117" roughness={1}/>
      </mesh>
      <mesh position={[0,1.48,0]}>
        <coneGeometry args={[.76,1.92,8]}/>
        <meshStandardMaterial color={i%3===0?"#1c2534":"#18211f"} roughness={1}/>
      </mesh>
      <mesh position={[0,2.12,0]}>
        <coneGeometry args={[.52,1.32,8]}/>
        <meshStandardMaterial color="#1d2825" roughness={1}/>
      </mesh>
    </group>)}
  </group>;
}

function Starfield({mobile}:{mobile:boolean}){
  const geometry=useMemo(()=>{
    const count=mobile?140:300;
    const g=new THREE.BufferGeometry();
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const angle=(i*2.39996)%(Math.PI*2);
      const radius=9+(i%17)*.75;
      positions[i*3]=Math.cos(angle)*radius;
      positions[i*3+1]=3+(i%13)*.46;
      positions[i*3+2]=-6-(i%19)*.58;
    }
    g.setAttribute("position",new THREE.BufferAttribute(positions,3));
    return g;
  },[mobile]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <points geometry={geometry}>
    <pointsMaterial color="#e7e0ff" size={mobile?.055:.07} sizeAttenuation transparent opacity={.78}/>
  </points>;
}

function Fireflies({mobile}:{mobile:boolean}){
  const geometry=useMemo(()=>{
    const count=mobile?28:54;
    const g=new THREE.BufferGeometry();
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=i*2.1;
      positions[i*3]=Math.cos(a)*((i%7)+1.6);
      positions[i*3+1]=.2+(i%6)*.42;
      positions[i*3+2]=-.8-(i%11)*.48;
    }
    g.setAttribute("position",new THREE.BufferAttribute(positions,3));
    return g;
  },[mobile]);
  const ref=useRef<THREE.Points>(null);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((state)=>{
    if(ref.current)ref.current.rotation.y=state.clock.elapsedTime*.012;
  });
  return <points ref={ref} geometry={geometry}>
    <pointsMaterial color="#ffd8b7" size={mobile?.11:.13} sizeAttenuation transparent opacity={.64}/>
  </points>;
}

function Moon({onDiscover}:{onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current)ref.current.rotation.y=state.clock.elapsedTime*.02;
  });
  return <group ref={ref} position={[2.7,4.9,-5.6]}>
    <mesh onClick={()=>onDiscover("moon")} onPointerOver={()=>{document.body.style.cursor="pointer"}} onPointerOut={()=>{document.body.style.cursor=""}}>
      <sphereGeometry args={[1.03,28,28]}/>
      <meshStandardMaterial color="#fff1d2" emissive="#684564" emissiveIntensity={.14} roughness={.94}/>
    </mesh>
    <mesh scale={1.06}>
      <ringGeometry args={[1.08,1.12,48]}/>
      <meshBasicMaterial color="#eab6cf" transparent opacity={.09} side={THREE.DoubleSide}/>
    </mesh>
    <pointLight position={[0,0,0]} distance={8} intensity={4.2} color="#efd9ff"/>
  </group>;
}

function Lantern({position,index,onDiscover,accent}:{position:[number,number,number];index:number;onDiscover:(id:string)=>void;accent:string}){
  const glow=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(glow.current)glow.current.scale.setScalar(1+Math.sin(state.clock.elapsedTime*2+index)*.035);
  });
  return <group position={position} onClick={()=>onDiscover("lantern-"+index)} onPointerOver={()=>{document.body.style.cursor="pointer"}} onPointerOut={()=>{document.body.style.cursor=""}}>
    <mesh position={[0,.56,0]}>
      <cylinderGeometry args={[.13,.18,.72,8]}/>
      <meshStandardMaterial color="#241a1e" roughness={.84}/>
    </mesh>
    <group ref={glow}>
      <mesh position={[0,1.03,0]}>
        <sphereGeometry args={[.17,14,14]}/>
        <meshStandardMaterial color="#ffd5ab" emissive={accent} emissiveIntensity={1.5} roughness={.25}/>
      </mesh>
      <mesh position={[0,1.03,0]} scale={1.8}>
        <sphereGeometry args={[.17,12,12]}/>
        <meshBasicMaterial color={accent} transparent opacity={.08}/>
      </mesh>
    </group>
  </group>;
}

function TechOrb({position,label,color,onDiscover}:{position:[number,number,number];label:string;color:string;onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(!ref.current)return;
    ref.current.rotation.y=state.clock.elapsedTime*.32;
    ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*1.35+position[0])*.08;
  });
  const id=label.toLowerCase().replace(/[^a-z]+/g,"-");
  return <group ref={ref} position={position} onClick={()=>onDiscover(id)} onPointerOver={()=>{document.body.style.cursor="pointer"}} onPointerOut={()=>{document.body.style.cursor=""}}>
    <mesh>
      <icosahedronGeometry args={[.34,1]}/>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.38} metalness={.32} roughness={.34}/>
    </mesh>
    <mesh scale={1.55}>
      <ringGeometry args={[.43,.47,32]}/>
      <meshBasicMaterial color={color} transparent opacity={.32} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

function HeartPickup({position,id,hidden,onDiscover}:{position:[number,number,number];id:string;hidden:boolean;onDiscover:(id:string)=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current){
      ref.current.rotation.y=state.clock.elapsedTime*.8;
      ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*2.15+position[0])*.1;
    }
  });
  if(hidden)return null;
  return <group ref={ref} position={position} onClick={()=>onDiscover(id)} onPointerOver={()=>{document.body.style.cursor="pointer"}} onPointerOut={()=>{document.body.style.cursor=""}}>
    <mesh position={[-.13,.04,0]}>
      <sphereGeometry args={[.17,16,16]}/>
      <meshStandardMaterial color="#f08db1" emissive="#8c3659" emissiveIntensity={1.45}/>
    </mesh>
    <mesh position={[.13,.04,0]}>
      <sphereGeometry args={[.17,16,16]}/>
      <meshStandardMaterial color="#f08db1" emissive="#8c3659" emissiveIntensity={1.45}/>
    </mesh>
    <mesh position={[0,-.11,0]} rotation={[0,0,Math.PI]}>
      <coneGeometry args={[.23,.46,16]}/>
      <meshStandardMaterial color="#e881aa" emissive="#78304f" emissiveIntensity={1.25}/>
    </mesh>
    <pointLight position={[0,.08,0]} distance={2.2} intensity={1.1} color="#f49abf"/>
  </group>;
}

function Portal({unlocked,onDiscover,accent}:{unlocked:boolean;onDiscover:(id:string)=>void;accent:string}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current)ref.current.rotation.z=Math.sin(state.clock.elapsedTime*.52)*.04;
  });
  return <group ref={ref} position={[4.0,.05,-1.0]} onClick={()=>onDiscover("future-portal")} onPointerOver={()=>{document.body.style.cursor="pointer"}} onPointerOut={()=>{document.body.style.cursor=""}}>
    <mesh>
      <torusGeometry args={[1.05,.085,14,64]}/>
      <meshStandardMaterial color={unlocked?accent:"#514150"} emissive={unlocked?accent:"#1c1520"} emissiveIntensity={unlocked?1.25:.2} roughness={.35} metalness={.35}/>
    </mesh>
    <mesh>
      <circleGeometry args={[.89,64]}/>
      <meshBasicMaterial color={unlocked?accent:"#201725"} transparent opacity={unlocked?.1:.045}/>
    </mesh>
    {unlocked&&<pointLight position={[0,0,0]} distance={4} intensity={2.6} color={accent}/>}
  </group>;
}

function Player({moveRef,mobile}:{moveRef:MoveRef;mobile:boolean}){
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
    const speed=mobile?2.05:2.55;
    const bounds=5.55;
    ref.current.position.x=clamp(ref.current.position.x+x*speed*dt,-bounds,bounds);
    ref.current.position.z=clamp(ref.current.position.z+y*speed*dt,-bounds,bounds);
    ref.current.position.y=.18+Math.sin(state.clock.elapsedTime*5)*.03;
    if(length>.08)ref.current.rotation.y=THREE.MathUtils.lerp(ref.current.rotation.y,Math.atan2(x,y),Math.min(1,dt*9));
    lookTarget.set(
      ref.current.position.x+pointer.x*(mobile?.7:1.05),
      1.02+pointer.y*(mobile?.34:.5),
      ref.current.position.z
    );
    const desiredZ=ref.current.position.z+(mobile?8.8:8.1);
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,ref.current.position.x+pointer.x*(mobile?.7:1.0),1-Math.exp(-dt*2.5));
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,3.55+pointer.y*(mobile?.3:.5),1-Math.exp(-dt*2.5));
    camera.position.z=THREE.MathUtils.lerp(camera.position.z,desiredZ,1-Math.exp(-dt*2.5));
    camera.lookAt(lookTarget);
  });
  return <group ref={ref} position={[0,.18,2.1]}>
    <mesh>
      <sphereGeometry args={[.25,18,18]}/>
      <meshStandardMaterial color="#f0d9e7" emissive="#74506e" emissiveIntensity={.5} roughness={.45}/>
    </mesh>
    <mesh position={[0,-.14,0]}>
      <ringGeometry args={[.34,.4,28]}/>
      <meshBasicMaterial color="#f0a8c6" transparent opacity={.34} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

function Scene({mobile,moveRef,collected,activeChapter,onDiscover}:{mobile:boolean;moveRef:MoveRef;collected:string[];activeChapter:ChapterId;onDiscover:(id:string)=>void}){
  const accent=theme[activeChapter];
  const futureOpen=collected.filter(x=>x.startsWith("heart-")||x.startsWith("game-")).length>=3;
  return <>
    <ambientLight intensity={.42}/>
    <directionalLight position={[-3,6,4]} intensity={1.05} color="#bba9ff"/>
    <pointLight position={[0,2,-4]} intensity={7} distance={12} color={accent}/>
    <Starfield mobile={mobile}/>
    <Fireflies mobile={mobile}/>
    <Moon onDiscover={onDiscover}/>
    <Ground/>
    <Path/>
    <Trees/>
    <Lantern position={[-2.5,0,1.0]} index={1} accent={accent} onDiscover={onDiscover}/>
    <Lantern position={[1.8,0,-1.8]} index={2} accent={accent} onDiscover={onDiscover}/>
    <Lantern position={[-1.0,0,-3.0]} index={3} accent={accent} onDiscover={onDiscover}/>
    <TechOrb position={[-2.5,1.9,-.5]} label="Python" color="#67e8ff" onDiscover={onDiscover}/>
    <TechOrb position={[-.7,2.5,-2.4]} label="AI / ML" color="#aa7aff" onDiscover={onDiscover}/>
    <TechOrb position={[1.8,1.8,-3.3]} label="Software" color="#8fc8ff" onDiscover={onDiscover}/>
    <TechOrb position={[3.2,1.4,1.0]} label="Robotics" color="#75e2bd" onDiscover={onDiscover}/>
    <TechOrb position={[-3.2,1.25,-3.3]} label="Web" color="#f0a1c1" onDiscover={onDiscover}/>
    <HeartPickup position={[-4.3,1.0,-1.6]} id="heart-world-1" hidden={collected.includes("heart-world-1")} onDiscover={onDiscover}/>
    <HeartPickup position={[3.4,2.15,-1.6]} id="heart-world-2" hidden={collected.includes("heart-world-2")} onDiscover={onDiscover}/>
    <HeartPickup position={[1.1,2.0,2.6]} id="heart-world-3" hidden={collected.includes("heart-world-3")} onDiscover={onDiscover}/>
    <Portal unlocked={futureOpen} accent={accent} onDiscover={onDiscover}/>
    <Player moveRef={moveRef} mobile={mobile}/>
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
      camera={{position:[0,3.55,8.1],fov:52,near:.1,far:70}}
      dpr={mobile?[1,1.08]:[1,1.5]}
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
      <fog attach="fog" args={["#07050d",8,25]}/>
      <Scene mobile={mobile} moveRef={moveRef} collected={collected} activeChapter={activeChapter} onDiscover={onDiscover}/>
    </Canvas>
    {contextLost&&<CanvasFallback contextLost onReload={()=>location.reload()}/>}
    <div className="world-hint" aria-hidden="true">
      <span className="world-hint-dot"/>
      <span>{mobile?"Explore · move · look · discover":"WASD to move · mouse to look · click to discover"}</span>
    </div>
  </div>;
}
