import {Component,useEffect,useMemo,useRef,useState} from "react";
import type {ReactNode} from "react";
import {AnimatePresence,motion} from "framer-motion";
import {BookOpen,Compass,Gamepad2,Heart,Info,Menu,MousePointer2,RotateCcw,Settings2,Smartphone,Sparkles,TerminalSquare,Volume2,VolumeX,X} from "lucide-react";
import {atlasFragments,chapterCopy,letters,quests,regions,type ChapterId,type FragmentId} from "./data";
import {loadSave,resetProgress,saveProgress,type SaveData} from "./lib/storage";
import {audioManager,chime} from "./lib/sound";
import {World} from "./three/World";
import {TouchControls} from "./components/TouchControls";

type PuzzleId="core"|"gear"|"signal"|"lake"|"house"|null;
type Detail={eyebrow:string;title:string;body:string}|null;
type Focus={position:[number,number,number];target:[number,number,number]}|null;

class WorldErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){console.error("Atlas 3D scene failed:",error);}
  render(){
    if(!this.state.failed)return this.props.children;
    return <div className="scene-crash"><div className="scene-crash-orbit"/><span className="eyebrow">THE ATLAS / SAFE MODE</span><h2>The world is still here.</h2><p>The 3D layer could not render on this device. Your progress is safe.</p><button className="primary" onClick={()=>location.reload()}>Try the world again</button></div>;
  }
}

function Intro({onEnter}:{onEnter:()=>void}){
  const [step,setStep]=useState(0);
  const lines=["There are places you haven't seen yet.","Some were built from questions.","Some from things that broke.","One room is still empty.","That part belongs to the future."];
  useEffect(()=>{const id=window.setInterval(()=>setStep(v=>(v+1)%lines.length),2900);return()=>window.clearInterval(id)},[]);
  return <main className="intro-screen">
    <div className="intro-atmosphere" aria-hidden="true">
      <div className="intro-orb intro-orb-one"/><div className="intro-orb intro-orb-two"/>
      <div className="intro-moon"><i/><i/><i/></div>
      <div className="intro-constellation"><i/><i/><i/><i/><i/><b/><b/><b/></div>
      <div className="intro-grid"/>
      <span className="intro-floating-heart heart-one">♡</span><span className="intro-floating-heart heart-two">✧</span>
      <span className="intro-floating-heart heart-three">♡</span><span className="intro-floating-heart heart-four">✦</span>
      <span className="intro-thread-line"/>
    </div>
    <div className="intro-topbar">
      <span className="intro-edition"><i>♡</i> ATLAS / 001</span><span className="intro-top-note">UNFINISHED BY DESIGN</span>
    </div>
    <section className="intro-hero">
      <motion.div className="eyebrow intro-kicker" initial={{opacity:0,y:14,letterSpacing:"0.48em"}} animate={{opacity:1,y:0,letterSpacing:"0.28em"}} transition={{duration:1,ease:"easeOut"}}>A SMALL EXPLORATION ADVENTURE</motion.div>
      <motion.h1 initial={{opacity:0,y:36,filter:"blur(14px)",scale:.97}} animate={{opacity:1,y:0,filter:"blur(0px)",scale:1}} transition={{duration:1.15,delay:.18,ease:[.2,.75,.2,1]}}>The Atlas<br/><em>of Us</em></motion.h1>
      <motion.div className="intro-title-ornament" initial={{opacity:0,scaleX:.2}} animate={{opacity:1,scaleX:1}} transition={{duration:1.1,delay:.48,ease:"easeOut"}} aria-hidden="true"><span/><i>♡</i><span/></motion.div>
      <motion.p className="intro-subtitle" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.65}}>A journey toward someone I haven't met yet.</motion.p>
      <AnimatePresence mode="wait"><motion.div className="intro-line" key={step} initial={{opacity:0,y:8,filter:"blur(4px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-7,filter:"blur(4px)"}} transition={{duration:.55,ease:"easeOut"}}>{lines[step]}</motion.div></AnimatePresence>
      <motion.button className="primary intro-enter" onClick={onEnter} whileHover={{scale:1.035,y:-3}} whileTap={{scale:.975}} initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.65,delay:.9}}><span>Enter the Atlas</span><i aria-hidden="true">↗</i></motion.button>
      <motion.div className="intro-meta" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.8,delay:1.1}}><span>20–35 MIN ADVENTURE</span><i/><span>PROCEDURAL 3D</span><i/><span>MADE OF MEMORIES NOT YET MADE</span></motion.div>
    </section>
    <div className="intro-bottom"><span>MOVE <i>/</i> NOTICE <i>/</i> SOLVE <i>/</i> DISCOVER</span><span className="intro-bottom-right"><b>01—06</b> THE FUTURE IS NOT WRITTEN</span></div>
  </main>;
}
function Modal({children,onClose,className=""}:{children:ReactNode;onClose:()=>void;className?:string}){
  return <motion.div className="modal-layer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
    <motion.section className={"modal "+className} initial={{y:22,opacity:0,scale:.98}} animate={{y:0,opacity:1,scale:1}} exit={{y:12,opacity:0,scale:.99}} transition={{duration:.22,ease:"easeOut"}} onClick={e=>e.stopPropagation()}>
      {children}
      <button className="modal-close" aria-label="Close" onClick={onClose}><X size={15}/></button>
    </motion.section>
  </motion.div>;
}

