// Width, surface and flow are interpolated from the authored Blender river.
export function sampleCoastRiver(points,x,z,out={}){
 let best=Infinity;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);if(len<1e-8)continue;
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(len*len))),d=Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);
  if(d<best){best=d;Object.assign(out,{d,level:a[1]+(b[1]-a[1])*t,width:a[3]+(b[3]-a[3])*t,flowX:dx/len,flowZ:dz/len,z:a[2]+dz*t});}
 }
 return out;
}
