import {useEffect,useMemo,useRef} from "react";
import type {MutableRefObject} from "react";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import * as THREE from "three";
import {letters,regions,type ChapterId} from "../data";


type Vec3=[number,number,number];
type MoveRef=MutableRefObject<{x:number;y:number}>;
type LookRef=MutableRefObject<{x:number;y:number}>;
type Nearby={id:string;label:string;prompt:string;distance:number};

const clamp=(value:number,min:number,max:number)=>THREE.MathUtils.clamp(value,min,max);

type WorldProps={
  mobile:boolean;
  moveRef:MoveRef;
  lookRef:LookRef;
  collected:string[];
  activeChapter:ChapterId;
  completedQuests:string[];
  flags:Record<string,number|string|boolean>;
  cameraFocus:{position:Vec3;target:Vec3}|null;
  onInteract:(id:string)=>void;
  onNear:(nearby:Nearby|null)=>void;
  onRegion:(region:ChapterId)=>void;
  discoveredLetters:string[];
  controlsLocked:boolean;
};

const palette={
  garden:"#d99ab9",workshop:"#6dd6d6",city:"#9b8df4",
  lake:"#6fbddd",mountain:"#efc291",house:"#e8a9c4"
};

const regionAt=(z:number):ChapterId=>{
  if(z>-6)return "origins";
  if(z>-30)return "curiosity";
  if(z>-54)return "building";
  if(z>-78)return "dreams";
  if(z>-103)return "quiet";
  return "future";
};

const interactables=[
  ...letters.map(letter=>({id:letter.id,label:letter.title,prompt:"Read this letter.",position:letter.position as Vec3,radius:2.2,region:({garden:"origins",workshop:"curiosity",city:"building",lake:"dreams",mountain:"quiet",house:"future"} as Record<string,ChapterId>)[letter.region]})),

  {id:"garden-lantern-1",label:"Lantern I",prompt:"Inspect the first light.",position:[-4.8,.4,4.5] as Vec3,radius:2.0,region:"origins" as ChapterId},
  {id:"garden-lantern-2",label:"Lantern II",prompt:"Listen to the second light.",position:[0,.4,-.8] as Vec3,radius:2.0,region:"origins" as ChapterId},
  {id:"garden-lantern-3",label:"Lantern III",prompt:"Wake the third light.",position:[4.7,.4,3.8] as Vec3,radius:2.0,region:"origins" as ChapterId},
  {id:"garden-star",label:"Suspended Star",prompt:"Read the constellation sculpture.",position:[0,5.9,2.2] as Vec3,radius:2.5,region:"origins" as ChapterId},
  {id:"workshop-core",label:"Energy Core",prompt:"Recover the missing core.",position:[-6.4,.55,-18] as Vec3,radius:2.2,region:"curiosity" as ChapterId},
  {id:"workshop-gear",label:"Gear Array",prompt:"Align the mechanical rings.",position:[-1.5,.8,-22.6] as Vec3,radius:2.2,region:"curiosity" as ChapterId},
  {id:"workshop-signal",label:"Signal Mast",prompt:"Decode the antenna sequence.",position:[5.7,2.0,-18.1] as Vec3,radius:2.5,region:"curiosity" as ChapterId},
  {id:"workshop-engine",label:"Memory Engine",prompt:"Inspect the broken machine.",position:[.6,2.4,-15.0] as Vec3,radius:3,region:"curiosity" as ChapterId},
  {id:"city-create",label:"CREATE",prompt:"Enter the art chamber.",position:[-6.2,.8,-41.5] as Vec3,radius:2.6,region:"building" as ChapterId},
  {id:"city-learn",label:"LEARN",prompt:"Open the knowledge archive.",position:[2.2,1.6,-47] as Vec3,radius:2.6,region:"building" as ChapterId},
  {id:"city-explore",label:"EXPLORE",prompt:"Climb toward the telescope.",position:[8.2,2.2,-39.7] as Vec3,radius:2.6,region:"building" as ChapterId},
  {id:"city-telescope",label:"Rooftop Telescope",prompt:"Look beyond the city.",position:[8.2,4.6,-41.7] as Vec3,radius:2.4,region:"building" as ChapterId},
  {id:"lake-dock",label:"Quiet Dock",prompt:"Sit at the water for a moment.",position:[-7,.05,-64.6] as Vec3,radius:2.4,region:"dreams" as ChapterId},
  {id:"lake-constellation",label:"Reflection Stones",prompt:"Decode the stars in the water.",position:[-2.8,.2,-71.4] as Vec3,radius:2.4,region:"dreams" as ChapterId},
  {id:"lake-cabin",label:"Lakeside Cabin",prompt:"Look inside the quiet room.",position:[4.5,.2,-65.2] as Vec3,radius:2.4,region:"dreams" as ChapterId},
  {id:"mountain-signal-1",label:"Future Signal I",prompt:"Capture the lower signal.",position:[-6,.9,-88] as Vec3,radius:2.5,region:"quiet" as ChapterId},
  {id:"mountain-signal-2",label:"Future Signal II",prompt:"Find the signal behind the ruin.",position:[4.8,4,-96] as Vec3,radius:2.6,region:"quiet" as ChapterId},
  {id:"mountain-signal-3",label:"Future Signal III",prompt:"Reach the observatory roof.",position:[2.4,8.4,-88.8] as Vec3,radius:2.8,region:"quiet" as ChapterId},
  {id:"observatory",label:"Observatory",prompt:"Turn the old telescope toward tomorrow.",position:[2.4,8.1,-91.5] as Vec3,radius:3.2,region:"quiet" as ChapterId},
  {id:"house-door",label:"The Final Door",prompt:"Assemble the fragments.",position:[0,1.35,-116.9] as Vec3,radius:2.8,region:"future" as ChapterId},
  {id:"house-empty-room",label:"The Empty Room",prompt:"Stand where the story has no answer yet.",position:[-3.2,.9,-114.3] as Vec3,radius:2.5,region:"future" as ChapterId}
];

