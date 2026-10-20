// Local visual study only. One continuous height function supplies the rendered
// island, coast map, house foundations, foliage and every moving foot.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
const mix=(a,b,t)=>a+(b-a)*t;
const bell=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));

export function storybookCoastRadius(angle){
 // Large lobes and two inlets, rather than a circular island or a noisy edge.
 return 102+11*Math.sin(angle*3+.4)+6*Math.cos(angle*5-1.1)+2.5*Math.sin(angle*8)
  -18*Math.exp(-((Math.atan2(Math.sin(angle-1.10),Math.cos(angle-1.10))/.24)**2))
  -13*Math.exp(-((Math.atan2(Math.sin(angle+2.45),Math.cos(angle+2.45))/.20)**2));
}

export function createStorybookHeight(sites){
 function land(x,z){
  const a=Math.atan2(z/1.05,x),distance=storybookCoastRadius(a)-Math.hypot(x,z/1.05);
  const shore=smooth(-12,23,distance),inland=smooth(2,27,distance);
  const hills=30*bell(x,z,-36,-53,29,28)+12*bell(x,z,52,-28,28,35)
   +5.5*bell(x,z,-45,43,29,26)+3.5*bell(x,z,49,48,25,24);
  const roll=(Math.sin(x*.065+z*.032)+Math.cos(z*.077-x*.02))*.48;
  let y=-15+15.4*shore+(hills+roll)*inland;
  // Subtle shelves make hills read as broad drawn forms, with no vertical seam.
  y+=Math.sin(y*.72)*.24*inland;
  y=mix(y,.40,1-smooth(14,27,Math.hypot(x,z-5)));
  return y;
 }
 const pads=sites.map(p=>({...p,y:land(p.x,p.z),r:p.asset==='atelier'?8:6.3}));
 return (x,z)=>{
  let y=land(x,z);
  for(const p of pads)y=mix(y,p.y,1-smooth(p.r,p.r+4.8,Math.hypot(x-p.x,z-p.z)));
  return y;
 };
}

// Paths link distinct clearings and views; their full centre lines are also
// used to reserve tree/flower space and to paint the actual terrain texture.
export const storybookPaths=[
 [[0,9],[-11,12],[-21,3],[-35,4],[-43,21],[-53,35],[-39,50],[-56,59],[-68,53]],
 [[2,9],[12,6],[19,15],[30,24],[41,29],[51,39],[57,49],[69,56]],
 [[-2,5],[-1,-7],[-19,-22],[-29,-30],[-31,-45],[-39,-60]],
 [[2,4],[12,-4],[17,-16],[31,-22],[41,-34],[57,-39]],
 [[2,11],[10,20],[10,32],[-5,43],[-9,55],[-2,68]]
];

export function pathDistance(x,z,paths){
 let best=Infinity;
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  best=Math.min(best,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
 }
 return best;
}

export const storybookBeds=[
 {x:-2.2,z:12.6,rx:3.1,rz:1.0,angle:.08,colour:'#4eaa70'},
 {x:5.2,z:10.5,rx:1.2,rz:2.5,angle:-.18,colour:'#42a786'},
 {x:-6.9,z:12.6,rx:2.4,rz:4.5,angle:-.52,colour:'#42a86b'},
 {x:4.4,z:15.8,rx:3.6,rz:2.1,angle:.20,colour:'#4db679'},
 {x:5.6,z:1.0,rx:3.7,rz:2.2,angle:-.45,colour:'#229d94'},
 {x:-8.9,z:1.4,rx:2.4,rz:3.7,angle:-.16,colour:'#3a9d85'},
 {x:15.7,z:16.3,rx:4.2,rz:2.6,angle:.7,colour:'#56b96c'},
 {x:-15.5,z:21,rx:4.9,rz:3.8,angle:.2,colour:'#3b9b84'},
 {x:22.0,z:-7,rx:5.7,rz:4.5,angle:-.6,colour:'#3cad80'}
];

export function bedPoint(b,u,v){const c=Math.cos(b.angle),s=Math.sin(b.angle);return {x:b.x+u*b.rx*c-v*b.rz*s,z:b.z+u*b.rx*s+v*b.rz*c};}

export function storybookTreeCandidates(){
 let seed=812735;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const groves=[[-15,17,12],[-11,-8,11],[19,-9,13],[17,30,14],[-36,42,16],[-55,13,15],[-47,-35,16],[-35,-64,20],[20,-46,15],[53,-19,18],[63,30,14],[48,63,18],[-21,72,18],[-68,52,16],[-80,-10,12],[72,-39,13]];
 const places=[[-10.8,15.7,6.9],[9.8,-1.5,7.8],[-9.8,-3.7,6.4],[14.8,19,8.1],[-18,18,8.6],[23,1,9.7]].map(([x,z,h])=>({x,z,h,sx:1.08,sz:.92,yaw:r()*6.28}));
 for(let i=0;i<440;i++){
  const [cx,cz,radius]=groves[i%groves.length],a=r()*Math.PI*2,d=Math.sqrt(r())*radius;
  const type=i%5,h=type===0?8+r()*3.7:4.6+r()*4.3;
  places.push({x:cx+Math.cos(a)*d,z:cz+Math.sin(a)*d,h,sx:type===0?.72:type===1?1.22:.87+r()*.22,sz:type===0?.82:.86+r()*.25,yaw:r()*Math.PI*2});
 }
 return places;
}
