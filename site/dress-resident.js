import * as T from 'three';
import {gameObject} from './game-material.js?v=c66fd58a3001';
import {createFollower} from './friend-locomotion.js?v=c66fd58a3001';
import {villageTrafficSafety} from './friend-traffic.js?v=c66fd58a3001';

export function safeDressRoute(city,height){
 const safe=villageTrafficSafety(city),body={radius:height*.43},segments=[];
 for(const points of city.paths){let part=[];const save=()=>{if(part.length>5){let length=0;for(let i=1;i<part.length;i++)length+=Math.hypot(part[i].x-part[i-1].x,part[i].z-part[i-1].z);segments.push({points:part,length});}part=[];};
  for(const p of points){if(!safe(p.x,p.z,body)){save();continue;}const last=part.at(-1);let clear=true;if(last){const n=Math.ceil(Math.hypot(p.x-last.x,p.z-last.z)/.2);for(let j=1;j<n;j++)if(!safe(last.x+(p.x-last.x)*j/n,last.z+(p.z-last.z)*j/n,body)){clear=false;break;}}if(!clear)save();part.push(p);}save();
 }segments.sort((a,b)=>b.length-a.length);if(!segments.length)throw Error('드레스 Po가 안전하게 걸을 길을 찾지 못했습니다.');return segments[0].points;
}

// A single authored skin. Cloth motion lives on separate skirt bones, so it
// doesn't require per-frame cloth simulation or another crowd texture.
export function createDressResident(scene,gltf,city,traffic,config){
 const model=gltf.scene;model.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),root=new T.Group();
 root.name='royal-dress-po-one';model.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));root.scale.setScalar(config.height/size.y);root.add(model);scene.add(root);gameObject(model);
 model.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.receiveShadow=false;}});
 const mixer=new T.AnimationMixer(model),actions={};for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip).setEffectiveWeight(clip.name==='idle'?1:0).play();
 const follower=createFollower(traffic,safeDressRoute(city,config.height),{id:'dress',height:config.height,radius:config.height*.43,fraction:.30,direction:1,speedMultiplier:config.speedMultiplier||1.5});
 const weights={idle:1,walk:0,run:0,turn:0},wanted={idle:0,walk:0,run:0,turn:0},entries=Object.entries(actions),names=Object.keys(actions);let speed=0,behavior='idle',lastYaw=0,blockedFor=0;
 function floor(name){const frames=config.motionFloorFrames?.[name],a=actions[name];if(!frames||!a)return 0;const f=a.time/a.getClip().duration*frames.length,i=Math.floor(f)%frames.length;return T.MathUtils.lerp(frames[i],frames[(i+1)%frames.length],f-Math.floor(f));}
 function prepare(dt,t){const phase=t%43;behavior=phase<17?'walk':phase<29?'run':phase<36?'idle':'walk';follower.prepare(dt,behavior==='run'?1.02:behavior==='walk'?.52:0);}
 function update(dt,t){
  const p=follower.finish(dt),angle=Math.atan2(Math.sin(p.yaw-lastYaw),Math.cos(p.yaw-lastYaw)),turnRate=dt?Math.abs(angle)/dt:0;
  blockedFor=behavior!=='idle'&&p.travel<.001?blockedFor+dt:0;if(blockedFor>3.5){follower.state.direction*=-1;follower.state.speed=0;blockedFor=0;}
  speed=p.speed;lastYaw=p.yaw;const motion=p.motion,run=T.MathUtils.smoothstep(speed/(config.speedMultiplier||1.5),.56,.94),turn=actions.turn&&speed<.08&&turnRate>.3?1:0;
  wanted.idle=(1-motion)*(1-turn);wanted.walk=motion*(1-run);wanted.run=motion*run;wanted.turn=(1-motion)*turn;
  for(const [name,a]of entries){weights[name]=T.MathUtils.lerp(weights[name]||0,wanted[name]||0,1-Math.exp(-dt*7));a.setEffectiveWeight(weights[name]);if(name==='walk'||name==='run')a.setEffectiveTimeScale(speed/Math.max(.01,(config.motionNativeSpeeds[name]||.25)*root.scale.x));else if(name==='turn')a.setEffectiveTimeScale(T.MathUtils.clamp(turnRate,.6,1.8));}
  mixer.update(dt);let correction=0;for(const name of names)correction+=floor(name)*(weights[name]||0);
  root.position.set(p.x,p.y+.025-correction*root.scale.x,p.z);root.rotation.y=p.yaw;
 }
 update(0,0);return {root,height:config.height,body:follower.body,prepare,update,shadowMoving:()=>speed>.02,get behavior(){return behavior;}};
}
