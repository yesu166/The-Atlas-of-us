import {useRef,useState} from "react";
import type {MutableRefObject,PointerEvent as ReactPointerEvent} from "react";

type Vec2={x:number;y:number};

export function TouchControls({moveRef,lookRef,onInteract,disabled}:{moveRef:MutableRefObject<Vec2>;lookRef:MutableRefObject<Vec2>;onInteract:()=>void;disabled?:boolean}){
  const [active,setActive]=useState(false);
  const [knob,setKnob]=useState({x:0,y:0});
  const pad=useRef<HTMLDivElement>(null);
  const lookStart=useRef<Vec2>({x:0,y:0});
  const lookId=useRef<number|null>(null);

  const updateMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
    const el=pad.current;if(!el||disabled)return;
    const r=el.getBoundingClientRect();
    let x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
    const max=r.width*.34;
    const d=Math.hypot(x,y)||1;
    if(d>max){x=x/d*max;y=y/d*max}
    moveRef.current={x:x/max,y:y/max};
    setKnob({x,y});
  };

  const endMove=()=>{
    moveRef.current={x:0,y:0};
    setKnob({x:0,y:0});
    setActive(false);
  };

  const startLook=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled)return;
    lookId.current=e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    lookStart.current={x:e.clientX,y:e.clientY};
  };

  const moveLook=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled||lookId.current!==e.pointerId)return;
    const dx=e.clientX-lookStart.current.x;
    const dy=e.clientY-lookStart.current.y;
    lookRef.current={
      x:Math.max(-1,Math.min(1,lookRef.current.x-dx*.012)),
      y:Math.max(-1,Math.min(1,lookRef.current.y-dy*.012))
    };
    lookStart.current={x:e.clientX,y:e.clientY};
  };

  const endLook=()=>{
    lookId.current=null;
    lookRef.current={x:0,y:0};
  };

  return <div className="touch-controls" aria-label="Mobile controls">
    <div
      ref={pad}
      className={`joystick ${active?"active":""}`}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setActive(true);updateMove(e)}}
      onPointerMove={e=>active&&updateMove(e)}
      onPointerUp={endMove}
      onPointerCancel={endMove}
    >
      <div className="joystick-ring"/>
      <div className="joystick-knob" style={{transform:`translate(calc(-50% + ${knob.x}px),calc(-50% + ${knob.y}px))`}}/>
      <span>MOVE</span>
    </div>

    <div
      className="look-pad"
      aria-label="Swipe to look"
      onPointerDown={startLook}
      onPointerMove={moveLook}
      onPointerUp={endLook}
      onPointerCancel={endLook}
    >
      <span>DRAG TO LOOK</span>
    </div>

    <button className="touch-interact" onClick={onInteract} disabled={disabled} aria-label="Interact">
      <span>✦</span><small>INTERACT</small>
    </button>
  </div>;
}