function Sky({mobile,bright}:{mobile:boolean;bright:boolean}){
  const geometry=useMemo(()=>{
    const count=mobile?240:520;
    const g=new THREE.BufferGeometry();
    const arr=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=i*2.39996;
      const r=34+(i%37)*1.18;
      arr[i*3]=Math.cos(a)*r;
      arr[i*3+1]=8+(i%25)*.72;
      arr[i*3+2]=-22-(i%41)*.8;
    }
    g.setAttribute("position",new THREE.BufferAttribute(arr,3));
    return g;
  },[mobile]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group>
    <points geometry={geometry}>
      <pointsMaterial color="#eee7ff" size={mobile?.055:.072} transparent opacity={bright?.82:.62} sizeAttenuation/>
    </points>
    <mesh position={[9,10,-28]}>
      <sphereGeometry args={[1.15,32,32]}/>
      <meshStandardMaterial color="#fff2d6" emissive="#b684a5" emissiveIntensity={.08} roughness={.97}/>
    </mesh>
  </group>;
}

function Terrain(){
  const slabs=useMemo(()=>Array.from({length:18},(_,i)=>{
    const z=10-i*7.6;
    const x=Math.sin(i*.8)*5.4;
    return {x,z,w:18-(i%4)*1.3};
  }),[]);
  return <group>
    <mesh position={[0,-1.12,-52]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[150,150]}/>
      <meshStandardMaterial color="#0a0b12" roughness={1}/>
    </mesh>
    {slabs.map((s,i)=><mesh key={i} position={[s.x,-.91,s.z]} rotation={[0,(i*.22)%0.5,0]}>
      <boxGeometry args={[s.w,.34,7.1]}/>
      <meshStandardMaterial color={i%3===0?"#151426":"#10111c"} roughness={.94}/>
    </mesh>)}
    <mesh position={[0,-.76,-47]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.3,2.9,64]}/>
      <meshBasicMaterial color="#8761a2" transparent opacity={.16} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

