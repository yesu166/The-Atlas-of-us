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
  jumpRef:MutableRefObject<boolean>;
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
  {id:"workshop-core",label:"Energy Core",prompt:"Recover the missing core.",position:[-10.25,.55,-18] as Vec3,radius:2.2,region:"curiosity" as ChapterId},
  {id:"workshop-gear",label:"Gear Array",prompt:"Align the mechanical rings.",position:[-1.5,.8,-22.6] as Vec3,radius:2.2,region:"curiosity" as ChapterId},
  {id:"workshop-signal",label:"Signal Mast",prompt:"Decode the antenna sequence.",position:[5.7,2.0,-18.1] as Vec3,radius:2.5,region:"curiosity" as ChapterId},
  {id:"workshop-engine",label:"Memory Engine",prompt:"Inspect the broken machine.",position:[.6,2.4,-15.0] as Vec3,radius:3,region:"curiosity" as ChapterId},
  {id:"city-create",label:"CREATE",prompt:"Enter the art chamber.",position:[-6.2,.8,-41.5] as Vec3,radius:2.6,region:"building" as ChapterId},
  {id:"city-learn",label:"LEARN",prompt:"Open the knowledge archive.",position:[2.2,1.6,-47] as Vec3,radius:2.6,region:"building" as ChapterId},
  {id:"city-explore",label:"EXPLORE",prompt:"Climb toward the telescope.",position:[8.2,2.2,-39.7] as Vec3,radius:2.6,region:"building" as ChapterId},
  {id:"city-telescope",label:"Rooftop Telescope",prompt:"Look beyond the city.",position:[8.2,4.6,-41.7] as Vec3,radius:2.4,region:"building" as ChapterId},
  {id:"lake-dock",label:"Quiet Dock",prompt:"Sit at the water for a moment.",position:[-9.2,.05,-64.6] as Vec3,radius:2.4,region:"dreams" as ChapterId},
  {id:"lake-constellation",label:"Reflection Stones",prompt:"Decode the stars in the water.",position:[-2.8,.2,-71.4] as Vec3,radius:2.4,region:"dreams" as ChapterId},
  {id:"lake-cabin",label:"Lakeside Cabin",prompt:"Look inside the quiet room.",position:[7.3,.2,-65.2] as Vec3,radius:2.4,region:"dreams" as ChapterId},
  {id:"mountain-signal-1",label:"Future Signal I",prompt:"Capture the lower signal.",position:[-6,.9,-88] as Vec3,radius:2.5,region:"quiet" as ChapterId},
  {id:"mountain-signal-2",label:"Future Signal II",prompt:"Find the second moonstone.",position:[5.3,.85,-95.2] as Vec3,radius:2.1,region:"quiet" as ChapterId},
  {id:"mountain-signal-3",label:"Future Signal III",prompt:"Find the last moonstone.",position:[-1.9,.85,-91.2] as Vec3,radius:2.1,region:"quiet" as ChapterId},
  {id:"observatory",label:"Moon Observatory",prompt:"Look through the moon observatory.",position:[7.6,.85,-91.5] as Vec3,radius:2.3,region:"quiet" as ChapterId},
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
      <pointsMaterial color="#eee7ff" size={mobile?.028:.036} transparent opacity={bright?.78:.55} sizeAttenuation/>
    </points>
    <group position={[0,16,-48]}>
      <mesh><sphereGeometry args={[2.35,40,32]}/><meshStandardMaterial color="#fff0dc" emissive="#e7c5f0" emissiveIntensity={.3} roughness={1}/></mesh>
      <mesh position={[-.68,.52,2.08]} scale={[.48,.38,.035]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#d3b2d9" roughness={1}/></mesh>
      <mesh position={[.74,-.65,2.10]} scale={[.31,.24,.035]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#d3b2d9" roughness={1}/></mesh>
      <pointLight intensity={.8} distance={18} color="#ffe0ef"/>
    </group>
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
      const center=0;
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
    <pointsMaterial color="#ffd4e5" size={mobile?.027:.036} transparent opacity={.42} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/>
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


function MeadowFlowers({mobile}:{mobile:boolean}){
  const count=mobile?100:220;
  const ref=useRef<THREE.InstancedMesh>(null);
  const geometry=useMemo(()=>new THREE.SphereGeometry(.075,7,6),[]);
  const material=useMemo(()=>new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.65}),[]);
  useEffect(()=>{
    if(!ref.current)return;
    const dummy=new THREE.Object3D();
    const colors=["#ffd0e2","#ffe2ac","#d8c2ff","#a9ece0","#f29fca"].map(color=>new THREE.Color(color));
    for(let i=0;i<count;i++){
      const t=i/Math.max(1,count-1);
      const z=12-t*136;
      const side=i%2===0?-1:1;
      const x=side*(6.9+(i%9)*.43+Math.sin(i*2.17)*.55);
      dummy.position.set(x,.01,z);
      dummy.rotation.set(0,0,(i%5)*.12);
      dummy.scale.setScalar(.36+(i%6)*.105);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i,dummy.matrix);
      ref.current.setColorAt(i,colors[i%colors.length]);
    }
    ref.current.instanceMatrix.needsUpdate=true;
    if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;
  },[count]);
  useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material]);
  return <instancedMesh ref={ref} args={[geometry,material,count]} frustumCulled={false}/>;
}

