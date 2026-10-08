import {useEffect,useMemo,useRef,useState} from "react";
import {Canvas,useFrame} from "@react-three/fiber";
import {Stars,Sparkles,OrbitControls,Float} from "@react-three/drei";
import * as THREE from "three";
import {Heart,Menu,Volume2,VolumeX,RotateCcw,MousePointer2,Smartphone,Lock,ChevronRight} from "lucide-react";
import {chapters,tech,quests,type ChapterId} from "./data";
import {loadSave,saveProgress,resetProgress,type SaveData} from "./lib/storage";

function World({mobile}:{mobile:boolean}){
  const moon=useRef<THREE.Group>(null);
  useFrame((_,d)=>{if(moon.current) moon.current.rotation.y+=d*.02});
  return <Canvas dpr={mobile?[1,1.25]:[1,1.8]} camera={{position:[0,2.4,9],fov:52}} gl={{antialias:!mobile,powerPreference:"high-performance"}}>
    <color attach="background" args={["#07050d"]}/><fog attach="fog" args={["#07050d",8,24]}/>
    <ambientLight intensity={.42}/><directionalLight position={[4,5,1]} intensity={1.3} color="#bfa9ff"/><pointLight position={[0,2,-3]} intensity={16} distance={12} color="#ff99bc"/>
    <Stars radius={44} depth={22} count={mobile?700:1500} factor={2.2} saturation={.15} fade speed={.2}/>
    <Sparkles count={mobile?45:95} scale={[13,5,10]} size={2.2} speed={.22} color="#ffd8b5" opacity={.55}/>
    <mesh position={[0,-.65,-1]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[7,64]}/><meshStandardMaterial color="#171227" roughness={.85}/></mesh>
    <group ref={moon}><mesh position={[2.4,2.8,-3]}><sphereGeometry args={[1.05,28,28]}/><meshStandardMaterial color="#fff0cf" emissive="#6b4165" emissiveIntensity={.12} roughness={.92}/></mesh></group>
    <Float speed={.9} rotationIntensity={.12} floatIntensity={.25}><mesh position={[-2.8,.2,-1.6]}><icosahedronGeometry args={[.7,1]}/><meshStandardMaterial color="#7d6fc5" emissive="#292043" emissiveIntensity={.5} wireframe={!mobile}/></mesh></Float>
    <mesh position={[0,.05,-2.2]}><torusGeometry args={[1.4,.025,8,80]}/><meshBasicMaterial color="#f19ac0" transparent opacity={.4}/></mesh>
    <OrbitControls enablePan={false} enableDamping dampingFactor={.045} minDistance={6} maxDistance={11} maxPolarAngle={1.8} minPolarAngle={1.05}/>
  </Canvas>
}
function Intro({enter}:{enter:()=>void}){
  return <main className="intro"><div className="intro-orb"/><div className="intro-content"><span className="mono micro">LEVEL 0 · BEFORE WE MET</span><h1>A World<br/><em>Waiting For You</em></h1><p>There is a story I have not finished yet.<br/>Maybe because one character is still missing.</p><button className="primary" onClick={enter}>Enter the little world <ChevronRight size={17}/></button><small>Built by Yesu · one small universe, intentionally unfinished.</small></div></main>
}

function Modal({title,eyebrow,body,onClose,children}:{title:string;eyebrow:string;body:string;onClose:()=>void;children?:React.ReactNode}){
  return <div className="modal-layer" onClick={onClose}><article className="modal" onClick={e=>e.stopPropagation()}><span className="micro">{eyebrow}</span><h2>{title}</h2><p>{body}</p>{children}<button className="ghost" onClick={onClose}>Close</button></article></div>
}

