import * as T from 'three';
import {createEncounterScheduler,encounterKind,pairKey} from './encounter-rules.js?v=d644c435c5eb';
import {createEncounterPerformers} from './encounter-performers.js?v=d644c435c5eb';
import {createSpitPortraitPaper} from './portrait-spit-paper-v62.js?v=d644c435c5eb';
import {createPaintSpitter} from './paint-spitter.js?v=d644c435c5eb';
import {villageTrafficSafety} from './friend-traffic.js?v=d644c435c5eb';
import {groundPatch} from './friend-locomotion.js?v=d644c435c5eb';

export function makeEncounters(scene,renderer,camera,city,traffic,crowd,realActors,definitions,acting,artOptions={}){
 const pool=createEncounterPerformers(scene,definitions,acting),entities=[],safe=villageTrafficSafety(city),point=new T.Vector3(),projected=new T.Vector3(),painterPoint=new T.Vector3(),modelPoint=new T.Vector3(),canvasPoint=new T.Vector3(),dir=new T.Vector3();
 const stage=new T.Group();stage.name='shared-encounter-easel';stage.visible=false;scene.add(stage);
 const wood=new T.MeshLambertMaterial({color:'#ad794e'}),barGeo=new T.BoxGeometry(1,1,1);
 function bar(x,y,z,sx,sy,sz,rz=0){const m=new T.Mesh(barGeo,wood);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;m.castShadow=m.receiveShadow=true;stage.add(m);}
 bar(-.43,.83,0,.055,1.7,.06,-.13);bar(.43,.83,0,.055,1.7,.06,.13);bar(0,.72,-.28,.06,1.5,.06);bar(0,.52,.045,1.1,.08,.11);
 const paperCanvas=document.createElement('canvas');paperCanvas.width=artOptions.width||320;paperCanvas.height=artOptions.height||400;
 const dummy=pool.actors.values().next().value,paper=createSpitPortraitPaper(renderer,scene,dummy,{width:paperCanvas.width,height:paperCanvas.height,captureLayer:7,showLabel:false,...artOptions},paperCanvas);
 const portrait=new T.Mesh(new T.PlaneGeometry(.98,1.225),new T.MeshBasicMaterial({map:paper.texture,side:T.DoubleSide,toneMapped:false}));portrait.position.set(0,1.15,.05);portrait.name='actual-painted-portrait';stage.add(portrait);
 const spitter=createPaintSpitter(scene,dummy,portrait,paper),standBody=traffic.add({id:'easel',x:-999,z:-999,y:-1000,radius:.38,movable:false});
 scene.traverse(o=>{if(o.isLight)o.layers.enable(7);});
 function add(id,kind,skin,body,height,person,resident){
  if(!body)return;const a={id,kind:encounterKind(kind),skin,body,height,person,resident,performer:null,target:new T.Vector3(),get x(){return body.x;},get y(){return body.y;},get z(){return body.z;}};entities.push(a);
 }
 for(const p of crowd.placements)if(p.follower&&!p.hero&&!p.water&&!p.statue&&!p.roof)add('po:'+p.id,p.variant||'po',p.variant||'base',p.follower.body,p.height,p,null);
 for(const a of realActors)add(a.id,a.kind,a.skin,a.resident.body,a.resident.height,null,a.resident);
 const eligible=a=>!a.body.social&&!a.body.inStream&&a.y>city.sea+2&&groundPatch(city.height,a.x,a.z,.55).rise<.21;
 const visible=(a,b)=>{projected.set((a.x+b.x)/2,Math.max(a.y,b.y)+1,(a.z+b.z)/2).project(camera);return Math.abs(projected.x)<.86&&Math.abs(projected.y)<.82&&projected.z>-1&&projected.z<1&&(!artOptions.visiblePair||artOptions.visiblePair(a,b));};
 let active=null,stageName='idle',age=0,lastTime=0,captureDone=false,completed=0,cancelled=0;
 const params=new URLSearchParams(location.search),reviewHold=params.has('inspect')&&params.get('hold')==='admire',forced=params.has('inspect')?params.get('encounter'):null,forcedKey=forced?pairKey(...forced.split('-')):null;
 function hold(a,on){a.body.social=on;if(a.person)a.person.social=on;if(a.resident)a.resident.root.visible=!on;}
 function begin(event){
  const [first,second]=event.actors;if(forcedKey&&pairKey(first.kind,second.kind)!==forcedKey)return false;if(!visible(first,second))return false;
  const painter=first.kind==='moa'?second:second.kind==='moa'?first:artOptions.alternateArtists?(event.serial%2?first:second):first.kind==='po'?first:second.kind==='po'?second:event.serial%2?first:second,model=painter===first?second:first;
  dir.set(model.x-painter.x,0,model.z-painter.z).normalize();const cx=(painter.x+model.x)/2,cz=(painter.z+model.z)/2;
  painterPoint.set(cx-dir.x*1.3,0,cz-dir.z*1.3);modelPoint.set(cx+dir.x*1.3,0,cz+dir.z*1.3);canvasPoint.set(cx-dir.z*.90,0,cz+dir.x*.90);
  for(const a of [painter,model]){
   const target=a===painter?painterPoint:modelPoint;
   for(let i=0;i<=10;i++){const u=i/10,x=T.MathUtils.lerp(a.x,target.x,u),z=T.MathUtils.lerp(a.z,target.z,u);if(!safe(x,z,a.body)||Math.abs(city.height(x,z)-a.y)>.42)return false;}
   if(traffic.agents.some(b=>b!==painter.body&&b!==model.body&&Math.abs(b.y-a.y)<1&&Math.hypot(b.x-target.x,b.z-target.z)<b.radius+a.body.radius+.15))return false;
  }
  if(!safe(canvasPoint.x,canvasPoint.z,{radius:1.8}))return false;
  active={...event,painter,model};stageName='approach';age=0;captureDone=false;
  for(const a of [painter,model]){a.target.copy(a===painter?painterPoint:modelPoint);a.target.y=city.height(a.target.x,a.target.z);a.performer=pool.acquire(a.skin);a.performer.painter=a===painter;a.performer.yaw=a.person?.yaw??a.resident.root.rotation.y;a.performer.model.traverse(o=>{if(o.isMesh){if(a===model)o.layers.enable(7);else o.layers.disable(7);}});hold(a,true);}
  stage.position.set(canvasPoint.x,city.height(canvasPoint.x,canvasPoint.z)+.02,canvasPoint.z);stage.rotation.y=Math.atan2(painter.x-canvasPoint.x,painter.z-canvasPoint.z);stage.visible=false;
  paper.setActor(model.performer);paper.clear();spitter.setActor(painter.performer);return true;
 }
 function end(_event,abort){if(!active)return;for(const a of active.actors){hold(a,false);a.body.movable=true;pool.release(a.performer);a.performer=null;}stage.visible=false;standBody.y=-1000;active=null;stageName='idle';if(abort)cancelled++;else completed++;}
 const scheduler=createEncounterScheduler({range:9,eligible,score:(a,b)=>visible(a,b)?(forcedKey?(pairKey(a.kind,b.kind)===forcedKey?1000:-10000):0):-10000,begin,end});
 function prepare(dt,t){lastTime=t;scheduler.update(dt,entities);}
 function steer(){if(!active)return;for(const a of active.actors){
  const dx=a.target.x-a.x,dz=a.target.z-a.z,d=Math.hypot(dx,dz),moving=stageName==='approach'&&d>.08,speed=Math.min(.9,d*1.7);
  a.body.movable=moving||Math.hypot(a.body.vx,a.body.vz)>.10;a.body.wantX=moving?dx/Math.max(d,.001)*speed:0;a.body.wantZ=moving?dz/Math.max(d,.001)*speed:0;
 }}
 function update(dt){
  if(!active){spitter.update(dt,false);return;}
  age+=dt;if(reviewHold&&stageName==='admire')age=Math.min(age,.15);
  if(stageName==='approach'){
   if(active.actors.every(a=>Math.hypot(a.x-a.target.x,a.z-a.target.z)<.18&&Math.hypot(a.body.vx,a.body.vz)<.28)){stageName='greet';age=0;stage.visible=true;standBody.x=stage.position.x;standBody.z=stage.position.z;standBody.y=stage.position.y;}
   else if(age>13){scheduler.finish(true);return;}
  }else if(age>=active.rule.durations[stageName]){
   const stages=['greet','pose','paint','admire','release'],next=stages[stages.indexOf(stageName)+1];
   if(!next){scheduler.finish();return;}stageName=next;age=0;
  }
  for(const a of active.actors){
   const other=a===active.painter?active.model:active.painter,wanted=stageName==='approach'?Math.atan2(-a.body.vz,a.body.vx):Math.atan2(-(other.z-a.z),other.x-a.x);
   a.performer.yaw+=T.MathUtils.clamp(Math.atan2(Math.sin(wanted-a.performer.yaw),Math.cos(wanted-a.performer.yaw)),-dt*2,dt*2);
   point.set(a.x,a.y+.03,a.z);pool.update(a.performer,dt,{position:point,height:a.height,yaw:a.performer.yaw,stage:stageName,speed:Math.hypot(a.body.vx,a.body.vz),pose:active.rule.pose,greeting:a.kind==='dress'?'turn':active.rule.greeting,age,serial:active.serial});
  }
  if(stageName==='paint'&&!captureDone){captureDone=true;paper.capture({presetId:(active.rule.styleOffset+active.serial*37)%100}).catch(()=>{});}
  if(stageName==='paint')paper.update(Math.min(1,age/7.8));if(stageName==='admire')paper.update(1);
  spitter.update(dt,stageName==='paint'&&paper.ready);
 }
 return {prepare,steer,update,pool,stage,entities,get artwork(){return paper.work;},get active(){return active;},diagnostics(){return {active:active?{pair:active.rule.id,actors:active.actors.map(a=>a.id),positions:active.actors.map(a=>[a.x,a.y,a.z]),stage:stageName,age:+age.toFixed(2)}:null,completed,cancelled,history:scheduler.history,captures:paper.captures,presets:100,style:paper.style,spitter:spitter.diagnostics,poolSize:pool.actors.size,maxSimultaneous:1};}};
}
