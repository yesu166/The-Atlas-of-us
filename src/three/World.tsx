import {useEffect,useMemo,useRef} from "react";
import type {MutableRefObject} from "react";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import * as THREE from "three";
import {letters,regions,type ChapterId} from "../data";
import {Atmosphere,Fireflies,LetterMarkers,RegionChunk,ThreadContinuity} from "./Systems";


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

const HEART_SHAPE=(()=>{
  const shape=new THREE.Shape();
  shape.moveTo(0,-.48);
  shape.bezierCurveTo(-.42,-.12,-.78,.28,-.48,.55);
  shape.bezierCurveTo(-.25,.76,-.04,.59,0,.43);
  shape.bezierCurveTo(.04,.59,.25,.76,.48,.55);
  shape.bezierCurveTo(.78,.28,.42,-.12,0,-.48);
  shape.closePath();
  return shape;
})();

function FloatingHeart({position,scale,color,phase}:{position:Vec3;scale:number;color:string;phase:number}){
  const ref=useRef<THREE.Group>(null);
  useFrame((state)=>{
    if(!ref.current)return;
    ref.current.position.y=position[1]+Math.sin(state.clock.elapsedTime*.72+phase)*.18;
    ref.current.rotation.y=Math.sin(state.clock.elapsedTime*.42+phase)*.22;
    ref.current.rotation.z=Math.sin(state.clock.elapsedTime*.55+phase)*.045;
  });
  return <group ref={ref} position={position} scale={scale}>
    <mesh>
      <extrudeGeometry args={[HEART_SHAPE,{depth:.14,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025}]}/>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.38} roughness={.28} metalness={.08}/>
    </mesh>
    <pointLight position={[0,0,.35]} color={color} intensity={.45} distance={4}/>
  </group>;
}

function LoveTrail(){
  const tubes=useMemo(()=>{
    const edgeA:THREE.Vector3[]=[];
    const edgeB:THREE.Vector3[]=[];
    for(let i=0;i<=32;i++){
      const z=12-i*4.3;
      const segment=(12-z)/7.6;
      const center=Math.sin(segment*.8)*5.4;
      edgeA.push(new THREE.Vector3(center-6.25,.025,z));
      edgeB.push(new THREE.Vector3(center+6.25,.025,z));
    }
    return [
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgeA),128,.035,5,false),
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgeB),128,.035,5,false)
    ];
  },[]);
  useEffect(()=>()=>{tubes[0].dispose();tubes[1].dispose()},[tubes]);
  return <group>
    <mesh geometry={tubes[0]}><meshStandardMaterial color="#ff9fc8" emissive="#f15d9b" emissiveIntensity={.65} roughness={.35}/></mesh>
    <mesh geometry={tubes[1]}><meshStandardMaterial color="#ffe0b4" emissive="#ffb8c8" emissiveIntensity={.52} roughness={.35}/></mesh>
  </group>;
}

function RoseDrift({mobile}:{mobile:boolean}){
  const particles=useMemo(()=>{
    const count=mobile?38:82;
    const geometry=new THREE.BufferGeometry();
    const positions=new Float32Array(count*3);
    const baseX=new Float32Array(count);
    const phase=new Float32Array(count);
    for(let i=0;i<count;i++){
      const x=Math.sin(i*2.39996)*9.2;
      const y=.35+(i%12)*.29;
      const z=11-(i/(count-1))*136;
      positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
      baseX[i]=x;phase[i]=i*.73;
    }
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
    return {geometry,baseX,phase};
  },[mobile]);
  useEffect(()=>()=>particles.geometry.dispose(),[particles]);
  useFrame((state)=>{
    const attr=particles.geometry.getAttribute("position") as THREE.BufferAttribute;
    for(let i=0;i<attr.count;i++){
      attr.setX(i,particles.baseX[i]+Math.sin(state.clock.elapsedTime*.38+particles.phase[i])*.16);
    }
    attr.needsUpdate=true;
  });
  return <points geometry={particles.geometry}>
    <pointsMaterial color="#ffd4e5" size={mobile?.055:.075} transparent opacity={.58} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/>
  </points>;
}

function LoveWorld({mobile}:{mobile:boolean}){
  return <group>
    <LoveTrail/>
    <RoseDrift mobile={mobile}/>
    <FloatingHeart position={[-1.7,3.6,1.2]} scale={.7} color="#ff9fc8" phase={.2}/>
    <FloatingHeart position={[-3.1,5.9,-19.4]} scale={.6} color="#ffd0dd" phase={1.4}/>
    <FloatingHeart position={[0,7.9,-43.8]} scale={.68} color="#d9b6ff" phase={2.2}/>
    <FloatingHeart position={[-5.6,3.2,-66.3]} scale={.58} color="#a9e4e3" phase={3.1}/>
    <FloatingHeart position={[2.7,10.8,-91.6]} scale={.62} color="#ffd7a8" phase={4.0}/>
    <FloatingHeart position={[0,5.3,-116.6]} scale={.78} color="#ffafd0" phase={5.1}/>
  </group>;
}