function Garden({complete,onInteract}:{complete:boolean;onInteract:(id:string)=>void}){
  const flowers=useMemo(()=>Array.from({length:34},(_,i)=>[Math.sin(i*1.77)*7.2,.02,4+Math.cos(i*.91)*7.2] as Vec3),[]);
  const trees=useMemo(()=>[[-8,.0,7],[-7,.0,-.5],[8,.0,7],[7,.0,-1],[-9,.0,-5],[9,.0,-6],[-5,.0,9],[5,.0,10]] as Vec3[],[]);
  return <group>
    {trees.map((p,i)=><group key={i} position={p}>
      <mesh position={[0,.75,0]}><cylinderGeometry args={[.14,.2,1.5,7]}/><meshStandardMaterial color="#191416"/></mesh>
      <mesh position={[0,1.85,0]}><coneGeometry args={[.84,2.1,8]}/><meshStandardMaterial color={i%2?"#17241f":"#1b2428"}/></mesh>
      <mesh position={[0,2.55,0]}><coneGeometry args={[.55,1.35,8]}/><meshStandardMaterial color="#202b27"/></mesh>
    </group>)}
    {flowers.map((p,i)=><mesh key={i} position={p}>
      <sphereGeometry args={[.055,8,8]}/>
      <meshBasicMaterial color={i%3===0?"#efb5ce":"#94c9ea"} transparent opacity={.8}/>
    </mesh>)}
    {[
      [-4.8,.4,4.5] as Vec3,[0,.4,-.8] as Vec3,[4.7,.4,3.8] as Vec3
    ].map((p,i)=><Lantern key={i} position={p} index={i+1} active={complete} onClick={()=>onInteract("garden-lantern-"+(i+1))}/> )}
    <mesh position={[0,6,2.2]} rotation={[0,.2,.15]} onClick={()=>onInteract("garden-star")}>
      <torusGeometry args={[1.55,.055,10,5]}/>
      <meshBasicMaterial color="#9f8bda" transparent opacity={.72}/>
    </mesh>
    <mesh position={[0,5.95,2.2]} rotation={[Math.PI/2,.1,0]}>
      <torusGeometry args={[1.15,.035,10,5]}/>
      <meshBasicMaterial color="#db9fbe" transparent opacity={.55}/>
    </mesh>
  </group>;
}

function Lantern({position,index,active,onClick}:{position:Vec3;index:number;active:boolean;onClick:()=>void}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(ref.current)ref.current.scale.setScalar(1+Math.sin(state.clock.elapsedTime*1.8+index)*.04);
  });
  return <group ref={ref} position={position} onClick={onClick}>
    <mesh position={[0,.35,0]}><cylinderGeometry args={[.12,.17,.68,8]}/><meshStandardMaterial color="#2c1e24"/></mesh>
    <mesh position={[0,.82,0]}><sphereGeometry args={[.17,16,16]}/><meshStandardMaterial color="#ffe3bd" emissive={active?"#e98eae":"#ffaf75"} emissiveIntensity={active?1.9:1.25}/></mesh>
    <pointLight position={[0,.82,0]} distance={2.2} intensity={active?1.1:.65} color={active?"#e99fbc":"#f0b17c"}/>
  </group>;
}

function Workshop({awakened,onInteract}:{awakened:boolean;onInteract:(id:string)=>void}){
  const gear=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(gear.current)gear.current.rotation.z=state.clock.elapsedTime*(awakened?.24:.04);
  });
  return <group>
    <mesh position={[-.6,.6,-18]}><boxGeometry args={[10,1.5,6.7]}/><meshStandardMaterial color="#171721" roughness={.84}/></mesh>
    <mesh position={[-.6,3.0,-18]} rotation={[0,0,.05]}><boxGeometry args={[9.5,3.8,5.5]}/><meshStandardMaterial color="#20212c" roughness={.72} metalness={.18}/></mesh>
    <mesh position={[-.6,5.2,-18]} rotation={[0,0,.13]}><coneGeometry args={[3.6,2.2,4]} /><meshStandardMaterial color="#11141e" metalness={.25}/></mesh>
    {[-3.8,-.8,2.2].map((x,i)=><mesh key={i} position={[x,3.1,-14.95]}><boxGeometry args={[1.4,.25,.2]}/><meshBasicMaterial color={awakened?"#7bdfd6":"#31414b"} transparent opacity={awakened?.85:.45}/></mesh>)}
    <group ref={gear} position={[-1.5,2.0,-22.6]} onClick={()=>onInteract("workshop-gear")}>
      {[0,1,2].map(i=><mesh key={i} rotation={[0,0,i*Math.PI/3]}><torusGeometry args={[1.0+i*.12,.08,10,20]}/><meshBasicMaterial color="#71d4d0" transparent opacity={awakened?.9:.58}/></mesh>)}
      <sphereGeometry args={[.18,12,12]}/>
    </group>
    <mesh position={[.6,2.3,-15]} onClick={()=>onInteract("workshop-engine")}>
      <icosahedronGeometry args={[.65,1]}/><meshStandardMaterial color={awakened?"#d5a6c9":"#6f6675"} emissive={awakened?"#a55179":"#151217"} emissiveIntensity={awakened?1.2:.15}/>
    </mesh>
    <mesh position={[-6.4,.65,-18]} onClick={()=>onInteract("workshop-core")}><icosahedronGeometry args={[.35,1]}/><meshStandardMaterial color="#64e0dd" emissive="#1b8484" emissiveIntensity={1.4}/></mesh>
    <mesh position={[5.7,2,-18.1]} onClick={()=>onInteract("workshop-signal")}>
      <cylinderGeometry args={[.09,.09,3.2,8]}/><meshStandardMaterial color="#6b7282" metalness={.55}/>
    </mesh>
    {[0,.65,1.3].map((y,i)=><mesh key={i} position={[5.7,2.55+y*.7,-18.1]}><sphereGeometry args={[.11,12,12]}/><meshBasicMaterial color={awakened?"#8fe5de":"#4b5961"} /></mesh>)}
  </group>;
}

