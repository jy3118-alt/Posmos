// Plan only on selection; sampling reuses the caller's vectors each frame.
const mix=(a,b,t)=>a+(b-a)*t;
export function planLandFlight(start,end,startTarget,endTarget,height,buildings=[]){
 const distance=Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z);
 let lift=Math.max(start.y,end.y)+Math.min(24,Math.max(.5,distance*.065));
 const horizontal=Math.hypot(end.x-start.x,end.z-start.z);
 const steps=Math.min(2048,Math.max(32,Math.ceil(horizontal/.25)));
 // A vertical tangent at either end clears nearby walls before crossing the
 // village. Solve the Bézier height against terrain and rotated building boxes.
 for(let i=1;i<steps;i++){
  const t=i/steps,q=1-t,u=t*t*(3-2*t),x=mix(start.x,end.x,u),z=mix(start.z,end.z,u);
  let floor=height(x,z)+.25;
  for(const b of buildings){
   const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0);
   if(Math.abs(c*dx-s*dz)<b.width*.5+.25&&Math.abs(s*dx+c*dz)<b.depth*.5+.25)floor=Math.max(floor,b.y+b.height+.35);
  }
  lift=Math.max(lift,(floor-q*q*q*start.y-t*t*t*end.y)/(3*q*t));
 }
 return {start:{...start},end:{...end},startTarget:{...startTarget},endTarget:{...endTarget},lift,duration:Math.min(2.4,Math.max(.65,.65+Math.sqrt(distance)*.085)),elapsed:0};
}
export function sampleLandFlight(flight,elapsed,out){
 const p=Math.max(0,Math.min(1,elapsed/flight.duration));
 // Quintic easing gives zero velocity/acceleration at both ends.
 const t=p*p*p*(p*(p*6-15)+10),q=1-t,u=t*t*(3-2*t);
 out.position.x=mix(flight.start.x,flight.end.x,u);
 out.position.z=mix(flight.start.z,flight.end.z,u);
 out.position.y=q*q*q*flight.start.y+3*q*t*flight.lift+t*t*t*flight.end.y;
 out.target.x=mix(flight.startTarget.x,flight.endTarget.x,u);
 out.target.y=mix(flight.startTarget.y,flight.endTarget.y,u);
 out.target.z=mix(flight.startTarget.z,flight.endTarget.z,u);
 out.progress=p;out.done=p===1;return out;
}
