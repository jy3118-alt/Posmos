import * as T from 'three';
import {makeRoute,makeRouteState,advanceRoute} from './route-motion.js?v=678b68d9df9d';
import {gameMaterial,characterMaterial} from './game-material.js?v=678b68d9df9d';
import {villageFriendPlaces} from './friend-places.js?v=678b68d9df9d';
import {makeRoyalOutfit} from './royal-outfit.js?v=678b68d9df9d';
import {createFollower,groundPatch,forwardSlope} from './friend-locomotion.js?v=678b68d9df9d';
import {villageTrafficSafety} from './friend-traffic.js?v=678b68d9df9d';
import {createWaterResidents} from './water-residents.js?v=678b68d9df9d';
import {createPoVariantCrowd} from './po-variants.js?v=678b68d9df9d';
import {createStatuePlay} from './statue-play.js?v=678b68d9df9d';

// Shared real-rig deformation, independent animation clocks and ground routes.
export async function createAnimatedFriends(scene,gltf,city,config,meta,hero,traffic,waterGltf,characterConfig,variantLibrary=[]){
 const data=new Uint16Array(await fetch(meta.texture).then(r=>{if(!r.ok)throw Error('친구들의 동작을 불러오지 못했습니다.');return r.arrayBuffer();})),texture=new T.DataTexture(data,meta.width,meta.height,T.RGBAFormat,T.HalfFloatType);texture.minFilter=texture.magFilter=T.NearestFilter;texture.needsUpdate=true;texture.generateMipmaps=false;
 let normalTexture=null;if(meta.normals){const bytes=new Uint8Array(await fetch(meta.normals).then(r=>r.arrayBuffer()));normalTexture=new T.DataTexture(bytes,meta.width,meta.height,T.RGBAFormat);normalTexture.minFilter=normalTexture.magFilter=T.NearestFilter;normalTexture.generateMipmaps=false;normalTexture.needsUpdate=true;}
 let seed=config.seed,source=null;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};gltf.scene.traverse(o=>{if(o.isSkinnedMesh)source=o;});if(!source)throw Error('새 캐릭터의 리그를 찾을 수 없습니다.');
 const geo=source.geometry.clone();geo.applyMatrix4(new T.Matrix4().fromArray(meta.normalize).multiply(new T.Matrix4().fromArray(meta.meshMatrix)));geo.setAttribute('aVertex',new T.BufferAttribute(Float32Array.from({length:meta.vertexCount},(_,i)=>i),1));const clocks=new Float32Array(config.count*4),transitions=new Float32Array(config.count*2),previousClocks=new Float32Array(config.count*4),poseMixes=new Float32Array(config.count).fill(1);geo.setAttribute('aPrevious',new T.InstancedBufferAttribute(previousClocks,4));geo.setAttribute('aPoseMix',new T.InstancedBufferAttribute(poseMixes,1));geo.setAttribute('aTransition',new T.InstancedBufferAttribute(transitions,2));geo.setAttribute('aAnimation',new T.InstancedBufferAttribute(clocks,4));
 const material=normalTexture?characterMaterial(source.material):gameMaterial(source.material,true),clock={value:0};
 material.onBeforeCompile=s=>{
  Object.assign(s.uniforms,{avatarVAT:{value:texture},avatarTextureSize:{value:new T.Vector2(meta.width,meta.height)},avatarVertexCount:{value:meta.vertexCount},avatarTime:clock,idleStart:{value:meta.clips.idle.start},idleCount:{value:meta.clips.idle.count}});
  let prefix=`attribute float aVertex;attribute vec4 aAnimation,aPrevious;attribute vec2 aTransition;attribute float aPoseMix;
   uniform float idleStart,idleCount,avatarVertexCount,avatarTime;uniform sampler2D avatarVAT;uniform vec2 avatarTextureSize;
   vec2 avatarUV(float frame){float i=frame*avatarVertexCount+aVertex;return (vec2(mod(i,avatarTextureSize.x),floor(i/avatarTextureSize.x))+.5)/avatarTextureSize;}
   vec3 avatarPosition(vec4 clip){float f=mod(avatarTime*clip.z+clip.w,clip.y);return mix(texture2D(avatarVAT,avatarUV(clip.x+floor(f))).xyz,texture2D(avatarVAT,avatarUV(clip.x+mod(floor(f)+1.,clip.y))).xyz,fract(f));}
  `;
  if(normalTexture){s.uniforms.avatarNormals={value:normalTexture};prefix+=`uniform sampler2D avatarNormals;
   vec3 avatarNormal(vec4 clip){float f=mod(avatarTime*clip.z+clip.w,clip.y);return mix(texture2D(avatarNormals,avatarUV(clip.x+floor(f))).xyz*2.-1.,texture2D(avatarNormals,avatarUV(clip.x+mod(floor(f)+1.,clip.y))).xyz*2.-1.,fract(f));}
   vec3 safeNormal(vec3 n){return n*inversesqrt(max(dot(n,n),.00001));}
  `;s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`vec3 objectNormal=avatarNormal(aAnimation);if(aPoseMix<.999)objectNormal=mix(avatarNormal(aPrevious),objectNormal,aPoseMix);if(aTransition.y<.999)objectNormal=mix(avatarNormal(vec4(idleStart,idleCount,0.,aTransition.x)),objectNormal,aTransition.y);objectNormal=safeNormal(objectNormal);`);}
  s.vertexShader=prefix+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=avatarPosition(aAnimation);if(aPoseMix<.999)transformed=mix(avatarPosition(aPrevious),transformed,aPoseMix);if(aTransition.y<.999)transformed=mix(avatarPosition(vec4(idleStart,idleCount,0.,aTransition.x)),transformed,aTransition.y);`);
 };material.customProgramCacheKey=()=> 'stable-po-v21-'+meta.version;
 // Keep continuous Lambert light on Po. Sampling the coarse scene shadow map
 // across animated white skin causes crawling/alternating dark surface bands.
 // Ground contact shadows remain separate and the real hero still casts.
 const mesh=new T.InstancedMesh(geo,material,config.count);mesh.name='animated-hidden-friends';mesh.castShadow=false;mesh.receiveShadow=false;mesh.boundingSphere=new T.Sphere(new T.Vector3(0,10,0),155);scene.add(mesh);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const context=shadowCanvas.getContext('2d'),fade=context.createRadialGradient(32,32,2,32,32,31);fade.addColorStop(0,'rgba(35,39,48,.34)');fade.addColorStop(.55,'rgba(35,39,48,.16)');fade.addColorStop(1,'rgba(35,39,48,0)');context.fillStyle=fade;context.fillRect(0,0,64,64);const shadows=new T.InstancedMesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),config.count);shadows.boundingSphere=mesh.boundingSphere.clone();scene.add(shadows);
 const guide=new T.Object3D(),placements=[],roots=new Array(config.count),routes=city.paths.map(makeRoute);
 const places=villageFriendPlaces(scene,city,random),roofCount=Math.min(20,places.roofCount),heroId=config.count-1,movingCount=36;
 for(let i=0;i<config.count;i++){
  const isHero=i===heroId,moving=i<movingCount,roof=i>=movingCount&&i<movingCount+roofCount;
  const pose=isHero?'idle':moving?(i%9===0?'desperate':i%3===0?'run':'walk'):'idle';
  const p={id:i,name:'Po',pose,height:isHero?hero.height:1.55+random()*.26,yaw:random()*Math.PI*2,position:[0,0,0],phase:random()*Math.PI*2,clockOffset:random()*20,home:false,hero:isHero,zone:'오솔길'};
  if(moving){p.route=i%routes.length;p.speed=pose==='desperate'?1.95:pose==='run'?1.75:.85;p.movement=makeRouteState(routes[p.route],p.phase/(Math.PI*2),i%2?1:-1);p.yaw=p.movement.yaw;p.animationFrame=p.clockOffset*meta.clips[pose].fps;}
  else if(isHero){p.position=hero.root.position.toArray();p.zone='작업실';}
  else{const place=roof?places.takeRoof():places.takeGround(true);p.position=[place.x,place.y,place.z];p.zone=place.zone;p.surfaceY=place.y;p.flat=place.flat??groundPatch(city.height,place.x,place.z).flat;p.roof=place.zone==='지붕';if(p.roof)p.yaw=place.yaw+Math.PI*.5;p.home=Math.hypot(place.x,place.z)<25;}
  roots[i]=new T.Matrix4();placements.push(p);const clip=meta.clips[pose];clocks.set([clip.start,clip.count,moving?0:clip.fps,p.clockOffset*clip.fps],i*4);transitions.set([0,moving?0:1],i*2);
 }
 const statuePerson=placements[Math.max(56,config.count-8)];statuePerson.statue=true;
 let statuePlay=null;
 const waterResidents=waterGltf&&city.swimmingBay?createWaterResidents(scene,waterGltf,city,placements,characterConfig):null;
 // Short terrain-checked outings let mountain/coastal friends move without
 // being routed down a cliff. Most now take longer, more frequent outings.
 const safeGround=villageTrafficSafety(city);
 for(const p of placements){if(p.hero||p.roof||p.water||p.statue||p.route!==undefined||(p.flat&&p.id%11===0))continue;let best=null,bestLength=0;
  for(const r of [6,3.8,2.0,1.1]){for(let n=0;n<12;n++){const angle=p.yaw+n*Math.PI/6,dx=Math.cos(angle),dz=Math.sin(angle),steps=[];let valid=true,lastY=p.position[1]-.035;
   const count=Math.ceil(r/.25);for(let j=0;j<=count;j++){const x=p.position[0]+dx*r*j/count,z=p.position[2]+dz*r*j/count,y=city.height(x,z);if(!safeGround(x,z,{radius:p.height*.34+.06})||Math.abs(y-lastY)>.20||Math.abs(y-p.position[1])>1.0){valid=false;break;}lastY=y;steps.push({x,z});}
   if(valid&&r>bestLength){best=steps;bestLength=r;}}if(best)break;}
  if(best){p.localRoute=best;p.pose=bestLength>3.5&&p.flat&&p.id%6===0?'run':'walk';p.speed=p.pose==='run'?1.18:.48+(p.id%4)*.055;p.roaming=true;p.animationFrame=p.clockOffset*meta.clips[p.pose].fps;clocks.set([meta.clips[p.pose].start,meta.clips[p.pose].count,0,p.animationFrame],p.id*4);transitions.set([0,0],p.id*2);}
 }
 // Only rest on flat surfaces; only hang where a real grounded support exists.
 let hangingCount=0,restCount=0;
 for(const p of placements){if(p.hero||p.statue||p.route!==undefined||p.localRoute||p.water||!p.flat)continue;
  if(!p.roof&&hangingCount<3&&restCount++%5===0){p.pose='hang';p.position[1]+=.35;p.grip=true;hangingCount++;}
  else if(!p.roof&&restCount%3===0)p.pose='lie';else if(restCount%2===0||p.roof)p.pose='sit';
  const c=meta.clips[p.pose];clocks.set([c.start,c.count,c.fps,p.clockOffset*c.fps],p.id*4);transitions.set([0,1],p.id*2);
 }
 const distribution={};for(const p of placements)distribution[p.zone]=(distribution[p.zone]||0)+1;
 const supports=[];for(const p of placements.filter(p=>p.grip)){const base=city.height(p.position[0],p.position[2]),grip=meta.clips.hang.grip||.68,front=meta.clips.hang.gripForward||.17,top=p.position[1]+grip*p.height,x=p.position[0]+Math.cos(p.yaw)*front*p.height,z=p.position[2]-Math.sin(p.yaw)*front*p.height;for(const side of [-1,1])supports.push({x:x+Math.sin(p.yaw)*side*.65,y:(base+top)/2,z:z+Math.cos(p.yaw)*side*.65,sx:.11,sy:top-base,sz:.11,yaw:p.yaw});supports.push({x,y:top,z,sx:.11,sy:.11,sz:1.5,yaw:p.yaw});}
 const supportMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),gameMaterial({color:'#ad8a5c'}),supports.length);for(const [i,p]of supports.entries()){guide.position.set(p.x,p.y,p.z);guide.rotation.set(0,p.yaw,0);guide.scale.set(p.sx,p.sy,p.sz);guide.updateMatrix();supportMesh.setMatrixAt(i,guide.matrix);}supportMesh.receiveShadow=true;supportMesh.computeBoundingSphere();scene.add(supportMesh);
 const royal=makeRoyalOutfit(scene),hat=royal.crown;
 const ring=new T.Mesh(new T.TorusGeometry(1,.025,6,40),gameMaterial({color:'#f4cb63'}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 const eligible=placements.filter(p=>!p.hero&&!p.water&&!['lie','hang','sit'].includes(p.pose)).map(p=>p.id);let target=eligible.includes(config.targetIndex)?config.targetIndex:eligible[0],round=0,found=false,lastTime=0;const localCap=new T.Vector3(),point=new T.Vector3(),center=new T.Vector3(),sphere=new T.Sphere(),up=new T.Vector3(0,1,0),capQ=new T.Quaternion(),yawQ=new T.Quaternion(),capEuler=new T.Euler();
 const variants=createPoVariantCrowd(scene,variantLibrary,placements,clocks,transitions,previousClocks,poseMixes,target);
 // Keep logical IDs stable for traffic/picking, but draw only the remaining
 // base skins. Zero-scale replacements still execute the expensive VAT shader.
 const baseMembers=placements.filter(p=>!p.hero&&!p.water&&!p.variant),drawClocks=new Float32Array(baseMembers.length*4),drawPrevious=new Float32Array(baseMembers.length*4),drawTransitions=new Float32Array(baseMembers.length*2),drawMixes=new Float32Array(baseMembers.length);
 for(const [i,p]of baseMembers.entries())p.vatInstance=i;mesh.count=baseMembers.length;
 geo.setAttribute('aAnimation',new T.InstancedBufferAttribute(drawClocks,4));geo.setAttribute('aPrevious',new T.InstancedBufferAttribute(drawPrevious,4));geo.setAttribute('aTransition',new T.InstancedBufferAttribute(drawTransitions,2));geo.setAttribute('aPoseMix',new T.InstancedBufferAttribute(drawMixes,1));
 if(variants.hasCrown){royal.crown.visible=false;royal.cape.visible=false;}
 previousClocks.set(clocks);
 // Register every visible body once; the hero is registered separately.
 for(const p of placements){
  if(p.water||p.statue)continue;
  if(p.route!==undefined||p.localRoute){p.follower=createFollower(traffic,p.localRoute||city.paths[p.route],{id:p.id,height:p.height,fraction:p.localRoute?0:p.phase/(Math.PI*2),direction:p.localRoute?1:p.id%2?1:-1,speedMultiplier:characterConfig.speedMultiplier});p.movement=p.follower.state;p.position=[p.follower.body.x,p.follower.body.y+.035,p.follower.body.z];}
  else if(!p.hero)traffic.add({id:p.id,x:p.position[0],y:p.position[1],z:p.position[2],height:p.height,radius:p.height*(p.pose==='lie'?.63:.34)+.06,movable:false});
 }
 for(const p of placements)if(p.follower){p.basePose=p.pose;p.animationMix=0;p.poseMix=1;p.modeWait=0;}
 const sourceMeta=meta;
 function prepare(dt,t){for(const p of placements)if(p.follower){const phase=(t+p.id*3.73)%30;p.follower.prepare(dt,p.social||p.roaming&&phase<5?0:p.speed);}}
 function sampleRoute(p,dt,t){const meta=p.variantMeta||sourceMeta,point=p.follower.finish(dt),angle=Math.atan2(Math.sin(point.yaw-p.yaw),Math.cos(point.yaw-p.yaw)),turnRate=dt>0?Math.abs(angle)/dt:0,turning=!!meta.clips.turn&&point.speed<.09&&turnRate>.25;
  const slope=forwardSlope(city.height,point.x,point.z,point.yaw);p.sliding=p.id%8===0&&(p.sliding?point.speed>.12&&slope<-.14:point.speed>.2&&slope<-.28);const sliding=p.sliding;p.slideAge=sliding?(p.slideAge||0)+dt:0;
  const mode=turning?'turn':p.pose==='turn'&&point.speed<.10&&p.animationMix>.05?'turn':sliding?(meta.clips.slide_enter&&p.slideAge<meta.clips.slide_enter.duration+.16?'slide_enter':'slide'):p.basePose;
  if(mode!==p.pose){if(p.pendingMode!==mode){p.pendingMode=mode;p.modeWait=0;}p.modeWait+=dt;
   if(p.modeWait>.12&&p.poseMix>.95){const old=meta.clips[p.pose];p.previousPose=p.pose;p.previousFrame=p.animationFrame;previousClocks.set([old.start,old.count,0,p.previousFrame],p.id*4);p.pose=mode;const c=meta.clips[mode];p.animationFrame=c.loop===false?0:(p.previousFrame/old.count)*c.count;p.poseMix=0;p.modeWait=0;clocks.set([c.start,c.count,0,p.animationFrame],p.id*4);}}
  else{p.pendingMode=mode;p.modeWait=0;}
  p.poseMix=Math.min(1,p.poseMix+dt/.30);poseMixes[p.id]=p.poseMix;
  if(p.previousPose&&p.poseMix<1){const old=meta.clips[p.previousPose];const next=p.previousFrame+(old.nativeSpeed?point.travel/(old.nativeSpeed*p.height)*old.fps:dt*old.fps);p.previousFrame=old.loop===false?Math.min(old.count-1,next):next%old.count;previousClocks[p.id*4+3]=p.previousFrame;}
  const clip=meta.clips[p.pose],wanted=turning?1:p.pose==='turn'?0:point.motion;p.animationMix+=(wanted-p.animationMix)*(1-Math.exp(-dt*7));p.movement.motion=p.animationMix;
  p.position[0]=point.x;p.position[1]=point.y+.035;p.position[2]=point.z;p.yaw=point.yaw;
  const advance=p.pose==='turn'?dt*clip.fps*T.MathUtils.clamp(turnRate/.9,.6,2):['slide','slide_enter'].includes(p.pose)?dt*clip.fps:point.travel/Math.max(.001,(clip.nativeSpeed||.45)*p.height)*clip.fps;
  p.animationFrame=clip.loop===false?Math.min(clip.count-1,p.animationFrame+advance):(p.animationFrame+advance)%clip.count;clocks[p.id*4+3]=p.animationFrame;transitions[p.id*2]=(t*meta.clips.idle.fps+p.clockOffset)%meta.clips.idle.count;transitions[p.id*2+1]=p.animationMix;
 }
 function capAt(clip,frame,out){const a=Math.floor(frame)%clip.count,b=(a+1)%clip.count,u=frame-Math.floor(frame);out.set(T.MathUtils.lerp(clip.cap[a*3],clip.cap[b*3],u),T.MathUtils.lerp(clip.cap[a*3+1],clip.cap[b*3+1],u),T.MathUtils.lerp(clip.cap[a*3+2],clip.cap[b*3+2],u));}
 const restCap=new T.Vector3(),previousCap=new T.Vector3();
 function setHat(t){if(variants.hasCrown)return;const p=placements[target],clip=meta.clips[p.pose],rate=clocks[target*4+2],f=((t*rate+clocks[target*4+3])%clip.count+clip.count)%clip.count,a=Math.floor(f),b=(a+1)%clip.count,u=f-a;localCap.set(T.MathUtils.lerp(clip.cap[a*3],clip.cap[b*3],u),T.MathUtils.lerp(clip.cap[a*3+1],clip.cap[b*3+1],u),T.MathUtils.lerp(clip.cap[a*3+2],clip.cap[b*3+2],u));if(p.previousPose&&p.poseMix<1){capAt(meta.clips[p.previousPose],p.previousFrame,previousCap);localCap.lerp(previousCap,1-p.poseMix);}if(p.movement){capAt(meta.clips.idle,transitions[target*2],restCap);localCap.lerp(restCap,1-p.movement.motion);}hat.position.copy(localCap).applyMatrix4(roots[target]);hat.scale.setScalar(p.height);yawQ.setFromAxisAngle(up,p.yaw);capQ.setFromEuler(capEuler.fromArray(clip.capRotation));hat.quaternion.copy(yawQ).multiply(capQ);localCap.y-=.42;royal.cape.position.copy(localCap.applyMatrix4(roots[target]));royal.cape.scale.setScalar(p.height);royal.cape.quaternion.copy(hat.quaternion);royal.clock.value=t;}
 function update(t){const dt=Math.min(.05,Math.max(0,t-lastTime));lastTime=t;clock.value=t;waterResidents?.update(t);statuePlay?.update(t);for(const p of placements){if(p.hero){hero.root.position.toArray(p.position);p.yaw=hero.root.rotation.y;}if(p.follower)sampleRoute(p,dt,t);guide.position.fromArray(p.position);guide.rotation.set(0,p.yaw,0);guide.scale.setScalar(p.hero||p.water||p.social?0:p.height);guide.updateMatrix();roots[p.id].copy(guide.matrix);if(p.vatInstance!==undefined)mesh.setMatrixAt(p.vatInstance,guide.matrix);guide.position.y=(p.surfaceY??city.height(p.position[0],p.position[2]))+.055;guide.scale.set(p.hero||p.water||p.social?0:p.height*(p.pose==='lie'?1.12:.78),1,p.hero||p.water||p.social?0:p.height*.60);guide.updateMatrix();shadows.setMatrixAt(p.id,guide.matrix);}variants.update(t,roots);for(let i=0;i<baseMembers.length;i++){const id=baseMembers[i].id;for(let k=0;k<4;k++){drawClocks[i*4+k]=clocks[id*4+k];drawPrevious[i*4+k]=previousClocks[id*4+k];}drawTransitions[i*2]=transitions[id*2];drawTransitions[i*2+1]=transitions[id*2+1];drawMixes[i]=poseMixes[id];}geo.attributes.aPrevious.needsUpdate=true;geo.attributes.aPoseMix.needsUpdate=true;geo.attributes.aAnimation.needsUpdate=true;geo.attributes.aTransition.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;shadows.instanceMatrix.needsUpdate=true;setHat(t);if(found){ring.position.fromArray(placements[target].position);ring.position.y+=.05;}}
 update(0);
 // A generous body capsule keeps tiny moving friends easy to select. Occlusion
 // still uses the real terrain/GLBs, so friends cannot be selected through walls.
 mesh.raycast=(raycaster,hits)=>{for(const p of placements){if(p.hero)continue;center.fromArray(p.position);center.y+=p.water?p.height*.78:(p.variantMeta||meta).clips[p.pose].height*p.height*.5;if(p.water)center.y=p.waterY+.18;sphere.set(center,p.height*(p.water?.65:p.pose==='lie'?.52:.44));if(raycaster.ray.intersectSphere(sphere,point)){const distance=point.distanceTo(raycaster.ray.origin);if(distance>=raycaster.near&&distance<=raycaster.far)hits.push({distance,point:point.clone(),object:mesh,instanceId:p.id});}}};
 const occluders=[];scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&o!==mesh&&!variants.batches.includes(o)&&o!==ring&&o.renderOrder!==-100&&!royal.pickMeshes.includes(o)&&!o.material?.transparent)occluders.push(o);});
 function visible(raycaster,distance){const oldFar=raycaster.far;raycaster.far=distance-.08;const blocked=raycaster.intersectObjects(occluders,false).length>0;raycaster.far=oldFar;return !blocked;}
 function pick(raycaster){const hits=raycaster.intersectObjects(variants.hasCrown?[mesh]:[mesh,...royal.pickMeshes],false);for(const hit of hits){if(!visible(raycaster,hit.distance))continue;const p=hit.object===mesh?placements[hit.instanceId]:placements[target];return {correct:p.id===target,person:p,distance:hit.distance};}return null;}
 function foundTarget(){found=true;ring.visible=false;}
 return {get statuePlay(){return statuePlay;},attachStatue(statue,material){const old=statuePerson.zone;statuePlay=createStatuePlay(scene,statue,material,statuePerson,meta,clocks,previousClocks,poseMixes,transitions);distribution[old]--;distribution[statuePerson.zone]=1;statue.traverse(o=>{if(o.isMesh)occluders.push(o);});occluders.push(statuePlay.rail);update(lastTime);},variants,renderCounts:{baseVAT:baseMembers.length,variants:Object.values(variants.counts).reduce((a,b)=>a+b,0),water:waterResidents?.count||0,hero:1},waterResidents,source,vatData:data,placements,batches:[mesh,...variants.batches],count:placements.length,distribution,hat,royal,fullDetail:true,localRoamers:placements.filter(p=>p.roaming).length,activePoses:[...new Set(placements.map(p=>p.pose))],animated:true,pick,visible,foundTarget,prepare,update,getTarget:()=>placements[target],hint:()=>({position:placements[target].position.slice(),home:placements[target].home,zone:placements[target].zone}),reset(){if(variants.hasCrown){found=false;ring.visible=false;return;}target=eligible[(eligible.indexOf(config.targetIndex)+(++round)*31+eligible.length)%eligible.length];found=false;ring.visible=false;setHat(lastTime);}};
}
