import * as T from 'three';
import {chooseDistantResident,eligibleResident,landCameraPoint} from './land-motion-v100.js?v=5bc4fcffc216';
import {planLandFlight,sampleLandFlight} from './land-camera-flight-v104.js?v=5bc4fcffc216';

// Control an existing resident in place. No extra model, mixer or crowd instance.
export function makeLandPlayer({camera,controls,canvas,actors,residents,height,buildings,isDiving,leaveWater,onSelect}){
 const keys=new Set(),pointers=new Map(),recent=[],focus=new T.Vector3(),goal=new T.Vector3();
 const baseLabel=canvas.getAttribute('aria-label'),inspect=new URLSearchParams(location.search).has('inspect');
 const flightSample={position:new T.Vector3(),target:new T.Vector3(),progress:0,done:false};
 let flight=null,hasSelected=false;
 let actor=null,yaw=0,pitch=.28,distance=9.5,drag=null,pinch=null,suspended=false,totalTravel=0,lastDistance=0,swaps=0,lastDiagnostic=0;
 const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'fast',ShiftRight:'fast'};
 const ownsInput=e=>e.target===canvas||e.target===document.body;
 const active=()=>!!actor&&!suspended&&!isDiving();
 function clearInput(){keys.clear();drag=null;pinch=null;for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();if(actor){actor.body.wantX=actor.body.wantZ=actor.body.vx=actor.body.vz=0;}}
 function control(a,on){if(a.person)residents.crowd.setControlled(a.person,on);else a.setControlled(on);}
 function label(){canvas.setAttribute('aria-label','캐릭터 직접 조종. 누른 채 드래그 또는 W A S D로 이동, Shift로 달리기, 오른쪽 드래그로 둘러보기, 스크롤·두 손가락으로 확대 축소. Tab으로 멀리 있는 친구로 전환. Escape로 자유 시점.');}
 function select(next){
  if(!next||!eligibleResident(next))return false;
  if(isDiving())leaveWater();
  const old=actor;lastDistance=old?Math.hypot(next.body.x-old.body.x,next.body.z-old.body.z):0;
  clearInput();if(actor)control(actor,false);actor=next;control(actor,true);actor.body.wantX=actor.body.wantZ=actor.body.vx=actor.body.vz=0;suspended=false;
  recent.push(actor.id);if(recent.length>6)recent.shift();swaps+=old&&old!==next?1:0;
  yaw=actor.person?.yaw??actor.yaw??actor.root.rotation?.y??0;
  controls.enabled=false;controls.enableDamping=false;onSelect(actor);label();canvas.focus({preventScroll:true});
  setGoal();
  // Only initial loading starts directly at Po. Repeated Tab/click selections
  // begin at the currently rendered camera, even when a prior flight is active.
  if(hasSelected){flight=planLandFlight(camera.position,goal,controls.target,focus,height,buildings);flightSample.progress=0;}
  else follow(0,true);
  hasSelected=true;writeDiagnostic(0,true);return true;
 }
 function next(){return select(chooseDistantResident(actors,actor,{recent,minimum:65}));}
 function suspend(){flight=null;if(!actor)return;clearInput();control(actor,false);suspended=true;}
 function resume(){if(!actor)return next();if(!eligibleResident(actor))return next();control(actor,true);suspended=false;controls.enabled=false;controls.enableDamping=false;label();canvas.focus({preventScroll:true});follow(0,true);}
 function freeView(){suspend();actor=null;controls.enabled=true;controls.enableDamping=true;controls.update();canvas.setAttribute('aria-label',baseLabel);onSelect(null);}
 function setGoal(){
  focus.set(actor.body.x,actor.body.y+actor.height*.7,actor.body.z);
  const arm=distance*(camera.aspect<.8?1.3:1),horizontal=Math.cos(pitch)*arm;
  goal.set(focus.x-Math.cos(yaw)*horizontal,focus.y+Math.sin(pitch)*arm,focus.z+Math.sin(yaw)*horizontal);
  const safe=landCameraPoint(focus,goal,height,buildings);goal.set(safe.x,safe.y,safe.z);
 }
 function follow(dt,snap=false){
  if(!active())return;
  if(flight&&!snap){
   flight.elapsed+=dt;sampleLandFlight(flight,flight.elapsed,flightSample);
   camera.position.copy(flightSample.position);controls.target.copy(flightSample.target);camera.lookAt(controls.target);
   if(flightSample.done)flight=null;return;
  }
  setGoal();
  if(snap)camera.position.copy(goal);else camera.position.lerp(goal,1-Math.exp(-dt*12));
  const checked=landCameraPoint(focus,camera.position,height,buildings);camera.position.set(checked.x,checked.y,checked.z);
  camera.lookAt(focus);controls.target.copy(focus);
 }
 addEventListener('keydown',e=>{
  // The water controller may have consumed Escape and resumed land earlier in
  // this same event; do not immediately release that restored resident again.
  if(e.defaultPrevented||!ownsInput(e)||e.ctrlKey||e.metaKey||e.altKey||isDiving())return;
  if(e.code==='Tab'&&!e.shiftKey){e.preventDefault();if(!e.repeat)next();return;}
  if(e.code==='Escape'&&active()){e.preventDefault();freeView();return;}
  if(active()&&keyMap[e.code]){e.preventDefault();keys.add(keyMap[e.code]);}
 });
 addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});
 addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);canvas.addEventListener('blur',clearInput);
 canvas.addEventListener('contextmenu',e=>{if(active())e.preventDefault();});
 canvas.addEventListener('pointerdown',e=>{
  if(!active()||(e.pointerType!=='touch'&&e.button!==0&&e.button!==2))return;
  canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  if(pointers.size===1)drag={id:e.pointerId,x:e.clientX,y:e.clientY,age:0,move:e.button!==2};
  else if(pointers.size===2){const [a,b]=pointers.values();pinch={start:Math.hypot(a.x-b.x,a.y-b.y),distance,at:performance.now(),motion:0};drag=null;keys.clear();}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!active()||!pointers.has(e.pointerId))return;
  const old=pointers.get(e.pointerId);if(pinch)pinch.motion+=Math.hypot(e.clientX-old.x,e.clientY-old.y);old.x=e.clientX;old.y=e.clientY;
  if(pinch&&pointers.size===2){const [a,b]=pointers.values();distance=T.MathUtils.clamp(pinch.distance*pinch.start/Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),3.2,650);return;}
  if(!drag||drag.id!==e.pointerId)return;
  const scale=e.pointerType==='touch'?.006:.004;yaw-=(e.clientX-drag.x)*scale;pitch=T.MathUtils.clamp(pitch+(e.clientY-drag.y)*scale,.08,1.30);drag.x=e.clientX;drag.y=e.clientY;
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{
  if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(drag?.id===e.pointerId)drag=null;
  if(!pointers.size&&pinch){const tap=name==='pointerup'&&pinch.motion<10&&performance.now()-pinch.at<320;pinch=null;if(tap)next();}
 });
 canvas.addEventListener('wheel',e=>{if(!active()||e.ctrlKey||e.metaKey)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);distance=T.MathUtils.clamp(distance*Math.exp(T.MathUtils.clamp(delta,-300,300)*.0015),3.2,650);},{passive:false});
 function prepare(dt){
  if(!active())return;
  // Keep the destination grounded and still until the view arrives. Input
  // remains held, so walking starts naturally when the camera settles.
  if(flight){actor.body.wantX=actor.body.wantZ=0;return;}
  if(drag)drag.age+=dt;
  const forward=Number(keys.has('forward')||!!(drag?.move&&drag.age>.12))-Number(keys.has('back')),right=Number(keys.has('right'))-Number(keys.has('left'));
  const scale=(keys.has('fast')?2.7:1.45)/Math.max(1,Math.hypot(forward,right));
  actor.body.wantX=(Math.cos(yaw)*forward+Math.sin(yaw)*right)*scale;
  actor.body.wantZ=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*scale;actor.body.playerFast=keys.has('fast');
 }
 function writeDiagnostic(t,force=false){
  if(!force&&(!inspect||t-lastDiagnostic<.25))return;lastDiagnostic=t;
  canvas.dataset.landControl=JSON.stringify({active:active(),actor:actor?.id,skin:actor?.skin,position:actor?[actor.body.x,actor.body.y,actor.body.z]:null,speed:actor?Math.hypot(actor.body.vx,actor.body.vz):0,travel:totalTravel,swaps,lastDistance,zoom:distance,keys:[...keys],pointer:!!drag,pinching:!!pinch,flight:flight?{progress:flightSample.progress,duration:flight.duration}:null,camera:camera.position.toArray(),target:controls.target.toArray(),animation:actor?.person?{pose:actor.person.pose,frame:actor.person.animationFrame}:actor?.motionReport,controlledBodies:residents.traffic.agents.filter(a=>a.playerControlled).length});
 }
 function update(dt,t){if(active()){totalTravel+=actor.body.travel||0;follow(dt);}writeDiagnostic(t);}
 return {get active(){return active();},get actor(){return actor;},select,next,suspend,resume,freeView,prepare,update};
}
