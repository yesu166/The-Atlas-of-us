import {useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import {Heart,Menu,Volume2,VolumeX,RotateCcw,MousePointer2,Smartphone,Lock,ChevronRight,TerminalSquare,Gamepad2,BookOpen,Sparkles,Settings2,ArrowUpRight} from "lucide-react";
import {chapters,discoveries,quests,tech,type ChapterId} from "./data";
import {loadSave,saveProgress,resetProgress,type SaveData} from "./lib/storage";
import {chime} from "./lib/sound";
import {World} from "./three/World";
import {TouchControls} from "./components/TouchControls";

type GameMode="heart"|"constellation"|"choice"|null;

function Intro({onEnter,onSkip}:{onEnter:()=>void;onSkip:()=>void}){
 const [step,setStep]=useState(0);
 useEffect(()=>{const t=window.setInterval(()=>setStep(s=>Math.min(3,s+1)),1050);return()=>window.clearInterval(t)},[]);
 const lines=["There is a story I haven't finished yet.","Maybe because one character is still missing.","You.","But before I tell you about us…"];
 return <main className="intro-screen">
  <div className="intro-stars"/><div className="intro-orbit intro-orbit-a"/><div className="intro-orbit intro-orbit-b"/><div className="intro-core"/>
  <div className="intro-top"><span>AWYU / 001</span><button onClick={onSkip}>SKIP INTRO</button></div>
  <div className="intro-copy"><span className="micro">LEVEL 0 · BEFORE WE MET</span><h1>A World<br/><em>Waiting For You</em></h1><div className="intro-line">{lines[step]}</div>
   <button className={"primary intro-enter " + (step<3?"dim":"")} onClick={onEnter}>Enter the little world <ChevronRight size={17}/></button>
   <small>Built by Yesu · one small universe, intentionally unfinished.</small>
  </div>
  <div className="intro-bottom"><span>STARS / READY</span><span>FUTURE / UNKNOWN</span><span>PRESS ENTER TO BEGIN</span></div>
 </main>
}

function Modal({title,eyebrow,children,onClose}:{title:string;eyebrow:string;children:ReactNode;onClose:()=>void}){
 return <div className="modal-layer" onClick={onClose}><article className="modal" onClick={e=>e.stopPropagation()}><span className="micro">{eyebrow}</span><h2>{title}</h2>{children}<button className="ghost" onClick={onClose}>Close</button></article></div>
}

function Terminal({onClose,onSecret}:{onClose:()=>void;onSecret:()=>void}){
 const [input,setInput]=useState("");const [lines,setLines]=useState<string[]>(["AWYU terminal v1.0","Type help for available commands."]);
 const run=(raw:string)=>{
  const cmd=raw.trim().toLowerCase();
  if(!cmd)return;
  if(cmd==="clear"){setLines([]);return}
  if(cmd==="secret"){setLines(v=>[...v,"> secret","You found the developer hiding inside the romance website.","Respect. ♡"]);onSecret();return}
  const out:Record<string,string>={help:"about · projects · dreams · hearts · future · secret",about:"YESU / 2nd year B.E. CSE (AI & ML) / builder",projects:"HoneyChain · Gwen Agentic AI · experimental web systems",dreams:"Keep learning. Build better systems. Leave room for the unknown.",hearts:"Collectibles are local. Nothing leaves this browser.",future:"CHAPTER ??? / intentionally unfinished"};
  setLines(v=>[...v,"> "+raw,out[cmd] ?? "Unknown command. Try help."]);
 };
 return <div className="terminal-layer" onClick={onClose}><section className="terminal" onClick={e=>e.stopPropagation()}>
  <div className="terminal-head"><span><TerminalSquare size={14}/> YESU / TERMINAL</span><button onClick={onClose}>×</button></div>
  <div className="terminal-body">{lines.map((l,i)=><div key={i}>{l}</div>)}<div className="terminal-input"><span>›</span><input autoFocus value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){run(input);setInput("")}}}/><i/></div></div>
 </section></div>
}

