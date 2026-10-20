import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {gameMaterial,cleanGeometry} from './game-material.js?v=33a550a771a7';
import {makeClearCoast} from './clear-coast.js?v=33a550a771a7';
import {prepareIsland,paintGround,colourCanopy} from './story-surface.js?v=33a550a771a7';
import {chapterHomes,createChapterHeight,chapterPaths,chapterLinks,chapterTreeCandidates,chapterAt} from './storybook-chapters.js?v=33a550a771a7';
import {addChapterBridges,addChapterLandmarks} from './chapter-surfaces.js?v=33a550a771a7';
import {createStorybookHeight,storybookPaths,storybookTreeCandidates,pathDistance} from './storybook-landscape.js?v=33a550a771a7';
import {createPaintIslandStudy,paintIslandSites,landmarkSites,regionWeights,paintRegions} from './paint-island-plan.js?v=33a550a771a7';
import {addPaintIslandDetails} from './paint-island-details.js?v=33a550a771a7';

// One continuous surface is shared by the coastline, roads and every moving foot.
const N=153,STEP=2,MIN=-152,SEA=-9,field=new Float32Array(N*N);
let renderedHeight=null;
const smooth=(a,b,v)=>{const t=T.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export const houseSites=[
 {id:'artist-home',asset:'atelier',x:-10,z:-13,h:11,yaw:.2},
 ...[[-24,8],[-40,14],[-51,30],[-38,40],[-19,39],[2,40],[21,34],[36,19],[36,-2],[25,-21],[7,-35],[-21,-40],[-48,-26],[-55,-8],[58,30],[72,38],[62,54],[45,56],[-43,62],[-62,58],[-73,39],[-71,14]].map(([x,z],i)=>({id:'cottage-'+i,asset:i%4===0?'paint-hut':i%4===2?'paint-mill':'cottage',x,z,h:i%4===2?8.2+(i%3)*.4:i%4===0?5.7:4.7+(i%4)*.55,yaw:(i%5-2)*.23})),
 ...[[-39,-60],[58,-39],[-2,66]].map(([x,z],i)=>({id:'lookout-'+i,asset:'lookout',x,z,h:8.5+i*1.3,yaw:i*.9}))
];
function base(x,z){const r=Math.hypot(x/.99,z/1.07),mountain=37*Math.exp(-(((x+38)/26)**2+((z+56)/27)**2)),east=13*Math.exp(-(((x-53)/31)**2+((z+31)/35)**2));return (mountain+east+Math.sin(x*.038+z*.024)*1.15)*smooth(13,30,r)-smooth(78,123,r)**1.35*26;}
function raw(x,z){let h=base(x,z);for(const p of houseSites){const r=p.asset==='atelier'?7:p.asset==='lookout'?4.5:5.5,weight=1-smooth(r,r+3,Math.hypot(x-p.x,z-p.z));h=T.MathUtils.lerp(h,base(p.x,p.z),weight);}return h;}
for(let z=0;z<N;z++)for(let x=0;x<N;x++)field[z*N+x]=raw(MIN+x*STEP,MIN+z*STEP);
export function paintVillageHeight(x,z){if(renderedHeight)return renderedHeight(x,z);const fx=T.MathUtils.clamp((x-MIN)/STEP,0,N-1.001),fz=T.MathUtils.clamp((z-MIN)/STEP,0,N-1.001),ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz,a=field[iz*N+ix],b=field[iz*N+ix+1],c=field[(iz+1)*N+ix],d=field[(iz+1)*N+ix+1];return tx+tz<=1?a+(b-a)*tx+(c-a)*tz:d+(b-d)*(1-tz)+(c-d)*(1-tx);}
export async function makePaintVillage(scene,config,camera){
 const storybook=!!config.storybookLandscape,multiverse=!!config.storybookArchipelago,paintWorld=!!config.paintIsland;
 let sites=paintWorld?paintIslandSites(houseSites):multiverse?chapterHomes:houseSites;
 const islandStudy=paintWorld?createPaintIslandStudy():null;
 const manifest=await fetch(config.assetManifest||'./assets/village-v13/manifest.json').then(r=>r.json()),loader=new GLTFLoader(),assets=new Map(await Promise.all(Object.entries(manifest.models).map(async([name,p])=>[name,await loader.loadAsync(p.file)])));
 let seed=5307;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},guide=new T.Object3D(),dummy=new T.Matrix4();
 renderedHeight=null;let groundMeshes=[],swimmingBay=null;if(assets.has('island')){const terrain=await prepareIsland(scene,assets.get('island'),sites,islandStudy|| (multiverse?{height:createChapterHeight(sites),addSurfaces:addChapterBridges}:storybook?{height:createStorybookHeight(sites)}:{}));renderedHeight=terrain.height;groundMeshes=terrain.meshes;swimmingBay=terrain.swimmingBay;}else{
 const grid=new T.PlaneGeometry(304,304,N-1,N-1);grid.rotateX(-Math.PI/2);const gp=grid.attributes.position;for(let i=0;i<gp.count;i++)gp.setY(i,field[i]);const land=grid.toNonIndexed();land.computeVertexNormals();const p=land.attributes.position,n=land.attributes.normal,colors=[];
 const pigments=['#82ad72','#92b881','#c2bd7d','#dbcb9e','#ad929f'];
 for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3,y=p.getY(i),steep=n.getY(i)<.72;let c=new T.Color(y<-4?'#dfcda4':steep?'#9d9cac':y>22?'#b6b891':pigments[Math.sin(x*.04+z*.055)>.1?0:1]);if(y>-4&&!steep)c.lerp(new T.Color('#c5b98a'),smooth(50,100,Math.hypot(x,z))*.37);for(const [cx,cz,r,ink] of [[42,6,9,'#df897a'],[-36,22,8,'#a3a5cb'],[32,55,5,'#e5b865']]){const angle=Math.atan2(z-cz,x-cx),edge=r*(1+.10*Math.sin(angle*3)+.07*Math.cos(angle*5));if(Math.hypot(x-cx,z-cz)<edge)c.set(ink);}c.multiplyScalar(.975+random()*.05);for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);}
 land.setAttribute('color',new T.Float32BufferAttribute(colors,3));const ground=new T.Mesh(land,gameMaterial({vertexColors:true}));ground.material.vertexColors=true;ground.receiveShadow=true;ground.name='continuous-village-ground';scene.add(ground);groundMeshes=[ground];grid.dispose();}
 if(paintWorld)sites=sites.filter(p=>paintVillageHeight(p.x,p.z)>SEA+2.5);
 const coast=await makeClearCoast(scene,camera,paintVillageHeight,SEA,swimmingBay);
 const originalPaths=[[[0,3],[-22,6],[-41,17],[-55,34],[-40,54],[-63,60]],[[1,5],[20,11],[35,22],[54,39],[65,52]],[[1,-4],[-13,-24],[-32,-39],[-39,-60]],[[1,-4],[15,-22],[35,-31],[58,-39]],[[0,9],[4,27],[0,46],[-2,68]]];
 const paths=paintWorld?originalPaths.concat([[[0,8],[-15,1],[-25,-1],[-30,-16],[-44,-16]],[[20,-20],[32,-25],[43,-19]],[[35,22],[43,29],[54,37]]]):multiverse?chapterPaths.concat(chapterLinks.map(l=>l.points)):storybook?storybookPaths:originalPaths;
 const pathCurves=paths.map(points=>new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)))),pathSamples=pathCurves.map(curve=>curve.getSpacedPoints(150));
 // Route the paths around each actual GLB footprint, rather than walking through houses.
 const footprints=sites.map(h=>{const b=new T.Box3().setFromObject(assets.get(h.asset).scene),s=b.getSize(new T.Vector3());return {...h,r:Math.max(s.x,s.z)/s.y*h.h*.52+1.9};});if(!paintWorld)footprints.push({x:-36,z:22,r:9});else footprints.push(...landmarkSites.map(p=>({...p,r:p.r+1.2})));
 for(const points of pathSamples)for(const pt of points)for(let pass=0;pass<3;pass++)for(const h of footprints){const dx=pt.x-h.x,dz=pt.z-h.z,d=Math.hypot(dx,dz);if(d<h.r){const scale=h.r/Math.max(.001,d);pt.x=h.x+(d>.001?dx:.01)*scale;pt.z=h.z+dz*scale;}}
 if(storybook)for(let pass=0;pass<4;pass++)for(const points of pathSamples){
  const copy=points.map(p=>p.clone());
  for(let i=1;i<points.length-1;i++){
   const p=points[i];p.copy(copy[i]).multiplyScalar(.5).addScaledVector(copy[i-1],.25).addScaledVector(copy[i+1],.25);
   for(const h of footprints){const dx=p.x-h.x,dz=p.z-h.z,d=Math.hypot(dx,dz);if(d<h.r){const scale=h.r/Math.max(.001,d);p.x=h.x+dx*scale;p.z=h.z+dz*scale;}}
  }
 }

  paintGround(groundMeshes,pathSamples,swimmingBay);
 const sources=new Map();for(const [name,gltf]of assets){gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3()),normalize=new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-centre.x,-box.min.y,-centre.z)),parts=[];gltf.scene.traverse(node=>{if(node.isMesh)parts.push({geometry:cleanGeometry(node.geometry.clone().applyMatrix4(dummy.multiplyMatrices(normalize,node.matrixWorld))),material:gameMaterial(node.material,name!=='cloud')});});sources.set(name,{parts,ratio:size.clone().divideScalar(size.y)});}
 function instances(name,places,shadow=true){const source=sources.get(name);if(!source)return;for(const part of source.parts){if(name==='tree')colourCanopy(part.material);if(name==='cloud'){part.material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat cloudTone=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.90,.97,1.)*mix(.82,1.,cloudTone);');};part.material.customProgramCacheKey=()=> 'clean-white-cloud';}const mesh=new T.InstancedMesh(part.geometry,part.material,places.length);mesh.name='tripo-'+name;mesh.userData.chapterArt=multiverse;places.forEach((a,i)=>{guide.position.set(a.x,a.y??paintVillageHeight(a.x,a.z),a.z);guide.rotation.set(a.rx||0,a.yaw||0,a.rz||0);guide.scale.set(a.h*(a.sx||1),a.h,a.h*(a.sz||1));guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);if(a.tint)mesh.setColorAt(i,new T.Color(a.tint));});mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}}
 const buildings=sites.map(p=>{const ratio=sources.get(p.asset).ratio,base=paintVillageHeight(p.x,p.z);return {...p,width:ratio.x*p.h,depth:ratio.z*p.h,top:base+p.h,roofHeight:0,type:'tripo',frame:0};});for(const type of ['atelier','cottage','lookout','paint-hut','paint-mill',...(paintWorld?['workshop']:[])])instances(type,sites.filter(p=>p.asset===type).map((p,i)=>({...p,tint:multiverse?chapterAt(p.x,p.z).houses[i%3]:['#ffffff','#fff0d8','#d8edf2','#f6dae6'][i%4]})));
 const treePositions=[];
 if(!storybook){for(let i=0;i<460;i++){const a=random()*Math.PI*2,r=22+Math.sqrt(random())*77,x=Math.cos(a)*r,z=Math.sin(a)*r,y=paintVillageHeight(x,z);if(y<-3.5||buildings.some(b=>Math.hypot(x-b.x,z-b.z)<Math.max(b.width,b.depth)*.57+3)||pathSamples.some(path=>path.some(p=>Math.hypot(x-p.x,z-p.z)<3.8))||Math.hypot(x-42,z-5)<14||Math.hypot(x+36,z-22)<12)continue;const height=4.1+random()*4.9;treePositions.push({x,y,z,h:height,radius:Math.max(sources.get('tree').ratio.x,sources.get('tree').ratio.z)*height*.5,height:6,yaw:random()*6.28,tint:['#ed9b81','#b89cda','#67bcb2','#e8c76f','#759ecb','#80b778'][((Math.imul(i+37,1597334677)^Math.round(x*32)^Math.round(z*64))>>>0)%6]});}for(let i=treePositions.length-1;i>=0;i--)if(Math.hypot(treePositions[i].x+62,treePositions[i].z+55)<11.3)treePositions.splice(i,1);
}else{
  const candidates=multiverse?chapterTreeCandidates():storybookTreeCandidates(),treePalette=['#ef6869','#ac69c7','#28ad99','#efbb3d','#5e93d0','#70b749'];
  for(let i=0;i<candidates.length;i++){
   const p=candidates[i],{x,z}=p,y=paintVillageHeight(x,z),height=p.h;
   const vistaDepth=x*.65-(z-8)*.76,vistaSide=x*.76+(z-8)*.65;
   if(vistaDepth>10&&vistaDepth<(multiverse?34:58)&&Math.abs(vistaSide)<(multiverse?3.2:5.8)+vistaDepth*.04)continue;
   if(y<-3.5||buildings.some(b=>Math.hypot(x-b.x,z-b.z)<Math.max(b.width,b.depth)*.57+2)||pathDistance(x,z,pathSamples)<2.7||!multiverse&&(Math.hypot(x-42,z-5)<14||Math.hypot(x+36,z-22)<12)||(x/8)**2+((z-8)/6.7)**2<1||treePositions.some(t=>Math.hypot(x-t.x,z-t.z)<(height+t.h)*.19)||!multiverse&&Math.hypot(x+62,z+55)<11.3)continue;
   treePositions.push({...p,y,radius:Math.max(sources.get('tree').ratio.x,sources.get('tree').ratio.z)*height*.5,height:6,tint:p.tint||treePalette[((Math.imul(i+37,1597334677)^Math.round(x*32)^Math.round(z*64))>>>0)%6]});
  }
 }
 if(paintWorld){
  for(let i=0;i<820;i++){
   const x=(random()-.5)*242,z=(random()-.5)*230,y=paintVillageHeight(x,z),height=4+random()*4.3;
   const river=islandStudy.world.closestRiver(x,z),slope=Math.hypot(paintVillageHeight(x+.5,z)-y,paintVillageHeight(x,z+.5)-y);
   if(y<SEA+4.2||slope>.46||Math.hypot(x,z-8)<10||buildings.some(b=>Math.hypot(x-b.x,z-b.z)<Math.max(b.width,b.depth)*.52+3)||landmarkSites.some(l=>Math.hypot(x-l.x,z-l.z)<l.r+2)||pathDistance(x,z,pathSamples)<3||river&&river.d<river.point.width+3||treePositions.some(t=>Math.hypot(x-t.x,z-t.z)<(height+t.h)*.24))continue;
   // Open meadow pockets contrast with clustered woodland, not a uniform forest.
   if(z>50&&x>22&&random()<.6)continue;
   treePositions.push({x,y,z,h:height,height:6,radius:height*.55,yaw:random()*6.28});
  }
 }
 if(paintWorld)for(let i=0;i<treePositions.length;i++){
  const p=treePositions[i],weights=regionWeights(p.x,p.z),tint=new T.Color(0,0,0);
  weights.forEach((w,j)=>{const c=new T.Color(paintRegions[j].trees[i%3]);tint.r+=c.r*w;tint.g+=c.g*w;tint.b+=c.b*w;});
  p.tint='#'+tint.getHexString();
 }
 if(paintWorld)for(let i=treePositions.length-1;i>=0;i--){const p=treePositions[i],river=islandStudy.world.closestRiver(p.x,p.z);if(((p.x+2)/14)**2+((p.z-7)/12)**2<1||landmarkSites.some(l=>Math.hypot(p.x-l.x,p.z-l.z)<l.r+1.6)||river&&river.d<river.point.width+2.8)treePositions.splice(i,1);}
 instances('tree',treePositions,paintWorld);
 instances('workshop',multiverse?[{x:0,z:0,h:3.0,yaw:.15},{x:54,z:-50,h:2.8,yaw:1.1},{x:-81,z:57,h:2.5,yaw:-1.2}]:[{x:0,z:0,h:3.0,yaw:.15},{x:24,z:34,h:2.8,yaw:1.1},{x:-49,z:31,h:2.5,yaw:-1.2}]);
 instances('camp',multiverse?[{x:8,z:3,h:3.2,yaw:-.65},{x:-73,z:-32,h:2.7,yaw:1.2}]:[{x:8,z:3,h:3.2,yaw:-.65},{x:-20,z:43,h:2.7,yaw:1.2}]);
 instances('palette-bridge',[paintWorld?{x:-36,z:22,h:2.8,yaw:0,y:islandStudy.world.bridge.y-.7}:multiverse?{x:-30,z:0,h:2.1,yaw:.45}:{x:-36,z:22,h:3.1,yaw:.45}]);
 const tubes=multiverse?[{x:-17,z:17,h:6.5,yaw:.9},{x:70,z:-55,h:4.5,yaw:-.4,rz:.42},{x:-75,z:46,h:7.5,yaw:2,rz:-.30},{x:88,z:45,h:5,yaw:-2,rx:1.25}]:[{x:42,z:4,h:12,yaw:.9},{x:62,z:-21,h:7,yaw:-.4,rz:.42},{x:-63,z:41,h:5,yaw:2.0,rz:-.30},{x:32,z:55,h:4,yaw:-2,rx:1.25}];for(const p of tubes){const b=new T.Box3();const src=sources.get('paint-tube'),rot=new T.Matrix4().makeRotationFromEuler(new T.Euler(p.rx||0,p.yaw,p.rz||0));for(const part of src.parts)b.union(new T.Box3().setFromBufferAttribute(part.geometry.attributes.position).applyMatrix4(rot));p.y=paintVillageHeight(p.x,p.z)-b.min.y*p.h+.03;}instances('paint-tube',tubes);
 instances('paint-skiff',[multiverse?{x:33,z:22,h:3.4,yaw:-.72,y:SEA+.04}:{x:75,z:52,h:3.4,yaw:-.72,y:paintVillageHeight(75,52)+.04}]);
 // Paint pools are part of the exact ground triangles, without surface overlap.
 const walkingPaths=[];for(const path of pathSamples){let part=[];const save=()=>{if(part.length>7)walkingPaths.push(part);part=[];};for(const pt of path){const y=paintVillageHeight(pt.x,pt.z),last=part.at(-1);if(y<-3){save();continue;}if(last&&Math.abs(y-paintVillageHeight(last.x,last.z))>.40*Math.hypot(pt.x-last.x,pt.z-last.z))save();part.push(pt);}save();}if(!walkingPaths.length)walkingPaths.push(pathSamples[0].slice(0,20));
 const chapterMetrics=multiverse?addChapterLandmarks(scene,paintVillageHeight):null;
 const city={multiverse,paintWorld,residentWorld:!!config.residentWorld,worldPlan:islandStudy?.world,chapterMetrics,swimmingBay,village:true,v13:true,storybook,groundMeshes,buildings,height:paintVillageHeight,treePositions,paths:walkingPaths,paintPaths:storybook?pathSamples:undefined,sea:SEA,buildingCount:buildings.length,buildingBatchCount:5,roofPropCount:0,exclusions:[{x:-62,z:-55,radius:18},{x:42,z:4,radius:10},{x:-36,z:22,radius:9},{x:75,z:52,radius:5}]};
 const paintDetails=paintWorld?await addPaintIslandDetails(scene,city,sources):null;
 const cloudPlaces=Array.from({length:18},(_,i)=>({x:Math.cos(i*2.4)*(storybook?355:195),z:Math.sin(i*2.4)*(storybook?355:195),y:(storybook?110:61)+(i%4)*14,h:12+(i%5)*3.1,yaw:i*.8,sx:1.1+(i%3)*.3,tint:['#ffffff','#f4fbff','#edf7ff'][i%3]}));if(assets.has('cloud'))instances('cloud',cloudPlaces,false);const cloudMeshes=[];scene.traverse(o=>{if(o.name==='tripo-cloud')cloudMeshes.push(o);});
 return {city,backgroundMaterial:coast.material,setNight:coast.setNight,setSunset:coast.setSunset,update(t){coast.update(t);paintDetails?.update(t);for(const mesh of cloudMeshes){cloudPlaces.forEach((p,i)=>{guide.position.set(p.x+Math.sin(t*.008+i)*3,p.y,p.z);guide.rotation.set(0,p.yaw,0);guide.scale.set(p.h*p.sx,p.h,p.h);guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);});mesh.instanceMatrix.needsUpdate=true;}},treeCount:treePositions.length};
}
