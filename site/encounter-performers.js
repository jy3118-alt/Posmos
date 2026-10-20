import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {characterMaterial} from './game-material.js?v=a2b9f13c5d88';

// A small reusable pool of real accepted skins. Only the selected two mixers
// run; their ordinary VAT/real residents are hidden for exactly the same time.
export function createEncounterPerformers(scene,definitions,acting){
 const actors=new Map(),axis=new T.Vector3(),rootQ=new T.Quaternion(),worldQ=new T.Quaternion(),parentQ=new T.Quaternion(),delta=new T.Quaternion(),inverse=new T.Quaternion(),footPoint=new T.Vector3();
 for(const [kind,d]of definitions){
  const model=clone(d.gltf.scene);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);
  const mixer=new T.AnimationMixer(model),actions=new Map();
  for(const clip of d.gltf.animations){const a=mixer.clipAction(clip).setEffectiveWeight(clip.name==='idle'?1:0).play();actions.set(clip.name,a);}
  if(kind==='moa')for(const data of acting.moa){const a=mixer.clipAction(T.AnimationClip.parse(data)).setEffectiveWeight(0).play();actions.set(a.getClip().name,a);}
  else{const a=mixer.clipAction(T.AnimationClip.parse(acting.spit)).setEffectiveWeight(0).play();actions.set('spit',a);}
  mixer.update(0);model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3());
  model.position.sub(new T.Vector3(centre.x,box.min.y,centre.z));
  const root=new T.Group(),facing=new T.Group();facing.rotation.y=kind==='moa'?Math.PI/2:0;facing.add(model);root.add(facing);root.visible=false;root.name='encounter-performer-'+kind;root.userData.encounterProxy=true;scene.add(root);
  model.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(characterMaterial):characterMaterial(o.material);o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;o.userData.encounterProxy=true;}});
  const bones=new Map();model.traverse(o=>{if(o.isBone)bones.set(o.name,o);});
  const find=n=>bones.get(n)||bones.get('mixamorig'+n)||bones.get('mixamorig:'+n);
  const head=find('Head'),marker=new T.Object3D();marker.name='PoMouthEmitter';marker.position.fromArray(acting.mouthInHead);if(head)head.add(marker);
  const feet=kind==='moa'?[find('LeftFoot'),find('RightFoot')]:[find('L_Foot'),find('R_Foot')],modifications=[];
  root.updateMatrixWorld(true);let baseline=Infinity;for(const foot of feet)if(foot)baseline=Math.min(baseline,foot.getWorldPosition(footPoint).y);baseline=Number.isFinite(baseline)?baseline:0;
  const state={kind,root,model,mixer,actions,find,marker,sourceHeight:size.y,nativeSpeed:d.nativeSpeed||.32,height:1.65,entity:null,selected:'idle',yaw:0,phase:0,feet,baseline,modifications,offsets:new Map()};actors.set(kind,state);
 }
 function removeOffsets(a){for(const m of a.modifications){inverse.copy(m.q).invert();m.bone.quaternion.multiply(inverse);m.applied=false;}a.modifications.length=0;}
 function turn(a,name,v,angle){const b=a.find(name);if(!b||!angle)return;rootQ.copy(a.root.quaternion);axis.fromArray(v).applyQuaternion(rootQ).normalize();b.getWorldQuaternion(worldQ);b.parent.getWorldQuaternion(parentQ);delta.setFromAxisAngle(axis,angle);let m=a.offsets.get(b);if(!m){m={bone:b,q:new T.Quaternion(),old:new T.Quaternion(),applied:false};a.offsets.set(b,m);}if(!m.applied){m.old.copy(b.quaternion);m.applied=true;a.modifications.push(m);}b.quaternion.copy(parentQ.invert().multiply(delta).multiply(worldQ));m.q.copy(m.old).invert().multiply(b.quaternion);a.root.updateMatrixWorld(true);}
 function update(a,dt,{position,height,yaw,stage,pose,greeting,age,serial,speed=0}){
  removeOffsets(a);a.height=height;a.root.scale.setScalar(height/a.sourceHeight);a.root.position.copy(position);a.root.rotation.y=yaw;
  const walk=stage==='approach',paint=stage==='paint',greet=stage==='greet',admir=stage==='admire';
  let selected=walk?'walk':paint&&a.kind!=='moa'&&a.painter?'spit':'idle';
  if(a.kind==='moa'&&!walk&&stage!=='release')selected=admir?'admire':pose==='hero'||pose==='proud'?'pose_hero':pose==='playful'?'pose_playful':'pose_calm';
  if(a.kind==='dress'&&greet&&greeting==='turn'){selected='turn';a.root.rotation.y+=Math.PI*2*T.MathUtils.smoothstep(age/2.2,0,1);}
  if(selected!==a.selected){actionsOf(a,selected)?.reset().play();a.selected=selected;}
  if(stage==='release')selected='idle';for(const [name,action]of a.actions)action.setEffectiveWeight(T.MathUtils.damp(action.getEffectiveWeight(),name===selected?1:0,10,dt));
  a.actions.get('walk')?.setEffectiveTimeScale(speed/Math.max(.01,a.nativeSpeed*height));a.mixer.update(dt);a.root.updateMatrixWorld(true);
  const wave=Math.sin(age*2.8+serial*.3),p=walk?0:stage==='release'?Math.max(0,1-age/.6):Math.min(1,age*3);
  if(a.kind!=='moa'&&!(paint&&a.painter)){
   turn(a,'Head',[1,0,0],(pose==='tilt'?.18:.035)*wave*p);
   turn(a,'Head',[0,0,1],greet&&greeting==='bow'?.18*Math.sin(Math.min(1,age/2.2)*Math.PI):.025*wave);
   const lift=pose==='proud'?.30:pose==='playful'?.24:pose==='turn'?.16:.09;
   turn(a,'L_Upperarm',[1,0,0],lift*p+(greeting==='flutter'?.12*wave*p:0));
   turn(a,'R_Upperarm',[1,0,0],-lift*p);
   turn(a,'L_Forearm',[0,1,0],.08*wave*p);turn(a,'R_Forearm',[0,1,0],-.08*wave*p);
   turn(a,'L_Ear',[0,1,0],.12*Math.sin(age*5)*p);turn(a,'R_Ear',[0,1,0],-.1*Math.sin(age*5+.6)*p);
  }else if(a.kind==='moa'&&greet)turn(a,'Head',[0,0,1],.12*Math.sin(age*3));
  if(a.kind==='dress')for(let i=0;i<8;i++)turn(a,'Skirt_'+i,[Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4)],.025*Math.sin(age*4+i*.6));
  let floor=Infinity;for(const foot of a.feet)if(foot)floor=Math.min(floor,foot.getWorldPosition(footPoint).y);
  if(Number.isFinite(floor))a.root.position.y+=a.baseline*(height/a.sourceHeight)-(floor-position.y);
  a.root.updateMatrixWorld(true);
 }
 function actionsOf(a,name){return a.actions.get(name);}
 return {actors,update,acquire(kind){const a=actors.get(kind);if(!a)throw Error('Encounter skin missing: '+kind);a.root.visible=true;return a;},release(a){removeOffsets(a);a.root.visible=false;a.entity=null;}};
}