function AtlasPanel({save,onClose}:{save:SaveData;onClose:()=>void}){
  return <Modal onClose={onClose} className="atlas-modal">
    <div className="panel-kicker">THE ARTIFACT / ATLAS</div>
    <div className="panel-title-row"><div><h2>The Atlas</h2><p>{save.fragments.length} of 12 fragments recovered.</p></div><Compass size={24}/></div>
    <div className="atlas-grid">{atlasFragments.map((f,i)=>{
      const collected=save.fragments.includes(f.id);
      return <motion.div key={f.id} className={"atlas-card "+(collected?"collected":"")} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.025}}>
        <div className="atlas-icon">{collected?f.icon:"·"}</div><div><strong>{collected?f.title:"UNKNOWN"}</strong><span>{collected?f.description:"This page is waiting for you."}</span></div><small>{String(i+1).padStart(2,"0")}</small>
      </motion.div>;
    })}</div>
    <div className="thread-summary">
      <div><span>THE THREAD</span><b>{save.letters.length}/6 letters read</b></div>
      <div className="thread-dots">{letters.map(letter=><i key={letter.id} className={save.letters.includes(letter.id)?"on":""}/>)}</div>
    </div>
    <div className="thread-notes">{letters.filter(letter=>save.letters.includes(letter.id)).map(letter=><div key={letter.id}><small>{letter.region.toUpperCase()}</small><strong>{letter.title}</strong><span>{letter.excerpt}</span></div>)}</div>
  </Modal>;
}

