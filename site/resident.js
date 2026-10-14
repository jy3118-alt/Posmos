import * as T from 'three';
const ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const diff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

// Real Tripo bones and skin, existing walk plus locally baked run/step-turn clips.
export function createResident(scene,gltf,config,chest,groundHeight,{say,onActivity,reduced=false,initialPose=null}){
 const model=gltf.scene;model.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=config.height/size.y;
 const bones=[],meshes=[];model.traverse(n=>{if(n.isBone)bones.push(n);if(n.isMesh){meshes.push(n);n.castShadow=true;n.receiveShadow=true;if(n.isSkinnedMesh)n.frustumCulled=false;}});
 const find=s=>bones.find(n=>n.name.endsWith(s)),hip=find('0_Left_Limb_0');
 const hipPoint=hip?hip.getWorldPosition(new T.Vector3()):new T.Vector3(center.x,box.min.y,center.z);
 const root=new T.Group(),bodyPivot=new T.Group();root.name=config.id;root.add(bodyPivot);bodyPivot.add(model);root.scale.setScalar(scale);scene.add(root);
 bodyPivot.position.set(hipPoint.x-center.x,hipPoint.y-box.min.y,hipPoint.z-center.z);
 model.position.sub(new T.Vector3(center.x,box.min.y,center.z)).sub(bodyPivot.position);root.updateMatrixWorld(true);
 const snapshots=bones.map(bone=>({bone,q:bone.quaternion.clone(),p:bone.position.clone()})),bind=new Map(snapshots.map(v=>[v.bone,v]));
 const q=new T.Quaternion(),inverse=new T.Quaternion(),zero=new T.Vector3(),vertex=new T.Vector3();
 function axis(bone,a){return bone?new T.Vector3(...a).applyQuaternion(bone.parent.getWorldQuaternion(inverse).invert()):null;}
 const legs=[['0_Left_Limb_0',config.hipAngle],['0_Right_Limb_0',config.hipAngle],['0_Left_Limb_1',config.kneeAngle],['0_Right_Limb_1',config.kneeAngle]].map(([name,angle])=>{const bone=find(name);return bone?{bone,axis:axis(bone,[0,0,1]),angle,q:null}:null;}).filter(Boolean);
 for(const leg of legs)leg.q=new T.Quaternion().setFromAxisAngle(leg.axis,leg.angle).multiply(bind.get(leg.bone).q);
 const head=find('Head_1'),headTop=find('Head_2')||head,spine=find('Spine_1');
 const headAxis=axis(head,[0,1,0]),spineYaw=axis(spine,[0,1,0]),spinePitch=axis(spine,[0,0,1]),spineBank=axis(spine,[1,0,0]);
 const arms=[find('bone_6'),find('bone_13')].map((bone,i)=>bone?{bone,side:i===0?1:-1,x:axis(bone,[1,0,0]),z:axis(bone,[0,0,1])}:null).filter(Boolean);
 const feet=[find('0_Left_Limb_2'),find('0_Right_Limb_2')];
 const settings=config.behavior,seat=new T.Vector3(config.position[0],chest.position[1]+chest.height-bodyPivot.position.y*scale+config.seatClearance,config.position[2]);
 const stand=new T.Vector3(settings.standPosition[0],groundHeight(...settings.standPosition)+.025,settings.standPosition[1]);
 const bed=new T.Vector3(settings.loungePosition[0],groundHeight(...settings.loungePosition),settings.loungePosition[1]);
 const mixer=new T.AnimationMixer(model),walkClip=gltf.animations.find(c=>c.name===settings.walkClip),runClip=gltf.animations.find(c=>c.name==='Run_Local_Prototype'),turnClip=gltf.animations.find(c=>c.name==='StepTurn_Local_Prototype');
 const walk=walkClip?mixer.clipAction(walkClip).play():null,run=runClip?mixer.clipAction(runClip).play():null,step=turnClip?mixer.clipAction(turnClip).play():null;
 for(const action of [walk,run,step])if(action)action.setEffectiveWeight(0);
 const baselineWalk=walkClip?.duration ? (settings.gait?.walkStride||.09)/(settings.gait?.walkStance||.60)/walkClip.duration*scale:settings.walkSpeed;
 const baselineRun=runClip?.duration ? (settings.gait?.runStride||.14)/(settings.gait?.runStance||.42)/runClip.duration*scale:settings.runSpeed;
 function resetBones(){for(const v of snapshots){v.bone.quaternion.copy(v.q);v.bone.position.copy(v.p);}}
 function anglePose(bone,a,angle,weight=1){if(!bone)return;q.setFromAxisAngle(a,angle).multiply(bind.get(bone).q);bone.quaternion.slerp(q,weight);}
 function loungePose(t){
  const bend=ease(t/.30),lean=ease((t-.22)/.62),settle=ease((t-.63)/.37);
  bodyPivot.rotation.z=lean*Math.PI/2;
  for(let i=0;i<legs.length;i++)anglePose(legs[i].bone,legs[i].axis,i<2?bend*(1.32-settle*1.12):-bend*(1.88-settle*1.38));
  for(const arm of arms){anglePose(arm.bone,arm.x,arm.side*.20*bend);q.setFromAxisAngle(arm.z,-.48*bend*(1-settle));arm.bone.quaternion.premultiply(q);}
 }
 // Sample exact deformed minima during initial loading, never scan vertices during animation.
 const floorSamples=new Float32Array(21),meshBounds=new Map(meshes.map(mesh=>[mesh,new T.Box3()]));
 for(let i=0;i<floorSamples.length;i++){
  resetBones();loungePose(i/(floorSamples.length-1));root.updateMatrixWorld(true);let min=Infinity;
  for(const mesh of meshes){const position=mesh.geometry.attributes.position;for(let v=0;v<position.count;v++){mesh.getVertexPosition(v,vertex);meshBounds.get(mesh).expandByPoint(vertex);vertex.applyMatrix4(mesh.matrixWorld);min=Math.min(min,vertex.y);}}
  floorSamples[i]=-min+.015;
 }
 for(const mesh of meshes)if(mesh.isSkinnedMesh){mesh.boundingSphere=meshBounds.get(mesh).getBoundingSphere(new T.Sphere());mesh.boundingSphere.radius+=.08;}
 resetBones();bodyPivot.rotation.z=0;
 function loungeFloor(t){const f=T.MathUtils.clamp(t,0,1)*(floorSamples.length-1),i=Math.min(floorSamples.length-2,Math.floor(f));return T.MathUtils.lerp(floorSamples[i],floorSamples[i+1],f-i);}

 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,31);gradient.addColorStop(0,'rgba(41,32,72,.55)');gradient.addColorStop(.5,'rgba(41,32,72,.25)');gradient.addColorStop(1,'rgba(41,32,72,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const shadow=new T.Mesh(new T.PlaneGeometry(.94,.67),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.6,polygonOffset:true,polygonOffsetFactor:-1}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const labels={rest:'풍경을 바라보는 중',rise:'잠깐 일어나는 중',turn:'발걸음으로 방향을 바꾸는 중',travel:'천천히 산책하는 중',jog:'가볍게 뛰는 중',gaze:'풍경을 바라보는 중',home:'쉼터로 돌아오는 중',sit:'다시 앉는 중',down:'편하게 눕는 중',lie:'누워서 하늘을 보는 중',up:'천천히 일어나는 중'};
 let phase='rest',elapsed=0,restDuration=settings.initialRestSeconds,autoIndex=0,journeyIndex=0,intent='walk',afterUp='home',afterTurn=null;
 let seatWeight=1,layProgress=0,upFrom=1,headingError=0,yawVelocity=0,motionWeight=0,turnWeight=0,runWeight=0,currentSpeed=0;
 let speechTime=0,speechDeadline=7,nextSpeech=27,speechIndex=0;
 const transitionFrom=new T.Vector3(),anchor=new T.Vector3(),footPosition=new T.Vector3();let support=-1;
 const ahead=new T.Vector3(),pathPoint=new T.Vector3();let pathSamples=null,pathLength=0,pathDistance=0,pathMode='walk',pathFinish='gaze';
 function talk(text){if(settings.speechEnabled===false)return;say(text);speechDeadline=speechTime+6;nextSpeech=speechTime+27;}
 function enter(value){phase=value;elapsed=0;onActivity(labels[value]);}
 function startTurn(yaw,callback){currentSpeed=0;if(Math.abs(diff(root.rotation.y,yaw))<.14){callback();return;}headingError=diff(root.rotation.y,yaw);afterTurn={yaw,callback};support=-1;step?.reset().play();enter('turn');}
 function steer(yaw,dt){headingError=diff(root.rotation.y,yaw);const limit=1.35*(settings.turnSpeedMultiplier||1),desired=T.MathUtils.clamp(headingError*4,-limit,limit);yawVelocity=T.MathUtils.lerp(yawVelocity,desired,1-Math.exp(-dt*7));const amount=Math.min(Math.abs(headingError),Math.abs(yawVelocity*dt));root.rotation.y+=Math.sign(headingError)*amount;}
 function curveSample(distance,out){const f=T.MathUtils.clamp(distance/pathLength,0,1)*100,i=Math.min(99,Math.floor(f)),a=i*3,b=a+3,t=f-i;out.set(T.MathUtils.lerp(pathSamples[a],pathSamples[b],t),0,T.MathUtils.lerp(pathSamples[a+2],pathSamples[b+2],t));}
 function startPath(points,mode,finish){
  const first=points.find(p=>Math.hypot(root.position.x-p[0],root.position.z-p[1])>.12);if(!first){finishPath(finish);return;}
  const yaw=Math.atan2(-(first[1]-root.position.z),first[0]-root.position.x);
  startTurn(yaw,()=>{
   const vectors=[new T.Vector3(root.position.x,0,root.position.z),...points.map(p=>new T.Vector3(p[0],0,p[1]))],curve=new T.CatmullRomCurve3(vectors,false,'centripetal');pathLength=curve.getLength();pathSamples=new Float32Array(303);curve.getSpacedPoints(100).forEach((p,i)=>{pathSamples.set([p.x,0,p.z],i*3);});pathDistance=0;pathMode=mode;pathFinish=finish;currentSpeed=0;enter(finish==='sit'?'home':mode==='run'?'jog':'travel');
  });
 }
 function routeHome(){intent='home';talk('다시 앉아서 조금 더 바라볼까.');startPath(settings.homePath,'walk','sit');}
 function finishPath(finish){
  if(finish==='sit')startTurn(config.yaw,()=>{transitionFrom.copy(root.position);enter('sit');});
  else if(finish==='lie')startTurn(settings.loungeYaw??config.yaw,()=>{root.position.x=bed.x;root.position.z=bed.z;layProgress=0;enter('down');talk('하늘을 보면서 잠깐 쉬어야지.');});
  else startTurn(config.yaw,()=>{enter('gaze');talk('조금 더 바라보고 싶다.');});
 }
 function startJourney(kind){
  intent=kind;
  if(kind==='home'){routeHome();return;}
  const hub=settings.hubPosition;
  if(kind==='lie'){const points=[[...hub],[bed.x,bed.z]];startPath(points,'walk','lie');return;}
  const routes=settings.outPaths||[settings.outPath],route=routes[journeyIndex++%routes.length];
  const points=root.position.z>1.4?[hub,...route]:route;talk(kind==='run'?'붓을 따라 조금 더 멀리 뛰어볼까.':'화실을 한 바퀴 돌아볼까.');startPath(points,kind==='run'?'run':'walk','gaze');
 }
 function beginUp(next='home'){afterUp=next;upFrom=layProgress;enter('up');}
 function request(kind){
  if(kind==='home'){
   restDuration=settings.restSeconds;
   if(phase==='rest'){elapsed=0;return;}
   if(phase==='lie'||phase==='down'){beginUp();return;}
   if(phase==='up'){afterUp='home';return;}
   if(phase==='rise'){intent='home';return;}
   if(phase!=='sit')routeHome();return;
  }
  if(phase==='rest'){intent=kind;transitionFrom.copy(root.position);enter('rise');return;}
  if(phase==='rise'){intent=kind;return;}
  if(phase==='lie'||phase==='down'){if(kind!=='lie')beginUp(kind);return;}
  if(phase==='up'){afterUp=kind;return;}
  if(phase==='sit'){intent=kind;return;}
  startJourney(kind);
 }
 function pose(dt,speed,time){
  resetBones();const moving=Math.min(1,speed/settings.walkSpeed),turning=phase==='turn'?1:0;
  motionWeight=T.MathUtils.lerp(motionWeight,moving*(1-turning),1-Math.exp(-dt*8));turnWeight=T.MathUtils.lerp(turnWeight,turning,1-Math.exp(-dt*9));runWeight=T.MathUtils.lerp(runWeight,pathMode==='run'&&phase==='jog'?1:0,1-Math.exp(-dt*5));
  if(walk){walk.timeScale=Math.max(.3,speed/baselineWalk);walk.setEffectiveWeight(motionWeight*(1-runWeight));}if(run){run.timeScale=Math.max(.3,speed/baselineRun);run.setEffectiveWeight(motionWeight*runWeight);}if(step){step.timeScale=settings.turnSpeedMultiplier||1;step.setEffectiveWeight(turnWeight);}
  mixer.update(dt);
  for(const leg of legs)leg.bone.quaternion.slerp(leg.q,seatWeight);
  if(layProgress>0)loungePose(layProgress);else bodyPivot.rotation.z=0;
  if(!reduced){
   const anticipation=T.MathUtils.clamp(headingError,-.65,.65),sleep=layProgress>.9;
   if(head){q.setFromAxisAngle(headAxis,anticipation*.24*(1-layProgress)+Math.sin(time*.29)*(sleep?.025:.055));head.quaternion.premultiply(q);}
   if(spine){q.setFromAxisAngle(spineYaw,anticipation*.09*(1-layProgress));spine.quaternion.premultiply(q);q.setFromAxisAngle(spinePitch,Math.sin(time*.90)*.006-motionWeight*(pathMode==='run'?.025:.008));spine.quaternion.premultiply(q);q.setFromAxisAngle(spineBank,T.MathUtils.clamp(yawVelocity,-1,1)*.035*motionWeight);spine.quaternion.premultiply(q);}
  }
  // Rotate around the planted foot during each stepping turn, rather than spinning at the model origin.
  if(phase==='turn'&&step&&feet[0]&&feet[1]){
   root.updateMatrixWorld(true);const cycle=step.time/turnClip.duration%1,index=cycle<.5?0:1;feet[index].getWorldPosition(footPosition);
   if(support!==index){support=index;anchor.copy(footPosition);}else{root.position.x+=anchor.x-footPosition.x;root.position.z+=anchor.z-footPosition.z;root.position.y=groundHeight(root.position.x,root.position.z)+.025;}
  }
  shadow.position.set(root.position.x,groundHeight(root.position.x,root.position.z)+.021,root.position.z);shadow.rotation.z=-root.rotation.y;shadow.scale.set(1+layProgress*.9,1+layProgress*.25,1);shadow.material.opacity=.60-seatWeight*.28;
 }
 root.position.copy(seat);root.rotation.y=config.yaw;
 if(initialPose==='lying'){root.position.copy(bed);root.position.y+=loungeFloor(1);root.rotation.y=settings.loungeYaw??config.yaw;seatWeight=0;layProgress=1;phase='lie';}
 onActivity(labels[phase]);talk(initialPose==='lying'?'하늘을 보면서 잠깐 쉬어야지.':settings.dialogue[0]);pose(0,0,0);
 return {root,meshes,shadowMoving(){return phase!=='rest'&&phase!=='lie'&&phase!=='gaze';},hasWalk:!!walk,hasRun:!!run,getSpeechPoint(out){root.updateMatrixWorld(true);if(headTop){headTop.getWorldPosition(out);out.y+=config.height*.15;}else{out.copy(root.position);out.y+=config.height;}},requestWalk(){request('walk');},requestRun(){request('run');},requestLie(){request('lie');},requestRest(){request('home');},talk(){talk(settings.dialogue[++speechIndex%settings.dialogue.length]);},update(dt,time){
  elapsed+=dt;speechTime+=dt;let speed=0,completeTurn=false;
  if(settings.speechEnabled!==false){if(speechTime>speechDeadline){say(null);speechDeadline=Infinity;}if(speechTime>nextSpeech)talk(settings.dialogue[++speechIndex%settings.dialogue.length]);}
  if(phase==='rest'){
   seatWeight=1;root.position.copy(seat);headingError=0;yawVelocity=0;
   if(!reduced&&elapsed>restDuration&&walk)request(['walk','lie','run'][autoIndex++%3]);
  }else if(phase==='rise'){
   const t=ease(elapsed/settings.transitionSeconds);seatWeight=1-t;root.position.lerpVectors(transitionFrom,stand,t);
   if(t===1)startJourney(intent);
  }else if(phase==='turn'){
   seatWeight=0;steer(afterTurn.yaw,dt);const cycle=step?step.time/turnClip.duration%1:0;completeTurn=Math.abs(diff(root.rotation.y,afterTurn.yaw))<.04&&(cycle<.12||cycle>.5&&cycle<.62);
  }else if(phase==='travel'||phase==='jog'||phase==='home'){
   seatWeight=0;curveSample(Math.min(pathLength,pathDistance+(pathMode==='run'?.9:.55)),ahead);steer(Math.atan2(-(ahead.z-root.position.z),ahead.x-root.position.x),dt);
   const maximum=pathMode==='run'?settings.runSpeed:settings.walkSpeed,alignment=Math.max(.2,Math.cos(Math.min(1.4,Math.abs(headingError)))),remaining=pathLength-pathDistance,brake=Math.min(1,Math.sqrt(Math.max(0,remaining)/(.65+maximum*.25)));
   currentSpeed=T.MathUtils.lerp(currentSpeed,maximum*alignment*brake,1-Math.exp(-dt*3.2));speed=currentSpeed;pathDistance=Math.min(pathLength,pathDistance+speed*dt);curveSample(pathDistance,pathPoint);root.position.set(pathPoint.x,groundHeight(pathPoint.x,pathPoint.z)+.025,pathPoint.z);
   if(remaining<.025){curveSample(pathLength,pathPoint);root.position.set(pathPoint.x,groundHeight(pathPoint.x,pathPoint.z)+.025,pathPoint.z);finishPath(pathFinish);}
  }else if(phase==='gaze'){
   seatWeight=0;headingError=0;yawVelocity=0;if(elapsed>(intent==='run'?5:settings.lookoutSeconds))routeHome();
  }else if(phase==='sit'){
   const t=ease(elapsed/settings.transitionSeconds);seatWeight=t;root.position.lerpVectors(transitionFrom,seat,t);
   if(t===1){enter('rest');restDuration=settings.restSeconds;if(intent!=='home'&&intent!=='walk'&&intent!=='run'&&intent!=='lie')intent='walk';talk('여기서는 서두를 일이 없네.');}
  }else if(phase==='down'){
   seatWeight=0;layProgress=ease(elapsed/settings.lieTransitionSeconds);root.position.y=groundHeight(root.position.x,root.position.z)+loungeFloor(layProgress);headingError=0;yawVelocity=0;
   if(layProgress===1)enter('lie');
  }else if(phase==='lie'){
   seatWeight=0;layProgress=1;root.position.y=groundHeight(root.position.x,root.position.z)+loungeFloor(1);headingError=0;yawVelocity=0;
   if(!reduced&&elapsed>settings.lyingSeconds)beginUp();
  }else if(phase==='up'){
   seatWeight=0;layProgress=upFrom*(1-ease(elapsed/settings.lieTransitionSeconds));root.position.y=groundHeight(root.position.x,root.position.z)+loungeFloor(layProgress);
   if(layProgress===0){root.position.y=groundHeight(root.position.x,root.position.z)+.025;startJourney(afterUp);}
  }
  pose(dt,speed,time);
  if(completeTurn){const callback=afterTurn.callback;afterTurn=null;support=-1;callback();}
 },getState(){return {phase,position:root.position.toArray(),layProgress,seatWeight};}};
}
