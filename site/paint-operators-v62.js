const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),round=x=>Math.round(x*1e5)/1e5;
const safePoint=p=>p.map(v=>clamp(v,.045,.955));
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255);
function random(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function moments(cells){
 const mass=cells.reduce((s,c)=>s+c[2],0),centre=[0,0],cov=[0,0,0];
 for(const [x,y,a]of cells){centre[0]+=x*a/mass;centre[1]+=y*a/mass;}
 for(const [x,y,a]of cells){const dx=x-centre[0],dy=y-centre[1];cov[0]+=dx*dx*a/mass;cov[1]+=dx*dy*a/mass;cov[2]+=dy*dy*a/mass;}
 const angle=.5*Math.atan2(2*cov[1],cov[0]-cov[2]),delta=Math.hypot(cov[0]-cov[2],2*cov[1]);
 return {mass,centre:centre.map(round),cov:cov.map(round),angle,major:Math.sqrt(Math.max(.0003,(cov[0]+cov[2]+delta)/2)),minor:Math.sqrt(Math.max(.0002,(cov[0]+cov[2]-delta)/2))};
}
function nearestPigment(rgb,palette){
 let best=0,distance=Infinity;
 for(let i=0;i<palette.length;i++){
  const p=palette[i],light=Math.max(...rgb,.03),plight=Math.max(...p,.03);
  const hue=rgb.reduce((s,v,j)=>s+(v/light-p[j]/plight)**2,0),lum=(light-plight)**2;
  const d=hue+lum*.35;if(d<distance){best=i;distance=d;}
 }return best;
}
export function observeCapture({capture,identity},params){
 const columns=Math.round(clamp(params.columns||32,12,48)),rows=Math.round(clamp(params.rows||40,16,60));
 if(capture.observation){
  const o=capture.observation;if(o.columns!==columns||o.rows!==rows||!o.cells?.length||o.cells.length>columns*rows)throw Error('Invalid stored observation');
  if(o.cells.some(c=>c.length!==4||!c.every(Number.isFinite)||c[0]<0||c[0]>1||c[1]<0||c[1]>1||c[2]<=0||c[3]<0||c[3]>=identity.palette.length))throw Error('Invalid observation cells');
  return {...o,identity};
 }
 const {pixels,width,height}=capture;if(!pixels||pixels.length!==width*height*4)throw Error('Invalid painting capture');
 const palette=identity.palette.map(hex),cells=[];
 // Nine samples per coarse cell preserve coverage and local colour distribution.
 // No traced contour, semantic face/limb detection or character-specific branches.
 for(let gy=0;gy<rows;gy++)for(let gx=0;gx<columns;gx++){
  let coverage=0;const rgb=[0,0,0];
  for(let sy=0;sy<3;sy++)for(let sx=0;sx<3;sx++){
   const x=clamp(Math.floor((gx+(sx+.5)/3)/columns*width),0,width-1),y=clamp(Math.floor((gy+(sy+.5)/3)/rows*height),0,height-1),k=((height-1-y)*width+x)*4,a=pixels[k+3]/255;
   coverage+=a;for(let j=0;j<3;j++)rgb[j]+=pixels[k+j]/255*a;
  }
  if(coverage/9>params.alphaThreshold){const index=nearestPigment(rgb.map(v=>v/coverage),palette);cells.push([(gx+.5)/columns,(gy+.5)/rows,Math.round(coverage/9*15)/15,index]);}
 }
 if(cells.length<3)throw Error('The painting subject is empty');
 let hash=2166136261;for(const c of cells)for(const value of c.slice(0,3)){hash^=Math.round(value*4096);hash=Math.imul(hash,16777619)>>>0;}
 return {columns,rows,cells,identity,origin:capture.source||'model-capture',signature:hash.toString(16).padStart(8,'0')};
}
export function readStructure({observation:o},params){
 const cells=o.cells,whole=moments(cells),count=Math.min(Math.round(clamp(params.masses||8,3,12)),cells.length),centres=[whole.centre.slice()];
 // Farthest-mass initialization and weighted clustering are deterministic.
 while(centres.length<count){let best=null,score=-1;for(const c of cells){const d=Math.min(...centres.map(p=>(c[0]-p[0])**2+(c[1]-p[1])**2))*c[2];if(d>score){score=d;best=c;}}centres.push(best.slice(0,2));}
 let groups;
 for(let iteration=0;iteration<Math.round(clamp(params.iterations||7,1,12));iteration++){
  groups=centres.map(()=>[]);for(const c of cells){let id=0,nearest=Infinity;for(let i=0;i<centres.length;i++){const d=(c[0]-centres[i][0])**2+(c[1]-centres[i][1])**2;if(d<nearest){nearest=d;id=i;}}groups[id].push(c);}
  groups.forEach((g,i)=>{if(g.length)centres[i]=moments(g).centre;});
 }
 const masses=groups.filter(g=>g.length).map((g,i)=>{
  const m=moments(g),pigments=o.identity.palette.map(()=>0);for(const c of g)pigments[c[3]]+=c[2];
  return {...m,id:i,share:m.mass/whole.mass,pigments:pigments.map(v=>v/m.mass)};
 }).sort((a,b)=>b.mass-a.mass);
 const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],sectors=Math.round(clamp(params.radialSectors||12,6,20)),radial=[];
 for(let i=0;i<sectors;i++){
  const a=i/sectors*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a);let best=cells[0],distance=-Infinity;
  for(const c of cells){const d=(c[0]-whole.centre[0])*dx+(c[1]-whole.centre[1])*dy;if(d>distance){distance=d;best=c;}}
  radial.push({point:best.slice(0,2),distance,angle:a});
 }
 // Gaps between masses affect fine paths and composition, without copying a face.
 const gaps=[];
 for(let band=0;band<6;band++){
  const cy=bounds[1]+(bounds[3]-bounds[1])*(band+.5)/6,strip=cells.filter(c=>Math.abs(c[1]-cy)<.035).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<strip.length;i++){const gap=strip[i][0]-strip[i-1][0];if(gap>.09)gaps.push({centre:[(strip[i][0]+strip[i-1][0])/2,cy],width:gap});}
 }
 gaps.sort((a,b)=>b.width-a.width);
 const pigmentWeights=o.identity.palette.map(()=>0);for(const c of cells)pigmentWeights[c[3]]+=c[2]/whole.mass;
 return {observation:o,...whole,bounds,masses,radial,gaps:gaps.slice(0,3),pigmentWeights,aspect:(bounds[2]-bounds[0])/(bounds[3]-bounds[1]),fill:whole.mass/Math.max(1,(bounds[2]-bounds[0])*(bounds[3]-bounds[1])*o.columns*o.rows),signature:o.signature};
}
export function warpPoint(p,eye,params){
 const strength=clamp(params.strength??1,0,1.8),[ex,ey]=params.eyes[eye],g=params.gazes[eye],m=params.magnification[eye];
 const dx=(p[0]-ex)*1.9,dy=(p[1]-ey)*1.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx)+g*.29+(eye?-.20:.25)*r,wide=Math.atan(r*1.8)*.64*m;
 const x=.5+g*.12+Math.cos(a)*wide+Math.sin(dy*2.7)*.06,y=.48+(ey-.45)*.18+Math.sin(a)*wide*.88+g*dx*.20;
 const warped=[.5+.452*Math.tanh((x-.5)*2.25),.5+.452*Math.tanh((y-.5)*2.25)];
 return safePoint(p.map((v,i)=>v+(warped[i]-v)*strength));
}
export function interpretGaze({structure},params){
 if(!params.eyes?.length||params.eyes.length!==2||params.gazes.length!==2||params.magnification.length!==2||[...params.eyes.flat(),...params.gazes,...params.magnification].some(v=>!Number.isFinite(v)))throw Error('Invalid painter eyes');
 const views=[0,1].map(eye=>({eye,masses:structure.masses.map(m=>{
  const ca=Math.cos(m.angle),sa=Math.sin(m.angle),c=warpPoint(m.centre,eye,params),a=warpPoint([m.centre[0]+ca*m.major,m.centre[1]+sa*m.major],eye,params),b=warpPoint([m.centre[0]-sa*m.minor,m.centre[1]+ca*m.minor],eye,params);
  return {...m,centre:c,major:Math.max(.02,Math.hypot(a[0]-c[0],a[1]-c[1])),minor:Math.max(.015,Math.hypot(b[0]-c[0],b[1]-c[1])),angle:Math.atan2(a[1]-c[1],a[0]-c[0])};
 }),radial:structure.radial.map(r=>({...r,point:warpPoint(r.point,eye,params)})),gaps:structure.gaps.map(g=>({...g,centre:warpPoint(g.centre,eye,params)}))}));
 return {structure,views,params};
}
function ribbon(x,y,length,width,angle,bend,rnd,colour,feature,eye){
 const left=[],right=[];for(let i=0;i<7;i++){
  const t=i/6,u=(t-.5)*length,v=Math.sin(t*Math.PI)*length*bend,cx=x+Math.cos(angle)*u-Math.sin(angle)*v,cy=y+Math.sin(angle)*u+Math.cos(angle)*v,r=width*(.38+rnd()*.20);
  left.push(safePoint([cx-Math.sin(angle)*r,cy+Math.cos(angle)*r]));right.push(safePoint([cx+Math.sin(angle)*r,cy-Math.cos(angle)*r]));
 }
 return {points:[...left,...right.reverse()],ridge:left.slice(1,-1),colour,rounding:.20+rnd()*.15,layer:1,thickness:1.5+rnd(),feature,eye};
}
export function paintGestures({vision:v,variation},params){
 const structure=v.structure,art=structure.observation.identity,rnd=random(variation.seed^Math.imul(variation.preset.id+1,1577334677)),marks=[],anchors=[];
 const strength=clamp(params.abstraction??1,.4,1.6),jitter=clamp(params.variation??.16,0,.45),count=Math.round(clamp(variation.preset.markCount||17,10,params.maxMarks||24));
 function pigment(m){let n=rnd(),weights=art.weights.map((w,i)=>w*.52+m.pigments[i]*.48);for(let i=0;i<weights.length;i++){n-=weights[i];if(n<=0)return art.palette[i];}return art.palette.at(-1);}
 for(let i=0;i<count;i++){
  const eye=i%2,m=v.views[eye].masses[i%v.views[eye].masses.length],x=m.centre[0]+(rnd()-.5)*jitter*.12,y=m.centre[1]+(rnd()-.5)*jitter*.12;
  const length=clamp(m.major*3.7+.065,.15,.48)*strength,width=clamp(m.minor*3.0+.025,.065,.20)*strength,angle=m.angle+variation.preset.direction*.15+(rnd()-.5)*jitter*1.4;
  const colour=pigment(m);marks.push(ribbon(x,y,length,width,angle,(rnd()-.5)*.38,rnd,colour,'mass:'+m.id,eye));
  if(i<5)anchors.push({point:safePoint([x,y]),colour,feature:'mass:'+m.id});
 }
 // Fine arcs originate in actual protrusions or negative spaces, not arbitrary
 // eye circles or accessory icons. They stay non-figurative after Po's warp.
 for(let i=0;i<4;i++){
  const eye=i%2,view=v.views[eye],gap=view.gaps[i%Math.max(1,view.gaps.length)],r=view.radial[(i*3+variation.preset.id)%view.radial.length],point=gap?.centre||r.point,radius=gap?clamp(gap.width*.55,.04,.13):.055+i*.012,points=[];
  for(let j=0;j<18;j++){const a=r.angle-.7+j/17*Math.PI*1.4;points.push(safePoint([point[0]+Math.cos(a)*radius,point[1]+Math.sin(a)*radius]));}
  marks.push({shape:'line',points,colour:art.palette[(i+1)%art.palette.length],lineWidth:i%2?.004:.008,feature:gap?'negative-space':'radial-extension',eye});
 }
 return {marks,anchors,vision:v,paper:variation.preset.paper,palette:art.palette};
}
export function spitPigment({painting,variation},params){
 const marks=painting.marks.slice(),rnd=random(variation.seed^0x51de62),count=Math.round(clamp(params.impacts??5,0,8)),satellites=Math.round(clamp(params.satellites??3,0,5)),strength=clamp(params.strength??1,0,2),impacts=[];let splatters=0;
 if(strength>0)for(let i=0;i<count;i++){
  const anchor=painting.anchors[i%painting.anchors.length],colour=anchor.colour,[x,y]=safePoint(anchor.point.map(v=>v+(rnd()-.5)*.12)),r=(.025+rnd()*.03)*strength,points=[];
  for(let j=0;j<13;j++){const a=j/13*Math.PI*2,rr=r*(.57+rnd()*.8)*(j%3===0?1.65:1);points.push(safePoint([x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8]));}
  marks.push({shape:'splat',points,colour,rounding:.10,thickness:1.8,impact:i,feature:anchor.feature});impacts.push({point:[x,y],colour});splatters++;
  for(let j=0;j<satellites;j++){
   const a=rnd()*Math.PI*2,d=r*(1.7+rnd()*2),sx=x+Math.cos(a)*d,sy=y+Math.sin(a)*d,rr=(.004+rnd()*.009)*strength,p=[];
   for(let k=0;k<6;k++){const t=k/6*Math.PI*2;p.push(safePoint([sx+Math.cos(t)*rr*(.8+rnd()*.5),sy+Math.sin(t)*rr]));}
   marks.push({shape:'splat',points:p,colour,rounding:.16,thickness:.6,impact:i,feature:anchor.feature});splatters++;
  }
  if(i%2===0)marks.push({shape:'line',points:[safePoint([x+r*.2,y+r*.2]),safePoint([x+r*.3,y+r*(2+rnd())])],colour,lineWidth:.007,impact:i,feature:anchor.feature});
 }
 return {...painting,marks,impacts,splatterCount:splatters};
}
export function finishWork({painting:p,variation},params){
 const s=p.vision.structure,o=s.observation;
 return {version:params.version||62,origin:o.origin,paper:p.paper,marks:p.marks,palette:p.palette,impactAnchors:p.impacts,splatterCount:p.splatterCount,
  preset:variation.preset.id,seed:variation.seed>>>0,modelId:o.identity.id,guideCells:o.cells.length,poseCentre:s.centre,poseSpread:[s.cov[0],s.cov[2]],
  vision:{...p.vision.params,rule:'observed-dual-gaze-v2'},
  subject:{signature:s.signature,bounds:s.bounds,centre:s.centre,aspect:round(s.aspect),fill:round(s.fill),masses:s.masses,gaps:s.gaps,radial:s.radial,pigmentWeights:s.pigmentWeights},
  observation:{columns:o.columns,rows:o.rows,cells:o.cells,signature:o.signature,origin:o.origin},identity:o.identity,
  stages:{massCentres:s.masses.map(m=>m.centre),eyeCentres:p.vision.views.map(v=>v.masses.map(m=>m.centre)),gestureMarks:p.marks.filter(m=>m.impact===undefined),impactAnchors:p.impacts}};
}
export const PAINT_OPERATORS={
 sample:{inputs:{capture:'capture',identity:'identity'},output:'observation',run:observeCapture},
 structure:{inputs:{observation:'observation'},output:'structure',run:readStructure},
 'dual-gaze':{inputs:{structure:'structure'},output:'vision',run:interpretGaze},
 gestures:{inputs:{vision:'vision',variation:'variation'},output:'painting',run:paintGestures},
 spit:{inputs:{painting:'painting',variation:'variation'},output:'painting',run:spitPigment},
 finish:{inputs:{painting:'painting',variation:'variation'},output:'work',run:finishWork}
};