function Terrain(){
  const slabs=useMemo(()=>Array.from({length:18},(_,i)=>{
    const z=10-i*7.6;
    const x=Math.sin(i*.8)*5.4;
    return {x,z,w:18-(i%4)*1.3};
  }),[]);
  return <group>
    {/* The continuous floor is almost level with the path slabs and the player's feet. */}
    <mesh position={[0,-.055,-52]} rotation={[-Math.PI/2,0,0]} name="walkable-world-floor">
      <planeGeometry args={[150,150]}/>
      <meshStandardMaterial color="#3b304c" roughness={1}/>
    </mesh>
    {slabs.map((s,i)=><mesh key={i} position={[s.x,-.1,s.z]} rotation={[0,(i*.22)%0.5,0]}>
      <boxGeometry args={[s.w,.2,7.1]}/>
      <meshStandardMaterial color={i%3===0?"#76546f":"#604966"} roughness={.9}/>
    </mesh>)}
    <mesh position={[0,.012,-47]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.3,2.9,64]}/>
      <meshBasicMaterial color="#ffb5d1" transparent opacity={.3} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}
function Garden({complete,onInteract}:{complete:boolean;onInteract:(id:string)=>void}){
  const flowers=useMemo(()=>Array.from({length:34},(_,i)=>[Math.sin(i*1.77)*7.2,.02,4+Math.cos(i*.91)*7.2] as Vec3),[]);
  const trees=useMemo(()=>[[-8,.0,7],[-7,.0,-.5],[8,.0,7],[7,.0,-1],[-9,.0,-5],[9,.0,-6],[-5,.0,9],[5,.0,10]] as Vec3[],[]);
  return <group>
    {trees.map((p,i)=><group key={i} position={p}>
      <mesh position={[0,.75,0]}><cylinderGeometry args={[.14,.2,1.5,7]}/><meshStandardMaterial color="#80566a"/></mesh>
      <mesh position={[0,1.85,0]}><coneGeometry args={[.84,2.1,8]}/><meshStandardMaterial color={i%2?"#4b826d":"#6f9c83"}/></mesh>
      <mesh position={[0,2.55,0]}><coneGeometry args={[.55,1.35,8]}/><meshStandardMaterial color="#8ab49a"/></mesh>
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
    <mesh position={[0,.35,0]}><cylinderGeometry args={[.12,.17,.68,8]}/><meshStandardMaterial color="#805263"/></mesh>
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
    <mesh position={[-.6,.6,-18]}><boxGeometry args={[10,1.5,6.7]}/><meshStandardMaterial color="#76516d" roughness={.84}/></mesh>
    <mesh position={[-.6,3.0,-18]} rotation={[0,0,.05]}><boxGeometry args={[9.5,3.8,5.5]}/><meshStandardMaterial color="#655278" roughness={.72} metalness={.18}/></mesh>
    <mesh position={[-.6,5.2,-18]} rotation={[0,0,.13]}><coneGeometry args={[3.6,2.2,4]} /><meshStandardMaterial color="#8c5a76" metalness={.18}/></mesh>
    {[-3.8,-.8,2.2].map((x,i)=><mesh key={i} position={[x,3.1,-14.95]}><boxGeometry args={[1.4,.25,.2]}/><meshBasicMaterial color={awakened?"#ffd5e5":"#b879a0"} transparent opacity={awakened?.85:.45}/></mesh>)}
    <group ref={gear} position={[-1.5,2.0,-22.6]} onClick={()=>onInteract("workshop-gear")}>
      {[0,1,2].map(i=><mesh key={i} rotation={[0,0,i*Math.PI/3]}><torusGeometry args={[1.0+i*.12,.08,10,20]}/><meshBasicMaterial color="#ffb2d0" transparent opacity={awakened?.9:.58}/></mesh>)}
      <sphereGeometry args={[.18,12,12]}/>
    </group>
    <mesh position={[.6,2.3,-15]} onClick={()=>onInteract("workshop-engine")}>
      <icosahedronGeometry args={[.65,1]}/><meshStandardMaterial color={awakened?"#d5a6c9":"#a887a0"} emissive={awakened?"#a55179":"#4b2d49"} emissiveIntensity={awakened?1.2:.15}/>
    </mesh>
    <mesh position={[-6.4,.65,-18]} onClick={()=>onInteract("workshop-core")}><icosahedronGeometry args={[.35,1]}/><meshStandardMaterial color="#ffb1c9" emissive="#b74477" emissiveIntensity={1.4}/></mesh>
    <mesh position={[5.7,2,-18.1]} onClick={()=>onInteract("workshop-signal")}>
      <cylinderGeometry args={[.09,.09,3.2,8]}/><meshStandardMaterial color="#b28bad" metalness={.55}/>
    </mesh>
    {[0,.65,1.3].map((y,i)=><mesh key={i} position={[5.7,2.55+y*.7,-18.1]}><sphereGeometry args={[.11,12,12]}/><meshBasicMaterial color={awakened?"#ffe0d3":"#8b6f92"} /></mesh>)}
  </group>;
}

function City({lit,onInteract}:{lit:number;onInteract:(id:string)=>void}){
  const buildings=useMemo(()=>[
    [-8,2,-43,3.4,4],[-3,2.6,-40,3.8,5.2],[2,3.3,-43,4.2,6.6],[7,2.2,-46,3.2,4.4],
    [-7,2,-50,3.0,3.8],[1,2.1,-50,3.5,4.2],[7,3.2,-52,3.6,6]
  ] as Array<[number,number,number,number,number]>,[]);
  return <group>
    {buildings.map((b,i)=><group key={i} position={[b[0],b[1],b[2]]}>
      <mesh><boxGeometry args={[b[3],b[4],b[3]*.82]}/><meshStandardMaterial color="#574363" roughness={.82} metalness={.08}/></mesh>
      <mesh position={[0,.3, -b[3]/2-.015]}><boxGeometry args={[b[3]*.62,b[4]*.28,.035]}/><meshBasicMaterial color={lit>i%3?"#f6bfdb":"#815d8c"} transparent opacity={lit>i%3?.82:.35}/></mesh>
    </group>)}
    <mesh position={[0,-.49,-45.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[18,24]}/><meshStandardMaterial color="#3d2e4c" roughness={.95}/></mesh>
    {[-5.8,0,5.8].map(x=><mesh key={x} position={[x,.05,-43]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.08,22]}/><meshBasicMaterial color="#f6c5d8" transparent opacity={.58}/></mesh>)}
    <CityNode position={[-6.2,.7,-41.5]} color="#e8a9c4" onClick={()=>onInteract("city-create")}/>
    <CityNode position={[2.2,1.6,-47]} color="#ffc9da" onClick={()=>onInteract("city-learn")}/>
    <CityNode position={[8.2,2.2,-39.7]} color="#ddb0f6" onClick={()=>onInteract("city-explore")}/>
    <group position={[8.2,4.6,-41.7]} onClick={()=>onInteract("city-telescope")}>
      <mesh rotation={[0,0,.35]}><cylinderGeometry args={[.12,.17,1.4,10]}/><meshStandardMaterial color="#966b85" metalness={.5}/></mesh>
      <mesh position={[0,.72,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.22,.12,.55,12]}/><meshStandardMaterial color="#ffe2d3" metalness={.3}/></mesh>
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
    <mesh position={[-3.0,-.65,-66]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[8.3,64]}/><meshStandardMaterial color="#38556c" metalness={.58} roughness={.18} transparent opacity={.28}/></mesh>
    <mesh ref={ref} position={[-3,-.59,-66]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[7.55,8.1,64]}/><meshBasicMaterial color="#a5dfdf" transparent opacity={.24} side={THREE.DoubleSide}/></mesh>
    <group position={[-7,.02,-64.6]} onClick={()=>onInteract("lake-dock")}>
      {Array.from({length:8},(_,i)=><mesh key={i} position={[i*.55,0,0]} rotation={[0,(i%2)*.03,0]}><boxGeometry args={[.55,.12,.72]}/><meshStandardMaterial color="#936276"/></mesh>)}
      <mesh position={[1.8,.65,.16]} rotation={[0,0,.05]}><boxGeometry args={[.12,1.05,.12]}/><meshStandardMaterial color="#82536c"/></mesh>
    </group>
    <group position={[4.5,.5,-65.2]}>
      <mesh><boxGeometry args={[4.2,2.2,3.4]}/><meshStandardMaterial color="#81556f"/></mesh>
      <mesh position={[0,1.7,0]} rotation={[0,0,.0]}><coneGeometry args={[2.8,1.6,4]}/><meshStandardMaterial color="#8b5c7d"/></mesh>
      <mesh position={[0,.2,-1.74]}><planeGeometry args={[1.0,.7]}/><meshBasicMaterial color={completed?"#dca9c3":"#bd8aaf"} transparent opacity={completed?.95:.45}/></mesh>
    </group>
    {[-1.0,1.7,4.0].map((x,i)=><mesh key={i} position={[x,.02,-71.3]} onClick={()=>onInteract("lake-constellation")}>
      <cylinderGeometry args={[.22,.3,.18,8]}/><meshBasicMaterial color={completed?"#f9b9d3":"#876b9c"} />
    </mesh>)}
  </group>;
}

function Mountain({signals,activated,onInteract}:{signals:number;activated:boolean;onInteract:(id:string)=>void}){
  const signalPositions:Vec3[]=[[-6,.9,-88],[4.8,4,-96],[2.4,8.4,-88.8]];
  return <group>
    {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*.7)*3.4, i*.95-.4,-82-i*2.7]} rotation={[0,.1*i,0]}>
      <boxGeometry args={[16-i*.7,1.25,7.5]}/><meshStandardMaterial color={i%2?"#645172":"#785875"} roughness={1}/>
    </mesh>)}
    <mesh position={[2.4,8.1,-91.5]}><cylinderGeometry args={[3.1,3.1,.7,32]}/><meshStandardMaterial color="#855a7b" metalness={.16}/></mesh>
    <mesh position={[2.4,9.8,-91.5]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[2.7,2.2,8]}/><meshStandardMaterial color="#63476f" metalness={.12}/></mesh>
    <mesh position={[2.4,10.1,-91.5]} onClick={()=>onInteract("observatory")}>
      <torusGeometry args={[1.3,.09,10,32]}/><meshStandardMaterial color="#ffd5e3" emissive="#d45b98" emissiveIntensity={.3}/>
    </mesh>
    {signalPositions.map((p,i)=><mesh key={i} position={p} onClick={()=>onInteract("mountain-signal-"+(i+1))}>
      <octahedronGeometry args={[.34,0]}/><meshStandardMaterial color={i<signals?"#ffd8a8":"#a3779b"} emissive={i<signals?"#ffb8c8":"#624052"} emissiveIntensity={i<signals?1.25:.22}/>
    </mesh>)}
    {activated&&<mesh position={[0,17,-92]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.2,.85,26,12]}/><meshBasicMaterial color="#efb8da" transparent opacity={.13}/>
    </mesh>}
  </group>;
}

