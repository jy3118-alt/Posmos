import * as T from 'three';
import {gameObject} from './game-material.js?v=dbedd2c7ac57';
import {createFollower} from './friend-locomotion.js?v=dbedd2c7ac57';
export function createMoaResident(scene,gltf,traffic,config){
 const model=gltf.scene,mixer=new T.AnimationMixer(model),idle=mixer.clipAction(T.AnimationClip.findByName(gltf.animations,'idle')),walk=mixer.clipAction(T.AnimationClip.findByName(gltf.animations,'walk'));
 idle.play();walk.play();walk.setEffectiveWeight(0);mixer.update(0);model.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const root=new T.Group(),facing=new T.Group();root.name='moa-resident';root.scale.setScalar(config.height/size.y);model.position.sub(new T.Vector3(center.x,box.min.y,center.z));facing.rotation.y=Math.PI/2;facing.add(model);root.add(facing);scene.add(root);gameObject(model);model.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false;});
 const curve=new T.CatmullRomCurve3(config.route.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal'),follower=createFollower(traffic,curve.getSpacedPoints(200),{id:'moa',height:config.height,closed:true,fraction:.12});
 let speed=0;
 function prepare(dt,t){follower.prepare(dt,t%65>49?0:.62);}
 function update(dt,t){const p=follower.finish(dt);speed=p.speed;root.position.set(p.x,p.y+.03,p.z);root.rotation.y=p.yaw;idle.setEffectiveWeight(1-p.motion);walk.setEffectiveWeight(p.motion);walk.setEffectiveTimeScale(speed/(config.nativeSpeed*config.height));mixer.update(dt);}
 update(0,0);return {root,body:follower.body,height:config.height,prepare,update,hasWalk:true,shadowMoving:()=>speed>.02};
}