function QuestPanel({save,onClose,mobile,onReset,onSound,onReduced,sound,reduced}:{save:SaveData;onClose:()=>void;mobile:boolean;onReset:()=>void;onSound:()=>void;onReduced:()=>void;sound:boolean;reduced:boolean}){
  const current=quests.find(q=>!save.completedQuests.includes(q.id))||quests[quests.length-1];
  return <Modal onClose={onClose} className="quest-modal">
    <div className="panel-kicker">FIELD LOG / QUESTS</div>
    <div className="panel-title-row"><div><h2>{current.title}</h2><p>{current.objective}</p></div><Gamepad2 size={24}/></div>
    <div className="current-quest"><span>CURRENT OBJECTIVE</span><b>{current.title}</b><p>{current.description}</p><small>{current.region==="house"?"HOUSE":current.region.toUpperCase()}</small></div>
    <h3>JOURNEY</h3>
    <div className="quest-timeline">{quests.map((q,i)=>{const done=save.completedQuests.includes(q.id);return <div className={"quest-row "+(done?"done":"")} key={q.id}><i>{done?"✓":String(i+1).padStart(2,"0")}</i><div><strong>{q.title}</strong><span>{q.region.toUpperCase()} · {done?"complete":"pending"}</span></div></div>})}</div>
    <h3>DISCOVERY</h3>
    <div className="stats-strip"><span><b>{save.visitedRegions.length}</b><small>REGIONS</small></span><span><b>{save.landmarks.length}</b><small>LANDMARKS</small></span><span><b>{save.letters.length}</b><small>LETTERS</small></span></div>
    <h3>SETTINGS</h3>
    <div className="settings-grid">
      <button onClick={onSound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>Ambient audio</span><b>{sound?"ON":"OFF"}</b></button>
      <button onClick={onReduced}><Sparkles size={16}/><span>Reduced motion</span><b>{reduced?"ON":"OFF"}</b></button>
      <button onClick={()=>onReset()}><RotateCcw size={16}/><span>Reset Atlas</span><b>RESET</b></button>
    </div>
    <div className="panel-footer">{mobile?<><Smartphone size={14}/> Mobile exploration mode</>:<><MousePointer2 size={14}/> Desktop exploration mode</>}</div>
  </Modal>;
}

function PuzzlePanel({puzzle,onClose,onSolved}:{puzzle:PuzzleId;onClose:()=>void;onSolved:(id:PuzzleId)=>void}){
  const [core,setCore]=useState<number[]>([]);
  const [gear,setGear]=useState([0,0,0]);
  const [signal,setSignal]=useState<number[]>([]);
  const [lake,setLake]=useState<number[]>([]);
  const [house,setHouse]=useState<FragmentId[]>([]);
  if(!puzzle)return null;

  const resetLocal=()=>{setCore([]);setGear([0,0,0]);setSignal([]);setLake([]);setHouse([])};
  const solve=(id:PuzzleId)=>{resetLocal();onSolved(id)};
  const coreTarget=[2,0,1];
  const gearTarget=[2,4,1];
  const signalTarget=[1,3,2];
  const lakeTarget=[0,2,5,4,1,3];
  const lakePoints:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
    [17,31],[38,17],[64,30],[77,64],[50,79],[24,64]
  ];

  return <Modal onClose={()=>{resetLocal();onClose()}} className="puzzle-modal">
    {puzzle==="core"&&(
      <>
        <div className="panel-kicker">WORKSHOP / ENERGY CORE</div>
        <h2>Match the pulse.</h2>
        <p>Read the faint pattern left to right, then power the engine.</p>
        <div className="symbol-target">{["◇","○","△"].map((symbol,index)=><span key={symbol} className={core[index]!==undefined?"filled":""}>{symbol}</span>)}</div>
        <div className="puzzle-actions">
          {["△","○","◇"].map((symbol,index)=><button key={symbol} onClick={()=>{
            const next=[...core,index].slice(0,3);
            setCore(next);
            if(next.length===3&&next.every((value,position)=>value===coreTarget[position]))solve("core");
          }}>{symbol}</button>)}
        </div>
        <div className="puzzle-status">SEQUENCE {core.length}/3</div>
      </>
    )}

    {puzzle==="gear"&&(
      <>
        <div className="panel-kicker">WORKSHOP / GEAR ARRAY</div>
        <h2>Make the machine agree.</h2>
        <p>Rotate each ring until its marker points to the highlighted notch.</p>
        <div className="gear-puzzle">
          {gear.map((value,index)=><button key={index} className="gear-dial" style={{transform:"rotate("+(value*45)+"deg)"}} onClick={()=>{
            const next=[...gear];
            next[index]=(next[index]+1)%8;
            setGear(next);
            if(next.every((number,position)=>number===gearTarget[position]))solve("gear");
          }}><span>{index+1}</span></button>)}
        </div>
        <div className="puzzle-status">ALIGNMENT {gear.join(" · ")}</div>
      </>
    )}

    {puzzle==="signal"&&(
      <>
        <div className="panel-kicker">WORKSHOP / SIGNAL MAST</div>
        <h2>Find the clean frequency.</h2>
        <p>Repeat the visible antenna rhythm. A wrong input resets the sequence.</p>
        <div className="signal-sequence">{signalTarget.map((value,index)=><span key={index} className={signal.includes(value)?"lit":""}>{value}</span>)}</div>
        <div className="puzzle-actions numbered">
          {[1,2,3].map(number=><button key={number} onClick={()=>{
            const expected=signalTarget[signal.length];
            if(number!==expected){setSignal([]);return}
            const next=[...signal,number];
            setSignal(next);
            if(next.length===3)solve("signal");
          }}>{number}</button>)}
        </div>
        <div className="puzzle-status">INPUT {signal.length}/3</div>
      </>
    )}

    {puzzle==="lake"&&(
      <>
        <div className="panel-kicker">QUIET LAKE / REFLECTION</div>
        <h2>Trace the waterline.</h2>
        <p>Follow the reflected stars. A wrong step sends the pattern back into the water.</p>
        <div className="constellation-puzzle">
          {lakePoints.map((point,index)=><button key={index} style={{left:point[0]+"%",top:point[1]+"%"}} className={lake.includes(index)?"lit":""} onClick={()=>{
            const expected=lakeTarget[lake.length];
            if(index!==expected){setLake([]);return}
            const next=[...lake,index];
            setLake(next);
            if(next.length===6)solve("lake");
          }}>{index+1}</button>)}
        </div>
        <div className="puzzle-status">CONSTELLATION {lake.length}/6</div>
      </>
    )}

    {puzzle==="house"&&(
      <>
        <div className="panel-kicker">THE UNWRITTEN HOUSE / DOOR</div>
        <h2>Choose three pieces.</h2>
        <p>The door asks for three things that can carry a life forward.</p>
        <div className="fragment-pick">
          {(["possibility","quiet","tomorrow"] as FragmentId[]).map(id=>{
            const item=atlasFragments.find(fragment=>fragment.id===id);
            const selected=house.includes(id);
            return <button key={id} className={selected?"selected":""} onClick={()=>{
              const next=selected?house.filter(value=>value!==id):[...house,id];
              setHouse(next);
              if(next.length===3)solve("house");
            }}><span>{item?.icon}</span>{id.toUpperCase()}</button>;
          })}
        </div>
        <div className="puzzle-status">INSERTED {house.length}/3</div>
      </>
    )}
  </Modal>;
}

