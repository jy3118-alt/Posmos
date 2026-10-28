import {createCharacterArtRegistry} from './character-art.js?v=5bc4fcffc216';
import {makeDistrictCrowd} from './district-crowd-v103.js?v=5bc4fcffc216';
import {loadPoVariants,loadViewDetails} from './resident-loading-v69.js?v=5bc4fcffc216';
import {checkedJSON,fetchResource,yieldTask} from './runtime-budget-v69.js?v=5bc4fcffc216';
import * as T from 'three';
import {localResumeRoute} from './land-motion-v100.js?v=5bc4fcffc216';
import {clone as cloneSkin} from 'three/addons/utils/SkeletonUtils.js';
import {createFollower,groundPatch} from './friend-locomotion-v100.js?v=5bc4fcffc216';
import {createFriendTraffic,villageTrafficSafety} from './friend-traffic.js?v=5bc4fcffc216';
import {makeEncounters} from './encounters-v100.js?v=5bc4fcffc216';

// A bounded cast for the authored district. Original approved skins and clips;
// shared model files, no per-resident download or replacement/teleport cycle.
export async function makeDistrictResidents(scene,renderer,camera,city,plan,config,load,cel){
 const [base,moa,dress,acting,baseMeta,variants,details]=await Promise.all([load(config.character.file),load(config.guestCharacter.file),load(config.dressCharacter.file),checkedJSON('./assets/encounters-v52/models/acting.json?v=09f9f66b2ca6'),checkedJSON('./assets/po-web-v103/models/base-bones.json?v=7e373e3fa6b2'),loadPoVariants(config.search.variants,load),loadViewDetails('./assets/po-web-v103/models/lods.json?v=d3bca1cc8e8c')]);
 const baseFrames=Float32Array.from(new Uint16Array(await fetchResource(baseMeta.texture,'arrayBuffer')),T.DataUtils.fromHalfFloat);
 const library=new Map([['base',{gltf:base,config:config.character,meta:baseMeta,frames:baseFrames}],['moa',{gltf:moa,config:config.guestCharacter}],['dress',{gltf:dress,config:config.dressCharacter}],...variants.map(v=>[v.key,{...v,config:{height:1.65,speedMultiplier:1.5,motionNativeSpeeds:Object.fromEntries(Object.entries(v.meta.clips).map(([n,c])=>[n,c.nativeSpeed])),motionFloorFrames:Object.fromEntries(Object.entries(v.meta.clips).map(([n,c])=>[n,c.floors]))}}])]);
 const artRegistry=createCharacterArtRegistry(library);
 const originalSafe=villageTrafficSafety(city),safe=(x,z,a)=>originalSafe(x,z,a)&&!(plan.obstacles||[]).some(o=>Math.hypot(x-o.x,z-o.z)<o.r+a.radius*.8);
 const traffic=createFriendTraffic({height:city.height,safe,water:(x,z)=>city.streamNear(x,z),spatial:true});
 // Avoid treating a tight staircase as a spline that cuts across its handrails.
 function route(name){const points=plan.routes[name];if(['shore','bridge'].includes(name))return points.map(([x,z])=>({x,z}));return new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)),!['woodland','lookout'].includes(name),'centripetal').getSpacedPoints(160);}
 const specs=[
  {skin:'base',route:'studio',fraction:.17},{skin:'base',route:'east',fraction:.25},
  {skin:'base',route:'bridge',fraction:.10},{skin:'base',route:'shore',fraction:.35},
  {skin:'base',route:'woodland',fraction:.10},{skin:'base',route:'lookout',fraction:.15},
  {skin:'base',at:plan.restPlaces[0],rest:'sit'},{skin:'base',at:plan.restPlaces[1],rest:'lie'},
  {skin:'ribbon',route:'studio',fraction:.72},{skin:'crown',route:'bridge',fraction:.80},
  {skin:'dress',route:'studio',fraction:.46},{skin:'moa',route:'studio',fraction:.30}
 ];
 const actors=[],realActors=[],point=new T.Vector3();let maxStep=0,lastDiagnostics=0;
 for(let i=0;i<specs.length;i++){await yieldTask();
  const spec=specs[i],def=library.get(spec.skin),cfg=def.config,model=cloneSkin(def.gltf.scene),mixer=new T.AnimationMixer(model),actions={};
  for(const clip of def.gltf.animations){const a=mixer.clipAction(clip).setEffectiveWeight(clip.name==='idle'?1:0).play();if(['sit','lie'].includes(clip.name)){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}actions[clip.name]=a;}
  mixer.update(0);model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());model.position.sub(new T.Vector3(centre.x,bounds.min.y,centre.z));
  const root=new T.Group(),facing=new T.Group();facing.rotation.y=spec.skin==='moa'?Math.PI/2:0;facing.add(model);root.add(facing);root.scale.setScalar(cfg.height/size.y);root.name='district-resident-'+i;scene.add(root);
  model.traverse(o=>{if(o.isMesh){o.material=cel(o.material,{skin:true});o.castShadow=true;o.receiveShadow=false;if(o.isSkinnedMesh)o.frustumCulled=false;}});
  let follower,body;
  if(spec.route){const points=route(spec.route);follower=createFollower(traffic,points,{id:'district:'+i,height:cfg.height,radius:spec.skin==='dress'?.66:.58,fraction:spec.fraction,closed:!['shore','bridge','woodland','lookout'].includes(spec.route),speedMultiplier:1.5});body=follower.body;}
  else{body=traffic.add({id:'district:'+i,x:spec.at[0],z:spec.at[1],height:cfg.height,radius:.66,movable:false});}
  const weights={idle:1},wanted={},entries=Object.entries(actions);let requested='idle',speed=0,lastMode='idle',idleTime=0,yaw=0,blocked=0,accum=0;const old=new T.Vector3();
  const state={id:'district:'+i,kind:spec.skin==='base'?'po':spec.skin,skin:spec.skin,root,model,body,height:cfg.height,spec,travel:0,
   prepare(dt,t){
    if(body.playerControlled){requested=body.playerFast?'run':'walk';return;}
    if(body.social){follower?.prepare(dt,0);return;}
    if(!follower){const phase=(t+i*2.1)%37,duration=actions[spec.rest]?.getClip().duration||0;requested=phase>3&&phase<3+duration?spec.rest:'idle';body.movable=false;return;}
    const phase=(t+i*8.3)%58;requested=phase<6?'idle':phase<35?'walk':phase<43&&spec.skin!=='moa'?'run':phase<48?'idle':'walk';
    if(i===4&&phase<8&&groundPatch(city.height,body.x,body.z).flat)requested='sit';
    if(i===5&&phase<7&&groundPatch(city.height,body.x,body.z).flat)requested='lie';
    follower.prepare(dt,requested==='run'?1.02:requested==='walk'?.52:0);
   },
   update(dt,t){
    old.copy(root.position);const p=follower?follower.finish(dt):{x:body.x,y:body.y,z:body.z,yaw,speed:0,motion:0,travel:0};speed=p.speed;state.travel+=p.travel;state.yaw=p.yaw;
    if(follower&&!body.social&&!body.playerControlled){blocked=requested!=='idle'&&p.travel<.001?blocked+dt:0;if(blocked>4&&!follower.route.closed){follower.state.direction*=-1;follower.state.speed=0;blocked=0;}}
    root.position.set(p.x,p.y+.025,p.z);root.rotation.y=p.yaw;
    if(body.social)return;
    const rest=speed<.07&&['sit','lie'].includes(requested)&&actions[requested]?requested:'idle';if(rest!==lastMode&&rest!=='idle')actions[rest].reset().play();lastMode=rest;
    for(const n of Object.keys(wanted))wanted[n]=0;
    if(rest!=='idle')wanted[rest]=1;
    else{const run=actions.run?T.MathUtils.smoothstep(speed/1.5,.56,.94):0;wanted.idle=1-p.motion;wanted.walk=p.motion*(1-run);wanted.run=p.motion*run;}
    for(const [n,a]of entries){weights[n]=T.MathUtils.damp(weights[n]||0,wanted[n]||0,8,dt);a.setEffectiveWeight(weights[n]);if(n==='walk'||n==='run')a.setEffectiveTimeScale(speed/Math.max(.01,(cfg.motionNativeSpeeds?.[n]||cfg.nativeSpeed||.25)*root.scale.x));}
    accum+=dt;const interval=!body.playerControlled&&root.position.distanceToSquared(camera.position)>2500?.075:0;if(accum>=interval){mixer.update(accum);accum=0;}
    let floor=0;for(const [n,a]of entries){const frames=cfg.motionFloorFrames?.[n];if(!frames||!(weights[n]>.0001))continue;const once=['sit','lie'].includes(n),f=once?T.MathUtils.clamp(a.time/a.getClip().duration,0,1)*(frames.length-1):a.time/a.getClip().duration*frames.length,k=Math.floor(f)%frames.length,next=once?Math.min(frames.length-1,k+1):(k+1)%frames.length;floor+=T.MathUtils.lerp(frames[k],frames[next],f-Math.floor(f))*(weights[n]||0);}
    root.position.y-=floor*root.scale.x;state.motionReport={speed,walkTime:actions.walk?.time||0,runTime:actions.run?.time||0,walkWeight:weights.walk||0,runWeight:weights.run||0};root.updateMatrixWorld(true);if(t>1)maxStep=Math.max(maxStep,root.position.distanceTo(old));
   }
  };state.setControlled=on=>{
    if(on){if(!follower)follower=createFollower(traffic,localResumeRoute(body,state.yaw||0,city.height,safe),{id:state.id,height:state.height,existingBody:body,speedMultiplier:1.5});body.playerControlled=true;body.movable=true;body.canSwim=false;requested='walk';}
    else{body.playerControlled=false;body.playerFast=false;follower?.reanchor(localResumeRoute(body,state.yaw||0,city.height,safe));requested='idle';}
   };state.update(0,0);actors.push(state);realActors.push({id:state.id,kind:state.kind,skin:spec.skin,resident:state});
 }
 const definitions=new Map([...library].map(([k,v])=>[k,{gltf:v.gltf,art:artRegistry.get(k),nativeSpeed:v.config.motionNativeSpeeds?.walk||v.config.nativeSpeed}]));
 const crowd=await makeDistrictCrowd(scene,camera,city,config,library,actors,traffic,safe,load,details,cel);
 const encounters=makeEncounters(scene,renderer,camera,city,traffic,crowd,realActors,definitions,acting,{profile:'vision',alternateArtists:true,width:512,height:640,visiblePair:city.visiblePair});
 for(const a of encounters.pool.actors.values())a.model.traverse(o=>{if(o.isMesh)o.material=cel(o.material,{skin:true});});
 function prepare(dt,t){encounters.prepare(dt,t);for(const a of actors)a.prepare(dt,t);crowd.prepare(dt,t);encounters.steer();traffic.step(dt);}
 let completedWorks=0,lastWork=null;function update(dt,t){const before=encounters.active;for(const a of actors)a.update(dt,t);crowd.update(dt,t);encounters.update(dt);if(before&&!encounters.active){completedWorks=encounters.diagnostics().completed;lastWork={painter:before.painter.skin,model:before.model.skin,painterLabel:artRegistry.get(before.painter.skin).label,modelLabel:artRegistry.get(before.model.skin).label};}}
 return {actors,traffic,encounters,crowd,artRegistry,prepare,update,get completedWorks(){return completedWorks;},get lastWork(){return lastWork;},get latestWork(){return encounters.artwork;},get latestPicture(){return encounters.stage.children.find(o=>o.name==='actual-painted-portrait')?.material.map.image;},
  async warmup(){const visible=encounters.stage.visible;encounters.stage.visible=true;for(const a of encounters.pool.actors.values())a.root.visible=true;try{await crowd.warmup(renderer);}finally{for(const a of encounters.pool.actors.values())a.root.visible=false;encounters.stage.visible=visible;}},
  diagnostics(){return {count:actors.length+crowd.placements.length,displayed:actors.filter(a=>a.root.visible).length+[...encounters.pool.actors.values()].filter(a=>a.root.visible).length+crowd.placements.filter(p=>!p.social).length,crowd:crowd.diagnostics(),art:artRegistry.diagnostics(),completedWorks,skinCounts:[...actors,...crowd.placements].reduce((r,p)=>(r[p.skin]=(r[p.skin]||0)+1,r),{}),kinds:actors.reduce((s,a)=>(s[a.kind]=(s[a.kind]||0)+1,s),{}),travel:actors.map(a=>({id:a.id,skin:a.skin,metres:+a.travel.toFixed(2),position:a.root.position.toArray(),visible:a.root.visible})),maxFrameStep:+maxStep.toFixed(3),traffic:traffic.metrics(),encounter:encounters.diagnostics()};}
 };
}
