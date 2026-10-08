import {useRef,useState} from "react";
import type {MutableRefObject,PointerEvent as ReactPointerEvent} from "react";

export function TouchControls({moveRef,onInteract}:{moveRef:MutableRefObject<{x:number;y:number}>;onInteract:()=>void}){
 const [active,setActive]=useState(false);const [knob,setKnob]=useState({x:0,y:0});const pad=useRef<HTMLDivElement>(null);
 const update=(e:ReactPointerEvent<HTMLDivElement>)=>{const el=pad.current;if(!el)return;const r=el.getBoundingClientRect();let x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);const max=r.width*.34;const d=Math.hypot(x,y)||1;if(d>max){x=x/d*max;y=y/d*max}moveRef.current={x:x/max,y:y/max};setKnob({x,y})};
 const end=()=>{moveRef.current={x:0,y:0};setKnob({x:0,y:0});setActive(false)};
 return <div className="touch-controls" aria-label="Mobile controls">
  <div ref={pad} className={`joystick ${active?"active":""}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setActive(true);update(e)}} onPointerMove={e=>active&&update(e)} onPointerUp={end} onPointerCancel={end}>
   <div className="joystick-ring"/><div className="joystick-knob" style={{transform:`translate(calc(-50% + ${knob.x}px),calc(-50% + ${knob.y}px))`}}/><span>MOVE</span>
  </div>
  <button className="touch-interact" onClick={onInteract} aria-label="Interact"><span>E</span><small>INTERACT</small></button>
 </div>
}
