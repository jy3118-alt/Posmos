import * as T from 'three';

const smooth=u=>{u=T.MathUtils.clamp(u,0,1);return u*u*(3-2*u);};

// One existing logical Po slot. A small supported deck inside the crown keeps
// a short Po visible above its tall rim and gives lying/running a safe surface.
export function createStatuePlay(scene,statue,material,p,meta,clocks,previous,mixes,transitions){
 statue.updateMatrixWorld(true);
 const ray=new T.Raycaster(),origin=new T.Vector3(),down=new T.Vector3(0,-1,0),point=new T.Vector3();
 const scale=statue.scale.x,heading=statue.rotation.y;
 function world(x,y,z,out=point){return out.set(x/scale,y/scale,z/scale).applyMatrix4(statue.matrixWorld);}
 let deck=null;
 function height(x,z){world(x,40,z,origin);ray.set(origin,down);const hit=ray.intersectObjects(deck?[statue,deck]:[statue],true)[0];if(!hit)throw Error('동상 위의 발 디딜 곳을 찾지 못했습니다.');return hit.point.y;}
 const deckCenter=world(1.5,32.9,-1.35,new T.Vector3()),legs=[];
 for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const x=1.5+1.4*Math.cos(a),z=-1.35+1.4*Math.sin(a),base=height(x,z);world(x,0,z);const column=new T.Mesh(new T.CylinderGeometry(.10,.13,deckCenter.y-base,8),material);column.position.set(point.x,(base+deckCenter.y)/2,point.z);column.castShadow=column.receiveShadow=true;scene.add(column);legs.push(column);}
 deck=new T.Mesh(new T.CylinderGeometry(2.25,2.18,.18,48),material);deck.name='supported-crown-play-deck';deck.position.copy(deckCenter).y-=.09;deck.castShadow=deck.receiveShadow=true;scene.add(deck);deck.updateMatrixWorld(true);
 const route=[];
 for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,x=1.5+.80*Math.cos(a),z=-1.35+.82*Math.sin(a);world(x,0,z);route.push(new T.Vector3(point.x,height(x,z)+.025,point.z));}
 const resting=world(1.5,0,-1.35,new T.Vector3());resting.y=height(1.5,-1.35)+.08;
 const barLocal={x:1.8,z:-.30},gripY=height(barLocal.x,barLocal.z)+1.68;
 const pieces=[],guide=new T.Object3D(),railWidth=1.65;
 for(const side of [-1,1]){const z=barLocal.z+side*railWidth/2,base=height(barLocal.x,z);world(barLocal.x,0,z);pieces.push({x:point.x,y:(base+gripY)/2,z:point.z,sx:.065,sy:gripY-base,sz:.065});}
 world(barLocal.x,0,barLocal.z);pieces.push({x:point.x,y:gripY,z:point.z,sx:.065,sy:.065,sz:railWidth+.08});
 const rail=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,pieces.length);rail.name='crown-play-grip';
 for(const [i,v]of pieces.entries()){guide.position.set(v.x,v.y,v.z);guide.rotation.y=heading;guide.scale.set(v.sx,v.sy,v.sz);guide.updateMatrix();rail.setMatrixAt(i,guide.matrix);}rail.castShadow=rail.receiveShadow=true;rail.computeBoundingSphere();scene.add(rail);
 const grip=world(barLocal.x,0,barLocal.z,new T.Vector3());grip.y=gripY;
 const hanging=grip.clone(),front=(meta.clips.hang.gripForward||.09)*p.height;
 hanging.x-=Math.cos(heading)*front;hanging.z+=Math.sin(heading)*front;hanging.y-=(meta.clips.hang.grip||.646)*p.height;
 const arrival=route[0],lastPosition=arrival.clone();let lastPose=null,poseAge=1,lastT=0,frame=0,runFrame=0,walkFrame=0;
 p.position=arrival.toArray();p.surfaceY=arrival.y;p.zone='왕관 동상';p.roof=true;p.flat=false;p.pose='run';p.yaw=heading;
 function pose(name,desiredFrame,dt){
  const clip=meta.clips[name];
  if(name!==lastPose){const old=meta.clips[lastPose||'idle'];previous.set([old.start,old.count,0,frame],p.id*4);poseAge=0;lastPose=name;}
  poseAge=Math.min(1,poseAge+dt/.24);mixes[p.id]=smooth(poseAge);frame=desiredFrame;
  clocks.set([clip.start,clip.count,0,desiredFrame],p.id*4);transitions[p.id*2+1]=1;p.pose=name;p.animationFrame=desiredFrame;
 }
 function routeAt(u,out){const f=((u%1)+1)%1*96,i=Math.floor(f);return out.lerpVectors(route[i],route[i+1],f-i);}
 function update(t){
  const dt=Math.max(0,Math.min(.05,t-lastT));lastT=t;const q=t%48;
  let name='run',f=t*meta.clips.run.fps,hop=0;
  if(q<12){routeAt(q/6,point);}
  else if(q<15){point.lerpVectors(arrival,resting,smooth((q-12)/3));name='walk';f=t*meta.clips.walk.fps;}
  else if(q<29){point.copy(resting);name='lie';f=(q-15)/14*(meta.clips.lie.count-1);}
  else if(q<32){point.lerpVectors(resting,arrival,smooth((q-29)/3));name='walk';f=t*meta.clips.walk.fps;}
  else if(q<34){const u=smooth((q-32)/2);point.lerpVectors(arrival,hanging,u);hop=Math.sin(u*Math.PI)*.42;name='hang';f=0;}
  else if(q<40){point.copy(hanging);name='hang';f=(q-34)*meta.clips.hang.fps;}
  else if(q<42){const u=smooth((q-40)/2);point.lerpVectors(hanging,arrival,u);hop=Math.sin(u*Math.PI)*.38;name='hang';f=(q-40)*meta.clips.hang.fps;}
  else{routeAt((q-42)/6,point);}
  point.y+=hop;
  const dx=point.x-lastPosition.x,dz=point.z-lastPosition.z,travel=Math.hypot(dx,dz);
  if(name==='run'){runFrame+=travel/(meta.clips.run.nativeSpeed*p.height)*meta.clips.run.fps;f=runFrame;}
  if(name==='walk'){walkFrame+=travel/(meta.clips.walk.nativeSpeed*p.height)*meta.clips.walk.fps;f=walkFrame;}
  let yaw=Math.hypot(dx,dz)>.0001?Math.atan2(-dz,dx):p.yaw;
  if(q>=31.5&&q<42)yaw=heading;
  p.yaw+=T.MathUtils.clamp(Math.atan2(Math.sin(yaw-p.yaw),Math.cos(yaw-p.yaw)),-dt*2.2,dt*2.2);
  if(t===0)p.yaw=heading-Math.PI/2;
  point.toArray(p.position);p.surfaceY=q>=32&&q<42?gripY-1.68:point.y;lastPosition.copy(point);
  pose(name,f%meta.clips[name].count,dt);
  p.statueActivity=q>=32&&q<34?'jump':q>=34&&q<40?'hang':q>=40&&q<42?'land':name;
 }
 update(0);
 return {person:p,rail,deck,legs,route,grip,hanging,update,diagnostics:()=>({id:p.id,activity:p.statueActivity,position:p.position,pose:p.pose,grip:grip.toArray(),height:p.height})};
}
