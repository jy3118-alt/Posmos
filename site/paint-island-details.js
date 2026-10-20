import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {gameMaterial} from './game-material.js?v=a1ea6da47f55';
import {landmarkSites} from './paint-island-plan.js?v=a1ea6da47f55';

// Native Tripo buildings and props stay shared; only five small floating batches
// change matrices. No additional skeletons, physics simulation or per-frame loads.
export async function addPaintIslandDetails(scene,city,sources){
 const loader=new GLTFLoader(),guide=new T.Object3D(),mat=new T.Matrix4(),extra=[];
 const manifest=await fetch('./assets/paint-island-v45/models.json?v=b9294c5fd3aa').then(r=>{if(!r.ok)throw Error('섬 오브제 설정을 불러오지 못했습니다.');return r.json();});
 const definitions={
  'tree-house':{file:'./assets/paint-island-v45/reused-tree-house/tree-house-world-web.glb?v=57b50195e1fd'},
  ...(!city.residentWorld?{statue:{file:'./assets/polish-v18/royal-po-statue-web.glb?v=21a5f3fe1c77'}}:{}),
  spaceship:{file:'./assets/forest/paint-spaceship-01-web.glb?v=43d5bace00aa'},
  brush:{file:'./assets/forest/painter-brush-01-web.glb?v=a717e67b658c'},
  ...manifest.models
 };
 const gold=new T.MeshStandardMaterial({color:'#e9ac34',metalness:.78,roughness:.25,envMap:scene.environment,envMapIntensity:1.15});
 await Promise.all(Object.entries(definitions).map(async([name,definition])=>{
  const gltf=await loader.loadAsync(definition.file);gltf.scene.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3());
  const normalize=new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-centre.x,-box.min.y,-centre.z)),parts=[];
  gltf.scene.traverse(o=>{if(o.isMesh)parts.push({geometry:o.geometry.clone().applyMatrix4(mat.multiplyMatrices(normalize,o.matrixWorld)),material:name==='statue'?gold:gameMaterial(o.material,false)});});
  sources.set(name,{parts,ratio:size.divideScalar(size.y)});
 }));
 function batch(name,places,{cast=true,floating=false,keepMaterial=false}={}){
  const source=sources.get(name);if(!source||!places.length)return;
  for(const part of source.parts){
   const mesh=new T.InstancedMesh(part.geometry,part.material,places.length);mesh.name='paint-island-'+name;mesh.userData.keepCrayonMaterial=keepMaterial;
   places.forEach((p,i)=>{if(p.tint||name==='tree')mesh.setColorAt(i,new T.Color(p.tint||'#9db3a3'));});
   const set=(time=0)=>{places.forEach((p,i)=>{guide.position.set(p.x,p.y??city.height(p.x,p.z),p.z);guide.rotation.set(p.rx||0,(p.yaw||0)+(floating?Math.sin(time*.10+i)*.06:0),p.rz||0);guide.scale.set(p.h*(p.sx||1),p.h,p.h*(p.sz||1));if(floating){guide.position.y+=Math.sin(time*.36+p.phase)*.55;guide.rotation.z+=Math.sin(time*.24+p.phase)*.035;}guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);});mesh.instanceMatrix.needsUpdate=true;};
   set();mesh.castShadow=cast;mesh.receiveShadow=name!=='statue';mesh.computeBoundingSphere();if(floating){mesh.boundingSphere.radius+=1.5;extra.push(set);}scene.add(mesh);
  }
 }
 const actualLandmarks=[];
 for(const p of landmarkSites){
  if(!sources.has(p.asset))continue;
  const y=city.height(p.x,p.z);if(y<city.sea+1)continue;
  actualLandmarks.push({...p,y});
 }
 for(const asset of new Set(actualLandmarks.map(p=>p.asset)))batch(asset,actualLandmarks.filter(p=>p.asset===asset).map(p=>({...p,y:p.y-.06})),{keepMaterial:asset==='statue'});
 // These larger forms have deliberate clearings; flowers do not cover the paths.
 city.buildings.push(...actualLandmarks.map(p=>({id:p.id,x:p.x,z:p.z,width:p.r*1.7,depth:p.r*1.7,h:p.h,top:p.y+p.h,type:'landmark'})));
 batch('brush',[{x:-10,z:-16,h:15,yaw:.5,rz:-.12},{x:28,z:27,h:8,yaw:1.8,rz:1.22}]);
 const bay=city.swimmingBay,shipX=bay.x+bay.nz*14-bay.nx*2,shipZ=bay.z-bay.nx*14-bay.nz*2;
 batch('spaceship',[{x:shipX,z:shipZ,y:Math.max(city.sea+.45,city.height(shipX,shipZ))-.3,h:6.3,yaw:-.65,rz:-.25}]);

 const floats=[
  {asset:'cottage',x:49,z:34,h:7,y:city.height(49,34)+15,yaw:-.7,rz:.20,phase:0},
  {asset:'paint-hut',x:64,z:23,h:5.5,y:city.height(64,23)+15,yaw:1.7,rx:Math.PI,rz:.12,phase:1.7},
  {asset:'paint-mill',x:35,z:43,h:6,y:city.height(35,43)+20,yaw:.5,rz:-.34,phase:3.5},
  {asset:'tree',x:58,z:46,h:8.7,y:city.height(58,46)+19,yaw:1,rz:.48,phase:2.2},
  {asset:'tree',x:34,z:28,h:6.4,y:city.height(34,28)+14,yaw:-.8,rx:Math.PI,phase:4.1}
 ];
 for(const name of new Set(floats.map(p=>p.asset)))batch(name,floats.filter(p=>p.asset===name),{floating:true,cast:false});
 // Float supports are irregular chunks of painted rock, one shared cheap mesh.
 const rockGeometry=new T.IcosahedronGeometry(1,1),rockMaterial=new T.MeshLambertMaterial({color:'#a0a3b4',flatShading:true});
 const rocks=new T.InstancedMesh(rockGeometry,rockMaterial,3);
 for(let i=0;i<3;i++){const p=floats[i];guide.position.set(p.x,p.y-.7,p.z);guide.rotation.set(.1,i,.15);guide.scale.set(p.h*.52,.9,p.h*.46);guide.updateMatrix();rocks.setMatrixAt(i,guide.matrix);}rocks.computeBoundingSphere();rocks.boundingSphere.radius+=1.5;rocks.name='painted-floating-rocks';scene.add(rocks);
 extra.push(t=>{for(let i=0;i<3;i++){const p=floats[i];guide.position.set(p.x,p.y-.7+Math.sin(t*.36+p.phase)*.55,p.z);guide.rotation.set(.1,i,.15);guide.scale.set(p.h*.52,.9,p.h*.46);guide.updateMatrix();rocks.setMatrixAt(i,guide.matrix);}rocks.instanceMatrix.needsUpdate=true;});

 const river=city.worldPlan.river,positions=[],uvs=[],indices=[],flows=[];
 // Build a shallow water ribbon on the carved river, with a shared flow shader.
 for(let i=0;i<river.length;i++){
  const p=river[i],a=river[Math.max(0,i-1)],b=river[Math.min(river.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
  for(const side of [-1,1]){positions.push(p.x+nx*p.width*side,p.y+.025,p.z+nz*p.width*side);uvs.push(side*.5+.5,i*.13);}
  if(i<river.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  if(i%9===0&&p.y>city.sea+.2)flows.push({x:p.x,z:p.z,y:p.y+.06,yaw:Math.atan2(dx,dz),scale:.4+(i%4)*.1});
 }
 const riverGeo=new T.BufferGeometry();riverGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));riverGeo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));riverGeo.setIndex(indices);riverGeo.computeVertexNormals();
 const time={value:0},riverMaterial=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{time},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;void main(){float bank=smoothstep(.30,.50,abs(vUv.x-.5));float line=pow(max(0.,sin(vUv.y*15.-time*1.25+sin(vUv.x*14.)*.35)),18.);vec3 c=mix(vec3(.16,.56,.62),vec3(.40,.77,.76),1.-abs(vUv.x-.5)*2.);c=mix(c,vec3(.78,.92,.87),line*.36+bank*.32);gl_FragColor=vec4(c,1.);}`});
 const water=new T.Mesh(riverGeo,riverMaterial);water.name='painted-flowing-river';scene.add(water);
 // Visible deck equals the height-sampler surface returned during terrain build.
 const bridge=city.worldPlan.bridge,deck=new T.Mesh(new T.BoxGeometry(bridge.width,.24,bridge.depth),new T.MeshLambertMaterial({color:'#c5ac83'}));deck.position.set(bridge.x,bridge.y-.12,bridge.z);deck.name='stream-bridge-deck';deck.castShadow=deck.receiveShadow=true;scene.add(deck);
 city.paintIslandMetrics={originalIsland:true,regions:city.worldPlan.regions.length,landmarks:actualLandmarks.map(p=>({id:p.id,position:[p.x,p.y,p.z],height:p.h})),floatingProps:floats.length,riverSegments:river.length-1,additionalPaidModels:Object.keys(manifest.models).length};
 return {update(t){time.value=t;for(const update of extra)update(t);}};
}