function GameModal({mode,onClose,onAward}:{mode:GameMode;onClose:()=>void;onAward:(id:string,message:string)=>void}){
 const [score,setScore]=useState(0);const [pos,setPos]=useState({x:46,y:42});const [step,setStep]=useState(0);const [choice,setChoice]=useState<string|null>(null);
 useEffect(()=>{if(mode!=="heart")return;const t=window.setInterval(()=>setPos({x:8+Math.random()*78,y:15+Math.random()*66}),850);return()=>window.clearInterval(t)},[mode]);
 if(mode==="heart")return <Modal eyebrow="MINI-GAME / HEART CATCHER" title="Catch five little moments." onClose={onClose}><p>Click the heart before it wanders away. Five catches unlock a collectible.</p><div className="heart-game"><button className="flying-heart" style={{left:pos.x+"%",top:pos.y+"%"}} onClick={()=>{const n=score+1;setScore(n);if(n>=5)onAward("game-heart-"+Date.now(),"Heart secured. Some things are better discovered than announced.")}}>♡</button><div className="game-score">{score}/5</div></div></Modal>;
 if(mode==="constellation"){const pts=[[18,26],[39,18],[63,29],[77,58],[50,76],[26,62]];return <Modal eyebrow="MINI-GAME / CONSTELLATION" title="Connect the pieces." onClose={onClose}><p>Tap the stars in order. A tiny shape is hiding inside the pattern.</p><div className="constellation"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={pts.slice(0,step).map(p=>p.join(",")).join(" ")} /></svg>{pts.map((p,i)=><button key={i} className={i<step?"lit":""} style={{left:p[0]+"%",top:p[1]+"%"}} onClick={()=>{if(i===step){const n=step+1;setStep(n);if(n===pts.length)onAward("game-constellation-"+Date.now(),"Constellation complete. You just connected the pieces.")}else setStep(0)}}>{i+1}</button>)}</div></Modal>};
 return <Modal eyebrow="MINI-GAME / THE CHOICE" title="A project broke at 2 AM." onClose={onClose}><p>You have a deadline tomorrow. What feels most like your move?</p><div className="choice-grid">{["Give up for tonight","Find the bug","Rewrite everything"].map(x=><button key={x} className={choice===x?"selected":""} onClick={()=>setChoice(x)}>{x}</button>)}</div>{choice&&<div className="choice-result"><span>RESULT</span><p>{choice==="Find the bug"?"Understand why it failed, then try again.":choice==="Rewrite everything"?"Bold. Expensive. Sometimes necessary.":"Even builders need sleep. There is no shame in stopping for the night."}</p></div>}</Modal>
}

