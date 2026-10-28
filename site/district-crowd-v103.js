import * as T from 'three';
import {localResumeRoute} from './land-motion-v100.js?v=d644c435c5eb';
import {yieldTask} from './runtime-budget-v69.js?v=d644c435c5eb';
import {makeRoute,sampleRoute,makeRouteState,advanceRoute} from './route-motion-v67.js?v=d644c435c5eb';
import {createFollower,groundPatch} from './friend-locomotion-v100.js?v=d644c435c5eb';
import {createPoVariantCrowd} from './po-variants-v103.js?v=d644c435c5eb';
import {createWaterResidents} from './water-residents-v103.js?v=d644c435c5eb';
import {makeViewDetail} from './view-detail-v67.js?v=d644c435c5eb';
import {createStreamResidents} from './stream-residents-v103.js?v=d644c435c5eb';

// Existing Po population, compact bone animation batches, and six real swimmers.
// Twelve close residents are owned by the district actor controller separately.
export async function makeDistrictCrowd(scene,camera,city,config,library,actors,traffic,safe,load,details,cel){
 const needed=new Map([['base',config.search.count-config.search.variants.reduce((s,v)=>s+v.count,0)],...config.search.variants.map(v=>[v.key,v.count])]);
 for(const a of actors)if(needed.has(a.skin))needed.set(a.skin,needed.get(a.skin)-1);
 const placements=[],roots=[],occupied=actors.map(a=>({x:a.body.x,z:a.body.z,y:a.body.y,r:a.body.radius})),regions=city.crowdRegions||[[-22,2,12],[-34,-16,13],[0,-32,17],[29,-13,15],[29,15,12],[-30,22,12]];
 let seed=60017;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Cut authored paths only at unsafe plots/slopes. Each visitor keeps its own
 // continuous arc-distance route; no district teleport or clock-based resets.
 const visitorRoutes=[];
 for(const [name,line]of city.visitorRoutes||[]){let segment=[],last=null;const flush=()=>{if(segment.length>2&&makeRoute(segment).length>8)visitorRoutes.push({name,route:makeRoute(segment),points:segment});segment=[];last=null;};
  for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.35);for(let j=0;j<steps;j++){const u=j/steps,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u,y=city.height(x,z);if(!safe(x,z,{radius:.6})||groundPatch(city.height,x,z,.5).rise>.38||(last&&Math.abs(last.y-y)>.25)){flush();continue;}segment.push({x,z});last={y};}}
  flush();
 }
 function available(x,z,y){return safe(x,z,{radius:.6})&&groundPatch(city.height,x,z,.6).rise<.35&&!occupied.some(p=>Math.abs(p.y-y)<1.3&&Math.hypot(p.x-x,p.z-z)<p.r+.86);}
 function spawn(id,skin){
  if(skin==='base'&&city.skyResidents?.crowdSlots.includes(id)){
   const sky=city.skyResidents,index=sky.crowdSlots.indexOf(id),z=sky.centre[2]+(index-1)*3.5,points=[-5,-2,2,5].map(x=>({x:sky.centre[0]+x,z:z+Math.sin(x*.35+index)*.35})),route=makeRoute(points),state=makeRouteState(route,.12+index*.30,index%2?-1:1),at=sampleRoute(route,state.distance);
   return {x:at.x,z:at.z,y:sky.centre[1]-.075,sky:{route,state,island:sky.island}};
  }
  if(id>10&&id%5===0&&visitorRoutes.length)for(let n=0;n<80;n++){const visitor=visitorRoutes[(Math.floor(id/5)+n)%visitorRoutes.length],fraction=.08+random()*.84,{x,z}=sampleRoute(visitor.route,visitor.route.length*fraction),y=city.height(x,z);if(!available(x,z,y))continue;occupied.push({x,z,y,r:.58});return {x,z,y,visitor:visitor.points,visitorName:visitor.name,fraction};}
  for(let attempt=0;attempt<12000;attempt++){const region=regions[Math.floor(random()*regions.length)],a=random()*Math.PI*2,r=Math.sqrt(random())*region[2],x=region[0]+Math.cos(a)*r,z=region[1]+Math.sin(a)*r,y=city.height(x,z);
   if(!available(x,z,y))continue;occupied.push({x,z,y,r:.58});return {x,z,y};
  }throw Error('Not enough safe space for the configured residents.');
 }
 for(const [skin,count]of needed){if(count<0)throw Error('District population exceeds the configured kind: '+skin);for(let i=0;i<count;i++){const id=placements.length,spot=spawn(id,skin),height=1.65*(config.search.variants.find(v=>v.key===skin)?.heightScale||1);placements.push({id,skin,pose:'idle',height,clockOffset:random()*40,position:[spot.x,spot.y+.025,spot.z],sky:spot.sky,visitor:spot.visitor,visitorName:spot.visitorName,fraction:spot.fraction||0,yaw:random()*Math.PI*2,zone:'마을',animationFrame:0});roots.push(new T.Matrix4());}}
 const count=placements.length,clocks=new Float32Array(count*4),previous=new Float32Array(count*4),transitions=new Float32Array(count*2),mixes=new Float32Array(count).fill(1);
 const waterSlots=placements.filter(p=>p.skin==='base').slice(0,6),waterGltf=await load(config.waterActivities.model),water=createWaterResidents(scene,waterGltf,city,waterSlots,config.character);
 for(const a of water.actors)a.root.traverse(o=>{if(o.isMesh)o.material=cel(o.material,{skin:true});});
 const crossings=[];for(let i=20;i<city.river.length-12&&crossings.length<2;i+=6){const point=city.river[i],q=city.streamNear(point[0],point[2],{});if(!q||!city.waterAt(point[0],point[2],{}))continue;const radius=q.width+3.5,points=[-1,-.5,0,.5,1].map(u=>({x:point[0]-q.flowZ*radius*u,z:point[2]+q.flowX*radius*u}));if(crossings.some(r=>Math.hypot(r[2].x-point[0],r[2].z-point[2])<8))continue;let valid=true;for(let j=0;j<=40;j++){const u=j/40,x=T.MathUtils.lerp(points[0].x,points[4].x,u),z=T.MathUtils.lerp(points[0].z,points[4].z,u);if(!safe(x,z,{radius:.57,canSwim:true})){valid=false;break;}}if(valid)crossings.push(points);}
 let usedCrossings=0,usedLakeCrossings=0;for(const p of placements){const def=library.get(p.skin),meta=def.meta;p.variantMeta=meta;const c=meta.clips.idle;clocks.set([c.start,c.count,c.fps,p.clockOffset*c.fps],p.id*4);transitions.set([0,1],p.id*2);
  if(p.sky){p.pose='walk';p.animationFrame=0;const c=meta.clips.walk;clocks.set([c.start,c.count,0,0],p.id*4);p.body={x:p.position[0],y:p.position[1],z:p.position[2],radius:.57};continue;}
  if(p.water)continue;
  let route=p.visitor||null;if(!route&&p.id%3!==0)for(const length of [5,3,1.8]){for(let angle=0;angle<8&&!route;angle++){const theta=p.yaw+angle*Math.PI/4,points=[];let okay=true,prevY=p.position[1]-.025;for(let i=0;i<=Math.ceil(length/.23);i++){const u=i/Math.ceil(length/.23),x=p.position[0]+Math.cos(theta)*length*u,z=p.position[2]+Math.sin(theta)*length*u,y=city.height(x,z);if(!safe(x,z,{radius:.58})||Math.abs(y-prevY)>.20||Math.abs(y-p.position[1])>.85){okay=false;break;}points.push({x,z});prevY=y;}if(okay)route=points;}if(route)break;}
  if(p.skin==='base'&&usedCrossings<crossings.length){route=crossings[usedCrossings++];p.crossing=true;}
  if(p.skin==='base'&&p.id>10&&usedLakeCrossings<(city.lakeCrossings?.length||0)){route=city.lakeCrossings[usedLakeCrossings++].map(([x,z])=>({x,z}));p.crossing=true;p.lakeCrossing=true;p.fraction=0;p.visitor=null;}
  if(route){p.follower=createFollower(traffic,route,{id:'crowd:'+p.id,height:p.height,radius:.57,fraction:p.fraction,speedMultiplier:config.character.speedMultiplier});p.body=p.follower.body;p.basePose=(p.visitor||p.id%7===0)&&!p.crossing?'run':'walk';p.pose=p.basePose;p.animationFrame=p.clockOffset*meta.clips[p.pose].fps;const c=meta.clips[p.pose];clocks.set([c.start,c.count,0,p.animationFrame],p.id*4);}
  else p.body=traffic.add({id:'crowd:'+p.id,x:p.position[0],z:p.position[2],height:p.height,radius:.57,movable:false});
 }
 previous.set(clocks);
 // createPoVariantCrowd claims members by kind; force that exact assignment.
 const drawLibrary=[...needed].filter(([skin,n])=>n>0).map(([key])=>({...library.get(key),key,count:placements.filter(p=>p.skin===key&&!p.water).length,heightScale:1}));
 const batches=[];
 // A separate call per kind preserves source identity without reshuffling skins.
 const crowds=[];for(const item of drawLibrary){await yieldTask();const members=placements.filter(p=>p.skin===item.key);crowds.push(createPoVariantCrowd(scene,[item],members,clocks,transitions,previous,mixes,-1));}
 for(const c of crowds)for(const batch of c.batches){const animationHook=batch.material.onBeforeCompile,replacement=cel(batch.material,{skin:true}),paintHook=replacement.onBeforeCompile;replacement.onBeforeCompile=s=>{animationHook(s);paintHook(s);};replacement.customProgramCacheKey=()=> 'district-crowd-v60-'+batch.name;batch.material=replacement;batches.push(batch);}
 const collection={batches},detail=makeViewDetail(scene,camera,collection,details,()=>innerHeight),guide=new T.Object3D(),stream=createStreamResidents(scene,waterGltf,city,{placements},config.character);
 for(const a of stream.pool)a.root.traverse(o=>{if(o.isMesh)o.material=cel(o.material,{skin:true});});
 const shadows=new T.InstancedMesh(new T.CircleGeometry(.42,12).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#373d68',opacity:.12,transparent:true,depthWrite:false}),count);shadows.frustumCulled=false;scene.add(shadows);
 function prepare(dt,t){for(const p of placements)if(p.follower){if(p.body.playerControlled)continue;const phase=(t+p.id*2.77)%47,rest=phase<10;p.follower.prepare(dt,p.social||rest?0:p.basePose==='run'?1.04:.45);}stream.prepare(dt);}
 function update(dt,t){water.update(t);for(const p of placements){
   if(p.sky){const idle=(t+p.id*2.1)%31<4,at=advanceRoute(p.sky.route,p.sky.state,idle?0:.60,dt),c=p.variantMeta.clips.walk;p.position[0]=at.x;p.position[2]=at.z;p.yaw=p.sky.state.yaw;p.animationFrame=(p.animationFrame+p.sky.state.travel/Math.max(.001,c.nativeSpeed*p.height)*c.fps)%c.count;clocks[p.id*4+3]=p.animationFrame;transitions[p.id*2]=(t*p.variantMeta.clips.idle.fps+p.clockOffset)%p.variantMeta.clips.idle.count;transitions[p.id*2+1]=p.sky.state.motion;p.travel=(p.travel||0)+p.sky.state.travel;Object.assign(p.body,{x:p.position[0],y:p.position[1],z:p.position[2]});}
   if(p.follower){const v=p.follower.finish(dt);
    if(p.body.playerControlled){const pose=v.speed>1.5&&p.variantMeta.clips.run?'run':'walk';if(p.pose!==pose){const old=p.variantMeta.clips[p.pose],c=p.variantMeta.clips[pose];previous.set(clocks.subarray(p.id*4,p.id*4+4),p.id*4);p.animationFrame=(p.animationFrame/old.count)*c.count;p.pose=pose;clocks.set([c.start,c.count,0,p.animationFrame],p.id*4);mixes[p.id]=0;}}
    mixes[p.id]=Math.min(1,mixes[p.id]+dt/.28);const c=p.variantMeta.clips[p.pose];p.position[0]=v.x;p.position[1]=v.y+.025;p.position[2]=v.z;p.yaw=v.yaw;p.animationFrame=(p.animationFrame+v.travel/Math.max(.001,c.nativeSpeed*p.height)*c.fps)%c.count;clocks[p.id*4+3]=p.animationFrame;transitions[p.id*2]=(t*p.variantMeta.clips.idle.fps+p.clockOffset)%p.variantMeta.clips.idle.count;transitions[p.id*2+1]=v.motion;p.travel=(p.travel||0)+v.travel;}
   guide.position.fromArray(p.position);guide.rotation.set(p.sky?Math.PI:0,p.yaw,0,'YXZ');guide.scale.setScalar(p.water||p.social||p.inStream?0:p.height);guide.updateMatrix();roots[p.id].copy(guide.matrix);
   guide.rotation.set(p.sky?Math.PI:0,p.yaw,0,'YXZ');guide.position.y=p.sky?city.skyResidents.centre[1]-.06:city.height(p.position[0],p.position[2])+.035;guide.scale.set(p.water||p.social||p.inStream?0:p.height,1,p.water||p.social||p.inStream?0:p.height*.65);guide.updateMatrix();shadows.setMatrixAt(p.id,guide.matrix);
  }for(const c of crowds)c.update(t,roots);stream.update(dt,t);shadows.instanceMatrix.needsUpdate=true;
 }
 update(0,0);detail.update();
 function setControlled(p,on){
  if(on){
   if(!p.follower)p.follower=createFollower(traffic,localResumeRoute(p.body,p.yaw,city.height,safe),{id:'crowd:'+p.id,height:p.height,existingBody:p.body,speedMultiplier:config.character.speedMultiplier});
   p.body.playerControlled=true;p.body.playerFast=false;p.body.canSwim=false;p.body.movable=true;
   const c=p.variantMeta.clips.walk;previous.set(clocks.subarray(p.id*4,p.id*4+4),p.id*4);p.pose='walk';p.basePose='walk';p.animationFrame=0;clocks.set([c.start,c.count,0,0],p.id*4);mixes[p.id]=0;
  }else{p.body.playerControlled=false;p.body.playerFast=false;p.follower?.reanchor(localResumeRoute(p.body,p.yaw,city.height,safe));}
 }
 return {placements,batches,water,stream,prepare,update,setControlled,detailUpdate:detail.update,
  warmup:async renderer=>{for(const a of stream.pool)a.root.visible=true;try{await renderer.compileAsync(scene,camera);}finally{for(const a of stream.pool)a.root.visible=!!a.p;}},
  diagnostics(){return {count,upsideDown:placements.filter(p=>p.sky).map(p=>({id:p.id,position:[...p.position],travel:+(p.travel||0).toFixed(2),gait:+p.animationFrame.toFixed(2),gravity:[0,1,0],surfaceY:city.skyResidents.centre[1]-.05})),land:count-water.count,swimmers:water.count,stream:stream.diagnostics(),crossings:crossings.length,lakeCrossings:usedLakeCrossings,groups:drawLibrary.map(g=>({kind:g.key,count:g.count})),boneBytes:drawLibrary.reduce((s,g)=>s+g.frames.byteLength,0),movers:placements.filter(p=>p.follower).length,visitors:placements.filter(p=>p.visitor).map(p=>({id:p.id,route:p.visitorName,length:+p.follower.route.length.toFixed(1),travel:+(p.travel||0).toFixed(2)})),districtCounts:regions.map(([x,z])=>placements.filter(p=>Math.hypot(p.position[0]-x,p.position[2]-z)<26).length),view:detail.metrics,water:water.actors.map(a=>({id:a.p.id,mode:a.p.waterActivity,depth:+a.p.waterDepth.toFixed(3),position:a.p.position})),movingResidents:placements.filter(p=>p.travel>.01).length};}
 };
}