function BlossomGrove({mobile}:{mobile:boolean}){
  const trees=useMemo(()=>Array.from({length:12},(_,i)=>{
    const z=5-i*11.1;
    const side=i%2===0?-1:1;
    return {x:side*(10.2+(i%3)*.6),z,h:2.3+(i%4)*.22,tint:i%4};
  }),[]);
  return <group>
    {trees.map((tree,i)=><group key={i} position={[tree.x,0,tree.z]} scale={tree.h/2.3}>
      <mesh position={[0,.78,0]}><cylinderGeometry args={[.13,.22,1.56,8]}/><meshStandardMaterial color="#82566a" roughness={.8}/></mesh>
      <mesh position={[0,1.78,0]} scale={[1,1.15,.95]}><sphereGeometry args={[.92,12,10]}/><meshStandardMaterial color={tree.tint%2?"#76aa91":"#6e9a83"} roughness={.86}/></mesh>
      <mesh position={[-.42,2.12,0]}><sphereGeometry args={[.61,12,10]}/><meshStandardMaterial color={tree.tint===0?"#eda9c8":tree.tint===1?"#c8a7ee":"#a5dcd1"} roughness={.8}/></mesh>
      <mesh position={[.39,2.11,.02]}><sphereGeometry args={[.63,12,10]}/><meshStandardMaterial color={tree.tint===2?"#f5bad1":"#e3a6c5"} roughness={.8}/></mesh>
      <mesh position={[0,2.52,.02]}><sphereGeometry args={[.28,10,8]}/><meshStandardMaterial color="#ffe1b7" emissive="#f7b9ce" emissiveIntensity={.18}/></mesh>
    </group>)}
    <MeadowFlowers mobile={mobile}/>
  </group>;
}
function Terrain(){
  const floorGeometry=useMemo(()=>{
    const geometry=new THREE.PlaneGeometry(150,150,96,96);
    const positions=geometry.getAttribute("position");
    const colors=new Float32Array(positions.count*3);
    const moss=new THREE.Color("#6d9b82");
    const lavender=new THREE.Color("#c18bb1");
    const sage=new THREE.Color("#a0cf9d");
    const blush=new THREE.Color("#f1a9cb");
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getY(i);
      const broad=(Math.sin(x*.12+z*.035)+Math.cos(z*.105-x*.045))*.5;
      const fine=Math.sin(x*.63+Math.cos(z*.3))*Math.cos(z*.51)*.15;
      const edge=Math.max(0,Math.min(1,(Math.abs(x)-4)/13));
      const t=THREE.MathUtils.clamp(.38+broad*.14+fine*.08,0,1);
      const color=moss.clone().lerp(lavender,t*.78);
      color.lerp(sage,THREE.MathUtils.clamp(.2+broad*.08,0,.32));
      color.lerp(blush,edge*.16);
      colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;
    }
    geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
    return geometry;
  },[]);
  const slabs=useMemo(()=>Array.from({length:24},(_,i)=>{
    const z=12-i*6;
    const x=0;
    return {x,z,w:13.6-(i%4)*.35,turn:0};
  }),[]);
  useEffect(()=>()=>floorGeometry.dispose(),[floorGeometry]);
  return <group>
    <mesh geometry={floorGeometry} position={[0,-.065,-52]} rotation={[-Math.PI/2,0,0]} name="world-floor">
      <meshStandardMaterial vertexColors roughness={1}/>
    </mesh>
    {slabs.map((s,i)=><group key={i} position={[s.x,-.095,s.z]} rotation={[0,s.turn,0]}>
      <mesh>
        <boxGeometry args={[s.w,.19,5.55]}/>
        <meshStandardMaterial color={i%4===0?"#a87598":i%3===0?"#8c6c91":"#765b83"} roughness={.88}/>
      </mesh>
      <mesh position={[0,.101,0]}>
        <boxGeometry args={[s.w*.94,.012,5.36]}/>
        <meshStandardMaterial color={i%3===0?"#e9bad0":"#cba1c6"} roughness={.8} metalness={.06}/>
      </mesh>
    </group>)}
    <mesh position={[0,.018,-47]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[2.3,2.9,64]}/>
      <meshBasicMaterial color="#ffb5d1" transparent opacity={.32} side={THREE.DoubleSide}/>
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
    <mesh position={[-5.0,.6,-18]}><boxGeometry args={[10,1.5,6.7]}/><meshStandardMaterial color="#76516d" roughness={.84}/></mesh>
    <mesh position={[-5.0,3.0,-18]} rotation={[0,0,.05]}><boxGeometry args={[9.5,3.8,5.5]}/><meshStandardMaterial color="#655278" roughness={.72} metalness={.18}/></mesh>
    <mesh position={[-5.0,5.2,-18]} rotation={[0,0,.13]}><coneGeometry args={[3.6,2.2,4]} /><meshStandardMaterial color="#8c5a76" metalness={.18}/></mesh>
    {[-7.8,-4.8,-1.8].map((x,i)=><mesh key={i} position={[x,3.1,-14.95]}><boxGeometry args={[1.4,.25,.2]}/><meshBasicMaterial color={awakened?"#ffd5e5":"#b879a0"} transparent opacity={awakened?.85:.45}/></mesh>)}
    <group ref={gear} position={[-1.5,2.0,-22.6]} onClick={()=>onInteract("workshop-gear")}>
      {[0,1,2].map(i=><mesh key={i} rotation={[0,0,i*Math.PI/3]}><torusGeometry args={[1.0+i*.12,.08,10,20]}/><meshBasicMaterial color="#ffb2d0" transparent opacity={awakened?.9:.58}/></mesh>)}
      <sphereGeometry args={[.18,12,12]}/>
    </group>
    <mesh position={[.6,2.3,-15]} onClick={()=>onInteract("workshop-engine")}>
      <icosahedronGeometry args={[.65,1]}/><meshStandardMaterial color={awakened?"#d5a6c9":"#a887a0"} emissive={awakened?"#a55179":"#4b2d49"} emissiveIntensity={awakened?1.2:.15}/>
    </mesh>
    <mesh position={[-10.25,.65,-18]} onClick={()=>onInteract("workshop-core")}><icosahedronGeometry args={[.35,1]}/><meshStandardMaterial color="#ffb1c9" emissive="#b74477" emissiveIntensity={1.4}/></mesh>
    <mesh position={[5.7,2,-18.1]} onClick={()=>onInteract("workshop-signal")}>
      <cylinderGeometry args={[.09,.09,3.2,8]}/><meshStandardMaterial color="#b28bad" metalness={.55}/>
    </mesh>
    {[0,.65,1.3].map((y,i)=><mesh key={i} position={[5.7,2.55+y*.7,-18.1]}><sphereGeometry args={[.11,12,12]}/><meshBasicMaterial color={awakened?"#ffe0d3":"#8b6f92"} /></mesh>)}
  </group>;
}