function City({lit,onInteract}:{lit:number;onInteract:(id:string)=>void}){
  const buildings=useMemo(()=>[
    [-8,2,-43,3.4,4],[-3,2.6,-40,3.8,5.2],[2,3.3,-43,4.2,6.6],[7,2.2,-46,3.2,4.4],
    [-7,2,-50,3.0,3.8],[1,2.1,-50,3.5,4.2],[7,3.2,-52,3.6,6]
  ] as Array<[number,number,number,number,number]>,[]);
  return <group>
    {buildings.map((b,i)=><group key={i} position={[b[0],b[1],b[2]]}>
      <mesh><boxGeometry args={[b[3],b[4],b[3]*.82]}/><meshStandardMaterial color="#17182a" roughness={.82} metalness={.12}/></mesh>
      <mesh position={[0,.3, -b[3]/2-.015]}><boxGeometry args={[b[3]*.62,b[4]*.28,.035]}/><meshBasicMaterial color={lit>i%3?"#a2a0f5":"#544f79"} transparent opacity={lit>i%3?.82:.35}/></mesh>
    </group>)}
    <mesh position={[0,-.49,-45.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[18,24]}/><meshStandardMaterial color="#0c0d15" roughness={.95}/></mesh>
    {[-5.8,0,5.8].map(x=><mesh key={x} position={[x,.05,-43]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.08,22]}/><meshBasicMaterial color="#7683d7" transparent opacity={.58}/></mesh>)}
    <CityNode position={[-6.2,.7,-41.5]} color="#e8a9c4" onClick={()=>onInteract("city-create")}/>
    <CityNode position={[2.2,1.6,-47]} color="#79dfe2" onClick={()=>onInteract("city-learn")}/>
    <CityNode position={[8.2,2.2,-39.7]} color="#a88df2" onClick={()=>onInteract("city-explore")}/>
    <group position={[8.2,4.6,-41.7]} onClick={()=>onInteract("city-telescope")}>
      <mesh rotation={[0,0,.35]}><cylinderGeometry args={[.12,.17,1.4,10]}/><meshStandardMaterial color="#6b597c" metalness={.5}/></mesh>
      <mesh position={[0,.72,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.22,.12,.55,12]}/><meshStandardMaterial color="#d4c5dd" metalness={.3}/></mesh>
    </group>
  </group>;
}

function CityNode({position,color,onClick}:{position:Vec3;color:string;onClick:()=>void}){
  const ref=useRef<THREE.Mesh>(null);
  useFrame((state)=>{if(ref.current)ref.current.rotation.y=state.clock.elapsedTime*.5});
  return <mesh ref={ref} position={position} onClick={onClick}>
    <icosahedronGeometry args={[.34,1]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.45}/>
  </mesh>;
}