export default function App(){
 const [save,setSave]=useState<SaveData>(()=>loadSave());const [entered,setEntered]=useState(false);const [mobile,setMobile]=useState(false);const [chapter,setChapter]=useState<ChapterId>("origins");
 const [drawer,setDrawer]=useState(false);const [letter,setLetter]=useState(false);const [notice,setNotice]=useState<string|null>(null);const [sound,setSound]=useState(save.sound);const [reduced,setReduced]=useState(save.reduced);
 const [game,setGame]=useState<GameMode>(null);const [terminal,setTerminal]=useState(false);const [detail,setDetail]=useState<string|null>(null);const moveRef=useRef({x:0,y:0});
 useEffect(()=>{const m=window.matchMedia("(max-width:820px)");const f=()=>setMobile(m.matches);f();m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);
 useEffect(()=>{saveProgress({...save,sound,reduced})},[sound,reduced]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{const tag=(document.activeElement as HTMLElement|null)?.tagName;if(e.key==="/"&&tag!=="INPUT"&&tag!=="TEXTAREA"){e.preventDefault();setTerminal(v=>!v)}if(e.key==="Escape"){setDrawer(false);setLetter(false);setGame(null);setTerminal(false);setDetail(null)}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[]);
 const heartCount=save.hearts.length;const futureOpen=heartCount>=3;const progress=Math.min(100,Math.round((save.chapters.length/6)*100));
 const flash=(s:string)=>{setNotice(s);window.setTimeout(()=>setNotice(null),2400)};
 const update=(next:SaveData)=>{const merged={...next,sound,reduced};setSave(merged);saveProgress(merged)};
 const award=(id:string,message:string)=>{if(save.hearts.includes(id)){flash("Already discovered.");return}const next={...save,hearts:heartCount<12?[...save.hearts,id]:save.hearts,awards:[...save.awards,id]};update(next);chime(sound,760);flash(message)};
 const go=(id:ChapterId)=>{if(id==="future"&&!futureOpen){flash("The missing chapter opens after three discoveries.");return}setChapter(id);if(!save.chapters.includes(id))update({...save,chapters:[...save.chapters,id]});chime(sound,540)};
 const discover=(id:string)=>{if(id.startsWith("heart-world")){award(id,"Secret found. The world kept one for you.");return}if(id==="future-portal"){if(futureOpen){go("future");flash("The door remembers you.")}else flash("Locked for now. Find three hearts.");return}if(id==="moon"){flash("The moon noticed you.");chime(sound,430);return}if(discoveries[id]){setDetail(id);chime(sound,620)}};
 const openGame=(m:GameMode)=>{setGame(m);chime(sound,520)};
 const secret=()=>award("terminal-secret","You found the developer hiding inside the romance website. Respect. ♡");
 if(!entered)return <Intro onEnter={()=>setEntered(true)} onSkip={()=>setEntered(true)}/>;
 const chapterMeta=chapters[chapter];
 return <div className={"app "+(reduced?"reduced ":"")+chapter}>
  <div className="world"><World mobile={mobile} moveRef={moveRef} collected={save.hearts} activeChapter={chapter} onDiscover={discover} onMessage={flash}/></div><div className="vignette"/><div className="grain"/>
  <header className="hud"><div className="identity"><div className="sigil">Y</div><div><b>YESU</b><small>LEVEL 18 · BUILDER</small></div></div><div className="hud-center"><span className="micro">A WORLD WAITING FOR YOU</span><div className="progress"><span style={{width:progress+"%"}}/></div></div><div className="hud-buttons"><button onClick={()=>setSound(!sound)} aria-label="sound">{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}</button><button onClick={()=>setDrawer(true)} aria-label="menu"><Menu size={17}/></button></div></header>
  <div className="chapter-copy"><div className="chapter-meta"><span>{chapterMeta[0]}</span><i/></div><h1>{chapterMeta[1]}</h1><p>{chapterMeta[2]}</p><div className="chapter-cta"><button className="primary mini" onClick={()=>openGame("heart")}>Find a heart</button><button className="ghost mini" onClick={()=>setLetter(true)}><BookOpen size={14}/> Letter</button></div></div>
  <div className="chapter-tabs">{(Object.keys(chapters) as ChapterId[]).map((id,i)=><button key={id} className={chapter===id?"active":""} disabled={id==="future"&&!futureOpen} onClick={()=>go(id)}><span>{id==="future"?"♡":String(i+1).padStart(2,"0")}</span>{chapters[id][1]}</button>)}</div>
  <div className="discovery-feed"><span>DISCOVERIES</span><strong>{heartCount.toString().padStart(2,"0")} / 12</strong><small>{futureOpen?"THE LOCKED DOOR IS LISTENING":"THREE HEARTS UNLOCK THE FUTURE"}</small></div>
  <div className="controls-hint">{mobile?<><Smartphone size={13}/> left thumb moves · drag world to look · E button interacts</>:<><span className="key">WASD</span> move <span className="key">mouse</span> look <span className="key">/</span> terminal</>}</div>
  <div className="side-actions"><button onClick={()=>setDrawer(true)}><Gamepad2 size={14}/> quest log</button><button onClick={()=>setTerminal(true)}><TerminalSquare size={14}/> terminal</button></div>
  {mobile&&<TouchControls moveRef={moveRef} onInteract={()=>flash("Tap a glowing object or heart after moving close.")}/>}
  {notice&&<div className="notice">{notice}</div>}
  {detail&&<Modal eyebrow={discoveries[detail].eyebrow} title={discoveries[detail].title} onClose={()=>setDetail(null)}><p>{discoveries[detail].body}</p></Modal>}
  {letter&&<Modal eyebrow="A LETTER, WITHOUT A NAME" title="To the person I have not met yet." onClose={()=>setLetter(false)}><p>I don't know your name, where we will meet, or which ordinary day becomes a favorite memory. I didn't want to invent those things. I only wanted to leave a little room for them.</p><p>For now I'll keep learning, building, making mistakes and becoming better. Maybe someday life will write the missing part naturally — not because I planned you, but because we met.</p><p>Until then: no pressure. Just possibility.</p></Modal>}
  {drawer&&<div className="drawer-layer" onClick={()=>setDrawer(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="micro">PLAYER PROFILE</span><h2>Yesuraja / Yesu</h2><p>B.E. Computer Science & Engineering — AI & ML · 2nd Year</p></div><button onClick={()=>setDrawer(false)}>×</button></div>
   <div className="drawer-status"><span><b>{heartCount}</b> hearts</span><span><b>{save.chapters.length}</b>/6 chapters</span><span><b>{progress}%</b> explored</span></div>
   <h3>QUEST LOG</h3><div className="quest-list">{["Enter the world","Visit the workshop","Find 3 hidden hearts","Reach the missing chapter"].map((q,i)=>{const done=i===0||(i===1&&save.chapters.includes("building"))||(i===2&&heartCount>=3)||(i===3&&futureOpen);return <div className={"quest "+(done?"done":"")} key={q}><span>{done?"✓":"□"}</span>{q}</div>})}</div>
   <h3>TECH CONSTELLATION</h3><div className="tech-grid">{tech.map(([a,b])=><button key={a} onClick={()=>flash(b)}><strong>{a}</strong><small>{b}</small></button>)}</div>
   <h3>MINI GAMES</h3><div className="game-grid"><button onClick={()=>openGame("heart")}><Heart size={16}/>Heart Catcher</button><button onClick={()=>openGame("constellation")}><Sparkles size={16}/>Constellation</button><button onClick={()=>openGame("choice")}><Settings2 size={16}/>The Choice</button></div>
   <h3>CO-OP QUESTS</h3><div className="co-op">{quests.slice(0,5).map(q=><div key={q}>□ {q}</div>)}</div>
   <h3>SETTINGS</h3><label className="setting"><span>Reduced motion</span><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/></label><label className="setting"><span>Ambient audio</span><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/></label>
   <div className="drawer-actions"><button className="ghost" onClick={()=>{resetProgress();location.reload()}}><RotateCcw size={14}/> Reset story</button><span>{mobile?<><Smartphone size={14}/> touch mode</>:<><MousePointer2 size={14}/> desktop exploration</>}</span></div>
  </aside></div>}
  {terminal&&<Terminal onClose={()=>setTerminal(false)} onSecret={secret}/>}
  {game&&<GameModal mode={game} onClose={()=>setGame(null)} onAward={(id,msg)=>{award(id,msg);setGame(null)}}/>}
 </div>
}