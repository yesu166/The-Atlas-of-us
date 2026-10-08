type RegionTone="garden"|"workshop"|"city"|"lake"|"mountain"|"house";
let ctx:AudioContext|undefined;
let master:GainNode|undefined;
let ambience:GainNode|undefined;
let oscA:OscillatorNode|undefined;
let oscB:OscillatorNode|undefined;
let enabled=false;

function get(){
  ctx??=new AudioContext();
  return ctx;
}

function ensure(){
  const c=get();
  if(c.state==="suspended")void c.resume();
  if(master)return;
  master=c.createGain();
  master.gain.value=.7;
  master.connect(c.destination);
}

const tones:Record<RegionTone,[number,number]>={
  garden:[196,293.66],
  workshop:[146.83,220],
  city:[164.81,246.94],
  lake:[130.81,196],
  mountain:[110,164.81],
  house:[174.61,261.63]
};

function ramp(node:AudioParam,value:number,time:number){
  const c=get();
  node.cancelScheduledValues(c.currentTime);
  node.linearRampToValueAtTime(value,c.currentTime+time);
}

function startAmbience(region:RegionTone){
  if(!enabled)return;
  ensure();
  const c=get();
  if(!master)return;
  if(!ambience){
    ambience=c.createGain();
    ambience.gain.value=.0001;
    ambience.connect(master);
    oscA=c.createOscillator();
    oscB=c.createOscillator();
    oscA.type="sine";
    oscB.type="triangle";
    oscA.connect(ambience);
    oscB.connect(ambience);
    oscA.start();
    oscB.start();
  }
  const [a,b]=tones[region];
  oscA!.frequency.setTargetAtTime(a,c.currentTime,.8);
  oscB!.frequency.setTargetAtTime(b,c.currentTime,1.1);
  ramp(ambience.gain,.018,1.2);
}

function stopAmbience(){
  if(!ambience)return;
  ramp(ambience.gain,.0001,.6);
}

export const audioManager={
  setEnabled(value:boolean){
    enabled=value;
    if(enabled){
      ensure();
      startAmbience("garden");
    }else stopAmbience();
  },
  setRegion(region:RegionTone){
    if(enabled)startAmbience(region);
  },
  stop(){stopAmbience()},
  discovery(frequency=660){
    if(!enabled)return;
    try{
      ensure();
      const c=get();
      const o=c.createOscillator();
      const g=c.createGain();
      o.type="sine";
      o.frequency.setValueAtTime(frequency,c.currentTime);
      o.frequency.exponentialRampToValueAtTime(frequency*1.5,c.currentTime+.22);
      g.gain.setValueAtTime(.0001,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.045,c.currentTime+.025);
      g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.38);
      o.connect(g);g.connect(master!);
      o.start();o.stop(c.currentTime+.4);
    }catch{}
  }
};

export function chime(enabledFlag:boolean,frequency=640){
  if(enabledFlag)audioManager.discovery(frequency);
}