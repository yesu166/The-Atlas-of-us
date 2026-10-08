let ctx:AudioContext|undefined;
function get(){ctx??=new AudioContext();return ctx}
export function chime(enabled:boolean,frequency=640){
 if(!enabled)return;
 try{const c=get();const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=frequency;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.045,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.32);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.34)}catch{}
}
