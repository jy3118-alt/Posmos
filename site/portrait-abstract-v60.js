import {CHARACTER_ART,normaliseArt} from './character-art.js?v=5bc4fcffc216';
// One hundred sparse compositions; identity is colour/rhythm, never a traced face.
export const ABSTRACT_PRESETS=Object.freeze(Array.from({length:100},(_,id)=>Object.freeze({id,family:'abstract',paper:['#eee7d8','#e9e6dc','#f2eadb'][id%3],sweep:Math.floor(id/10),direction:(id%10-4.5)*.13,markCount:13+id%7})));
export function abstractPreset(id,art=CHARACTER_ART.base){const recipe=ABSTRACT_PRESETS[((id%100)+100)%100],identity=normaliseArt(art.id||'base',art);return {...recipe,name:identity.label+' · 색의 리듬',pigments:identity.palette,weights:identity.weights,rhythm:identity.rhythm,modelId:identity.id};}
export function abstractStyleForWork(seed,serial,fixed,art){const id=Number.isInteger(fixed)?fixed:((seed%100)+serial*37)%100;return abstractPreset(id,art);}
function random(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function tint(hex,amount){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return `rgb(${c.map(v=>Math.round(amount<0?v*(1+amount):v+(255-v)*amount)).join(',')})`;}
export function buildAbstractWork(source,w,h,preset,seed=1){
 const rnd=random((seed^Math.imul(preset.id+1,1577334677))>>>0),cells=[];
 for(let gy=0;gy<24;gy++)for(let gx=0;gx<20;gx++){const x=Math.floor((gx+.5)/20*w),y=Math.floor((gy+.5)/24*h),k=((h-1-y)*w+x)*4;if(source[k+3]>90)cells.push([(gx+.5)/20,(gy+.5)/24]);}
 if(!cells.length)throw Error('The portrait capture is empty; keep the previous work.');
 const centre=cells.reduce((s,p)=>(s[0]+=p[0]/cells.length,s[1]+=p[1]/cells.length,s),[0,0]);
 // Only two coarse moments of the pose survive. No silhouette, facial features,
 // literal accessories, eye circles or ordered body-part paint regions.
 const spread=cells.reduce((s,p)=>(s[0]+=(p[0]-centre[0])**2/cells.length,s[1]+=(p[1]-centre[1])**2/cells.length,s),[0,0]);
 const marks=[],palette=preset.pigments,weights=preset.weights||palette.map(()=>1/palette.length),phase=preset.sweep*.44+spread[0]*6;
 const pigment=()=>{let n=rnd();for(let i=0;i<weights.length;i++){n-=weights[i];if(n<=0)return palette[i];}return palette.at(-1);};
 function ribbon(x,y,length,width,angle,colour,layer=1){const left=[],right=[],n=6,bend=(rnd()-.5)*.85;
  for(let j=0;j<n;j++){const t=j/(n-1),along=(t-.5)*length,cross=Math.sin(t*Math.PI*2+phase)*length*bend*.25,cx=x+Math.cos(angle)*along-Math.sin(angle)*cross,cy=y+Math.sin(angle)*along+Math.cos(angle)*cross,r=width*(.32+rnd()*.22);left.push([clamp(cx-Math.sin(angle)*r,.06,.94),clamp(cy+Math.cos(angle)*r,.06,.94)]);right.push([clamp(cx+Math.sin(angle)*r,.06,.94),clamp(cy-Math.cos(angle)*r,.06,.94)]);}
  marks.push({points:[...left,...right.reverse()],ridge:left.slice(1,-1),colour,layer,rounding:.2+rnd()*.23,thickness:1.3+rnd()*1.5});
 }
 for(let i=0;i<preset.markCount;i++){const angle=phase+i*2.399+centre[0]*.9,rad=.12+rnd()*.23,x=.5+Math.cos(angle)*rad,y=.5+Math.sin(angle)*rad*.95;
  ribbon(x,y,.18+rnd()*.39,.055+rnd()*.12,preset.direction+(rnd()-.5)*2.8+preset.rhythm,pigment());
 }
 // Circles, arcs and fine trajectories counterbalance the heavy paint masses.
 // Their positions are compositional, unrelated to eyes, head or limbs.
 for(let i=0;i<4;i++){const x=.13+rnd()*.74,y=.12+rnd()*.76,r=.04+rnd()*.12,colour=pigment();marks.push({shape:i%2?'arc':'disc',x,y,r,start:rnd()*2,end:Math.PI*(1.3+rnd()*.5),colour,layer:2,thickness:1.5});}
 for(let i=0;i<3;i++){const x=.12+rnd()*.76,y=.12+rnd()*.76,angle=phase+rnd()*Math.PI;marks.push({shape:'line',points:[[x,y],[clamp(x+Math.cos(angle)*.3,.06,.94),clamp(y+Math.sin(angle)*.3,.06,.94)]],colour:palette[(i+1)%palette.length],layer:2,thickness:1});}
 return {paper:preset.paper,marks,guideCells:cells.length,poseCentre:centre,poseSpread:spread,preset:preset.id,seed:seed>>>0,modelId:preset.modelId};
}
function path(ctx,points,dx=0,dy=0,rounding=.2){
 ctx.beginPath();const n=points.length;
 for(let i=0;i<n;i++){
  const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n];
  const x=b[0]+(a[0]-b[0])*rounding+dx,y=b[1]+(a[1]-b[1])*rounding+dy;
  ctx[i?'lineTo':'moveTo'](x,y);ctx.quadraticCurveTo(b[0]+dx,b[1]+dy,b[0]+(c[0]-b[0])*rounding+dx,b[1]+(c[1]-b[1])*rounding+dy);
 }
 ctx.closePath();
}
export function* paintAbstractRows(ctx,work,w,h){
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=work.paper;ctx.fillRect(0,0,w,h);ctx.scale(w,h);
 try{
 for(let i=0;i<work.marks.length;i++){
  const mark=work.marks[i],thick=mark.thickness/w;
  if(mark.shape){ctx.strokeStyle=ctx.fillStyle=mark.colour;ctx.lineWidth=mark.shape==='arc'?.009:.004;ctx.beginPath();if(mark.shape==='disc'||mark.shape==='arc'){ctx.arc(mark.x,mark.y,mark.r,mark.shape==='disc'?0:mark.start,mark.shape==='disc'?Math.PI*2:mark.end);if(mark.shape==='disc')ctx.fill();else ctx.stroke();}else{mark.points.forEach((p,j)=>ctx[j?'lineTo':'moveTo'](...p));ctx.stroke();}if(i%6===5)yield null;continue;}
  // A narrow dark lower lip and a few bristle ridges imply raised paint.
  // No canvas-wide blur, speckle, saturation filter or texture downloads.
  path(ctx,mark.points,thick*.55,thick*.85,mark.rounding);ctx.fillStyle=tint(mark.colour,-.18);ctx.fill();
  path(ctx,mark.points,0,0,mark.rounding);ctx.fillStyle=mark.colour;ctx.fill();
  if(mark.layer&&i%3===0&&mark.ridge.length>1){
   ctx.beginPath();mark.ridge.forEach((p,j)=>ctx[j?'lineTo':'moveTo'](p[0],p[1]));ctx.strokeStyle=tint(mark.colour,.14);ctx.lineWidth=.0014;ctx.lineJoin='round';ctx.stroke();
  }
  if(i%6===5)yield null;
 }
 }finally{ctx.restore();}return ctx;
}
export function renderAbstract(ctx,work,w,h){const it=paintAbstractRows(ctx,work,w,h);let next;do{next=it.next();}while(!next.done);return ctx;}