function House({lit,ending,onInteract}:{lit:boolean;ending:boolean;onInteract:(id:string)=>void}){
  const glow=lit?"#f3c5d4":"#e7a3be";
  return <group>
    <mesh position={[0,1.0,-116]}><boxGeometry args={[11,4.2,7.4]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[0,4.0,-116]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[5.1,3.1,4]}/><meshStandardMaterial color="#a16b86" roughness={.7} metalness={.08}/></mesh>
    <mesh position={[0,.8,-119.75]}><boxGeometry args={[9.2,2.3,.07]}/><meshBasicMaterial color={glow} transparent opacity={lit?.3:.12}/></mesh>
    {[-3.1,0,3.1].map(x=><mesh key={x} position={[x,.95,-119.82]}><boxGeometry args={[1.6,1.15,.04]}/><meshBasicMaterial color={glow} transparent opacity={lit?.8:.25}/></mesh>)}
    <mesh position={[0,1.1,-112.2]}><boxGeometry args={[3.2,2.1,.8]}/><meshStandardMaterial color="#9b667c"/></mesh>
    <mesh position={[0,.95,-112.55]} onClick={()=>onInteract("house-door")}>
      <boxGeometry args={[1.5,2.5,.16]}/><meshStandardMaterial color={ending?"#f4d5e4":"#8e5872"} emissive={ending?"#d88cab":"#6c3d5b"} emissiveIntensity={ending?1.3:.25}/>
    </mesh>
    {!ending&&<mesh position={[-3.2,1,-114.3]} onClick={()=>onInteract("house-empty-room")}><boxGeometry args={[2.4,2.2,.2]}/><meshBasicMaterial color="#e4a4c0" transparent opacity={.18}/></mesh>}
    {ending&&<pointLight position={[0,3,-116]} distance={10} intensity={5} color="#eab1cf"/>}
  </group>;
}