function LetterPanel({letter,onClose}:{letter:typeof letters[number];onClose:()=>void}){
  return <Modal onClose={onClose} className="letter-modal">
    <div className="panel-kicker">FIELD NOTE / {letter.region.toUpperCase()}</div>
    <div className="letter-sheet">
      <div className="letter-stamp">ATLAS</div>
      <h2>{letter.title}</h2>
      <p className="letter-excerpt">{letter.excerpt}</p>
      <p className="detail-copy">{letter.body}</p>
      <div className="letter-signature">— a page from the journey</div>
    </div>
  </Modal>;
}

function CompassStrip({region}:{region:ChapterId}){
  const key=region==="origins"?"garden":region==="curiosity"?"workshop":region==="building"?"city":region==="dreams"?"lake":region==="quiet"?"mountain":"house";
  const info=regions[key];
  const order=["garden","workshop","city","lake","mountain","house"] as const;
  const i=order.indexOf(key);
  const next=order[i+1];
  return <div className="compass-strip" aria-label="Navigation compass">
    <span className="compass-face"><Compass size={12}/><b>{String(info.index).padStart(2,"0")}</b></span>
    <div><small>NORTH / ATLAS</small><strong>{next?"NEXT · "+regions[next].short:"FINAL REGION"}</strong></div>
    <i className="compass-arrow">↑</i>
  </div>;
}

function DetailPanel({detail,onClose}:{detail:Detail;onClose:()=>void}){
  if(!detail)return null;
  return <Modal onClose={onClose}><div className="panel-kicker">{detail.eyebrow}</div><h2>{detail.title}</h2><p className="detail-copy">{detail.body}</p></Modal>;
}

function EndingPanel({onClose,onOpen}:{onClose:()=>void;onOpen:()=>void}){
  return <Modal onClose={onClose} className="ending-modal"><div className="ending-mark">?</div><div className="panel-kicker">THE ATLAS / FINAL PAGE</div><h2>Leave one page unwritten.</h2><p>You can finish the Atlas without predicting the person, place or ordinary day that might eventually fill this page.</p><p>The house is ready. The future is not.</p><button className="primary" onClick={onOpen}>Open the final sky →</button></Modal>;
}

