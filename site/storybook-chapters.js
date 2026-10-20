// Character homes are art-directed chapters, not interchangeable coloured lots.
// These six sample chapters reserve identities for future supplied residents;
// the only active residents in this study are still the existing Po and Moa.
export const chapters=[
 {id:'po',name:'Po · 크레파스 화실',x:-7,z:8,rx:43,rz:35,height:.4,shape:2.5,ground:'#b6b58a',edge:'#dec9a0',ink:'#8b9e87',houses:['#c49b7d','#76999c','#c4b177'],trees:['#7b9a83','#b6a078','#8e9ca6'],texture:'wax'},
 {id:'garden',name:'동화 정원',x:-73,z:-48,rx:35,rz:31,height:4.5,shape:2,ground:'#729488',edge:'#c3bf97',ink:'#405e62',houses:['#b0a897','#a38087','#8d9e97'],trees:['#587b75','#899b76','#a99a91'],texture:'leaf'},
 {id:'fabric',name:'실과 천의 언덕',x:56,z:-52,rx:32,rz:28,height:2.1,shape:2.4,ground:'#baa2ad',edge:'#d9c3b2',ink:'#936f87',houses:['#c4aba0','#9f9fb3','#c4ba91'],trees:['#ad95ad','#bdab94','#8ea9a4'],texture:'stitch'},
 {id:'neon',name:'푸른 전자 도시',x:87,z:34,rx:30,rz:34,height:7.0,shape:4.3,ground:'#546d86',edge:'#8498a6',ink:'#35465f',houses:['#697d9b','#81728e','#568e91'],trees:['#6e8195','#887e9b','#618e8f'],texture:'circuit'},
 {id:'scrap',name:'고철과 먹의 작업장',x:-83,z:57,rx:32,rz:31,height:1.8,shape:3.7,ground:'#a29077',edge:'#bcad8f',ink:'#6d7274',houses:['#9a8777','#7e8885','#ae927a'],trees:['#7e8776','#a28d72','#7d8b8f'],texture:'scrap'},
 {id:'moon',name:'달빛 종이 무대',x:-1,z:104,rx:34,rz:26,height:3.4,shape:2,ground:'#a7abc3',edge:'#d5c9b5',ink:'#767d9f',houses:['#bdaf91','#aaa8c2','#8d9eaf'],trees:['#a5a2bc','#b5ac93','#8c9daa'],texture:'stars'}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const chapterSmooth=(a,b,v)=>{const u=clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);};
export function chapterDistance(c,x,z){
 const dx=(x-c.x)/c.rx,dz=(z-c.z)/c.rz,p=c.shape;
 let d=(1-(Math.abs(dx)**p+Math.abs(dz)**p)**(1/p))*Math.min(c.rx,c.rz);
 if(c.id==='po'){
  // Thumb inlet and a long brush-tail turn the home into a daub of pigment.
  d=Math.min(d,Math.hypot(x-24,z+13)-12);
  d=Math.max(d,(1-Math.hypot((x+43)/21,(z+8)/11))*11);
 }else if(c.id==='garden')d+=Math.cos(Math.atan2(dz,dx)*3+.5)*1.8;
 else if(c.id==='fabric')d+=Math.cos(Math.atan2(dz,dx)*5)*2.0;
 else if(c.id==='moon')d=Math.min(d,Math.hypot((x-18)*.95,z-104)-22);
 return d;
}
export function chapterAt(x,z){let best=chapters[0],distance=-Infinity;for(const c of chapters){const d=chapterDistance(c,x,z);if(d>distance){distance=d;best=c;}}return best;}
export const chapterHomes=[
 ['atelier',-10,-13,9.4,.2],['cottage',-25,10,5.3,-.3],['paint-hut',12,18,5.6,.3],['cottage',-13,28,4.4,.4],
 ['lookout',-79,-57,8.5,.6],['cottage',-63,-42,5.2,-.4],['paint-mill',-84,-38,7.9,.1],['cottage',-62,-63,4.7,-.5],
 ['cottage',48,-56,4.8,.2],['paint-hut',64,-47,5.9,-.4],['cottage',47,-43,4.7,.3],['lookout',61,-65,7.7,.2],
 ['lookout',86,30,13,.1],['paint-mill',98,41,12,-.2],['atelier',79,43,10,.4],['lookout',87,16,10,.4],['cottage',101,22,7.1,-.1],
 ['paint-mill',-87,56,8.3,.4],['paint-hut',-74,65,6.3,-.2],['atelier',-94,45,9.1,.8],['cottage',-88,73,4.5,-.5],
 ['lookout',-16,102,9.3,.5],['cottage',-8,88,4.6,-.4],['paint-hut',-5,121,5.9,.3]
].map(([asset,x,z,h,yaw],i)=>({id:'chapter-home-'+i,asset,x,z,h,yaw,chapter:chapterAt(x,z).id}));

