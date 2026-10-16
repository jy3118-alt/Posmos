import * as T from 'three';
import {gameObject} from './game-material.js?v=e5ec221a5af3';
import {createFollower,groundPatch,forwardSlope,painterSchedule} from './friend-locomotion.js?v=e5ec221a5af3';
export function createGameResident(scene,gltf,config,height,onActivity,traffic){
 const model=gltf.scene;model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),root=new T.Group();root.name='painter-resident-v20';root.scale.setScalar(config.height/size.y);model.position.sub(new T.Vector3(center.x,box.min.y,center.z));root.add(model);scene.add(root);gameObject(model);model.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.receiveShadow=false;}});
 const mixer=new T.AnimationMixer(model),actions={},weights={};for(const clip of gltf.animations){const a=mixer.clipAction(clip);a.setEffectiveWeight(0).play();actions[clip.name]=a;weights[clip.name]=0;}actions.idle?.setEffectiveWeight(1);
 const curve=new T.CatmullRomCurve3([[3,2],[-2,7],[-9,5],[-6,-1],[-4,-5],[3,-5],[6,-1]].map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');
 const follower=createFollower(traffic,curve.getSpacedPoints(240),{id:'hero',height:config.height,closed:true});let speed=0,lastActivity='',requested='idle',turnMix=0,runMix=0,desperateMix=0,sitMix=0,lieMix=0,slideMix=0,restMode='idle';
 const floor=name=>{const frames=config.motionFloorFrames?.[name],action=actions[name];if(!frames||!action)return config.motionFloors?.[name]||0;const f=(action.time/action.getClip().duration%1)*frames.length,i=Math.floor(f);return T.MathUtils.lerp(frames[i],frames[(i+1)%frames.length],f-i);};
 function prepare(dt,t){
  requested=config.previewAction||painterSchedule(t);const resting=requested==='sit'||requested==='lie';
  if(resting&&!groundPatch(height,follower.body.x,follower.body.z).flat)requested='idle';
  // Seated/lying bodies become stationary obstacles once braking is complete.
  follower.body.movable=!(speed<.07&&['sit','lie'].includes(requested));
  follower.body.radius=config.height*(.34+.29*lieMix)+.06;
  follower.prepare(dt,['idle','sit','lie'].includes(requested)?0:requested==='desperate'?1.95:requested==='run'?1.70:.65);
 }
 function update(dt,t){
  const p=follower.finish(dt),yawDelta=Math.atan2(Math.sin(p.yaw-root.rotation.y),Math.cos(p.yaw-root.rotation.y)),turnRate=dt>0?Math.abs(yawDelta)/dt:0,f=1-Math.exp(-dt*7);speed=p.speed;
  const rest=p.speed<.07&&['sit','lie'].includes(requested)?requested:'idle';
  if(rest!==restMode){if(rest!=='idle')actions[rest]?.reset().setEffectiveTimeScale(1).play();restMode=rest;}
  sitMix+=(rest==='sit'?1-sitMix:-sitMix)*f;lieMix+=(rest==='lie'?1-lieMix:-lieMix)*f;
  const restMix=T.MathUtils.clamp(sitMix+lieMix,0,1);
  turnMix+=((actions.turn&&speed<.09&&turnRate>.25&&restMix<.05?1:0)-turnMix)*f;
  slideMix+=((actions.slide&&speed>.2&&forwardSlope(height,p.x,p.z,p.yaw)<-.14?1:0)-slideMix)*f;
  desperateMix+=((requested==='desperate'?1:0)-desperateMix)*f;runMix+=(T.MathUtils.smoothstep(speed,.58,1.3)-runMix)*f;
  const motion=p.motion*(1-restMix)*(1-turnMix),slide=motion*slideMix,moving=motion-slide;
  weights.sit=sitMix;weights.lie=lieMix;weights.turn=turnMix*(1-restMix);weights.slide=slide;weights.walk=moving*(1-runMix);weights.run=moving*runMix*(1-desperateMix);weights.desperate=moving*runMix*desperateMix;weights.idle=Math.max(0,1-restMix-weights.turn-motion);weights.hang=0;
  root.position.set(p.x,p.y+.03,p.z);root.rotation.y=p.yaw;
  for(const [name,a]of Object.entries(actions)){a.setEffectiveWeight(weights[name]||0);if(['walk','run','desperate'].includes(name))a.setEffectiveTimeScale(speed/Math.max(.01,(config.motionNativeSpeeds?.[name]||.31)*config.height));}
  actions.turn?.setEffectiveTimeScale(T.MathUtils.clamp(turnRate/.9,.6,2));mixer.update(dt);
  let groundCorrection=0;for(const name of Object.keys(actions))groundCorrection+=floor(name)*(weights[name]||0);root.position.y-=groundCorrection*config.height;
  const activity=rest!=='idle'?rest:slideMix>.5?'slide':requested;if(activity!==lastActivity){onActivity(({idle:'그림을 떠올리는 중',walk:'작업실 주변을 산책하는 중',run:'오솔길을 뛰어가는 중',desperate:'온 힘을 다해 뛰는 중',sit:'앉아서 쉬는 중',lie:'누워서 하늘을 보는 중',slide:'비탈을 미끄러지는 중'})[activity]||'잠시 쉬는 중');lastActivity=activity;}
 }
 update(0,0);return {root,height:config.height,hasWalk:!!actions.walk,prepare,update,body:follower.body,shadowMoving:()=>speed>.02||sitMix+lieMix>.05,get behavior(){return lastActivity;}};
}
