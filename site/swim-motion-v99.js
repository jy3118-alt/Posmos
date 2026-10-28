// Swept character collision and camera clearance, independent of the DOM.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const SWIM_CLEARANCE=.85,SWIM_SURFACE=-.8,SWIM_RADIUS=.6;
export function swimFloor(height,x,z){
 let y=height(x,z);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;y=Math.max(y,height(x+Math.cos(a)*SWIM_RADIUS,z+Math.sin(a)*SWIM_RADIUS));}
 return y;
}
export function moveSwimmer(position,delta,{height,rocks=[],limit=500}){
 const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y,delta.z)/.18)),dx=delta.x/steps,dy=delta.y/steps,dz=delta.z/steps,p={...position};
 for(let i=0;i<steps;i++){
  const old={...p},floor=swimFloor(height,p.x,p.z)+SWIM_CLEARANCE;
  p.y=clamp(p.y+dy,Math.min(SWIM_SURFACE,floor),SWIM_SURFACE);
  const pass=(x,z)=>swimFloor(height,x,z)+SWIM_CLEARANCE<=p.y+.025;
  const x=clamp(p.x+dx,-limit,limit),z=clamp(p.z+dz,-limit,limit);
  if(pass(x,z)){p.x=x;p.z=z;}else{if(pass(x,p.z))p.x=x;if(pass(p.x,z))p.z=z;}
  for(let round=0;round<6;round++)for(const r of rocks){
   if(p.y<r.y-SWIM_RADIUS||p.y>r.top+SWIM_RADIUS)continue;
   const ax=p.x-r.x,az=p.z-r.z,d=Math.hypot(ax,az),radius=r.r+SWIM_RADIUS;if(d>=radius)continue;
   const nx=d>.00001?ax/d:1,nz=d>.00001?az/d:0,rx=r.x+nx*(radius+.002),rz=r.z+nz*(radius+.002);
   if(pass(rx,rz)){p.x=rx;p.z=rz;}else{p.x=old.x;p.z=old.z;}
  }
  p.y=Math.max(p.y,Math.min(SWIM_SURFACE,swimFloor(height,p.x,p.z)+SWIM_CLEARANCE));
  // Overlapping rock bounds may oppose each other's push; keep the last safe step.
  if(rocks.some(r=>p.y>=r.y-SWIM_RADIUS&&p.y<=r.top+SWIM_RADIUS&&Math.hypot(p.x-r.x,p.z-r.z)<r.r+SWIM_RADIUS-.00001))Object.assign(p,old);
 }
 return p;
}
export function swimCameraPoint(focus,desired,{height,rocks=[]}){
 let result={...focus};const length=Math.hypot(desired.x-focus.x,desired.y-focus.y,desired.z-focus.z),steps=Math.max(1,Math.ceil(length/.15));
 for(let i=1;i<=steps;i++){
  const u=i/steps,p={x:focus.x+(desired.x-focus.x)*u,y:Math.min(-.12,focus.y+(desired.y-focus.y)*u),z:focus.z+(desired.z-focus.z)*u};
  if(height(p.x,p.z)+.3>p.y||rocks.some(r=>p.y>r.y-.25&&p.y<r.top+.25&&Math.hypot(p.x-r.x,p.z-r.z)<r.r+.25))break;
  result=p;
 }
 return result;
}
