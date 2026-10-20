import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {gameObject} from './game-material.js?v=a2b9f13c5d88';
import {bayPoint,swimmingState} from './water-space.js?v=a2b9f13c5d88';

// Six real skins replace six crowd slots; they never add to the Po population.
// Geometry, material and clips are shared, with small independent bone palettes.
export function createWaterResidents(scene,gltf,city,placements,config){
 const bay=city.swimmingBay;if(!bay)return null;const speedScale=config.speedMultiplier||1;
 const people=placements.filter(p=>!p.hero&&!p.roof).slice(-6);
 const model=gltf.scene;model.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 gameObject(model);
 model.traverse(o=>{if(!o.isSkinnedMesh)return;o.material.onBeforeCompile=shader=>{
  shader.uniforms.swimSea={value:bay.sea};
  shader.vertexShader='varying float swimWorldY;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','swimWorldY=(modelMatrix*vec4(transformed,1.)).y;\n#include <project_vertex>');
  shader.fragmentShader='varying float swimWorldY;uniform float swimSea;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat submerged=clamp((swimSea-swimWorldY)*1.4,0.,.60);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.62,.64),submerged);');
 };o.material.customProgramCacheKey=()=> 'po-water-v30';});
 const actors=people.map((p,index)=>{
  p.water=true;p.zone='수영 해변';p.pose='idle';
  const root=new T.Group(),skin=clone(model);root.name='swimming-po-'+p.id;
  skin.position.sub(new T.Vector3(center.x,box.min.y,center.z));root.scale.setScalar(p.height/size.y);root.add(skin);scene.add(root);
  skin.traverse(o=>{if(o.isSkinnedMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;}});
  const mixer=new T.AnimationMixer(skin),actions={};
  for(const name of ['idle','walk','swim','float','tread']){const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw Error('수영 동작이 없습니다: '+name);actions[name]=mixer.clipAction(clip).setEffectiveWeight(0).play();}
  return {p,index,root,mixer,actions,weights:{idle:0,walk:0,swim:0,float:0,tread:0},previous:null,yaw:0};
 });
 const wakeMaterial=new T.MeshBasicMaterial({color:'#d1fff6',transparent:true,opacity:.40,depthWrite:false});
 const wakes=new T.InstancedMesh(new T.TorusGeometry(.58,.025,4,32).rotateX(-Math.PI/2),wakeMaterial,actors.length);wakes.frustumCulled=false;wakes.renderOrder=3;scene.add(wakes);
 const splashes=new T.InstancedMesh(new T.SphereGeometry(.035,4,4),new T.MeshBasicMaterial({color:'#d5fff9',transparent:true,opacity:.65,depthWrite:false}),actors.length*5);splashes.frustumCulled=false;splashes.renderOrder=3;scene.add(splashes);
 const guide=new T.Object3D(),buoys=[];
 for(const u of [-12.5,12.5])for(const v of [3,12,20]){
  const point=bayPoint(bay,u,v),mesh=new T.Mesh(new T.SphereGeometry(.38,8,6),new T.MeshToonMaterial({color:v===12?'#f8c650':u<0?'#f19b9e':'#71cbc2'}));mesh.position.set(point.x,bay.sea+.12,point.z);mesh.scale.y=.7;scene.add(mesh);buoys.push(mesh);
 }
 let last=0;
 function update(t){
  const dt=Math.min(.05,Math.max(0,t-last));last=t;
  for(const a of actors){
   const s=swimmingState(bay,a.index,t*speedScale,a.p.height,city.height),first=!a.previous;
   const dx=first?0:s.x-a.previous.x,dz=first?0:s.z-a.previous.z,travel=Math.hypot(dx,dz),speed=dt>0?travel/dt:0;
   if(travel>.0001){const target=Math.atan2(-dz,dx),angle=Math.atan2(Math.sin(target-a.yaw),Math.cos(target-a.yaw));a.yaw+=T.MathUtils.clamp(angle,-dt*2.1,dt*2.1);}else if(first)a.yaw=Math.atan2(-bay.nz,bay.nx);
   const walk=T.MathUtils.smoothstep(speed,.02,.28)*(1-s.waterMix),desired={idle:1-s.waterMix-walk,walk,swim:s.waterMix*(1-s.floatMix)*(1-s.treadMix),float:s.waterMix*s.floatMix,tread:s.waterMix*(1-s.floatMix)*s.treadMix};
   for(const [name,action]of Object.entries(a.actions)){a.weights[name]=first?desired[name]:T.MathUtils.lerp(a.weights[name],desired[name],1-Math.exp(-dt*7));action.setEffectiveWeight(a.weights[name]);action.setEffectiveTimeScale(name==='walk'?speed/Math.max(.01,(config.motionNativeSpeeds?.walk||.25)*a.p.height):speedScale);}
   a.mixer.update(dt);a.root.position.set(s.x,s.y-(config.motionFloors?.walk||0)*a.p.height*walk,s.z);a.root.rotation.y=a.yaw;
   a.p.position=a.root.position.toArray(a.p.position);a.p.yaw=a.yaw;a.p.waterY=bay.sea;a.p.waterActivity=s.mode;a.p.waterDepth=s.depth;
   guide.position.set(s.x,bay.sea+.035,s.z);guide.rotation.set(0,0,0);guide.scale.set(s.depth>.1?1.0+Math.sin(t*2+a.index)*.1:0,1,s.depth>.1?.7:0);guide.updateMatrix();wakes.setMatrixAt(a.index,guide.matrix);
   for(let j=0;j<5;j++){const phase=(t*(s.mode==='tread'?1.7:.8)+j*.2+a.index*.17)%1,angle=j*2.4;guide.position.set(s.x+Math.cos(angle)*(.35+phase*.45),bay.sea+.04+Math.sin(phase*Math.PI)*.30,s.z+Math.sin(angle)*(.35+phase*.45));guide.scale.setScalar(s.depth>.15&&s.mode!=='float'?.8*(1-phase):0);guide.updateMatrix();splashes.setMatrixAt(a.index*5+j,guide.matrix);}
   a.previous=s;
  }
  wakes.instanceMatrix.needsUpdate=true;splashes.instanceMatrix.needsUpdate=true;
  for(let i=0;i<buoys.length;i++)buoys[i].position.y=bay.sea+.12+Math.sin(t*1.5+i)*.035;
 }
 update(0);return {actors,count:actors.length,bay,update};
}