function Lake({completed,onInteract}:{completed:boolean;onInteract:(id:string)=>void}){
  const ref=useRef<THREE.Mesh>(null);
  useFrame((state)=>{if(ref.current)(ref.current.material as THREE.MeshStandardMaterial).opacity=.27+Math.sin(state.clock.elapsedTime*.6)*.02});
  return <group>
    <mesh position={[-3.0,-.65,-66]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[8.3,64]}/><meshStandardMaterial color="#071623" metalness={.86} roughness={.12} transparent opacity={.28}/></mesh>
    <mesh ref={ref} position={[-3,-.59,-66]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[7.55,8.1,64]}/><meshBasicMaterial color="#78c5df" transparent opacity={.24} side={THREE.DoubleSide}/></mesh>
    <group position={[-7,.02,-64.6]} onClick={()=>onInteract("lake-dock")}>
      {Array.from({length:8},(_,i)=><mesh key={i} position={[i*.55,0,0]} rotation={[0,(i%2)*.03,0]}><boxGeometry args={[.55,.12,.72]}/><meshStandardMaterial color="#4b302e"/></mesh>)}
      <mesh position={[1.8,.65,.16]} rotation={[0,0,.05]}><boxGeometry args={[.12,1.05,.12]}/><meshStandardMaterial color="#3a2829"/></mesh>
    </group>
    <group position={[4.5,.5,-65.2]}>
      <mesh><boxGeometry args={[4.2,2.2,3.4]}/><meshStandardMaterial color="#2c2227"/></mesh>
      <mesh position={[0,1.7,0]} rotation={[0,0,.0]}><coneGeometry args={[2.8,1.6,4]}/><meshStandardMaterial color="#191723"/></mesh>
      <mesh position={[0,.2,-1.74]}><planeGeometry args={[1.0,.7]}/><meshBasicMaterial color={completed?"#dca9c3":"#6f5c69"} transparent opacity={completed?.95:.45}/></mesh>
    </group>
    {[-1.0,1.7,4.0].map((x,i)=><mesh key={i} position={[x,.02,-71.3]} onClick={()=>onInteract("lake-constellation")}>
      <cylinderGeometry args={[.22,.3,.18,8]}/><meshBasicMaterial color={completed?"#8bc3d4":"#596075"} />
    </mesh>)}
  </group>;
}

function Mountain({signals,activated,onInteract}:{signals:number;activated:boolean;onInteract:(id:string)=>void}){
  const signalPositions:Vec3[]=[[-6,.9,-88],[4.8,4,-96],[2.4,8.4,-88.8]];
  return <group>
    {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*.7)*3.4, i*.95-.4,-82-i*2.7]} rotation={[0,.1*i,0]}>
      <boxGeometry args={[16-i*.7,1.25,7.5]}/><meshStandardMaterial color={i%2?"#1b1b26":"#252330"} roughness={1}/>
    </mesh>)}
    <mesh position={[2.4,8.1,-91.5]}><cylinderGeometry args={[3.1,3.1,.7,32]}/><meshStandardMaterial color="#292331" metalness={.24}/></mesh>
    <mesh position={[2.4,9.8,-91.5]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[2.7,2.2,8]}/><meshStandardMaterial color="#151522" metalness={.2}/></mesh>
    <mesh position={[2.4,10.1,-91.5]} onClick={()=>onInteract("observatory")}>
      <torusGeometry args={[1.3,.09,10,32]}/><meshStandardMaterial color="#cfb6d8" emissive="#8c5a86" emissiveIntensity={.3}/>
    </mesh>
    {signalPositions.map((p,i)=><mesh key={i} position={p} onClick={()=>onInteract("mountain-signal-"+(i+1))}>
      <octahedronGeometry args={[.34,0]}/><meshStandardMaterial color={i<signals?"#f1ca9f":"#746272"} emissive={i<signals?"#db8b66":"#231a25"} emissiveIntensity={i<signals?1.25:.22}/>
    </mesh>)}
    {activated&&<mesh position={[0,17,-92]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.2,.85,26,12]}/><meshBasicMaterial color="#efb8da" transparent opacity={.13}/>
    </mesh>}
  </group>;
}

