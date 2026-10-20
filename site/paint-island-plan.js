import * as T from 'three';

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
 const curve=new T.CatmullRomCurve3([[-68,-40],[-65,-20],[-49,1],[-36,22],[-52,45],[-75,63],[-102,72]].map(([x,z])=>new T.Vector3(x,0,z)));
 const samples=curve.getSpacedPoints(150),bins=new Map(),cell=12;
 samples.forEach((p,i)=>{p.width=2.0+Math.sin(i*.09)*.32+i/samples.length*.8;p.index=i;const key=(x,z)=>`${x},${z}`;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const k=key(Math.floor(p.x/cell)+dx,Math.floor(p.z/cell)+dz);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p);}});
 function closest(x,z){let best=null,d2=Infinity;for(const p of bins.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)||[]){const d=(p.x-x)**2+(p.z-z)**2;if(d<d2){d2=d;best=p;}}return best?{point:best,d:Math.sqrt(d2)}:null;}
 const world={regions:paintRegions,landmarks:landmarkSites,river:samples,closestRiver:closest,riverCurve:curve,originalCoast:true};
 return {world,heightTransform(base){
  // Sample the unmodified island before carving, so water and banks agree.
  world.baseHeight=base;
  const pads=landmarkSites.map(p=>({...p,y:base(p.x,p.z)}));
  for(const p of samples)p.y=Math.max(-8.94,base(p.x,p.z)-.66);
  return (x,z)=>{
   const original=base(x,z);let y=original;
   if(original>-6)for(const p of pads){if(p.y<-6)continue;y=T.MathUtils.lerp(y,p.y,1-smooth(p.r,p.r+5,Math.hypot(x-p.x,z-p.z)));}
   const river=closest(x,z);
   if(river&&river.d<river.point.width+2.1&&original>-10){
    const p=river.point,channel=1-smooth(p.width*.55,p.width+1.8,river.d);
    y=T.MathUtils.lerp(y,Math.min(y,p.y-.72),channel);
   }
   return y;
  };
 },addSurfaces(_scene,height){
  // The visible existing Tripo palette bridge crosses this same stream.
  // Its collision deck is invisible; rendered terrain is never an overlay.
  const y=Math.max(height(-41,22),height(-31,22))+.28;
  world.bridge={x:-36,z:22,y,width:12,depth:3.1};
  const g=new T.PlaneGeometry(12,3.1);g.rotateX(-Math.PI/2);g.translate(-36,y,22);return [g];
 }};
}
