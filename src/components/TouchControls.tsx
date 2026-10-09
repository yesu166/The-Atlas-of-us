import {useEffect,useRef,useState} from "react";
import type {MutableRefObject,PointerEvent as ReactPointerEvent} from "react";

type Vec2={x:number;y:number};

export function TouchControls({moveRef,lookRef,onJump,onInteract,disabled}:{moveRef:MutableRefObject<Vec2>;lookRef:MutableRefObject<Vec2>;onJump:()=>void;onInteract:()=>void;disabled?:boolean}){
  const [active,setActive]=useState(false);
  const [knob,setKnob]=useState({x:0,y:0});
  const pad=useRef<HTMLDivElement>(null);
  const moveId=useRef<number|null>(null);
  const lookStart=useRef<Vec2>({x:0,y:0});
  const lookId=useRef<number|null>(null);

  const updateMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
    const el=pad.current;
    if(!el||disabled||moveId.current!==e.pointerId)return;
    const r=el.getBoundingClientRect();
    let x=e.clientX-(r.left+r.width/2);
    let y=e.clientY-(r.top+r.height/2);
    const max=r.width*.35;
    const distance=Math.hypot(x,y)||1;
    if(distance>max){x=x/distance*max;y=y/distance*max}
    const force=Math.min(1,Math.hypot(x,y)/max);
    const deadZone=.07;
    const output=force<deadZone?0:(force-deadZone)/(1-deadZone);
    moveRef.current=output===0?{x:0,y:0}:{x:x/(Math.hypot(x,y)||1)*output,y:y/(Math.hypot(x,y)||1)*output};
    setKnob({x,y});
  };

  const startMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled)return;
    e.preventDefault();
    moveId.current=e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    updateMove(e);
  };

  const endMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(moveId.current!==e.pointerId)return;
    moveId.current=null;
    moveRef.current={x:0,y:0};
    setKnob({x:0,y:0});
    setActive(false);
  };

  const startLook=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled)return;
    e.preventDefault();
    lookId.current=e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    lookStart.current={x:e.clientX,y:e.clientY};
  };

  const moveLook=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled||lookId.current!==e.pointerId)return;
    const dx=e.clientX-lookStart.current.x;
    const dy=e.clientY-lookStart.current.y;
    // Accumulate one frame's camera delta; the world consumes and resets this value.
    // Pointer events can arrive faster than the render loop. Accumulate bounded
    // camera deltas so quick swipes are not lost between frames.
    lookRef.current.x=Math.max(-.45,Math.min(.45,lookRef.current.x-dx*.006));
    lookRef.current.y=Math.max(-.32,Math.min(.32,lookRef.current.y-dy*.0045));
    lookStart.current={x:e.clientX,y:e.clientY};
  };

  const endLook=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(lookId.current!==e.pointerId)return;
    lookId.current=null;
  };

  useEffect(()=>{
    if(!disabled)return;
    moveId.current=null;
    lookId.current=null;
    moveRef.current={x:0,y:0};
    lookRef.current={x:0,y:0};
    setKnob({x:0,y:0});
    setActive(false);
  },[disabled,moveRef,lookRef]);

  return <div className="touch-controls" aria-label="Mobile game controls">
    <div
      ref={pad}
      className={`joystick ${active?"active":""}`}
      role="application"
      aria-label="Movement joystick. Drag in the direction you want to walk."
      onPointerDown={startMove}
      onPointerMove={updateMove}
      onPointerUp={endMove}
      onPointerCancel={endMove}
      onLostPointerCapture={endMove}
    >
      <div className="joystick-ring" aria-hidden="true"/>
      <div className="joystick-knob" style={{transform:`translate(calc(-50% + ${knob.x}px),calc(-50% + ${knob.y}px))`}}/>
      <span>MOVE</span>
    </div>

    <div
      className="look-pad"
      aria-label="Swipe to orbit the camera"
      onPointerDown={startLook}
      onPointerMove={moveLook}
      onPointerUp={endLook}
      onPointerCancel={endLook}
      onLostPointerCapture={endLook}
    >
      <span>DRAG TO LOOK</span>
    </div>

    <button className="touch-jump" onPointerDown={e=>e.stopPropagation()} onClick={onJump} disabled={disabled} aria-label="Jump"><span>↑</span><small>JUMP</small></button>

    <button className="touch-interact" onPointerDown={e=>e.stopPropagation()} onClick={onInteract} disabled={disabled} aria-label="Interact">
      <span>✦</span><small>INTERACT</small>
    </button>
  </div>;
}