function House({lit,ending,onInteract}:{lit:boolean;ending:boolean;onInteract:(id:string)=>void}){
  const glow=lit?"#f3c5d4":"#7f5e6e";
  return <group>
    <mesh position={[0,1.0,-116]}><boxGeometry args={[11,4.2,7.4]}/><meshStandardMaterial color="#241d25" roughness={.88}/></mesh>
    <mesh position={[0,4.0,-116]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[5.1,3.1,4]}/><meshStandardMaterial color="#11131b" roughness={.7} metalness={.12}/></mesh>
    <mesh position={[0,.8,-119.75]}><boxGeometry args={[9.2,2.3,.07]}/><meshBasicMaterial color={glow} transparent opacity={lit?.3:.12}/></mesh>
    {[-3.1,0,3.1].map(x=><mesh key={x} position={[x,.95,-119.82]}><boxGeometry args={[1.6,1.15,.04]}/><meshBasicMaterial color={glow} transparent opacity={lit?.8:.25}/></mesh>)}
    <mesh position={[0,1.1,-112.2]}><boxGeometry args={[3.2,2.1,.8]}/><meshStandardMaterial color="#3a292f"/></mesh>
    <mesh position={[0,.95,-112.55]} onClick={()=>onInteract("house-door")}>
      <boxGeometry args={[1.5,2.5,.16]}/><meshStandardMaterial color={ending?"#f4d5e4":"#5a4653"} emissive={ending?"#d88cab":"#2b2028"} emissiveIntensity={ending?1.3:.25}/>
    </mesh>
    {!ending&&<mesh position={[-3.2,1,-114.3]} onClick={()=>onInteract("house-empty-room")}><boxGeometry args={[2.4,2.2,.2]}/><meshBasicMaterial color="#8b6b7c" transparent opacity={.18}/></mesh>}
    {ending&&<pointLight position={[0,3,-116]} distance={10} intensity={5} color="#eab1cf"/>}
  </group>;
}