export default function App(){
  const [save,setSave]=useState<SaveData>(()=>loadSave());
  const [entered,setEntered]=useState(false);
  const [mobile,setMobile]=useState(false);
  const [region,setRegion]=useState<ChapterId>("origins");
  const [near,setNear]=useState<{id:string;label:string;prompt:string;distance:number}|null>(null);
  const [atlasOpen,setAtlasOpen]=useState(false);
  const [questOpen,setQuestOpen]=useState(false);
  const [detail,setDetail]=useState<Detail>(null);
  const [letter,setLetter]=useState<typeof letters[number]|null>(null);
  const [cinematic,setCinematic]=useState<{focus:Focus;message:string}|null>(null);
  const [puzzle,setPuzzle]=useState<PuzzleId>(null);
  const [ending,setEnding]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  const [sound,setSound]=useState(save.sound);
  const [reduced,setReduced]=useState(save.reduced);
  const [focus,setFocus]=useState<Focus>(null);
  const moveRef=useRef({x:0,y:0});
  const lookRef=useRef({x:0,y:0});
  const jumpRef=useRef(false);
  const noticeTimer=useRef<number|undefined>(undefined);
  const cinematicTimer=useRef<number|undefined>(undefined);

  useEffect(()=>{const m=window.matchMedia("(max-width:820px)");const f=()=>setMobile(m.matches);f();m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);
  useEffect(()=>{saveProgress({...save,sound,reduced})},[sound,reduced]);
  useEffect(()=>()=>{if(noticeTimer.current)window.clearTimeout(noticeTimer.current);if(cinematicTimer.current)window.clearTimeout(cinematicTimer.current);audioManager.stop()},[]);
  useEffect(()=>{audioManager.setEnabled(sound);return()=>audioManager.stop()},[sound]);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==="Escape"){setAtlasOpen(false);setQuestOpen(false);setPuzzle(null);setDetail(null);setLetter(null);setCinematic(null);setFocus(null);setEnding(false)}if(e.key.toLowerCase()==="e"&&!atlasOpen&&!questOpen&&!puzzle&&!detail&&!letter&&!cinematic&&!ending&&near)interact(near.id);if(e.key.toLowerCase()==="t"&&!atlasOpen&&!questOpen&&!puzzle&&!detail&&!letter&&!cinematic&&!ending)setAtlasOpen(true)};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k)},[near,atlasOpen,questOpen,puzzle,detail,letter,cinematic,ending,save]);
  const flash=(message:string)=>{setNotice(message);if(noticeTimer.current)window.clearTimeout(noticeTimer.current);noticeTimer.current=window.setTimeout(()=>setNotice(null),2600)};
  const update=(next:SaveData)=>{const merged={...next,sound,reduced};setSave(merged);saveProgress(merged)};
  const has=(fragment:FragmentId)=>save.fragments.includes(fragment);
  const flag=(key:string)=>Boolean(save.flags[key]);
  const completeQuest=(id:string)=>{if(save.completedQuests.includes(id))return save.completedQuests;return [...save.completedQuests,id]};
  const addFragments=(ids:FragmentId[],message:string)=>{
    const fresh=ids.filter(id=>!save.fragments.includes(id));
    if(!fresh.length){flash("Already discovered.");return false}
    const next={...save,fragments:[...save.fragments,...fresh]};
    update(next);chime(sound,660);flash(message);return true;
  };
  const setFlags=(entries:Record<string,boolean|string|number>)=>update({...save,flags:{...save.flags,...entries}});
  const regionToKey=(value:ChapterId)=>value==="origins"?"garden":value==="curiosity"?"workshop":value==="building"?"city":value==="dreams"?"lake":value==="quiet"?"mountain":"house";
  const startCinematic=(focusValue:Focus,message:string,duration=4200)=>{
    if(cinematicTimer.current)window.clearTimeout(cinematicTimer.current);
    setCinematic({focus:focusValue,message});
    flash(message);
    cinematicTimer.current=window.setTimeout(()=>setCinematic(null),duration);
  };
  const discoverLandmark=(id:string)=>{
    if(!save.landmarks.includes(id))update({...save,landmarks:[...save.landmarks,id]});
  };
  const handleRegion=(next:ChapterId)=>{
    setRegion(next);
    const key=regionToKey(next);
    audioManager.setRegion(key);
    flash(`Entered ${regions[key].name} — ${regions[key].subtitle}`);
    if(!save.visitedRegions.includes(key))update({...save,visitedRegions:[...save.visitedRegions,key]});
  };
  
  function interact(id:string){
    if(id.startsWith("letter-")){
      const found=letters.find(item=>item.id===id);
      if(!found)return;
      if(save.letters.includes(id)){setLetter(found);flash("You already read this page.");return}
      update({...save,letters:[...save.letters,id]});
      setLetter(found);
      chime(sound,690);
      flash("A new page joins the Thread.");
      return;
    }
    if(id.startsWith("garden-lantern-")){
      if(flag(id)){flash("That light is already awake.");return}
      setFlags({[id]:true});
      const all=["garden-lantern-1","garden-lantern-2","garden-lantern-3"].every(flag2=>flag2===id||flag(flag2));
      if(all){
        const next={...save,flags:{...save.flags,[id]:true},fragments:has("star")?save.fragments:[...save.fragments,"star"],completedQuests:completeQuest("garden")};
        update(next);chime(sound,740);flash("The suspended star has remembered its shape.");setDetail({eyebrow:"ORIGIN GARDEN / STAR SHARD",title:"You started with questions.",body:"Three lights became one pattern. The first Atlas fragment is yours: STAR."});
      }else flash("The lantern answers with a different note.");
      return;
    }
    if(id==="garden-star"){discoverLandmark(id);setDetail({eyebrow:"LANDMARK / SUSPENDED STAR",title:"A shape waiting to connect.",body:"The sculpture was built from points instead of a picture. Up close, it looks unfinished. From a distance, the missing line feels obvious."});return}
    if(id==="workshop-engine"){discoverLandmark(id);setDetail({eyebrow:"WORKSHOP / MEMORY ENGINE",title:"Three missing systems.",body:"The machine does not need a replacement. It needs the parts that still make sense: a core, a gear array, and a clean signal."});return}
    if(id==="workshop-core"){if(flag(id)){flash("The core is already installed.");return}setPuzzle("core");return}
    if(id==="workshop-gear"){if(flag(id)){flash("The gear array is already aligned.");return}setPuzzle("gear");return}
    if(id==="workshop-signal"){if(flag(id)){flash("The signal is already tuned.");return}setPuzzle("signal");return}
    if(id==="city-create"||id==="city-learn"||id==="city-explore"){
      if(flag(id)){flash("This direction is already mapped.");return}
      const map:any={"city-create":"idea","city-learn":"dream","city-explore":"possibility"};
      const fragment=map[id] as FragmentId;
      const nextFlags={...save.flags,[id]:true};
      const nextFragments=has(fragment)?save.fragments:[...save.fragments,fragment];
      const cityComplete=["city-create","city-learn","city-explore"].every(k=>Boolean(nextFlags[k]));
      const next={...save,flags:nextFlags,fragments:nextFragments,completedQuests:cityComplete?completeQuest("city"):save.completedQuests};
      update(next);chime(sound,700);if(cityComplete)startCinematic({position:[0,5,-46],target:[0,2,-44]},"The city lights come on, all at once.",4300);else flash("A new route has become part of the Atlas.");if(cityComplete)setDetail({eyebrow:"CITY OF POSSIBILITY / THREE ROUTES",title:"All three were worth exploring.",body:"CREATE, LEARN and EXPLORE each left something behind. The city is brighter because you looked around."});
      return;
    }
    if(id==="city-telescope"){discoverLandmark(id);setDetail({eyebrow:"ROOFTOP / TELESCOPE",title:"Look further without guessing.",body:"A telescope can point at tomorrow without claiming to know what it will contain. That feels like a useful way to build a life."});return}
    if(id==="lake-dock"){discoverLandmark(id);setFocus({position:[-7.5,2.4,-59.2],target:[-4.8,.15,-66]});flash("For a moment, nothing needs fixing.");window.setTimeout(()=>setFocus(null),5200);return}
    if(id==="lake-cabin"){discoverLandmark(id);setDetail({eyebrow:"LAKE / CABIN",title:"The quiet room.",body:"No quest starts here. No collectible waits on the table. It is simply a room where the world feels smaller."});return}
    if(id==="lake-constellation"){if(flag(id)){flash("The reflection bridge is already awake.");return}setPuzzle("lake");return}
    if(id.startsWith("mountain-signal-")){
      if(flag(id)){flash("That signal is already stored.");return}
      const patch:any={...save.flags,[id]:true};
      let fragments=[...save.fragments];
      if(id==="mountain-signal-1"&&!has("courage"))fragments.push("courage");
      if(id==="mountain-signal-3"&&!has("tomorrow"))fragments.push("tomorrow");
      const complete=["mountain-signal-1","mountain-signal-2","mountain-signal-3"].every(k=>Boolean(patch[k]));
      update({...save,flags:patch,fragments,completedQuests:complete?completeQuest("mountain"):save.completedQuests});chime(sound,720);if(complete)startCinematic({position:[4.5,9,-92],target:[1,4,-92]},"Three signals. One direction.",5000);else flash("Signal locked into the Atlas.");if(complete)setDetail({eyebrow:"MOUNTAIN / OBSERVATORY",title:"The sky has a direction now.",body:"The observatory turns, the beam appears, and a distant house catches a thread of warm light."});return;
    }
    if(id==="observatory"){discoverLandmark(id);setDetail({eyebrow:"MOUNTAIN / OBSERVATORY",title:"Tomorrow is not a place.",body:"The telescope can aim, but it cannot predict. That distinction is the whole point."});return}
    if(id==="house-empty-room"){discoverLandmark(id);setDetail({eyebrow:"THE UNWRITTEN HOUSE / EMPTY ROOM",title:"Leave room for a real story.",body:"There is no furniture here because filling the room now would mean inventing a future that has not happened. The emptiness is the honest part."});return}
    if(id==="house-door"){
      if(!has("possibility")||!has("quiet")||!has("tomorrow")){flash("The door needs POSSIBILITY, QUIET and TOMORROW.");return}
      if(!flag("house-door-opened"))setPuzzle("house");else setEnding(true);return;
    }
  }

  const solve=(id:PuzzleId)=>{
    if(!id)return;
    if(id==="core"){const nextFlags={...save.flags,"workshop-core":true};update({...save,flags:nextFlags,fragments:has("spark")?save.fragments:[...save.fragments,"spark"]});setPuzzle(null);flash("The core finds a heartbeat.");}
    if(id==="gear"){const nextFlags={...save.flags,"workshop-gear":true};update({...save,flags:nextFlags,fragments:has("gear")?save.fragments:[...save.fragments,"gear"]});setPuzzle(null);flash("The rings settle into alignment.");}
    if(id==="signal"){const nextFlags={...save.flags,"workshop-signal":true};const all=["workshop-core","workshop-gear","workshop-signal"].every(k=>k==="workshop-signal"||flag(k));const fragments=has("memory")?save.fragments:[...save.fragments,"memory"];update({...save,flags:nextFlags,fragments,completedQuests:all?completeQuest("workshop"):save.completedQuests});setPuzzle(null);if(all)startCinematic({position:[-2,5,-19],target:[0,2,-17]},"The Memory Engine wakes up.",4500);else flash("Signal secured.");}
    if(id==="lake"){update({...save,flags:{...save.flags,"lake-constellation":true},fragments:has("quiet")?save.fragments:[...save.fragments,"quiet"],completedQuests:completeQuest("lake")});setPuzzle(null);startCinematic({position:[-7,4,-62],target:[-3,.2,-66]},"The reflection becomes a bridge.",4600);}
    if(id==="house"){update({...save,flags:{...save.flags,"house-door-opened":true},fragments:has("home")?save.fragments:[...save.fragments,"home"],completedQuests:completeQuest("house")});setPuzzle(null);startCinematic({position:[5,5,-114],target:[0,2,-116]},"The unfinished house fills with warm light.",4800);setDetail({eyebrow:"THE UNWRITTEN HOUSE / HOME",title:"Ready does not mean finished.",body:"The door opens into a sky instead of another room. Before you step through, the Atlas leaves one page blank."});}
  };

  const openEnding=()=>{setEnding(false);const fragments=has("unknown")?save.fragments:[...save.fragments,"unknown"];update({...save,fragments,completedQuests:completeQuest("ending")});setEntered(true);flash("The Atlas is complete. One page remains intentionally unknown.");};
  const currentQuest=quests.find(q=>!save.completedQuests.includes(q.id))||quests[quests.length-1];
  const progress=Math.round(save.completedQuests.length/7*100);
  const regionKey=regionToKey(region);
  const regionInfo=regions[regionKey];

  return <div className={"app atlas-app "+(reduced?"reduced":"")} onContextMenu={e=>e.preventDefault()}>
    {!entered?<Intro onEnter={()=>{setEntered(true);chime(sound,520)}}/>:<>
      <WorldErrorBoundary>
        <World mobile={mobile} moveRef={moveRef} lookRef={lookRef} jumpRef={jumpRef} collected={save.fragments} activeChapter={region} completedQuests={save.completedQuests} flags={save.flags} cameraFocus={cinematic?.focus||focus} controlsLocked={Boolean(cinematic||atlasOpen||questOpen||puzzle||detail||letter||ending)} discoveredLetters={save.letters} onInteract={interact} onNear={setNear} onRegion={handleRegion}/>
      </WorldErrorBoundary>

      <header className="game-hud">
        <div className="hud-brand"><div className="hud-sigil">A</div><div><b>THE ATLAS OF US</b><small>{String(regionInfo.index).padStart(2,"0")} / 06 · {regionInfo.short}</small></div></div>
        <div className="hud-progress"><span>ATLAS {save.fragments.length}/12</span><div><i style={{width:Math.max(4,(save.fragments.length/12)*100)+"%"}}/></div><small>{progress}% journey complete</small></div>
        <div className="hud-actions"><button onClick={()=>setAtlasOpen(true)} aria-label="Open Atlas"><BookOpen size={16}/><span>ATLAS</span></button><button onClick={()=>setQuestOpen(true)} aria-label="Open quest log"><Menu size={16}/></button></div>
      </header>

      <CompassStrip region={region}/>
      {cinematic&&<div className="cinematic-banner"><span>CINEMATIC / {regionInfo.short}</span><b>{cinematic.message}</b></div>}
      <div className="objective-card"><span>CURRENT OBJECTIVE</span><b>{currentQuest.title}</b><small>{currentQuest.objective}</small></div>
      <div className="region-badge"><i/><div><span>{regionInfo.name}</span><small>{regionInfo.subtitle}</small></div></div>

      {near&&!cinematic&&!letter&&<button className="interaction-prompt" onClick={()=>interact(near.id)}><span className="interact-key">{mobile?"✦":"E"}</span><div><b>{near.prompt}</b><small>{near.label} · {mobile?"tap":"click / E"}</small></div></button>}
      {mobile?<TouchControls moveRef={moveRef} lookRef={lookRef} onJump={()=>{jumpRef.current=true}} onInteract={()=>near?interact(near.id):flash("Move closer to something that catches your eye.")} disabled={!entered}/>:<div className="control-hint"><span>WASD</span> move <span>SHIFT</span> run <span>RIGHT-DRAG</span> orbit <span>SCROLL</span> zoom <span>SPACE</span> moon-jump <span>E</span> interact <span>T</span> atlas</div>}

      <div className="side-quick"><button onClick={()=>setAtlasOpen(true)}><BookOpen size={14}/> Atlas <span className="shortcut">T</span></button><button onClick={()=>setQuestOpen(true)}><Gamepad2 size={14}/> Quests</button></div>
      {notice&&<motion.div className="toast" initial={{y:-10,opacity:0}} animate={{y:0,opacity:1}}>{notice}</motion.div>}

      <AnimatePresence>
        {atlasOpen&&<AtlasPanel save={save} onClose={()=>setAtlasOpen(false)}/>}
        {questOpen&&<QuestPanel save={save} onClose={()=>setQuestOpen(false)} mobile={mobile} onReset={()=>{resetProgress();location.reload()}} onSound={()=>setSound(v=>!v)} onReduced={()=>setReduced(v=>!v)} sound={sound} reduced={reduced}/>}
        {letter&&<LetterPanel letter={letter} onClose={()=>setLetter(null)}/>} 
        {detail&&<DetailPanel detail={detail} onClose={()=>setDetail(null)}/>}
        {puzzle&&<PuzzlePanel puzzle={puzzle} onClose={()=>setPuzzle(null)} onSolved={solve}/>}
        {ending&&<EndingPanel onClose={()=>setEnding(false)} onOpen={openEnding}/>}
      </AnimatePresence>
    </>}
  </div>;
}
