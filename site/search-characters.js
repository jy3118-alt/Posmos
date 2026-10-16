import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {paintMaterial} from './paint.js?v=c971b551bea2';

export function createHiddenLayout(city,config,poses){
 if(city.village)return createVillageFriends(city,config,poses);
 let seed=config.seed;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const kinds=['standing','seated','hanging','lying','painting'],placements=[];
 const home=[[10,-8],[5,-13],[21,-4],[-5,-15],[-18,14],[-7,17],[8,15],[4,-4],[-8,3],[14,1],[1,12],[-22,-8]];
 for(const [i,[x,z]] of home.entries())placements.push({id:i,pose:i%5===2?'painting':kinds[i%5],position:[x,.03,z],height:1.65,yaw:random()*Math.PI*2,home:true});
 const candidates=city.buildings.filter(b=>Math.hypot(b.x,b.z)<205&&!['basilica-plaza','brush-plaza','statue-west-base','statue-east-base','lotus-landmark'].includes(b.id)).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 for(let i=placements.length;i<config.count;i++){
  const b=candidates[(i-home.length)%candidates.length],pose=i===config.targetIndex?'standing':kinds[i%5],height=2.05+random()*.5;
  const ox=b.type==='terraced'?b.width*.14:b.type==='twin'?b.width*.28:b.type==='stepped'?-b.width*.08:0;
  let yy=b.top+.17,zz=0;
  if(b.type==='round')yy+=1.35;if(b.type==='gabled')yy+=1.62;
  if(pose==='hanging'){yy=b.top-(b.type==='terraced'?11:b.type==='twin'?5.5:b.type==='stepped'?6:0)+.17-poses.hanging.grip[1]*height;zz=b.depth/2+.75;}
  const cx=Math.cos(b.yaw),sn=Math.sin(b.yaw);
  placements.push({id:i,pose,position:[b.x+ox*cx+zz*sn,yy,b.z-ox*sn+zz*cx],height,yaw:pose==='hanging'?b.yaw-Math.PI/2:b.yaw+random()*Math.PI*2,buildingId:b.id});
 }
 return placements;
}