function City({lit,onInteract}:{lit:number;onInteract:(id:string)=>void}){
  const buildings=useMemo(()=>[
    [-9,2,-43,3.0,4],[-6.6,2.6,-39.8,3.2,5.2],[6.5,3.3,-43,3.4,6.6],[9.2,2.2,-46,2.8,4.4],
    [-9.1,2,-50,2.7,3.8],[6.0,2.1,-50,3.0,4.2],[9.2,3.2,-52,2.8,6]
  ] as Array<[number,number,number,number,number]>,[]);
  return <group>
    {buildings.map((b,i)=><group key={i} position={[b[0],b[1],b[2]]}>
      <mesh><boxGeometry args={[b[3],b[4],b[3]*.82]}/><meshStandardMaterial color="#574363" roughness={.82} metalness={.08}/></mesh>
      <mesh position={[0,.3, -b[3]/2-.015]}><boxGeometry args={[b[3]*.62,b[4]*.28,.035]}/><meshBasicMaterial color={lit>i%3?"#f6bfdb":"#815d8c"} transparent opacity={lit>i%3?.82:.35}/></mesh>
    </group>)}
    <mesh position={[0,-.055,-45.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[18,24]}/><meshStandardMaterial color="#3d2e4c" roughness={.95}/></mesh>
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
    <mesh position={[-4.8,-.62,-66]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[5.3,64]}/><meshStandardMaterial color="#38556c" metalness={.58} roughness={.18} transparent opacity={.28}/></mesh>
    <mesh ref={ref} position={[-4.8,-.575,-66]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[4.82,5.2,64]}/><meshBasicMaterial color="#a5dfdf" transparent opacity={.24} side={THREE.DoubleSide}/></mesh>
    <group position={[-10,.02,-64.6]} onClick={()=>onInteract("lake-dock")}>
      {Array.from({length:13},(_,i)=><mesh key={i} position={[i*.55,0,0]} rotation={[0,(i%2)*.03,0]}><boxGeometry args={[.55,.12,.72]}/><meshStandardMaterial color="#936276"/></mesh>)}
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
  const signalPositions:Vec3[]=[[-5.5,.85,-87.7],[5.3,.85,-95.2],[-1.9,.85,-91.2]];
  return <group>
    {/* Rounded hills live beside the route; no floating stair slabs across the player's path. */}
    <mesh position={[-8.3,2.1,-87.5]} scale={[3.1,3.8,7.4]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#7b718f" roughness={1}/></mesh>
    <mesh position={[8.5,2.6,-95.2]} scale={[3.2,4.6,8.0]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#8e7899" roughness={1}/></mesh>
    <mesh position={[-8.7,1.5,-98.8]} scale={[2.6,2.7,5.5]}><sphereGeometry args={[1,14,10]}/><meshStandardMaterial color="#aa87a4" roughness={1}/></mesh>
    <mesh position={[7.6,.25,-91.5]}><cylinderGeometry args={[.72,.95,1.0,8]}/><meshStandardMaterial color="#b18bad" roughness={.8}/></mesh>
    <mesh position={[7.6,1.1,-91.5]}><cylinderGeometry args={[.18,.24,1.0,8]}/><meshStandardMaterial color="#d7b1cd" roughness={.6}/></mesh>
    <mesh position={[7.6,1.8,-91.5]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[1.15,1.0,8]}/><meshStandardMaterial color="#c2a0c2" roughness={.7}/></mesh>
    <mesh position={[7.6,2.1,-91.5]} onClick={()=>onInteract("observatory")}>
      <torusGeometry args={[.62,.075,10,32]}/><meshStandardMaterial color="#ffe2bb" emissive="#d45b98" emissiveIntensity={.6}/>
    </mesh>
    {signalPositions.map((p,i)=><group key={i} position={p} onClick={()=>onInteract("mountain-signal-"+(i+1))}>
      <mesh><cylinderGeometry args={[.14,.22,.62,7]}/><meshStandardMaterial color="#9b7198" roughness={.7}/></mesh>
      <mesh position={[0,.48,0]}><octahedronGeometry args={[.34,0]}/><meshStandardMaterial color={i<signals?"#ffe0a9":"#bd9acb"} emissive={i<signals?"#ffaf82":"#a36bb3"} emissiveIntensity={i<signals?1.4:.5}/></mesh>
      <pointLight position={[0,.5,0]} distance={2.7} intensity={i<signals?1.0:.3} color="#ffd4e5"/>
    </group>)}
    {activated&&<mesh position={[0,3,-92]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.12,.55,11,12]}/><meshBasicMaterial color="#ffe0e9" transparent opacity={.12}/>
    </mesh>}
  </group>;
}
function House({lit,ending,onInteract}:{lit:boolean;ending:boolean;onInteract:(id:string)=>void}){
  const glow=lit?"#f3c5d4":"#e7a3be";
  return <group>
    {/* A walk-in cottage: the front wall is split around a real doorway. */}
    <mesh position={[0,.07,-116]}><boxGeometry args={[11,.14,7.4]}/><meshStandardMaterial color="#bd91af" roughness={.9}/></mesh>
    <mesh position={[-5.42,2.1,-116]}><boxGeometry args={[.16,4.2,7.4]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[5.42,2.1,-116]}><boxGeometry args={[.16,4.2,7.4]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[0,2.1,-119.65]}><boxGeometry args={[11,4.2,.16]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[-3.25,2.1,-112.32]}><boxGeometry args={[4.5,4.2,.16]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[3.25,2.1,-112.32]}><boxGeometry args={[4.5,4.2,.16]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[0,3.48,-112.32]}><boxGeometry args={[2,1.45,.16]}/><meshStandardMaterial color="#83556e" roughness={.88}/></mesh>
    <mesh position={[0,4.0,-116]} rotation={[0,0,Math.PI/4]}><coneGeometry args={[5.1,3.1,4]}/><meshStandardMaterial color="#a16b86" roughness={.7} metalness={.08}/></mesh>
    <mesh position={[0,.8,-119.53]}><boxGeometry args={[9.2,2.3,.045]}/><meshBasicMaterial color={glow} transparent opacity={lit?.3:.12}/></mesh>
    {[-3.1,0,3.1].map(x=><mesh key={x} position={[x,.95,-119.51]}><boxGeometry args={[1.6,1.15,.035]}/><meshBasicMaterial color={glow} transparent opacity={lit?.8:.25}/></mesh>)}
    <mesh position={[0,1.1,-112.2]}><boxGeometry args={[3.2,2.1,.8]}/><meshStandardMaterial color="#9b667c"/></mesh>
    <mesh position={[0,.95,-112.48]} onClick={()=>onInteract("house-door")}>
      <boxGeometry args={[1.5,2.5,.12]}/><meshStandardMaterial color={ending?"#f4d5e4":"#8e5872"} emissive={ending?"#d88cab":"#6c3d5b"} emissiveIntensity={ending?1.3:.25}/>
    </mesh>
    {!ending&&<mesh position={[-3.2,1,-114.3]} onClick={()=>onInteract("house-empty-room")}><boxGeometry args={[2.4,2.2,.06]}/><meshBasicMaterial color="#e4a4c0" transparent opacity={.18}/></mesh>}
    {ending&&<pointLight position={[0,3,-116]} distance={10} intensity={5} color="#eab1cf"/>}
  </group>;
}

function LittleDreamer({movingRef,jumpingRef}:{movingRef:MutableRefObject<boolean>;jumpingRef:MutableRefObject<boolean>}){
  const cloak=useRef<THREE.Group>(null);
  const hood=useRef<THREE.Group>(null);
  const face=useRef<THREE.Group>(null);
  const leftArm=useRef<THREE.Group>(null),rightArm=useRef<THREE.Group>(null);
  const leftLeg=useRef<THREE.Group>(null),rightLeg=useRef<THREE.Group>(null);
  const trailingCharm=useRef<THREE.Group>(null);
  const jumpStars=useRef<THREE.Group>(null);
  const landingSparkles=useRef<THREE.Group>(null);
  const wasJumping=useRef(false);
  const jumpElapsed=useRef(0);
  const landingElapsed=useRef(1);

  useFrame((state,dt)=>{
    const t=state.clock.elapsedTime;
    const moving=movingRef.current;
    const jumping=jumpingRef.current;
    const gait=moving?Math.sin(t*10.2):0;
    const smooth=1-Math.exp(-dt*9);

    if(jumping&&!wasJumping.current){
      jumpElapsed.current=0;
      landingElapsed.current=1;
    }
    if(jumping)jumpElapsed.current+=dt;
    if(!jumping&&wasJumping.current)landingElapsed.current=0;
    if(!jumping)landingElapsed.current=Math.min(1,landingElapsed.current+dt/.28);
    wasJumping.current=jumping;

    // Arms unfold as the character leaves the ground, hold an open, happy silhouette,
    // then relax back into the walk swing after landing.
    const takeoff=THREE.MathUtils.smoothstep(jumpElapsed.current,0,.18);
    const armOpen=jumping?takeoff:0;
    const landing=1-THREE.MathUtils.smoothstep(landingElapsed.current,0,1);
    const squash=landing*Math.sin(landingElapsed.current*Math.PI)*.12;

    if(cloak.current){
      cloak.current.position.y=THREE.MathUtils.lerp(cloak.current.position.y,
        moving&&!jumping?Math.abs(gait)*.025:(!jumping?Math.sin(t*1.55)*.009:0),smooth);
      cloak.current.rotation.z=THREE.MathUtils.lerp(cloak.current.rotation.z,
        jumping?Math.sin(jumpElapsed.current*2.1)*.018:(moving?Math.sin(t*5.1)*.028:Math.sin(t*.85)*.008),smooth);
      cloak.current.rotation.x=THREE.MathUtils.lerp(cloak.current.rotation.x,jumping?-.12:0,smooth);
      const targetY=1-squash;
      const targetX=1+squash*.52;
      cloak.current.scale.y=THREE.MathUtils.lerp(cloak.current.scale.y,targetY,1-Math.exp(-dt*18));
      cloak.current.scale.x=THREE.MathUtils.lerp(cloak.current.scale.x,targetX,1-Math.exp(-dt*18));
      cloak.current.scale.z=THREE.MathUtils.lerp(cloak.current.scale.z,targetX,1-Math.exp(-dt*18));
    }
    if(hood.current){
      hood.current.rotation.z=THREE.MathUtils.lerp(hood.current.rotation.z,
        jumping?-Math.sin(jumpElapsed.current*2.1)*.025:(moving?-Math.sin(t*5.1)*.018:Math.sin(t*.95)*.011),smooth);
      hood.current.rotation.x=THREE.MathUtils.lerp(hood.current.rotation.x,jumping?-.055:0,smooth);
    }
    if(face.current){
      face.current.position.y=THREE.MathUtils.lerp(face.current.position.y,jumping?-.012:0,smooth);
      face.current.scale.y=THREE.MathUtils.lerp(face.current.scale.y,1+armOpen*.025, smooth);
    }
    if(leftArm.current){
      leftArm.current.rotation.x=THREE.MathUtils.lerp(leftArm.current.rotation.x,jumping?-.28:-gait*.28, smooth);
      leftArm.current.rotation.z=THREE.MathUtils.lerp(leftArm.current.rotation.z,-.95*armOpen,1-Math.exp(-dt*14));
    }
    if(rightArm.current){
      rightArm.current.rotation.x=THREE.MathUtils.lerp(rightArm.current.rotation.x,jumping?-.28:gait*.28, smooth);
      rightArm.current.rotation.z=THREE.MathUtils.lerp(rightArm.current.rotation.z,.95*armOpen,1-Math.exp(-dt*14));
    }
    if(leftLeg.current){
      leftLeg.current.rotation.x=THREE.MathUtils.lerp(leftLeg.current.rotation.x,jumping?-.55:-gait*.42,smooth);
      leftLeg.current.rotation.z=THREE.MathUtils.lerp(leftLeg.current.rotation.z,jumping?-.08:0,smooth);
    }
    if(rightLeg.current){
      rightLeg.current.rotation.x=THREE.MathUtils.lerp(rightLeg.current.rotation.x,jumping?-.55:gait*.42,smooth);
      rightLeg.current.rotation.z=THREE.MathUtils.lerp(rightLeg.current.rotation.z,jumping?.08:0,smooth);
    }
    if(trailingCharm.current){
      trailingCharm.current.rotation.z=Math.sin(t*2.1)*.08+(moving?gait*.1:0)+(jumping?-.2:0);
      trailingCharm.current.position.y=.87+Math.sin(t*1.8+.6)*.035+(jumping?.1:0);
    }
    if(jumpStars.current){
      jumpStars.current.visible=jumping;
      jumpStars.current.scale.setScalar(jumping?1+Math.sin(t*15)*.12:1);
    }
    if(landingSparkles.current){
      landingSparkles.current.visible=landingElapsed.current<.3;
      const pop=1+landingElapsed.current*4;
      landingSparkles.current.scale.setScalar(pop);
    }
  });

  return <group>
    <group ref={cloak}>
      {/* One bell-shaped cloak creates a clean, readable silhouette. */}
      <mesh position={[0,.59,0]}>
        <coneGeometry args={[.34,.66,9,2,false]}/>
        <meshStandardMaterial color="#827197" roughness={.84} flatShading/>
      </mesh>
      <mesh position={[0,.77,.012]} scale={[.245,.29,.205]}>
        <sphereGeometry args={[1,14,12]}/>
        <meshStandardMaterial color="#a18caf" roughness={.82} flatShading/>
      </mesh>
      {/* Short, mitten-like arms. */}
      <group ref={leftArm} position={[-.275,.77,0]} rotation={[0,0,-.18]}>
        <mesh position={[0,-.1,0]}><capsuleGeometry args={[.072,.13,4,8]}/><meshStandardMaterial color="#9a88ae" roughness={.85} flatShading/></mesh>
        <mesh position={[0,-.205,.025]}><sphereGeometry args={[.068,10,8]}/><meshStandardMaterial color="#ead9e7" roughness={.8} flatShading/></mesh>
      </group>
      <group ref={rightArm} position={[.275,.77,0]} rotation={[0,0,.18]}>
        <mesh position={[0,-.1,0]}><capsuleGeometry args={[.072,.13,4,8]}/><meshStandardMaterial color="#9a88ae" roughness={.85} flatShading/></mesh>
        <mesh position={[0,-.205,.025]}><sphereGeometry args={[.068,10,8]}/><meshStandardMaterial color="#ead9e7" roughness={.8} flatShading/></mesh>
      </group>
      {/* Tiny boots barely peek out from the hem. */}
      <group ref={leftLeg} position={[-.13,.25,.012]}>
        <mesh position={[0,-.055,0]}><capsuleGeometry args={[.062,.09,4,8]}/><meshStandardMaterial color="#e8d8e7" roughness={.82}/></mesh>
        <mesh position={[0,-.125,.055]} scale={[1,.65,1.12]}><sphereGeometry args={[.072,10,8]}/><meshStandardMaterial color="#554464" roughness={.75}/></mesh>
        <mesh position={[0,-.1,.11]}><boxGeometry args={[.075,.025,.012]}/><meshStandardMaterial color="#d9a6c9" roughness={.65}/></mesh>
      </group>
      <group ref={rightLeg} position={[.13,.25,.012]}>
        <mesh position={[0,-.055,0]}><capsuleGeometry args={[.062,.09,4,8]}/><meshStandardMaterial color="#e8d8e7" roughness={.82}/></mesh>
        <mesh position={[0,-.125,.055]} scale={[1,.65,1.12]}><sphereGeometry args={[.072,10,8]}/><meshStandardMaterial color="#554464" roughness={.75}/></mesh>
        <mesh position={[0,-.1,.11]}><boxGeometry args={[.075,.025,.012]}/><meshStandardMaterial color="#d9a6c9" roughness={.65}/></mesh>
      </group>

      {/* One oversized hood. No hair, animal ears or layered human costume. */}
      <group ref={hood} position={[0,1.16,-.015]}>
        <mesh scale={[.365,.405,.305]}>
          <sphereGeometry args={[1,16,12]}/>
          <meshStandardMaterial color="#493754" roughness={.88} flatShading/>
        </mesh>
        <mesh position={[0,.19,.008]} rotation={[0,0,.02]} scale={[.29,.245,.265]}>
          <sphereGeometry args={[1,14,10]}/>
          <meshStandardMaterial color="#5b4568" roughness={.88} flatShading/>
        </mesh>
        {/* A single folded peak gives the hood a recognizable silhouette. */}
        <mesh position={[.13,.28,-.015]} rotation={[0,0,-.34]}>
          <coneGeometry args={[.14,.28,5,1]}/>
          <meshStandardMaterial color="#61496f" roughness={.9} flatShading/>
        </mesh>
        {/* The cream face is inset into the hood, with only two eyes and a tiny mouth. */}
        <group ref={face} position={[0,-.055,.214]}>
          <mesh scale={[.255,.285,.105]}>
            <sphereGeometry args={[1,20,16]}/>
            <meshStandardMaterial color="#f0dfe2" roughness={.8} flatShading/>
          </mesh>
          {[-.085,.085].map((x,i)=><group key={i} position={[x,-.018,.102]}>
            <mesh scale={[.023,.041,.014]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#34253d" roughness={.4}/></mesh>
            <mesh position={[-.006,.014,.012]}><sphereGeometry args={[.006,8,8]}/><meshBasicMaterial color="#fff7f5"/></mesh>
          </group>)}
          {[-1,1].map(side=><mesh key={side} position={[side*.151,-.072,.091]} scale={[.036,.016,.008]}>
            <sphereGeometry args={[1,10,8]}/><meshBasicMaterial color="#df9ab7" transparent opacity={.55}/>
          </mesh>)}
          <mesh position={[0,-.093,.099]} scale={[.017,.006,.006]}>
            <sphereGeometry args={[1,8,8]}/><meshBasicMaterial color="#ad718e"/>
          </mesh>
        </group>
        {/* One crescent clasp: the only decorative focal point. */}
        <mesh position={[0,-.318,.257]} rotation={[0,0,-.15]}>
          <torusGeometry args={[.055,.013,6,16,Math.PI*1.55]}/>
          <meshStandardMaterial color="#f1d7a6" emissive="#c69bbb" emissiveIntensity={.18} roughness={.42}/>
        </mesh>
      </group>

      {/* A single trailing thread and glowing bead echo the world's light trail. */}
      <group ref={trailingCharm} position={[-.19,.87,-.24]}>
        <mesh position={[0,.15,-.015]} rotation={[0,0,-.2]}>
          <capsuleGeometry args={[.012,.27,3,6]}/>
          <meshStandardMaterial color="#d98fbe" emissive="#b65b9b" emissiveIntensity={.24} roughness={.55}/>
        </mesh>
        <mesh position={[-.005,.31,-.02]} scale={[.052,.052,.052]}>
          <sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#ffc6df" emissive="#e96ead" emissiveIntensity={.8} roughness={.4}/>
        </mesh>
        <pointLight position={[0,.31,-.02]} color="#f5a5d5" distance={1.5} intensity={.16}/>
      </group>
    </group>

    {/* Tiny glints orbit her hands while floating through a moon jump. */}
    <group ref={jumpStars} position={[0,.23,.06]} visible={false}>
      <mesh position={[-.36,.32,0]} rotation={[0,0,.35]}><octahedronGeometry args={[.045,0]}/><meshBasicMaterial color="#f8dbaa"/></mesh>
      <mesh position={[.36,.38,0]} rotation={[0,0,.2]}><octahedronGeometry args={[.037,0]}/><meshBasicMaterial color="#eeb5d9"/></mesh>
      <mesh position={[0,.54,-.02]} rotation={[0,0,.5]}><octahedronGeometry args={[.026,0]}/><meshBasicMaterial color="#fff0d7"/></mesh>
    </group>
    {/* Landing gets a tiny, quick burst rather than an abrupt stop. */}
    <group ref={landingSparkles} position={[0,.1,0]} visible={false}>
      {[-1,1].map(side=><group key={side} position={[side*.26,0,.06]}>
        <mesh rotation={[0,0,side*.3]}><octahedronGeometry args={[.04,0]}/><meshBasicMaterial color="#f5c4df" transparent opacity={.65}/></mesh>
      </group>)}
    </group>
    <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[.26,24]}/><meshBasicMaterial color="#d9a6d7" transparent opacity={.12} depthWrite={false}/>
    </mesh>
  </group>;
}
function isBlocked(x:number,z:number,region:ChapterId){
  const circles:Array<[ChapterId,number,number,number]>=[
    ["origins",-8,7,.78],["origins",-7,-.5,.78],["origins",8,7,.78],["origins",7,-1,.78],
    ["origins",-9,-5,.78],["origins",9,-6,.78],["origins",-5,9,.78],["origins",5,10,.78],
    ["curiosity",5.7,-18,.4],
    ["building",-9,-43,1.75],["building",-6.6,-39.8,1.85],["building",6.5,-43,2.0],
    ["building",9.2,-46,1.7],["building",-9.1,-50,1.6],["building",6,-50,1.7],["building",9.2,-52,1.7],
    ["dreams",-4.8,-66,5.05],["dreams",-7,-64.6,.65],["dreams",7.3,-65.2,1.75],
    ["quiet",-8.3,-87.5,2.25],["quiet",8.5,-95.2,2.35],["quiet",-8.7,-98.8,1.9],["quiet",7.6,-91.5,1.05]
  ];
  for(const [zone,cx,cz,r] of circles){
    if(region===zone&&Math.hypot(x-cx,z-cz)<r+.27){const onDock=region==="dreams"&&z>-65.02&&z<-64.18&&x>-10.35&&x<-2.65;if(!onDock)return true;}
  }
  if(region==="curiosity"&&x>-10.25&&x<-.05&&z>-21.55&&z<-14.42)return true;
  if(region==="future"){
    // Side walls and rear wall are solid; the front entrance remains open.
    if(z<-112.45&&z>-119.8&&(x<-5.15||x>5.15))return true;
    if(z<-119.1&&Math.abs(x)<5.2)return true;
    if(z<-112.15&&z>-112.85&&Math.abs(x)>.93)return true;
  }
  return false;
}

function Player({moveRef,lookRef,jumpRef,mobile,cameraFocus,onNear,onRegion,completedQuests,controlsLocked}:{moveRef:MoveRef;lookRef:LookRef;jumpRef:React.MutableRefObject<boolean>;mobile:boolean;cameraFocus:WorldProps["cameraFocus"];onNear:(n:Nearby|null)=>void;onRegion:(r:ChapterId)=>void;completedQuests:string[];controlsLocked:boolean}){
  const ref=useRef<THREE.Group>(null);
  const keys=useRef<Record<string,boolean>>({});
  const velocity=useRef({x:0,z:0});
  const verticalVelocity=useRef(0);
  const grounded=useRef(true);
  const movingRef=useRef(false),jumpingRef=useRef(false);
  const orbit=useRef({yaw:0,pitch:.075,distance:6.5});
  const dragging=useRef(false);
  const lastPointer=useRef({x:0,y:0});
  const {camera,gl}=useThree();
  const focusPosition=useMemo(()=>new THREE.Vector3(),[]);
  const focusTarget=useMemo(()=>new THREE.Vector3(),[]);
  const cameraGoal=useMemo(()=>new THREE.Vector3(),[]);
  const lookTarget=useMemo(()=>new THREE.Vector3(),[]);
  const lastNear=useRef(""); const lastRegion=useRef<ChapterId>("origins");

  useEffect(()=>{orbit.current.distance=mobile?5.1:6.5},[mobile]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement|null;
      if(target&&(target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(target.tagName)))return;
      if(e.code==="Space"){
        e.preventDefault();
        if(!e.repeat)jumpRef.current=true;
        return;
      }
      const key=e.key.toLowerCase();
      if(["arrowup","arrowdown","arrowleft","arrowright"].includes(key))e.preventDefault();
      keys.current[key]=true;
    };
    const up=(e:KeyboardEvent)=>{
      if(e.code==="Space"){e.preventDefault();return}
      keys.current[e.key.toLowerCase()]=false;
    };
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);keys.current={};jumpRef.current=false};
  },[jumpRef]);

  // Desktop camera orbit uses right drag; wheel gently adjusts follow distance.
  useEffect(()=>{
    const el=gl.domElement;
    const down=(e:PointerEvent)=>{if(e.button!==2)return;dragging.current=true;lastPointer.current={x:e.clientX,y:e.clientY};e.preventDefault()};
    const move=(e:PointerEvent)=>{
      if(!dragging.current)return;
      const dx=e.clientX-lastPointer.current.x,dy=e.clientY-lastPointer.current.y;
      orbit.current.yaw-=dx*.0052;
      orbit.current.pitch=clamp(orbit.current.pitch-dy*.0032,-.08,.3);
      lastPointer.current={x:e.clientX,y:e.clientY};
    };
    const up=()=>{dragging.current=false};
    const wheel=(e:WheelEvent)=>{orbit.current.distance=clamp(orbit.current.distance+Math.sign(e.deltaY)*.45,mobile?4.2:4.8,mobile?7.2:9.2);e.preventDefault()};
    const context=(e:MouseEvent)=>e.preventDefault();
    el.addEventListener("pointerdown",down);window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
    el.addEventListener("wheel",wheel,{passive:false});el.addEventListener("contextmenu",context);
    return()=>{el.removeEventListener("pointerdown",down);window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);el.removeEventListener("wheel",wheel);el.removeEventListener("contextmenu",context)};
  },[gl,mobile]);

  useFrame((state,dt)=>{
    if(!ref.current)return;
    const delta=Math.min(dt,.05);
    if(mobile){
      const lx=lookRef.current.x,ly=lookRef.current.y;
      if(Math.abs(lx)+Math.abs(ly)>.0001){
        orbit.current.yaw+=lx;
        orbit.current.pitch=clamp(orbit.current.pitch+ly,-.08,.3);
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
    const maxSpeed=sprint?3.9:2.7;
    const targetVX=(x*Math.cos(orbit.current.yaw)+y*Math.sin(orbit.current.yaw))*maxSpeed;
    const targetVZ=(-x*Math.sin(orbit.current.yaw)+y*Math.cos(orbit.current.yaw))*maxSpeed;
    const blend=1-Math.exp(-delta*(inputLength>.035?13:10));
    if(controlsLocked){velocity.current.x=0;velocity.current.z=0}else{
      velocity.current.x=THREE.MathUtils.lerp(velocity.current.x,targetVX,blend);
      velocity.current.z=THREE.MathUtils.lerp(velocity.current.z,targetVZ,blend);
    }

    const nextX=clamp(ref.current.position.x+velocity.current.x*delta,-10.8,10.8);
    if(!isBlocked(nextX,ref.current.position.z,regionAt(ref.current.position.z)))ref.current.position.x=nextX;

    // Progression gates ensure the objective and the region can never become wildly out of sync.
    const minZ=!completedQuests.includes("garden")?-5.7:
      !completedQuests.includes("workshop")?-29.7:
      !completedQuests.includes("city")?-53.7:
      !completedQuests.includes("lake")?-77.7:
      !completedQuests.includes("mountain")?-102.7:-124;
    const nextZ=Math.max(clamp(ref.current.position.z+velocity.current.z*delta,-124,10),minZ);
    if(!isBlocked(ref.current.position.x,nextZ,regionAt(nextZ)))ref.current.position.z=nextZ;

    const speed=Math.hypot(velocity.current.x,velocity.current.z);
    const moving=speed>.13&&!controlsLocked;
    movingRef.current=moving;
    const groundY=-.02;
    // Lunar gravity: floatier apex, longer airtime, but still a bounded and predictable jump.
    if(jumpRef.current){
      if(!controlsLocked&&grounded.current){grounded.current=false;verticalVelocity.current=2.5}
      jumpRef.current=false;
    }
    if(!grounded.current){
      verticalVelocity.current-=1.62*delta;
      ref.current.position.y+=verticalVelocity.current*delta;
      if(ref.current.position.y<=groundY){ref.current.position.y=groundY;verticalVelocity.current=0;grounded.current=true}
    }else{
      const bob=moving?Math.abs(Math.sin(state.clock.elapsedTime*9.2))*.012:Math.sin(state.clock.elapsedTime*1.5)*.0025;
      ref.current.position.y=groundY+bob;
    }
    jumpingRef.current=!grounded.current;

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
      const dx=ref.current.position.x-item.position[0],dy=.48-item.position[1],dz=ref.current.position.z-item.position[2];
      const d=Math.hypot(dx,dy,dz);
      if(d<item.radius&&d<best){best=d;nearest={id:item.id,label:item.label,prompt:item.prompt,distance:d}}
    }
    const key=nearest?.id||"";
    if(key!==lastNear.current){lastNear.current=key;onNear(nearest)}

    if(cameraFocus){
      focusPosition.set(...cameraFocus.position);focusTarget.set(...cameraFocus.target);
      camera.position.lerp(focusPosition,1-Math.exp(-delta*2.8));camera.lookAt(focusTarget);
    }else{
      const yaw=orbit.current.yaw,pitch=orbit.current.pitch,distance=orbit.current.distance;
      const horizontal=Math.cos(pitch)*distance;
      cameraGoal.set(
        ref.current.position.x+Math.sin(yaw)*horizontal,
        ref.current.position.y+.98+Math.sin(pitch)*distance,
        ref.current.position.z+Math.cos(yaw)*horizontal
      );
      camera.position.lerp(cameraGoal,1-Math.exp(-delta*6.2));
      lookTarget.set(ref.current.position.x-Math.sin(yaw)*.08,ref.current.position.y+.48,ref.current.position.z-Math.cos(yaw)*.08);
      camera.lookAt(lookTarget);
    }
  });

  return <group ref={ref} position={[0,-.02,8.2]} rotation={[0,Math.PI,0]}>
    <LittleDreamer movingRef={movingRef} jumpingRef={jumpingRef}/>
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

export function World({mobile,moveRef,lookRef,jumpRef,collected,activeChapter,completedQuests,flags,cameraFocus,onInteract,onNear,onRegion,discoveredLetters,controlsLocked}:WorldProps){
  const bright=completedQuests.includes("mountain")||completedQuests.includes("ending");
  const awakened=completedQuests.includes("workshop");
  const cityLit=completedQuests.includes("city")?3:Object.keys(flags).filter(k=>k.startsWith("city-")).length;
  const signals=["mountain-signal-1","mountain-signal-2","mountain-signal-3"].filter(id=>Boolean(flags[id])).length;
  const ending=completedQuests.includes("ending");
  return <div className="world-stage">
    <div className="world-backdrop" aria-hidden="true"><div className="backdrop-stars"/><div className="backdrop-horizon"/><div className="backdrop-glow"/></div>
    <Canvas
      camera={{position:[0,1.7,14.5],fov:48,near:.1,far:190}}
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
      <BlossomGrove mobile={mobile}/>
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
      <Player moveRef={moveRef} lookRef={lookRef} jumpRef={jumpRef} mobile={mobile} cameraFocus={cameraFocus} onNear={onNear} onRegion={onRegion} completedQuests={completedQuests} controlsLocked={controlsLocked}/>
    </Canvas>
    {ending&&<div className="final-sky-overlay" aria-hidden="true"><div className="final-sky-stars"/><div className="final-sky-core"/></div>}
  </div>;
}
