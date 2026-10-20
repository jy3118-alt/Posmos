import * as T from 'three';
import {paintRegions,regionWeights} from './paint-island-plan.js?v=a2b9f13c5d88';

// A single startup-baked ground map: soft overlapping colour fields, continuous
// paths and distinct small garden beds on the real original terrain triangles.
export function paintIslandGroundTexture(city){
 const c=document.createElement('canvas');c.width=c.height=2048;const ctx=c.getContext('2d'),s=2048/304;
 const small=document.createElement('canvas');small.width=small.height=384;const sc=small.getContext('2d'),pixels=sc.createImageData(384,384);
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),colours=paintRegions.map(r=>rgb(r.ground));
 for(let j=0;j<384;j++)for(let i=0;i<384;i++){
  const x=i/383*304-152,z=j/383*304-152,y=city.height(x,z),weights=regionWeights(x,z),k=(j*384+i)*4;
  const shore=1-T.MathUtils.smoothstep(y,city.sea+1.6,city.sea+5.5),sand=[241,215,157];
  const dx=city.height(x+.75,z)-y,dz=city.height(x,z+.75)-y,steep=T.MathUtils.smoothstep(Math.hypot(dx,dz),.75,2.3),rock=[211,182,130];
  for(let q=0;q<3;q++){let v=weights.reduce((n,w,r)=>n+w*colours[r][q],0);v=T.MathUtils.lerp(v,sand[q],shore);v=T.MathUtils.lerp(v,rock[q],steep*.58);pixels.data[k+q]=Math.round(v);}
  pixels.data[k+3]=255;
 }
 sc.putImageData(pixels,0,0);ctx.drawImage(small,0,0,2048,2048);
 const point=(x,z)=>[(x+152)*s,(z+152)*s],stroke=(points,width,colour)=>{ctx.lineWidth=width*s;ctx.strokeStyle=colour;ctx.beginPath();points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...point(p.x,p.z)));ctx.stroke();};
 ctx.lineCap=ctx.lineJoin='round';
 // River banks fade into neighbouring regions rather than ending at a tile edge.
 stroke(city.worldPlan.river,9.2,'#bca77f');stroke(city.worldPlan.river,7.1,'#d4c39e');
 for(const points of city.paintPaths||city.paths){stroke(points,4.1,'#a99b72');stroke(points,3.5,'#e6d5ad');stroke(points,1.8,'#eddfbb');}
 function patch(x,z,rx,rz,colour){ctx.save();ctx.translate(...point(x,z));ctx.rotate(Math.sin(x*.12)*.35);ctx.fillStyle=colour;ctx.beginPath();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,r=1+.05*Math.sin(a*5+x);ctx[i?'lineTo':'moveTo'](Math.cos(a)*rx*s*r,Math.sin(a)*rz*s*r);}ctx.closePath();ctx.fill();ctx.restore();}
 // A clear work area, then pigment gardens on either side, not grass on paths.
 patch(0,8,6.4,5.4,'#ead5b1');
 for(const p of [[-8,10,2.3,3,'#c6a3a2'],[4,15,3,1.4,'#b8b68c'],[-15,-12,3,2,'#cfb491'],[34,-25,4,2,'#b9b2bc'],[41,40,4,2,'#b9b0b9']])patch(...p);
 let seed=45291;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<720;i++){const x=(r()-.5)*205,z=(r()-.5)*205;if(city.height(x,z)<city.sea+5)continue;const [px,pz]=point(x,z);ctx.strokeStyle=i%2?'#fff0d21b':'#415d6410';ctx.lineWidth=.7+r();ctx.beginPath();ctx.moveTo(px,pz);ctx.lineTo(px+3+r()*11,pz-1-r()*3);ctx.stroke();}
 // Paint is a story detail concentrated around the atelier and trails.
 const inks=['#eaaa69','#ca7d91','#69b6b4','#9999be','#e5bf64'];
 for(let i=0;i<58;i++){const a=r()*6.28,d=6+Math.sqrt(r())*18,x=Math.cos(a)*d-5,z=Math.sin(a)*d+3;if(city.height(x,z)<city.sea+3)continue;ctx.globalAlpha=.40;ctx.fillStyle=inks[i%inks.length];ctx.beginPath();ctx.ellipse(...point(x,z),(.14+r()*.65)*s,(.1+r()*.32)*s,r()*6.28,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.flipY=false;t.anisotropy=8;return t;
}
