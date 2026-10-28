import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {oceanLighting} from './ocean-light-v77.js?v=4baf9416a5b8';
import {moveSwimmer,swimCameraPoint,swimFloor,SWIM_CLEARANCE,SWIM_SURFACE} from './swim-motion-v99.js?v=4baf9416a5b8';

// One player uses the existing swimming Po asset and its actual skeletal clips.
// The six autonomous residents keep their own animation and movement controllers.
export function makePoExplorer({scene,camera,controls,canvas,height,habitat,coast,gltf,cel,onEnter}){
 const entry=document.querySelector('[data-dive]'),status=document.querySelector('[data-dive-status]');
 const seaIcon='<path d="M3 7c2-3 4 3 6 0s4 3 6 0 4 3 6 0M3 12c2-3 4 3 6 0s4 3 6 0 4 3 6 0M12 15v6m-3-3 3 3 3-3"/>';
 const landIcon='<path d="M3 21h18M3 18l4-6 4 6 4-5 6 8M12 11V3m-3 3 3-3 3 3"/>';
 const root=new T.Group(),rig=new T.Group(),skin=clone(gltf.scene);root.name='ocean-player-po';root.visible=false;rig.add(skin);root.add(rig);scene.add(root);
 const mixer=new T.AnimationMixer(skin),actions={};
 for(const name of ['swim','tread']){const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw Error('Po 수영 동작을 찾지 못했어요: '+name);actions[name]=mixer.clipAction(clip).setEffectiveWeight(0).play();}
 skin.updateMatrixWorld(true);const size=new T.Box3().setFromObject(skin,true).getSize(new T.Vector3());rig.scale.setScalar(1.65/size.y);
 const centres={};
 for(const name of ['swim','tread']){for(const [n,a]of Object.entries(actions))a.setEffectiveWeight(n===name?1:0);mixer.setTime(.3);root.updateMatrixWorld(true);centres[name]=new T.Box3().setFromObject(skin,true).getCenter(new T.Vector3());}
 const materials=new Map();skin.traverse(o=>{if(!o.isMesh)return;const convert=source=>{if(!materials.has(source)){const m=cel(source,{skin:true});oceanLighting(m,{time:coast.waterContext.clock,night:coast.waterContext.night});materials.set(source,m);}return materials.get(source);};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);o.castShadow=false;o.receiveShadow=false;if(o.isSkinnedMesh)o.frustumCulled=false;});
 const position=new T.Vector3(3,-3.5,56),velocity=new T.Vector3(),delta=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),desired=new T.Vector3(),focus=new T.Vector3(),cameraGoal=new T.Vector3(),oldPosition=new T.Vector3(),oldTarget=new T.Vector3();
 const world={height,rocks:habitat.collision||[]},keys=new Set(),projected=new T.Vector3();
 const originalFog=scene.fog.clone(),originalBackground=scene.background.clone(),fogColour=new T.Color(),blue=new T.Color('#237d92'),deepBlue=new T.Color('#124759'),sky=scene.getObjectByName('clear-summer-sky');
 const inspect=new URLSearchParams(location.search).get('inspect')==='1',baseLabel=canvas.getAttribute('aria-label'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,wet=false,drag=null,yaw=Math.atan2(9,10),pitch=0,heading=yaw,tilt=0,swimMix=0,totalTravel=0,diagnosticsAt=-Infinity,lastTime=0,started=false,oldDamping=true;
 function clearInput(){keys.clear();velocity.set(0,0,0);const id=drag?.id;drag=null;if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 function changeIcon(){entry.querySelector('svg').innerHTML=active?landIcon:seaIcon;entry.setAttribute('aria-label',active?'육지로 돌아가기':'Po와 바닷속 탐험');entry.title=active?'육지로 돌아가기':'Po와 바닷속 탐험';entry.setAttribute('aria-pressed',String(active));}
 function restoreAtmosphere(){if(!wet)return;scene.fog.near=originalFog.near;scene.fog.far=originalFog.far;scene.fog.color.copy(originalFog.color);scene.background.copy(originalBackground);if(sky)sky.visible=true;wet=false;}
 function facing(){forward.set(Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.sin(yaw)*Math.cos(pitch));right.set(Math.sin(yaw),0,Math.cos(yaw));}
 function followCamera(dt,snap=false){
  facing();focus.copy(position);cameraGoal.copy(position).addScaledVector(forward,camera.aspect<.8?-8:-6.2);cameraGoal.y+=1.25;
  const safe=swimCameraPoint(focus,cameraGoal,world);cameraGoal.set(safe.x,safe.y,safe.z);
  if(snap)camera.position.copy(cameraGoal);else camera.position.lerp(cameraGoal,1-Math.exp(-dt*10));
  // Check the smoothed segment too, so lateral turns cannot cut through a rock.
  const checked=swimCameraPoint(focus,camera.position,world);camera.position.set(checked.x,checked.y,checked.z);
  focus.copy(position).addScaledVector(forward,.9);focus.y+=.12;camera.lookAt(focus);controls.target.copy(focus);
 }
 function enter(){
  if(active)return;onEnter();oldPosition.copy(camera.position);oldTarget.copy(controls.target);oldDamping=controls.enableDamping;originalFog.near=scene.fog.near;originalFog.far=scene.fog.far;originalFog.color.copy(scene.fog.color);originalBackground.copy(scene.background);
  clearInput();controls.enabled=false;controls.enableDamping=false;active=true;root.visible=true;document.body.classList.add('diving');
  position.y=T.MathUtils.clamp(position.y,Math.min(SWIM_SURFACE,swimFloor(height,position.x,position.z)+SWIM_CLEARANCE),SWIM_SURFACE);
  root.position.copy(position);followCamera(0,true);changeIcon();canvas.setAttribute('aria-label','Po 조종. 화면을 누른 채 드래그하면 헤엄치고 놓으면 멈춥니다. W A S D 이동, E 상승, Q 잠수, Escape 육지 복귀.');canvas.focus({preventScroll:true});status.textContent='Po와 함께 바닷속에 들어왔어요. 화면을 누른 채 드래그하면 헤엄쳐요.';started=true;update(0,lastTime);
 }
 function leave(){
  if(!active)return;active=false;clearInput();root.visible=false;restoreAtmosphere();camera.position.copy(oldPosition);controls.target.copy(oldTarget);controls.enabled=true;controls.enableDamping=false;controls.update();controls.enableDamping=oldDamping;
  document.body.classList.remove('diving');changeIcon();canvas.setAttribute('aria-label',baseLabel);status.textContent='육지로 돌아왔어요.';entry.focus({preventScroll:true});update(0,lastTime);
 }
 entry.addEventListener('click',()=>active?leave():enter());changeIcon();
 const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyE:'up',Space:'up',KeyQ:'down',ControlLeft:'down',ShiftLeft:'fast',ShiftRight:'fast'};
 addEventListener('keydown',e=>{if(!active)return;if(e.code==='Escape'){e.preventDefault();leave();return;}if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLButtonElement)return;if(keyMap[e.code]){e.preventDefault();keys.add(keyMap[e.code]);}});
 addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
 canvas.addEventListener('contextmenu',e=>{if(active)e.preventDefault();});
 canvas.addEventListener('pointerdown',e=>{if(!active||drag)return;canvas.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,age:0,swim:e.button!==2};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!active||drag?.id!==e.pointerId)return;const scale=e.pointerType==='touch'?.006:.004;yaw-=(e.clientX-drag.x)*scale;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*scale,-1.05,1.05);drag.x=e.clientX;drag.y=e.clientY;});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(drag?.id===e.pointerId)drag=null;});
 canvas.addEventListener('wheel',e=>{if(active)e.preventDefault();},{passive:false});
 function update(dt,t){
  lastTime=t;
  if(active){
   if(drag)drag.age+=dt;facing();desired.set(0,0,0);const held=!!(drag?.swim&&drag.age>.12);
   desired.addScaledVector(forward,Math.max(Number(keys.has('forward')),Number(held))-Number(keys.has('back'))).addScaledVector(right,Number(keys.has('right'))-Number(keys.has('left')));desired.y+=Number(keys.has('up'))-Number(keys.has('down'));
   if(desired.lengthSq()>1)desired.normalize();desired.multiplyScalar(keys.has('fast')?6.5:3.6);velocity.lerp(desired,1-Math.exp(-dt*9));if(!desired.lengthSq()&&velocity.lengthSq()<.0001)velocity.set(0,0,0);
   delta.copy(velocity).multiplyScalar(dt);const next=moveSwimmer(position,delta,world);delta.set(next.x-position.x,next.y-position.y,next.z-position.z);position.set(next.x,next.y,next.z);const travel=delta.length(),speed=dt>0?travel/dt:0;totalTravel+=travel;
   if(Math.hypot(delta.x,delta.z)>.00001){const target=Math.atan2(-delta.z,delta.x);heading+=Math.atan2(Math.sin(target-heading),Math.cos(target-heading))*(1-Math.exp(-dt*9));}
   const wantedTilt=speed>.05?Math.atan2(delta.y,Math.hypot(delta.x,delta.z)):0;tilt=T.MathUtils.damp(tilt,T.MathUtils.clamp(wantedTilt,-1.15,1.15),7,dt);swimMix=T.MathUtils.damp(swimMix,T.MathUtils.smoothstep(speed,.08,1),7,dt);
   actions.swim.setEffectiveWeight(swimMix).setEffectiveTimeScale(T.MathUtils.clamp(speed/2.5,.65,1.8));actions.tread.setEffectiveWeight(1-swimMix).setEffectiveTimeScale(.8);mixer.update(dt);
   rig.position.copy(centres.tread).lerp(centres.swim,swimMix).negate();if(!reduced.matches)rig.position.y+=Math.sin(t*1.8)*.015;
   root.position.copy(position);root.rotation.set(0,heading,tilt,'YXZ');root.updateMatrixWorld(true);followCamera(dt);
   const depth=Math.max(0,-camera.position.y),night=coast.waterContext.night.value;fogColour.copy(blue).lerp(deepBlue,T.MathUtils.smoothstep(depth,9,42)).multiplyScalar(1-night*.52);scene.fog.color.copy(fogColour);scene.fog.near=4;scene.fog.far=T.MathUtils.lerp(100,68,T.MathUtils.smoothstep(depth,8,42));scene.background.copy(fogColour);if(sky)sky.visible=false;wet=true;
  }
  habitat.update(t,active);
  if(dt===0||(inspect&&t-diagnosticsAt>.25)){
   projected.copy(position).project(camera);const floor=swimFloor(height,position.x,position.z);canvas.dataset.exploration=JSON.stringify({active,underwater:active,mode:'po-control',playerVisible:root.visible,player:position.toArray(),camera:camera.position.toArray(),depth:+(-position.y).toFixed(2),floor:+floor.toFixed(2),clearance:+(position.y-floor).toFixed(2),travel:+totalTravel.toFixed(3),animation:swimMix>.5?'swim':'tread',swimWeight:+swimMix.toFixed(3),clipTime:+actions.swim.time.toFixed(3),keys:[...keys],pointer:!!drag,playerScreen:[+(projected.x*.5+.5).toFixed(3),+(.5-projected.y*.5).toFixed(3)],started});diagnosticsAt=t;
  }
 }
 // Compile the extra rig with the existing warm-up instead of stalling on entry.
 return {get active(){return active;},root,enter,leave,update,async warmup(renderer){root.visible=true;try{await renderer.compileAsync(scene,camera);}finally{root.visible=active;}},diagnostics:()=>({mode:'po-control',players:1,source:'existing water.glb',...habitat.diagnostics()})};
}
