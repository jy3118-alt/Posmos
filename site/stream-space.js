// The rendered river and this query share the same segmented water profile.
// Bridges remain dry because the real upper-envelope walking surface is higher.
export function installStreamSpace(city){
 if(!city.worldPlan?.sampleStream)return;
 city.waterAt=(x,z,out={})=>{const r=city.worldPlan.sampleStream(x,z,out);if(!r||r.d>r.width)return null;const floor=city.height(x,z),depth=r.level-floor;if(depth<.035)return null;r.floor=floor;r.surfaceY=r.level;r.waterDepth=depth;return r;};
 city.streamNear=(x,z,out={})=>{const r=city.worldPlan.sampleStream(x,z,out);return r&&r.d<r.width+2.7?r:null;};
}

export function streamImmersion(depth,height){const a=height*.20,b=height*.68,u=Math.max(0,Math.min(1,(depth-a)/(b-a)));return u*u*(3-2*u);}

// Choose two clear, gentle bank-to-bank routes on the lower stream. They are
// real routes used by existing residents, not additional demonstration actors.
export function streamCrossings(city,safe){
 if(!city.waterAt)return [];const routes=[];
 for(let i=108;i<146&&routes.length<2;i+=4){
  const p=city.worldPlan.river[i],q=city.worldPlan.sampleStream(p.x,p.z),nx=-q.flowZ,nz=q.flowX,r=q.width+3.6;
  const points=[-1,-.5,0,.5,1].map(u=>({x:p.x+nx*r*u,z:p.z+nz*r*u}));
  if(city.waterAt(points[0].x,points[0].z)||city.waterAt(points[4].x,points[4].z))continue;
  if(routes.some(route=>Math.hypot(route[2].x-p.x,route[2].z-p.z)<9))continue;
  let clear=true;for(let j=0;j<=32;j++){const u=j/32,x=points[0].x+(points[4].x-points[0].x)*u,z=points[0].z+(points[4].z-points[0].z)*u;if(!safe(x,z,{radius:.55,canSwim:true})){clear=false;break;}}
  if(clear)routes.push(points);
 }
 return routes;
}