function Player({moveRef,lookRef,mobile,completedQuests,cameraFocus,onNear,onRegion,controlsLocked}:{moveRef:MoveRef;lookRef:LookRef;mobile:boolean;completedQuests:string[];cameraFocus:WorldProps["cameraFocus"];onNear:(n:Nearby|null)=>void;onRegion:(r:ChapterId)=>void;controlsLocked:boolean}){
  const ref=useRef<THREE.Group>(null);
  const keys=useRef<Record<string,boolean>>({});
  const velocity=useRef({x:0,y:0});
  const {camera,pointer}=useThree();
  const lookTarget=useMemo(()=>new THREE.Vector3(),[]);
  const focusPosition=useMemo(()=>new THREE.Vector3(),[]);
  const focusTarget=useMemo(()=>new THREE.Vector3(),[]);
  const leftLeg=useRef<THREE.Mesh>(null),rightLeg=useRef<THREE.Mesh>(null),leftArm=useRef<THREE.Mesh>(null),rightArm=useRef<THREE.Mesh>(null);
  const lastNear=useRef(""); const lastRegion=useRef<ChapterId>("origins");
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true};
    const up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)};
  },[]);
  useFrame((state,dt)=>{
    if(!ref.current)return;
    let x=controlsLocked?0:moveRef.current.x,y=controlsLocked?0:moveRef.current.y;
    if(!mobile){
      x+=(keys.current.d||keys.current.arrowright?1:0)-(keys.current.a||keys.current.arrowleft?1:0);
      y+=(keys.current.s||keys.current.arrowdown?1:0)-(keys.current.w||keys.current.arrowup?1:0);
    }
    const rawLen=Math.hypot(x,y);
    if(rawLen>1){x/=rawLen;y/=rawLen}
    const targetX=x*2.5,targetY=y*2.5;
    const accel=1-Math.exp(-dt*8);
    const drag=1-Math.exp(-dt*10);
    velocity.current.x=THREE.MathUtils.lerp(velocity.current.x,targetX,rawLen>.03?accel:drag);
    velocity.current.y=THREE.MathUtils.lerp(velocity.current.y,targetY,rawLen>.03?accel:drag);
    const speed=mobile?1.0:1.15;
    ref.current.position.x=clamp(ref.current.position.x+velocity.current.x*speed*dt,-10.8,10.8);
    ref.current.position.z=clamp(ref.current.position.z+velocity.current.y*speed*dt,-124,10);
    const moving=Math.hypot(velocity.current.x,velocity.current.y)>.14;
    const run=Math.hypot(velocity.current.x,velocity.current.y)>1.8;
    const cycle=Math.sin(state.clock.elapsedTime*(run?12:moving?9:2.4));
    ref.current.position.y=.03+(moving?Math.abs(cycle)*.035:.006*Math.sin(state.clock.elapsedTime*1.6));
    if(leftLeg.current)leftLeg.current.rotation.x=cycle*.42*(moving?1:0);
    if(rightLeg.current)rightLeg.current.rotation.x=-cycle*.42*(moving?1:0);
    if(leftArm.current)leftArm.current.rotation.z=-.18-cycle*.12*(moving?1:0);
    if(rightArm.current)rightArm.current.rotation.z=.18+cycle*.12*(moving?1:0);
    if(moving)ref.current.rotation.y=THREE.MathUtils.lerp(ref.current.rotation.y,Math.atan2(velocity.current.x,velocity.current.y),1-Math.exp(-dt*10));

    const region=regionAt(ref.current.position.z);
    if(region!==lastRegion.current){lastRegion.current=region;onRegion(region)}
    let nearest:Nearby|null=null,best=Infinity;
    for(const item of interactables){
      if(item.region!==region)continue;
      const dx=ref.current.position.x-item.position[0],dy=.7-item.position[1],dz=ref.current.position.z-item.position[2];
      const d=Math.hypot(dx,dy,dz);
      if(d<item.radius&&d<best){best=d;nearest={id:item.id,label:item.label,prompt:item.prompt,distance:d}}
    }
    const key=nearest?.id||"";
    if(key!==lastNear.current){lastNear.current=key;onNear(nearest)}

    const lx=mobile?lookRef.current.x:pointer.x,ly=mobile?lookRef.current.y:pointer.y;
    const ease=1-Math.exp(-dt*4);
    if(cameraFocus){
      focusPosition.set(...cameraFocus.position);focusTarget.set(...cameraFocus.target);
      camera.position.lerp(focusPosition,ease);camera.lookAt(focusTarget);
    }else{
      const targetX=ref.current.position.x+lx*(mobile?.7:1.2);
      const targetY=1.0+ly*(mobile?.35:.5);
      const targetZ=ref.current.position.z-.65;
      camera.position.x=THREE.MathUtils.lerp(camera.position.x,targetX,ease);
      camera.position.y=THREE.MathUtils.lerp(camera.position.y,3.5+ly*(mobile?.3:.55),ease);
      camera.position.z=THREE.MathUtils.lerp(camera.position.z,ref.current.position.z+(mobile?10:9.2),ease);
      camera.lookAt(lookTarget.set(targetX,targetY,targetZ));
    }
  });
  return <group ref={ref} position={[0,.03,8.2]}>
    <group rotation={[0,.15,0]}>
      <mesh position={[0,.98,0]}><sphereGeometry args={[.24,16,16]}/><meshStandardMaterial color="#e6cbd7" roughness={.48} emissive="#774f6e" emissiveIntensity={.28}/></mesh>
      <mesh position={[0,.66,0]}><sphereGeometry args={[.25,10,10,0,Math.PI*2,0,Math.PI*.62]}/><meshStandardMaterial color="#10131b" roughness={.7}/></mesh>
      <mesh position={[0,.52,0]}><capsuleGeometry args={[.2,.48,4,8]}/><meshStandardMaterial color="#353042" roughness={.7}/></mesh>
      <mesh ref={leftLeg} position={[-.15,.12,0]}><capsuleGeometry args={[.065,.36,3,7]}/><meshStandardMaterial color="#24202b"/></mesh>
      <mesh ref={rightLeg} position={[.15,.12,0]}><capsuleGeometry args={[.065,.36,3,7]}/><meshStandardMaterial color="#24202b"/></mesh>
      <mesh ref={leftArm} position={[-.28,.51,0]}><capsuleGeometry args={[.052,.34,3,7]}/><meshStandardMaterial color="#322733"/></mesh>
      <mesh ref={rightArm} position={[.28,.51,0]}><capsuleGeometry args={[.052,.34,3,7]}/><meshStandardMaterial color="#322733"/></mesh>
      <mesh position={[0,.43,.19]}><boxGeometry args={[.3,.36,.12]}/><meshStandardMaterial color="#4a3650" roughness={.78}/></mesh>
      <mesh position={[0,.42,.03]}><boxGeometry args={[.48,.07,.32]}/><meshStandardMaterial color="#1b1823" roughness={.8}/></mesh>
      <mesh position={[0,.44,-.13]}><boxGeometry args={[.34,.4,.11]}/><meshStandardMaterial color="#17141d" roughness={.8}/></mesh>
      <mesh position={[0,-.03,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.31,.39,30]}/><meshBasicMaterial color="#eaa9c6" transparent opacity={.34} side={THREE.DoubleSide}/></mesh>
    </group>
  </group>;
}