export function createChapterHeight(sites=chapterHomes){
 function raw(x,z){
  let h=-15;
  for(const c of chapters){
   const d=chapterDistance(c,x,z),shore=chapterSmooth(-4,7,d),core=chapterSmooth(1,12,d);
   let hill=0;
   if(c.id==='garden')hill=10*Math.exp(-(((x+83)/13)**2+((z+54)/15)**2));
   else if(c.id==='fabric')hill=3.0*(.5+.5*Math.cos((x-56)*.13))*core;
   else if(c.id==='neon')hill=(x>90?3.5:0)*chapterSmooth(2,9,d);
   else if(c.id==='scrap')hill=1.5*(Math.sin(x*.13)+Math.cos(z*.17))*core;
   else if(c.id==='moon')hill=2.0*Math.exp(-(((x+18)/15)**2+((z-105)/18)**2));
   h=Math.max(h,-15+(15+c.height)*shore+hill*core);
  }
  return h;
 }
 const pads=sites.map(p=>({...p,y:raw(p.x,p.z),r:p.asset==='atelier'?6.5:5.2}));
 return (x,z)=>{let y=raw(x,z);for(const p of pads)y+=(p.y-y)*(1-chapterSmooth(p.r,p.r+3.4,Math.hypot(x-p.x,z-p.z)));if(Math.hypot(x,z-8)<8)y=.4;return y;};
}

export const chapterLinks=[
 {id:'garden-link',points:[[-29,-5],[-44,-22],[-55,-34]],colour:'#bdad95'},
 {id:'fabric-link',points:[[18,-1],[34,-23],[45,-36]],colour:'#b5a2b2'},
 {id:'neon-link',points:[[25,19],[47,27],[65,33]],colour:'#8f9faf'},
 {id:'scrap-link',points:[[-33,24],[-49,43],[-65,50]],colour:'#af987e'},
 {id:'moon-link',points:[[-7,33],[-12,58],[-10,85]],colour:'#aaa8c0'}
];
export const chapterPaths=[
 [[-1,8],[-10,14],[-25,10],[-33,24]],[[1,8],[12,7],[13,18],[25,19]],
 [[-1,7],[-4,-3],[-18,-9],[-29,-5]],[[1,8],[13,4],[18,-1]],[[0,9],[-2,22],[-7,33]],
 [[-55,-34],[-65,-41],[-70,-52],[-79,-57]],[[-65,-41],[-84,-38]],[[-70,-52],[-62,-63]],
 [[45,-36],[52,-43],[57,-54],[61,-65]],[[52,-43],[47,-43]],[[57,-54],[48,-56],[64,-47]],
 [[65,33],[76,33],[86,30],[98,41]],[[76,33],[79,43]],[[86,30],[87,16],[101,22]],
 [[-65,50],[-76,52],[-87,56],[-88,73]],[[-87,56],[-94,45]],[[-76,52],[-74,65]],
 [[-10,85],[-17,92],[-20,105],[-13,115],[-5,121]],[[-17,92],[-8,88]]
];
export function chapterTreeCandidates(){
 let seed=45072;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),out=[];
 for(const c of chapters){const count=c.id==='neon'?16:c.id==='garden'?135:75;
  for(let i=0;i<count;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*.88,x=c.x+Math.cos(a)*c.rx*d,z=c.z+Math.sin(a)*c.rz*d;
   if(chapterDistance(c,x,z)<5||c.id==='po'&&Math.hypot(x,z-8)<9)continue;
   const h=c.id==='garden'?5.2+r()*6.5:c.id==='fabric'?3.9+r()*3.2:4.7+r()*4.2;
   out.push({x,z,h,sx:c.id==='garden'?.70+r()*.35:c.id==='fabric'?1.15:.85+r()*.2,sz:.85+r()*.25,yaw:r()*6.28,tint:c.trees[i%c.trees.length],chapter:c.id});
  }
 }
 return out;
}