export function createSearchCharacters(scene,gltf,city,config,metadata){
 const placements=createHiddenLayout(city,config,metadata.poses),batches=[],guide=new T.Object3D(),roots=new Map(),sourceMeshes=[];
 gltf.scene.traverse(o=>{if(o.isMesh)sourceMeshes.push(o);});
 const material=paintMaterial({map:sourceMeshes[0].material.map},'character');
 for(const source of sourceMeshes){
  const pose=source.name.replace(/^pose-/,'').replace(/_\d+$/,''),people=placements.filter(p=>p.pose===pose);if(!people.length)continue;
  const mesh=new T.InstancedMesh(source.geometry,material,people.length);mesh.name='hidden-'+pose;mesh.userData.hiddenPeople=people;
  people.forEach((p,i)=>{guide.position.fromArray(p.position);guide.rotation.set(0,p.yaw,0);guide.scale.setScalar(p.height);guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);roots.set(p.id,guide.matrix.clone());});
  mesh.castShadow=false;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);batches.push(mesh);
 }
 if(city.village){
  const parts=[];for(const person of placements.filter(p=>p.pose==='hanging')){const [x,y,z]=person.position,grip=metadata.poses.hanging.grip,base=city.height(x,z),top=y+grip[1]*person.height;for(const side of [-1,1])parts.push({position:[x+Math.sin(person.yaw)*side*.55,base+(top-base)/2,z+Math.cos(person.yaw)*side*.55],scale:[.08,top-base,.08],yaw:person.yaw});parts.push({position:[x,top,z],scale:[.08,.08,1.2],yaw:person.yaw});}
  const supports=new T.InstancedMesh(new T.BoxGeometry(1,1,1),paintMaterial({color:'#9e8062'},'village-house'),parts.length);parts.forEach((p,i)=>{guide.position.fromArray(p.position);guide.rotation.set(0,p.yaw,0);guide.scale.fromArray(p.scale);guide.updateMatrix();supports.setMatrixAt(i,guide.matrix);});supports.receiveShadow=true;supports.computeBoundingSphere();scene.add(supports);
 }
 const capPieces=[],dome=new T.SphereGeometry(.29,16,8,0,Math.PI*2,0,Math.PI/2);capPieces.push(dome);
 const visor=new T.SphereGeometry(1,12,6);visor.scale(.37,.024,.28);visor.translate(.10,0,0);capPieces.push(visor);
 const hat=new T.Mesh(mergeGeometries(capPieces),paintMaterial({color:'#d83235'},'character'));hat.name='unique-red-cap';hat.castShadow=false;scene.add(hat);
 const ring=new T.Mesh(new T.TorusGeometry(1,.035,6,48),paintMaterial({color:'#f5d468',emissive:new T.Color('#856633'),emissiveIntensity:.4},'surface'));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
 let target=config.targetIndex,round=0,found=false;
 function setHat(){const p=placements[target],m=metadata.poses[p.pose],pos=new T.Vector3(...m.cap);pos.y-=.12;const local=new T.Matrix4().compose(pos,new T.Quaternion().setFromEuler(new T.Euler(...m.capRotation)),new T.Vector3(1,1,1));hat.matrixAutoUpdate=false;hat.matrix.multiplyMatrices(roots.get(target),local);hat.updateMatrixWorld(true);hat.userData.targetId=target;}
 setHat();
 const occluders=[];scene.traverse(o=>{if(o.isMesh&&!batches.includes(o)&&o!==hat&&o!==ring&&!o.material?.transparent&&!o.material?.alphaTest&&o.renderOrder!==-100&&o.name!=='hidden-lying')occluders.push(o);});
 function pick(raycaster){
  const hits=raycaster.intersectObjects([...batches,hat],false);if(!hits.length)return null;
  const hit=hits[0],person=hit.object===hat?placements[target]:hit.object.userData.hiddenPeople[hit.instanceId];
  const previousFar=raycaster.far;raycaster.far=Math.max(0,hit.distance-.08);const blocked=raycaster.intersectObjects(occluders,false).length>0;raycaster.far=previousFar;if(blocked)return null;
  if(person.id===target){found=true;ring.visible=true;ring.position.fromArray(person.position);ring.position.y+=person.pose==='hanging'?person.height*.65:.08;ring.scale.setScalar(person.height*.8);return {correct:true,person};}
  return {correct:false,person};
 }
 return {placements,batches,count:placements.length,hat,pick,reset(){round++;target=(config.targetIndex+round*31)%placements.length;found=false;ring.visible=false;setHat();},hint(){const p=placements[target];return {position:p.position.slice(),home:!!p.home};},getTarget(){return placements[target];},update(t){if(found)ring.rotation.z=t*.2;}};
}

function createVillageFriends(city,config,poses){
 let seed=config.seed;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},kinds=['standing','seated','hanging','lying','painting'],people=[];
 for(let i=0;i<config.count;i++){
  const pose=i===config.targetIndex?'standing':kinds[i%5],height=1.5+random()*.45;let x,z,y,yaw=random()*Math.PI*2,buildingId=null;
  if(i%4===0&&pose!=='hanging'){
   const b=city.buildings[Math.floor(i/4)%city.buildings.length],offset=(Math.floor(i/52)%2?1:-1)*b.width*.18;x=b.x+offset*Math.cos(b.yaw);z=b.z-offset*Math.sin(b.yaw);y=b.top+b.roofHeight*(1-Math.abs(offset)/(b.type==='round-studio'?3.8:(b.width+1)/2))+.025;buildingId=b.id;
  }else{
   let attempt=0;do{const a=random()*Math.PI*2,r=13+Math.sqrt(random())*47;x=Math.cos(a)*r;z=Math.sin(a)*r;y=city.height(x,z);attempt++;}while(attempt<250&&(y< -4||(city.treePositions||[]).some(t=>Math.hypot(x-t.x,z-t.z)<t.height*.30+.65)||(city.exclusions||[]).some(p=>Math.hypot(x-p.x,z-p.z)<p.radius)||city.buildings.some(b=>Math.abs(x-b.x)<b.width*.65+1&&Math.abs(z-b.z)<b.depth*.65+1)||people.some(p=>Math.hypot(x-p.position[0],z-p.position[2])<2.2)||Math.abs(x-(-18+Math.sin(z*.07)*4))<3));
   y+=.025;if(pose==='hanging')y+=2.7-poses.hanging.grip[1]*height;
  }
  people.push({id:i,pose,position:[x,y,z],height,yaw,home:Math.hypot(x,z)<19,buildingId});
 }
 return people;
}