function Gates({completedQuests}:{completedQuests:string[]}){
  const gates=[
    {z:-9,ready:completedQuests.includes("garden"),color:palette.garden},
    {z:-31,ready:completedQuests.includes("workshop"),color:palette.workshop},
    {z:-55,ready:completedQuests.includes("city"),color:palette.city},
    {z:-79,ready:completedQuests.includes("lake"),color:palette.lake},
    {z:-104,ready:completedQuests.includes("mountain"),color:palette.mountain}
  ];
  return <group>{gates.map((g,i)=><group key={i} position={[0,1.6,g.z]}>
    <mesh><torusGeometry args={[2.4,.06,10,48]}/><meshBasicMaterial color={g.color} transparent opacity={g.ready?.46:.12}/></mesh>
    {g.ready&&<pointLight distance={4} intensity={1.1} color={g.color}/>}
  </group>)}</group>;
}

export function World({mobile,moveRef,lookRef,collected,activeChapter,completedQuests,flags,cameraFocus,onInteract,onNear,onRegion,discoveredLetters,controlsLocked}:WorldProps){
  const bright=completedQuests.includes("mountain")||completedQuests.includes("ending");
  const awakened=completedQuests.includes("workshop");
  const cityLit=completedQuests.includes("city")?3:Object.keys(flags).filter(k=>k.startsWith("city-")).length;
  const signals=["mountain-signal-1","mountain-signal-2","mountain-signal-3"].filter(id=>Boolean(flags[id])).length;
  const ending=completedQuests.includes("ending");
  return <div className="world-stage">
    <div className="world-backdrop" aria-hidden="true"><div className="backdrop-stars"/><div className="backdrop-horizon"/><div className="backdrop-glow"/></div>
    <Canvas
      camera={{position:[0,3.15,15.9],fov:50,near:.1,far:170}}
      dpr={mobile?[1,1.08]:[1,1.5]}
      gl={{antialias:!mobile,powerPreference:mobile?"low-power":"high-performance",alpha:true,preserveDrawingBuffer:false}}
      performance={{min:.55,max:1,debounce:250}}
      shadows={false}
    >
      <color attach="background" args={["#05040a"]}/>
      <fog attach="fog" args={["#07060e",17,92]}/>
      <ambientLight intensity={.56}/>
      <directionalLight position={[-10,15,8]} intensity={1.1} color="#bdb3ee"/>
      <pointLight position={[0,5,-22]} intensity={3.5} distance={24} color={palette.workshop}/>
      <pointLight position={[0,5,-66]} intensity={2.2} distance={26} color={palette.lake}/>
      <Sky mobile={mobile} bright={bright}/>
      <Atmosphere chapter={activeChapter} mobile={mobile}/>
      <Terrain/>
      <Garden complete={completedQuests.includes("garden")} onInteract={onInteract}/>
      <Workshop awakened={awakened} onInteract={onInteract}/>
      <City lit={cityLit} onInteract={onInteract}/>
      <Lake completed={completedQuests.includes("lake")} onInteract={onInteract}/>
      <Mountain signals={signals} activated={completedQuests.includes("mountain")} onInteract={onInteract}/>
      <House lit={completedQuests.includes("house")||ending} ending={ending} onInteract={onInteract}/>
      <Gates completedQuests={completedQuests}/>
      <Player moveRef={moveRef} lookRef={lookRef} mobile={mobile} completedQuests={completedQuests} cameraFocus={cameraFocus} onNear={onNear} onRegion={onRegion} controlsLocked={controlsLocked}/>
    </Canvas>
    {ending&&<div className="final-sky-overlay" aria-hidden="true"><div className="final-sky-stars"/><div className="final-sky-core"/></div>}
  </div>;
}
