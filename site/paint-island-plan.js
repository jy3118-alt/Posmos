import * as T from 'three';
import {planGroundedBridge,fitBridgeLandings} from './bridge-grounding.js?v=50e1064b0d79';

// One continuous original island. These overlapping fields are art direction,
// not biome tiles: new residents can add a home without replacing the coast.
export const paintRegions=Object.freeze([
 {id:'atelier',name:'Po의 물감 마을',x:-3,z:8,rx:40,rz:38,ground:'#a6b878',accent:'#ed9e76',trees:['#85ad77','#dfbd73','#83b6a6']},
 {id:'woodland',name:'나무집 숲',x:-44,z:-30,rx:36,rz:40,ground:'#729f83',accent:'#a6bfa1',trees:['#5e9e86','#81b19a','#b6bf79']},
 {id:'moon',name:'달빛 정원',x:42,z:-29,rx:29,rz:31,ground:'#b0b6a3',accent:'#d7bb91',trees:['#a1adca','#c3a8c4','#9ebaaa']},
 {id:'gravity',name:'뒤집힌 정원',x:48,z:34,rx:29,rz:29,ground:'#a9b5ad',accent:'#d39dba',trees:['#a7a0bd','#7cbab1','#d8b38d']},
 {id:'ink',name:'낙서 언덕',x:-62,z:37,rx:23,rz:29,ground:'#929fb1',accent:'#b7a5c5',trees:['#7c93ae','#a299b2','#8ba9a0']},
 {id:'coast',name:'조용한 물가',x:0,z:70,rx:51,rz:30,ground:'#b5bf91',accent:'#ddcc9f',trees:['#a9b987','#96b4a8','#d5bf8e']}
]);
export const landmarkSites=Object.freeze([
 {id:'tree-house',asset:'tree-house',x:-44,z:-29,h:27,yaw:-2.45,r:14},
 {id:'royal-statue',asset:'statue',x:-62,z:-55,h:33,yaw:-.25,r:6.5},
 {id:'moon-observatory',asset:'moon-observatory',x:45,z:-30,h:15,yaw:-2.3,r:9},
 {id:'ink-grotto',asset:'ink-grotto',x:-66,z:34,h:10,yaw:-2.25,r:7},
 {id:'mushroom-home',asset:'mushroom-home',x:-28,z:-2,h:8,yaw:-2.6,r:6},
 {id:'mushroom-small',asset:'mushroom-home',x:-57,z:-8,h:5.8,yaw:-1.9,r:4.5},
 {id:'mushroom-curious',asset:'mushroom-home',x:-23,z:-35,h:4.8,yaw:.4,r:3.5}
]);
export function regionWeights(x,z){
 const weights=paintRegions.map(r=>Math.exp(-1.7*(((x-r.x)/r.rx)**2+((z-r.z)/r.rz)**2))+.00001);
 const sum=weights.reduce((a,b)=>a+b,0);return weights.map(w=>w/sum);
}
export function regionAt(x,z){let best=0,score=-1;for(let i=0;i<paintRegions.length;i++){const r=paintRegions[i],w=-(((x-r.x)/r.rx)**2+((z-r.z)/r.rz)**2);if(w>score){score=w;best=i;}}return paintRegions[best];}
export function paintIslandSites(sites){return sites.concat([
 {id:'cliff-atelier',asset:'paint-mill',x:8,z:80,h:9,yaw:-.4},
 {id:'cliff-house-1',asset:'cottage',x:-14,z:85,h:5.8,yaw:.2},
 {id:'cliff-house-2',asset:'paint-hut',x:29,z:91,h:6.1,yaw:-.7},
 {id:'western-studio',asset:'workshop',x:-86,z:16,h:4.8,yaw:.4},
 {id:'east-garden-home',asset:'cottage',x:80,z:13,h:5.6,yaw:-.8}
 ]).filter(p=>!landmarkSites.some(l=>l.id!=='royal-statue'&&Math.hypot(p.x-l.x,p.z-l.z)<l.r+4));}

