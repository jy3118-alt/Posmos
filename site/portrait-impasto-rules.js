// 100 compositions, not 100 bitmap files. All keep the reference's three
// pigments. The captured model's occupied cells and pose guide the paint masses.
const palettes=[
 ['#d82532','#1242bb','#d6c12b'],['#dc303b','#1746be','#d0bd24'],
 ['#cf2431','#194cca','#dfc62b'],['#de2d35','#153eb1','#d8c529'],
 ['#d92936','#1a4ac2','#dfc932']
];
const gestures=['교차','회전','도약','물결','사선','겹침','비틀림','펼침','되돌림','리듬'];
export const IMPASTO_PRESETS=Object.freeze(Array.from({length:100},(_,id)=>Object.freeze({
 id,family:'impasto',name:'세 가지 물감 · '+String(id+1).padStart(3,'0'),
 pigments:palettes[id%5],paper:id%3===0?'#e4e0d5':'#e9e5da',
 gesture:gestures[Math.floor(id/10)],direction:(id%10-4.5)*.105,
 sweep:Math.floor(id/10),mass:.88+(id%7)*.035,markCount:34+id%8
})));
export function impastoStyleForWork(seed,serial,fixed){
 const id=Number.isInteger(fixed)?((fixed%100)+100)%100:((seed%100)+serial*37)%100;
 return IMPASTO_PRESETS[id];
}
function random(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function tint(hex,amount){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return `rgb(${c.map(v=>Math.round(amount<0?v*(1+amount):v+(255-v)*amount)).join(',')})`;}

export function buildImpastoWork(source,w,h,preset,seed=1){
 const rnd=random((seed^Math.imul(preset.id+1,1577334677))>>>0),cells=[];
 // WebGL readback is bottom-up. No eye/mouth tracing or generic face template.
 for(let gy=0;gy<48;gy++)for(let gx=0;gx<38;gx++){
  const x=Math.floor((gx+.5)/38*w),y=Math.floor((gy+.5)/48*h),k=((h-1-y)*w+x)*4;
  if(source[k+3]>90)cells.push({x:(gx+.5)/38,y:(gy+.5)/48,tone:(source[k]+source[k+1]+source[k+2])/765});
 }
 if(!cells.length)throw new Error('The portrait capture is empty; keep the previous work.');
 const centre=cells.reduce((s,p)=>(s.x+=p.x/cells.length,s.y+=p.y/cells.length,s),{x:0,y:0});
 const marks=[],palette=preset.pigments;
 function ribbon(x,y,length,width,angle,colour,layer){
  // A spatula's broad, folded stroke: a few bends and chisel ends, no pixel noise.
  const n=5+Math.floor(rnd()*3),mid=[],left=[],right=[],bend=(rnd()-.5)*.58;
  for(let j=0;j<n;j++){
   const t=j/(n-1),along=(t-.5)*length,cross=Math.sin(t*Math.PI*2+seed%19)*length*bend*.28;
   const cx=x+Math.cos(angle)*along-Math.sin(angle)*cross,cy=y+Math.sin(angle)*along+Math.cos(angle)*cross;
   const r=width*(.32+rnd()*.25)*(j===0||j===n-1?.7:1);
   mid.push([cx,cy]);left.push([clamp(cx-Math.sin(angle)*r,.025,.975),clamp(cy+Math.cos(angle)*r,.025,.975)]);
   right.push([clamp(cx+Math.sin(angle)*r,.025,.975),clamp(cy-Math.cos(angle)*r,.025,.975)]);
  }
  marks.push({points:[...left,...right.reverse()],ridge:left.slice(1,-1),colour,layer,rounding:layer===0?.07:.18+rnd()*.22,thickness:layer===0?.7:2.0+rnd()*2.0});
 }
 // Muted planes leave open canvas between the three emphatic paint masses.
 for(let i=0;i<7;i++){
  const p=cells[Math.floor(rnd()*cells.length)];
  ribbon(.5+(p.x-centre.x)*1.15,.49+(p.y-centre.y)*.96,.26+rnd()*.26,.10+rnd()*.07,(rnd()-.5)*2.5,['#aaa99e','#b7b6aa','#98aba9'][i%3],0);
 }
 const cx=[.35,.43,.69],cy=[.32,.72,.29],phase=preset.sweep*.32;
 for(let i=0;i<preset.markCount;i++){
  const p=cells[Math.floor(rnd()*cells.length)],x=clamp(.5+(p.x-centre.x)*1.22+(rnd()-.5)*.065,.12,.88),y=clamp(.49+(p.y-centre.y)*1.04+(rnd()-.5)*.065,.12,.88);
  const distances=cx.map((c,k)=>(x-c-Math.sin(phase+k)*.09)**2+(y-cy[k]-Math.cos(phase+k)*.07)**2);
  let pigment=distances.indexOf(Math.min(...distances));if(rnd()<.23)pigment=Math.floor(rnd()*3);
  const angle=preset.direction+(pigment===0?-.35:pigment===1?-.72:1.05)+(rnd()-.5)*1.7+Math.sin(i*.9+preset.sweep)*.35;
  const large=i<10,length=(large?.34:.18)+rnd()*(large?.25:.24),width=(large?.12:.07)+rnd()*.065;
  ribbon(x,y,length*preset.mass,width,angle,palette[pigment],1);
 }
 // Three tiny contrasting scoops; a little teal keeps the reference's accident.
 for(let i=0;i<3;i++){const p=cells[Math.floor(rnd()*cells.length)];ribbon(p.x,p.y,.08+rnd()*.08,.035+rnd()*.025,rnd()*Math.PI,i===0?'#488e97':palette[(i+preset.id)%3],2);}
 return {paper:preset.paper,marks,guideCells:cells.length,poseCentre:centre,preset:preset.id,seed:seed>>>0};
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
export function* paintImpastoRows(ctx,work,w,h){
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=work.paper;ctx.fillRect(0,0,w,h);ctx.scale(w,h);
 try{
 for(let i=0;i<work.marks.length;i++){
  const mark=work.marks[i],thick=mark.thickness/w;
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
export function renderImpasto(ctx,work,w,h){const it=paintImpastoRows(ctx,work,w,h);let next;do{next=it.next();}while(!next.done);return ctx;}