export default function App(){
 const [save,setSave]=useState<SaveData>(loadSave); const [entered,setEntered]=useState(false); const [mobile,setMobile]=useState(false);
 const [chapter,setChapter]=useState<ChapterId>("origins"); const [drawer,setDrawer]=useState(false); const [letter,setLetter]=useState(false); const [notice,setNotice]=useState<string|null>(null); const [sound,setSound]=useState(save.sound); const [reduced,setReduced]=useState(save.reduced);
 useEffect(()=>{const m=matchMedia("(max-width:820px)");const f=()=>setMobile(m.matches);f();m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);
 useEffect(()=>{const n={...save,sound,reduced};saveProgress(n);},[sound,reduced]);
 const chapterIndex=useMemo(()=>Object.keys(chapters).indexOf(chapter)+1,[chapter]);
 const heartCount=save.hearts.length;
 const flash=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(null),2300)};
 const go=(id:ChapterId)=>{if(id==="future"&&heartCount<3){flash("Find three hearts first. The unknown chapter can wait.");return} setChapter(id); if(!save.chapters.includes(id)){const n={...save,chapters:[...save.chapters,id]};setSave(n);saveProgress(n)}};
 const collect=()=>{const id="heart-"+(heartCount+1);const n={...save,hearts:[...save.hearts,id]};setSave(n);saveProgress(n);flash("♡ Found. Some things are better discovered than announced.")};
 if(!entered)return <Intro enter={()=>setEntered(true)}/>;
 return <div className={`app ${reduced?"reduced":""}`}>
  <div className="world"><World mobile={mobile}/></div>
  <header className="hud"><div className="brand"><b>YESU</b><small>LVL 18 · BUILDER</small></div><div className="hud-buttons"><button onClick={()=>setSound(!sound)} aria-label="sound">{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button onClick={()=>setDrawer(true)} aria-label="menu"><Menu size={18}/></button></div></header>
  <div className="chapter-copy"><span className="micro">{chapters[chapter][0]}</span><h1>{chapters[chapter][1]}</h1><p>{chapters[chapter][2]}</p></div>
  <nav className="chapter-nav">{(Object.keys(chapters) as ChapterId[]).map(id=><button key={id} className={chapter===id?"active":""} onClick={()=>go(id)}>{id==="future"?"♡":chapters[id][1].slice(0,4)}</button>)}</nav>
  <div className="hotspots"><button onClick={()=>go("origins")}>Origins</button><button onClick={()=>go("curiosity")}>Curiosity</button><button onClick={()=>go("building")}>Building</button><button onClick={()=>go("dreams")}>Dreams</button><button onClick={()=>go("quiet")}>Quiet</button><button className="future-link" onClick={()=>go("future")}><Lock size={12}/> Missing chapter</button></div>
  <div className="bottom"><span><Heart size={15} fill="currentColor"/> {heartCount}/12</span><span className="hint">{mobile?"Tap a chapter · drag to look":"Drag to look · choose a chapter · find what is hidden"}</span><button className="primary mini" onClick={collect}>Find a heart</button></div>
  <div className="side"><button onClick={()=>setLetter(true)}>A letter, without a name</button><button onClick={()=>setDrawer(true)}>Quest log</button></div>
  {notice&&<div className="notice">{notice}</div>}
  {letter&&<Modal eyebrow="A LETTER, WITHOUT A NAME" title="To the person I have not met yet." body="I do not know your name, where we will meet, or which ordinary day becomes a favorite memory. I did not want to invent those things. I only wanted to leave a little room for them. For now I will keep learning, building, making mistakes and becoming better. Maybe someday life will write the missing part naturally — not because I planned you, but because we met. Until then: no pressure. Just possibility." onClose={()=>setLetter(false)}/>}
  {drawer&&<div className="drawer-layer" onClick={()=>setDrawer(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="micro">PLAYER PROFILE</span><h2>Yesuraja / Yesu</h2></div><button onClick={()=>setDrawer(false)}>×</button></div><p><b>B.E. Computer Science & Engineering — AI & ML</b><br/>2nd year student building software, AI/ML experiments, interactive technology and curious hardware projects.</p><h3>QUEST LOG</h3>{["Enter the world","Visit the workshop","Find 3 hidden hearts","Reach the missing chapter"].map((q,i)=><div className="quest" key={q}><span>{(i===0)||(i===1&&save.chapters.includes("building"))||(i===2&&heartCount>=3)||(i===3&&save.chapters.includes("future"))?"✓":"□"}</span>{q}</div>)}<h3>TECH CONSTELLATION</h3><div className="tech-grid">{tech.map(([a,b])=><button key={a} onClick={()=>flash(b)}><strong>{a}</strong><small>{b}</small></button>)}</div><h3>CO-OP QUESTS</h3><div className="co-op">{quests.slice(0,5).map(q=><div key={q}>□ {q}</div>)}</div><div className="drawer-actions"><button className="ghost" onClick={()=>{resetProgress();location.reload()}}><RotateCcw size={14}/> Reset</button><span>{mobile?<><Smartphone size={14}/> touch mode</>:<><MousePointer2 size={14}/> desktop mode</>}</span></div></aside></div>}
 </div>
}