const smooth=(a,b,v)=>{const u=T.MathUtils.clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);};
export function createPaintIslandStudy(){
 let bridgeModel=null;
 // Start in the high western hills and descend to the western sea, never
 // animate an uphill ribbon over the original uncut terrain.
 const curve=new T.CatmullRomCurve3([[-72,61],[-59,51],[-48,40],[-36,22],[-32,10],[-43,-8],[-65,-24],[-84,-35],[-106,-48]].map(([x,z])=>new T.Vector3(x,0,z)));
 const samples=curve.getSpacedPoints(210),bins=new Map(),cell=10;
 samples.forEach((p,i)=>{p.width=2.65+Math.sin(i*.07)*.28;p.index=i;});
 for(let i=0;i<samples.length-1;i++){
  const a=samples[i],b=samples[i+1],pad=12;
  for(let z=Math.floor((Math.min(a.z,b.z)-pad)/cell);z<=Math.floor((Math.max(a.z,b.z)+pad)/cell);z++)for(let x=Math.floor((Math.min(a.x,b.x)-pad)/cell);x<=Math.floor((Math.max(a.x,b.x)+pad)/cell);x++){
   const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);
  }
 }
 function sample(x,z,out={}){
  let best=-1,bestT=0,d2=Infinity;
  for(const i of bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const a=samples[i],b=samples[i+1],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),d=(x-a.x-dx*t)**2+(z-a.z-dz*t)**2;if(d<d2){d2=d;best=i;bestT=t;}}
  if(best<0)return null;const a=samples[best],b=samples[best+1],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),t=bestT;
  Object.assign(out,{x:a.x+dx*t,z:a.z+dz*t,d:Math.sqrt(d2),level:T.MathUtils.lerp(a.y,b.y,t)+.025,width:T.MathUtils.lerp(a.width,b.width,t),flowX:dx/l,flowZ:dz/l,index:best,t,depth:1.45+.25*Math.sin(best*.055)**2});return out;
 }
 function closest(x,z){const r=sample(x,z);return r?{d:r.d,point:{...r,y:r.level-.025}}:null;}
 const scratch={};
 function carve(x,z,original){const r=sample(x,z,scratch);if(!r||r.d>r.width+2.5)return original;
  const u=Math.min(1,r.d/r.width),bed=r.level-.20-(r.depth-.20)*(1-u*u*u*u),weight=1-smooth(r.width,r.width+2.5,r.d);
  return T.MathUtils.lerp(original,Math.min(original,bed),weight);
 }
 const world={regions:paintRegions,landmarks:landmarkSites,river:samples,closestRiver:closest,sampleStream:sample,carveStream:carve,riverCurve:curve,originalCoast:true};
 return {world,setBridgeModel(gltf){bridgeModel=gltf;},heightTransform(base){
  // Sample the unmodified island before carving, so water and banks agree.
  world.baseHeight=base;
  const pads=landmarkSites.map(p=>({...p,y:base(p.x,p.z)}));
  const sea=-9,shoreHit=samples.findIndex(p=>base(p.x,p.z)<=sea),shore=shoreHit<0?samples.length-3:Math.max(16,shoreHit);
  const end=Math.min(samples.length-1,shore+2),start=Math.max(0,end-13);
  let level=Infinity;
  for(const p of samples){
   level=Math.min(level,base(p.x,p.z)-.50);
   const merge=smooth(start,end,p.index);
   p.y=T.MathUtils.lerp(Math.max(sea-.025,level),sea-.025,merge);
   p.width*=1+merge*1.55;
  }
  world.estuary={startIndex:start,endIndex:end,shoreIndex:shore,x:samples[end].x,z:samples[end].z,surfaceY:sea,width:samples[end].width*2};
  return (x,z)=>{
   const original=base(x,z);let y=original;
   if(original>-6)for(const p of pads){if(p.y<-6)continue;y=T.MathUtils.lerp(y,p.y,1-smooth(p.r,p.r+5,Math.hypot(x-p.x,z-p.z)));}
   return carve(x,z,y);
  };
 },carveFinal:carve,finishGround(geometry,height){
  if(!bridgeModel)return;
  world.bridge=planGroundedBridge(bridgeModel,height,sample,samples[116]);
  fitBridgeLandings(geometry,world.bridge,sample);
 },addSurfaces(){return world.bridge?.surfaces||[];}};
}