function Player({moveRef,lookRef,mobile,cameraFocus,onNear,onRegion,controlsLocked}:{moveRef:MoveRef;lookRef:LookRef;mobile:boolean;cameraFocus:WorldProps["cameraFocus"];onNear:(n:Nearby|null)=>void;onRegion:(r:ChapterId)=>void;controlsLocked:boolean}){
  const ref=useRef<THREE.Group>(null);
  const torso=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null),scarfTail=useRef<THREE.Mesh>(null);
  const keys=useRef<Record<string,boolean>>({});
  const velocity=useRef({x:0,z:0});
  const orbit=useRef({yaw:0,pitch:.18,distance:8.7});
  const dragging=useRef(false);
  const lastPointer=useRef({x:0,y:0});
  const {camera,scene,gl}=useThree();
  const focusPosition=useMemo(()=>new THREE.Vector3(),[]);
  const focusTarget=useMemo(()=>new THREE.Vector3(),[]);
  const cameraGoal=useMemo(()=>new THREE.Vector3(),[]);
  const cameraOrigin=useMemo(()=>new THREE.Vector3(),[]);
  const cameraDirection=useMemo(()=>new THREE.Vector3(),[]);
  const cameraSafe=useMemo(()=>new THREE.Vector3(),[]);
  const lookTarget=useMemo(()=>new THREE.Vector3(),[]);
  const raycaster=useMemo(()=>new THREE.Raycaster(),[]);
  const collisionTick=useRef(-Infinity);
  const leftLeg=useRef<THREE.Group>(null),rightLeg=useRef<THREE.Group>(null);
  const leftArm=useRef<THREE.Group>(null),rightArm=useRef<THREE.Group>(null);
  const lastNear=useRef(""); const lastRegion=useRef<ChapterId>("origins");

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement|null;
      if(target&&(target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(target.tagName)))return;
      const key=e.key.toLowerCase();
      if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))e.preventDefault();
      keys.current[key]=true;
    };
    const up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);keys.current={}};
  },[]);

  // Desktop: right-drag orbits around the avatar; wheel changes follow distance.
  useEffect(()=>{
    const el=gl.domElement;
    const down=(e:PointerEvent)=>{
      if(e.button!==2)return;
      dragging.current=true;
      lastPointer.current={x:e.clientX,y:e.clientY};
      e.preventDefault();
    };
    const move=(e:PointerEvent)=>{
      if(!dragging.current)return;
      const dx=e.clientX-lastPointer.current.x;
      const dy=e.clientY-lastPointer.current.y;
      orbit.current.yaw-=dx*.006;
      orbit.current.pitch=clamp(orbit.current.pitch-dy*.0045,-.12,.62);
      lastPointer.current={x:e.clientX,y:e.clientY};
    };
    const up=()=>{dragging.current=false};
    const wheel=(e:WheelEvent)=>{
      orbit.current.distance=clamp(orbit.current.distance+Math.sign(e.deltaY)*.62,5.2,13.5);
      e.preventDefault();
    };
    const context=(e:MouseEvent)=>e.preventDefault();
    el.addEventListener("pointerdown",down);
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up);
    el.addEventListener("wheel",wheel,{passive:false});
    el.addEventListener("contextmenu",context);
    return()=>{
      el.removeEventListener("pointerdown",down);
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",up);
      el.removeEventListener("wheel",wheel);
      el.removeEventListener("contextmenu",context);
    };
  },[gl]);

  useFrame((state,dt)=>{
    if(!ref.current)return;
    const delta=Math.min(dt,.05);

    // Touch look values are per-swipe deltas. Keep the resulting orbit after the finger lifts.
    if(mobile){
      const lx=lookRef.current.x,ly=lookRef.current.y;
      if(Math.abs(lx)+Math.abs(ly)>.0001){
        orbit.current.yaw+=lx;
        orbit.current.pitch=clamp(orbit.current.pitch+ly,-.12,.62);
        lookRef.current={x:0,y:0};
      }
    }

    let x=controlsLocked?0:moveRef.current.x;
    let y=controlsLocked?0:moveRef.current.y;
    if(!mobile&&!controlsLocked){
      x+=(keys.current.d||keys.current.arrowright?1:0)-(keys.current.a||keys.current.arrowleft?1:0);
      y+=(keys.current.s||keys.current.arrowdown?1:0)-(keys.current.w||keys.current.arrowup?1:0);
    }
    const inputLength=Math.hypot(x,y);
    if(inputLength>1){x/=inputLength;y/=inputLength}
    const sprint=!mobile&&Boolean(keys.current.shift)&&!controlsLocked;
    const maxSpeed=sprint?4.9:3.55;
    // Movement is camera-relative: W/up always travels away from the current camera.
    const targetVX=(x*Math.cos(orbit.current.yaw)-y*Math.sin(orbit.current.yaw))*maxSpeed;
    const targetVZ=(x*Math.sin(orbit.current.yaw)+y*Math.cos(orbit.current.yaw))*maxSpeed;
    const blend=1-Math.exp(-delta*(inputLength>.035?15:11));
    velocity.current.x=THREE.MathUtils.lerp(velocity.current.x,targetVX,blend);
    velocity.current.z=THREE.MathUtils.lerp(velocity.current.z,targetVZ,blend);
    ref.current.position.x=clamp(ref.current.position.x+velocity.current.x*delta,-10.8,10.8);
    ref.current.position.z=clamp(ref.current.position.z+velocity.current.z*delta,-124,10);

    const speed=Math.hypot(velocity.current.x,velocity.current.z);
    const moving=speed>.16;
    const cycle=Math.sin(state.clock.elapsedTime*(moving?8.8+speed*.65:2.2));
    ref.current.position.y=.025+(moving?Math.abs(cycle)*.025:Math.sin(state.clock.elapsedTime*1.5)*.004);
    if(leftLeg.current)leftLeg.current.rotation.x=cycle*.52*(moving?1:0);
    if(rightLeg.current)rightLeg.current.rotation.x=-cycle*.52*(moving?1:0);
    if(leftArm.current)leftArm.current.rotation.x=-cycle*.34*(moving?1:0);
    if(rightArm.current)rightArm.current.rotation.x=cycle*.34*(moving?1:0);
    if(torso.current){
      torso.current.rotation.z=THREE.MathUtils.lerp(torso.current.rotation.z,moving?clamp(-velocity.current.x*.045,-.12,.12):0,1-Math.exp(-delta*7));
      torso.current.rotation.x=THREE.MathUtils.lerp(torso.current.rotation.x,moving?-.035:0,1-Math.exp(-delta*6));
    }
    if(head.current)head.current.rotation.z=THREE.MathUtils.lerp(head.current.rotation.z,moving?clamp(velocity.current.x*.025,-.07,.07):0,1-Math.exp(-delta*5));
    if(scarfTail.current)scarfTail.current.rotation.x=.2+Math.sin(state.clock.elapsedTime*5)*(moving?.16:.035);

    if(moving){
      const desiredYaw=Math.atan2(velocity.current.x,velocity.current.z);
      const turn=1-Math.exp(-delta*11);
      ref.current.rotation.y+=Math.atan2(Math.sin(desiredYaw-ref.current.rotation.y),Math.cos(desiredYaw-ref.current.rotation.y))*turn;
    }

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

    if(cameraFocus){
      focusPosition.set(...cameraFocus.position);
      focusTarget.set(...cameraFocus.target);
      camera.position.lerp(focusPosition,1-Math.exp(-delta*2.8));
      camera.lookAt(focusTarget);
    }else{
      const yaw=orbit.current.yaw,pitch=orbit.current.pitch,distance=orbit.current.distance;
      const horizontal=Math.cos(pitch)*distance;
      cameraGoal.set(
        ref.current.position.x+Math.sin(yaw)*horizontal,
        ref.current.position.y+1.85+Math.sin(pitch)*distance,
        ref.current.position.z+Math.cos(yaw)*horizontal
      );
      if(state.clock.elapsedTime-collisionTick.current>.045){
        collisionTick.current=state.clock.elapsedTime;
        cameraOrigin.set(ref.current.position.x,ref.current.position.y+1.05,ref.current.position.z);
        cameraDirection.subVectors(cameraGoal,cameraOrigin).normalize();
        const rayDistance=cameraOrigin.distanceTo(cameraGoal);
        raycaster.near=.2;raycaster.far=rayDistance;
        raycaster.set(cameraOrigin,cameraDirection);
        const hit=raycaster.intersectObjects(scene.children,true).find(item=>{
          if(item.point.y<ref.current!.position.y+.22)return false;
          let node:THREE.Object3D|null=item.object;
          while(node){
            if(node===ref.current)return false;
            node=node.parent;
          }
          return true;
        });
        if(hit&&hit.distance<rayDistance-.2)cameraSafe.copy(cameraOrigin).addScaledVector(cameraDirection,Math.max(1.7,hit.distance-.32));
        else cameraSafe.copy(cameraGoal);
      }
      camera.position.lerp(cameraSafe,1-Math.exp(-delta*9));
      lookTarget.set(
        ref.current.position.x-Math.sin(yaw)*.28,
        ref.current.position.y+.98,
        ref.current.position.z-Math.cos(yaw)*.28
      );
      camera.lookAt(lookTarget);
    }
  });

  return <group ref={ref} position={[0,.025,8.2]}>
    {/* A soft grounded halo replaces the old floating, angular mannequin silhouette. */}
    <mesh position={[0,-.021,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[.43,32]}/>
      <meshBasicMaterial color="#ffafd0" transparent opacity={.22} depthWrite={false}/>
    </mesh>
    <group ref={torso}>
      {/* Small travel pack with a stitched heart clasp. */}
      <mesh position={[0,.68,-.205]}><boxGeometry args={[.34,.43,.19]}/><meshStandardMaterial color="#75516f" roughness={.7}/></mesh>
      <mesh position={[0,.69,-.31]}><sphereGeometry args={[.065,12,12]}/><meshStandardMaterial color="#ffb1ce" emissive="#e45d99" emissiveIntensity={.65}/></mesh>
      {/* Warm ivory shirt under a rose-pink jacket. */}
      <mesh position={[0,.72,.015]}><capsuleGeometry args={[.215,.39,5,12]}/><meshStandardMaterial color="#f2cbd8" roughness={.62}/></mesh>
      <mesh position={[0,.71,.125]}><boxGeometry args={[.16,.36,.055]}/><meshStandardMaterial color="#fff0dc" roughness={.6}/></mesh>
      <mesh position={[0,.49,.012]}><boxGeometry args={[.39,.075,.3]}/><meshStandardMaterial color="#a96a86" roughness={.68}/></mesh>
      {/* A bright heart pin gives the character a readable silhouette from behind and up close. */}
      <mesh position={[-.045,.72,.174]} rotation={[0,0,.14]}><sphereGeometry args={[.075,16,12]}/><meshStandardMaterial color="#ff9dc4" emissive="#f15d9b" emissiveIntensity={.55}/></mesh>
      <mesh position={[.045,.72,.174]} rotation={[0,0,-.14]}><sphereGeometry args={[.075,16,12]}/><meshStandardMaterial color="#ff9dc4" emissive="#f15d9b" emissiveIntensity={.55}/></mesh>
      <mesh position={[0,.655,.18]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.115,.115,.045]}/><meshStandardMaterial color="#ff9dc4" emissive="#f15d9b" emissiveIntensity={.5}/></mesh>
      {/* Collar and scarf tail. */}
      <mesh position={[0,.965,.005]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.145,.045,8,18]}/><meshStandardMaterial color="#ffb1ce" roughness={.42}/></mesh>
      <mesh ref={scarfTail} position={[.13,.92,-.12]} rotation={[.2,0,.18]}><boxGeometry args={[.095,.39,.04]}/><meshStandardMaterial color="#e87eaa" roughness={.55}/></mesh>
      {/* Head, soft hair silhouette, expressive eyes, and a tiny gold hair clip. */}
      <group ref={head} position={[0,1.205,.012]}>
        <mesh scale={[.235,.275,.205]}><sphereGeometry args={[1,24,20]}/><meshStandardMaterial color="#f1c5b3" roughness={.72}/></mesh>
        <mesh position={[0,.115,-.016]} scale={[1.05,.68,1.0]}><sphereGeometry args={[.235,20,16]}/><meshStandardMaterial color="#38283a" roughness={.86}/></mesh>
        <mesh position={[-.19,.015,-.01]} scale={[.23,.31,.21]}><sphereGeometry args={[.19,16,12]}/><meshStandardMaterial color="#38283a" roughness={.86}/></mesh>
        <mesh position={[.19,.025,-.01]} scale={[.23,.28,.21]}><sphereGeometry args={[.19,16,12]}/><meshStandardMaterial color="#38283a" roughness={.86}/></mesh>
        <mesh position={[-.082,-.015,.188]}><sphereGeometry args={[.027,12,12]}/><meshStandardMaterial color="#39263a" roughness={.5}/></mesh>
        <mesh position={[.082,-.015,.188]}><sphereGeometry args={[.027,12,12]}/><meshStandardMaterial color="#39263a" roughness={.5}/></mesh>
        <mesh position={[-.075,-.008,.21]}><sphereGeometry args={[.008,8,8]}/><meshBasicMaterial color="#fff7e8"/></mesh>
        <mesh position={[.089,-.008,.21]}><sphereGeometry args={[.008,8,8]}/><meshBasicMaterial color="#fff7e8"/></mesh>
        <mesh position={[0,-.072,.211]}><sphereGeometry args={[.018,10,10]}/><meshStandardMaterial color="#d08a89" roughness={.65}/></mesh>
        <mesh position={[0,-.118,.207]}><boxGeometry args={[.057,.012,.012]}/><meshBasicMaterial color="#9d526e"/></mesh>
        <mesh position={[.125,.18,.09]} rotation={[0,0,-.4]}><boxGeometry args={[.075,.035,.025]}/><meshStandardMaterial color="#f6cc8f" emissive="#c88f52" emissiveIntensity={.35}/></mesh>
        <mesh position={[-.225,-.055,.015]}><sphereGeometry args={[.055,12,12]}/><meshStandardMaterial color="#e6a4aa" roughness={.8}/></mesh>
        <mesh position={[.225,-.055,.015]}><sphereGeometry args={[.055,12,12]}/><meshStandardMaterial color="#e6a4aa" roughness={.8}/></mesh>
      </group>
      {/* Articulated legs with little boots. */}
      <group ref={leftLeg} position={[-.125,.385,.015]}>
        <mesh position={[0,-.155,0]}><capsuleGeometry args={[.073,.25,4,10]}/><meshStandardMaterial color="#61506c" roughness={.72}/></mesh>
        <mesh position={[0,-.315,.055]}><boxGeometry args={[.145,.105,.22]}/><meshStandardMaterial color="#4b344f" roughness={.7}/></mesh>
        <mesh position={[0,-.267,.13]}><boxGeometry args={[.11,.035,.055]}/><meshStandardMaterial color="#ffcfaa" metalness={.22}/></mesh>
      </group>
      <group ref={rightLeg} position={[.125,.385,.015]}>
        <mesh position={[0,-.155,0]}><capsuleGeometry args={[.073,.25,4,10]}/><meshStandardMaterial color="#61506c" roughness={.72}/></mesh>
        <mesh position={[0,-.315,.055]}><boxGeometry args={[.145,.105,.22]}/><meshStandardMaterial color="#4b344f" roughness={.7}/></mesh>
        <mesh position={[0,-.267,.13]}><boxGeometry args={[.11,.035,.055]}/><meshStandardMaterial color="#ffcfaa" metalness={.22}/></mesh>
      </group>
      {/* Arms pivot at the shoulders, so the gait reads as a walk rather than spinning capsules. */}
      <group ref={leftArm} position={[-.245,.84,.005]}>
        <mesh position={[0,-.145,.01]}><capsuleGeometry args={[.065,.24,4,10]}/><meshStandardMaterial color="#eaa1bd" roughness={.7}/></mesh>
        <mesh position={[0,-.282,.045]}><sphereGeometry args={[.068,12,12]}/><meshStandardMaterial color="#f1c5b3" roughness={.76}/></mesh>
      </group>
      <group ref={rightArm} position={[.245,.84,.005]}>
        <mesh position={[0,-.145,.01]}><capsuleGeometry args={[.065,.24,4,10]}/><meshStandardMaterial color="#eaa1bd" roughness={.7}/></mesh>
        <mesh position={[0,-.282,.045]}><sphereGeometry args={[.068,12,12]}/><meshStandardMaterial color="#f1c5b3" roughness={.76}/></mesh>
      </group>
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
      <color attach="background" args={["#3a2847"]}/>
      <fog attach="fog" args={["#59415f",28,150]}/>
      <hemisphereLight intensity={1.35} color="#fff1fb" groundColor="#5a4a62"/>
      <ambientLight intensity={.88} color="#d8cbe8"/>
      <directionalLight position={[-10,15,8]} intensity={2.0} color="#ffe1ee"/>
      <pointLight position={[0,6,-18]} intensity={mobile?1.7:3.0} distance={34} color={palette.workshop}/>
      <pointLight position={[0,7,0]} intensity={mobile?1.5:2.5} distance={30} color="#f0c2dc"/>
      <pointLight position={[0,7,-43]} intensity={mobile?1.6:2.8} distance={36} color={palette.city}/>
      <pointLight position={[-3,5,-66]} intensity={mobile?1.6:2.8} distance={34} color={palette.lake}/>
      <pointLight position={[0,10,-92]} intensity={mobile?1.4:2.5} distance={38} color={palette.mountain}/>
      <pointLight position={[0,5,-116]} intensity={mobile?1.5:2.6} distance={32} color={palette.house}/>
      <Sky mobile={mobile} bright={bright}/>
      <Atmosphere chapter={activeChapter} mobile={mobile}/>
      <Fireflies mobile={mobile}/>
      <Terrain/>
      <LoveWorld mobile={mobile}/>
      <RegionChunk center={4}><Garden complete={completedQuests.includes("garden")} onInteract={onInteract}/></RegionChunk>
      <RegionChunk center={-18}><Workshop awakened={awakened} onInteract={onInteract}/></RegionChunk>
      <RegionChunk center={-42}><City lit={cityLit} onInteract={onInteract}/></RegionChunk>
      <RegionChunk center={-66}><Lake completed={completedQuests.includes("lake")} onInteract={onInteract}/></RegionChunk>
      <RegionChunk center={-92}><Mountain signals={signals} activated={completedQuests.includes("mountain")} onInteract={onInteract}/></RegionChunk>
      <RegionChunk center={-116}><House lit={completedQuests.includes("house")||ending} ending={ending} onInteract={onInteract}/></RegionChunk>
      <LetterMarkers discovered={discoveredLetters} onInteract={onInteract}/>
      <ThreadContinuity discovered={discoveredLetters}/>
      <Gates completedQuests={completedQuests}/>
      <Player moveRef={moveRef} lookRef={lookRef} mobile={mobile} cameraFocus={cameraFocus} onNear={onNear} onRegion={onRegion} controlsLocked={controlsLocked}/>
    </Canvas>
    {ending&&<div className="final-sky-overlay" aria-hidden="true"><div className="final-sky-stars"/><div className="final-sky-core"/></div>}
  </div>;
}
