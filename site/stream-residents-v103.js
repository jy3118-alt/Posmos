import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {characterMaterial} from './game-material-v103.js?v=4baf9416a5b8';
import {streamImmersion} from './stream-space.js?v=4baf9416a5b8';

// Four reusable real skins replace the selected ordinary crowd skins. All other
// residents use dry paths/bridges; the stream never needs 150 live skeletons.
export function createStreamResidents(scene,gltf,city,crowd,config){
 if(!gltf||!city.waterAt)return null;
 const source=gltf.scene;source.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(source),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),guide=new T.Object3D();
 const pool=Array.from({length:4},(_,index)=>{
  const skin=clone(source),root=new T.Group();skin.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));root.add(skin);root.visible=false;root.name='stream-swimmer-'+index;scene.add(root);
  skin.traverse(o=>{if(o.isSkinnedMesh){o.material=characterMaterial(o.material);o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  const mixer=new T.AnimationMixer(skin),actions={};for(const name of ['idle','walk','swim','tread'])actions[name]=mixer.clipAction(T.AnimationClip.findByName(gltf.animations,name)).setEffectiveWeight(name==='idle'?1:0).play();
  return {root,mixer,actions,index,p:null,water:{},probe:{},entryAge:10,wasWet:false,velocityY:0,y:0,mix:0,dry:0};
 });
 const rings=new T.InstancedMesh(new T.TorusGeometry(.6,.022,4,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#d1f9ee',transparent:true,opacity:.55,depthWrite:false}),pool.length*2);
 const drops=new T.InstancedMesh(new T.SphereGeometry(.045,4,4),new T.MeshBasicMaterial({color:'#d5fff5',transparent:true,opacity:.8,depthWrite:false}),pool.length*8);rings.frustumCulled=drops.frustumCulled=false;rings.renderOrder=drops.renderOrder=3;scene.add(rings,drops);
 const candidates=crowd.placements.filter(p=>p.follower&&(!p.variant||p.variant==='base')&&!p.hero&&!p.water&&!p.statue);
 const regionEntries={};let entries=0,maxDepth=0,maxImmersion=0;const modes={};
 function release(a){a.p.waterPoolCooldown=3;a.p.inStream=false;a.p.follower.body.inStream=false;a.p.follower.body.canSwim=false;a.p.follower.body.contactY=undefined;a.p=null;a.root.visible=false;}
 function prepare(dt){
  for(const p of candidates){p.waterPoolCooldown=Math.max(0,(p.waterPoolCooldown||0)-dt);if(p.waterPoolCooldown>0)continue;const b=p.follower.body;b.canSwim=!!p.inStream;if(p.inStream||p.social||b.playerControlled)continue;
   const n=Math.hypot(b.wantX,b.wantZ),dx=n>.02?b.wantX/n:0,dz=n>.02?b.wantZ/n:0;
   const entryNear=city.streamNear(b.x+dx*.85,b.z+dz*.85,b.streamProbe||(b.streamProbe={}));if(!entryNear||(entryNear.lake&&entryNear.normalizedRadius>1.12))continue;
   const a=pool.find(a=>!a.p);if(!a)continue;
   a.p=p;a.landWait=0;a.y=b.y+.035;a.velocityY=0;a.mix=0;a.wasWet=false;a.entryAge=10;a.dry=0;a.root.visible=true;a.root.scale.setScalar(p.height/size.y);a.actions.walk.time=p.animationFrame/(p.variantMeta?.clips.walk.fps||24);p.inStream=true;b.inStream=b.canSwim=true;
  }
  for(const a of pool){if(!a.p)continue;const b=a.p.follower.body,r=city.waterAt(b.x,b.z,a.water),near=city.streamNear(b.x,b.z,a.probe);
   a.landWait=near?.lake&&!r?(a.landWait||0)+dt:0;if(a.landWait>4){release(a);continue;}a.dry=near?0:a.dry+dt;if(a.dry>.25){release(a);continue;}
   const m=r?streamImmersion(r.waterDepth,a.p.height):0;
   b.contactY=r&&m>.65?r.surfaceY-a.p.height*.30:undefined;
   b.wantX=b.wantX*(1-m*.64)+(r?r.flowX*.09*m:0);b.wantZ=b.wantZ*(1-m*.64)+(r?r.flowZ*.09*m:0);
  }
 }
 function update(dt,t){
  for(const a of pool){let wet=false,level=0,x=0,z=0;
   if(a.p){const p=a.p,b=p.follower.body,r=city.waterAt(b.x,b.z,a.water),depth=r?.waterDepth||0,m=streamImmersion(depth,p.height),speed=Math.hypot(b.vx,b.vz),tread=m*(1-T.MathUtils.smoothstep(speed,.04,.20));wet=depth>.12;level=r?.surfaceY??b.y;x=b.x;z=b.z;
    if(wet&&!a.wasWet){a.entryAge=0;a.velocityY=Math.min(a.velocityY,-.8);entries++;const region=r?.region||'stream';regionEntries[region]=(regionEntries[region]||0)+1;}a.wasWet=wet;a.entryAge+=dt;a.mix=T.MathUtils.damp(a.mix,m,9,dt);
    const walk=(1-a.mix)*T.MathUtils.smoothstep(speed,.02,.22),wanted={idle:Math.max(0,1-a.mix-walk),walk,swim:a.mix-tread,tread};
    for(const [name,action]of Object.entries(a.actions)){action.setEffectiveWeight(T.MathUtils.damp(action.getEffectiveWeight(),Math.max(0,wanted[name]),10,dt));action.setEffectiveTimeScale(name==='walk'?speed/Math.max(.01,(config.motionNativeSpeeds?.walk||.25)*p.height):name==='swim'?.85+speed*.5:1);}
    a.mixer.update(dt);const afloat=level-p.height*T.MathUtils.lerp(.30,.63,tread)+Math.sin(t*2.2+p.id)*.025,target=T.MathUtils.lerp(b.y+.035,afloat,a.mix);
    if(a.y>target+.006){a.velocityY=Math.max(-4,a.velocityY-8*dt);a.y=Math.max(target,a.y+a.velocityY*dt);}else{a.y=T.MathUtils.damp(a.y,target,14,dt);a.velocityY=0;}
    a.root.position.set(x,a.y,z);a.root.rotation.y=p.yaw;p.position[1]=a.y;p.streamSurface=level;p.waterActivity=a.entryAge<.65&&wet?'splash':a.mix>.65?(tread>.4?'tread':'swim'):wet?'wade':'walk';p.waterDepth=depth;maxDepth=Math.max(maxDepth,depth);maxImmersion=Math.max(maxImmersion,a.mix);if(a.previousMode!==p.waterActivity){modes[p.waterActivity]=(modes[p.waterActivity]||0)+1;a.previousMode=p.waterActivity;}
   }
   const touch=city.streamSurface?.disturbances[a.index];if(touch)touch.set(x,z,wet?1:0,a.entryAge);
   for(let j=0;j<2;j++){const age=a.entryAge+j*.16,scale=wet?j===0?.7+Math.sin(t*3)*.04:age<1.2?.5+age*1.8:0:0;guide.position.set(x,level+.035,z);guide.rotation.set(0,0,0);guide.scale.set(scale,1,scale*.7);guide.updateMatrix();rings.setMatrixAt(a.index*2+j,guide.matrix);}
   for(let j=0;j<8;j++){const age=a.entryAge+j*.013,active=wet&&age<.65,angle=j*2.4;guide.position.set(x+Math.cos(angle)*age*.8,level+.05+Math.max(0,age*2.8-4.8*age*age),z+Math.sin(angle)*age*.8);guide.rotation.set(0,0,0);guide.scale.setScalar(active?1-age/.65:0);guide.updateMatrix();drops.setMatrixAt(a.index*8+j,guide.matrix);}
  }
  rings.instanceMatrix.needsUpdate=true;drops.instanceMatrix.needsUpdate=true;
 }
 update(0,0);return {pool,prepare,update,diagnostics(){return {capacity:pool.length,entries,regionEntries,maxDepth:+maxDepth.toFixed(3),maxImmersion:+maxImmersion.toFixed(3),modes,actors:pool.filter(a=>a.p).map(a=>({id:a.p.id,region:a.water.region||'stream',mode:a.p.waterActivity,depth:+a.p.waterDepth.toFixed(3),surface:a.p.streamSurface,position:a.root.position.toArray(),mix:+a.mix.toFixed(3)}))};}};
}
