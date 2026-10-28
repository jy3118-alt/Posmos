import {ABSTRACT_PRESETS,abstractPreset as basePreset,buildAbstractWork as baseWork} from './portrait-abstract-v60.js?v=4baf9416a5b8';
export {ABSTRACT_PRESETS};
// Po's invented optics, not a simulation of biological chameleon vision.
// Two vertically displaced eyes see divergent directions with unequal scale.
export const PO_VISION=Object.freeze({name:'Po · 어긋난 두 시점',eyes:[[.30,.27],[.70,.64]],gazes:[-.65,.72],magnification:[1.32,.86],rule:'dual-gaze-v1'});
export function abstractPreset(id,art){return {...basePreset(id,art),vision:PO_VISION};}
export function abstractStyleForWork(seed,serial,fixed,art){return abstractPreset(Number.isInteger(fixed)?fixed:((seed%100)+serial*37)%100,art);}
function random(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const clamp=(n,a=.045,b=.955)=>Math.max(a,Math.min(b,n));
export function poView(point,eye,phase=0){
 const [ex,ey]=PO_VISION.eyes[eye],g=PO_VISION.gazes[eye],m=PO_VISION.magnification[eye];
 const dx=(point[0]-ex)*1.9,dy=(point[1]-ey)*1.5,r=Math.hypot(dx,dy);
 const a=Math.atan2(dy,dx)+g*.29+(eye?-.20:.25)*r;
 const wide=Math.atan(r*1.8)*.64*m;
 const x=.50+g*.12+Math.cos(a)*wide+Math.sin(dy*2.7+phase)*.06;
 const y=.48+(ey-.45)*.18+Math.sin(a)*wide*.88+g*dx*.20;
 // Soft compression keeps broad marks on paper without flat clipped edges.
 return [.5+.452*Math.tanh((x-.5)*2.25),.5+.452*Math.tanh((y-.5)*2.25)];
}
export function buildAbstractWork(source,w,h,preset,seed=1){
 const work=baseWork(source,w,h,preset,seed),rnd=random(seed^0x51de61),phase=(preset.id%10)*.11;
 work.marks=work.marks.map((mark,i)=>{
  const eye=i%2,warp=p=>poView(p,eye,phase);let copy={...mark,eye};
  if(mark.shape==='disc'||mark.shape==='arc'){
   const closed=mark.shape==='disc',start=closed?0:mark.start,end=closed?Math.PI*2:mark.end,points=[];
   for(let j=0;j<=40;j++){const a=start+(end-start)*j/40;points.push(warp([mark.x+Math.cos(a)*mark.r,mark.y+Math.sin(a)*mark.r]));}
   copy={...copy,shape:closed?'patch':'line',points,rounding:.18,lineWidth:closed?0:.009};
  }else{copy.points=mark.points.map(warp);if(mark.ridge)copy.ridge=mark.ridge.map(warp);}
  return copy;
 });
 // A handful of blunt impacts, uneven satellites and short runs. No fine noise.
 const palette=preset.pigments;let splatters=0;
 for(let i=0;i<5;i++){
  const colour=palette[(i+Math.floor(rnd()*palette.length))%palette.length],x=.13+rnd()*.74,y=.12+rnd()*.76,r=.025+rnd()*.035,points=[];
  for(let j=0;j<13;j++){const a=j/13*Math.PI*2,rr=r*(.57+rnd()*.8)*(j%3===0?1.65:1);points.push([clamp(x+Math.cos(a)*rr),clamp(y+Math.sin(a)*rr*.8)]);}
  work.marks.push({shape:'splat',points,colour,rounding:.10,thickness:1.8,impact:i});splatters++;
  for(let j=0;j<3;j++){
   const a=rnd()*Math.PI*2,d=r*(1.7+rnd()*2.0),sx=clamp(x+Math.cos(a)*d),sy=clamp(y+Math.sin(a)*d),rr=.004+rnd()*.009,p=[];
   for(let k=0;k<6;k++){const t=k/6*Math.PI*2;p.push([clamp(sx+Math.cos(t)*rr*(.8+rnd()*.5)),clamp(sy+Math.sin(t)*rr)]);}
   work.marks.push({shape:'splat',points:p,colour,rounding:.16,thickness:.6,impact:i});splatters++;
  }
  if(i%2===0)work.marks.push({shape:'line',points:[[x+r*.22,y+r*.2],[x+r*.3,y+r*(2.0+rnd())]],colour,lineWidth:.007});
 }
 return {...work,version:61,vision:PO_VISION,palette:[...palette],splatterCount:splatters};
}
function tint(hex,k){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return `rgb(${c.map(v=>Math.round(k<0?v*(1+k):v+(255-v)*k)).join(',')})`;}
const number=x=>Number(x.toFixed(6));
function polygon(points,rounding=.2,dx=0,dy=0){
 let d='';const n=points.length;
 for(let i=0;i<n;i++){const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n];d+=(i?'L':'M')+`${number(b[0]+(a[0]-b[0])*rounding+dx)} ${number(b[1]+(a[1]-b[1])*rounding+dy)}Q${number(b[0]+dx)} ${number(b[1]+dy)} ${number(b[0]+(c[0]-b[0])*rounding+dx)} ${number(b[1]+(c[1]-b[1])*rounding+dy)}`;}
 return d+'Z';
}
const line=points=>points.map((p,i)=>(i?'L':'M')+p.map(number).join(' ')).join('');
// Exactly the same normalized paths drive live canvas, export PNG and SVG.
export function artLayers(work){const layers=[];
 for(let i=0;i<work.marks.length;i++){
  const m=work.marks[i];
  if(m.shape==='line'){layers.push({d:line(m.points),stroke:m.colour,width:m.lineWidth||.004});continue;}
  const t=(m.thickness||1.5)/512;
  if(m.shape!=='patch')layers.push({d:polygon(m.points,m.rounding,t*.55,t*.85),fill:tint(m.colour,-.18)});
  layers.push({d:polygon(m.points,m.rounding),fill:m.colour});
  if(m.layer&&i%3===0&&m.ridge?.length>1)layers.push({d:line(m.ridge),stroke:tint(m.colour,.14),width:.0014});
 }
 return layers;
}
export function* paintAbstractRows(ctx,work,w,h){
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=work.paper;ctx.fillRect(0,0,w,h);ctx.scale(w,h);
 try{let i=0;for(const layer of artLayers(work)){const p=new Path2D(layer.d);if(layer.fill){ctx.fillStyle=layer.fill;ctx.fill(p);}else{ctx.strokeStyle=layer.stroke;ctx.lineWidth=layer.width;ctx.lineJoin=ctx.lineCap='round';ctx.stroke(p);}if(++i%12===0)yield null;}}finally{ctx.restore();}
 return ctx;
}
export function renderAbstract(ctx,work,w,h){for(const _ of paintAbstractRows(ctx,work,w,h)){}return ctx;}
const xml=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function exportArtworkSVG(work,title='Po · 두 개의 시점'){
 const paths=artLayers(work).map(l=>`<path d="${l.d}" fill="${l.fill||'none'}"${l.stroke?` stroke="${l.stroke}" stroke-width="${l.width}" stroke-linejoin="round" stroke-linecap="round"`:''}/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="5120" viewBox="0 0 1 1" preserveAspectRatio="none"><title>${xml(title)}</title><metadata>${xml(JSON.stringify({version:work.version,seed:work.seed,preset:work.preset,model:work.modelId,vision:work.vision.rule,palette:work.palette}))}</metadata><rect width="1" height="1" fill="${work.paper}"/>${paths}</svg>`;
}
