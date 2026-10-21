import {makeRoute,makeRouteState,advanceRoute,sampleRoute} from './route-motion.js?v=573fab3a318f';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Eligibility uses the same rendered surface as feet and traffic.
export function groundPatch(height,x,z,radius=.95){
 const y=height(x,z),samples=[height(x+radius,z),height(x-radius,z),height(x,z+radius),height(x,z-radius)];
 const rise=Math.max(...samples.map(h=>Math.abs(h-y)));
 return {flat:rise<.15,slopeX:(samples[0]-samples[1])/(2*radius),slopeZ:(samples[2]-samples[3])/(2*radius),rise};
}
export function forwardSlope(height,x,z,yaw){const r=.5,dx=Math.cos(yaw)*r,dz=-Math.sin(yaw)*r;return (height(x+dx,z+dz)-height(x-dx,z-dz))/(2*r);}
export function painterSchedule(t){
 const phase=t%132;
 return phase<7?'idle':phase<43?'walk':phase<59?'desperate':phase<63?'idle':phase<69.1?'sit':phase<72?'idle':phase<80.1?'lie':phase<98?'walk':phase<115?'run':'idle';
}
export function createFollower(traffic,points,{id,height=1.65,radius=height*.34+.06,fraction=0,direction=1,closed=false,speedMultiplier=1}={}){
 const speedScale=Math.max(.25,Math.min(3,Number(speedMultiplier)||1)),route=makeRoute(points),state=makeRouteState(route,fraction,direction),start=sampleRoute(route,state.distance),body=traffic.add({id,x:start.x,z:start.z,radius,height});
 let oldDistance=state.distance,planned=0,tx=Math.cos(state.yaw),tz=-Math.sin(state.yaw),yaw=state.yaw,motion=0;
 function prepare(dt,speed){
  speed*=speedScale;oldDistance=state.distance;
  if(closed){state.speed+=(speed-state.speed)*(1-Math.exp(-dt*4));planned=state.speed*dt;const ahead=sampleRoute(route,(state.distance+.5)%route.length),here=sampleRoute(route,state.distance);tx=ahead.x-here.x;tz=ahead.z-here.z;const n=Math.hypot(tx,tz)||1;tx/=n;tz/=n;state.yaw=Math.atan2(-tz,tx);}
  else{advanceRoute(route,state,speed,dt);planned=state.travel;state.distance=oldDistance;tx=Math.cos(state.yaw);tz=-Math.sin(state.yaw);}
  const center=sampleRoute(route,oldDistance),cx=center.x-body.x,cz=center.z-body.z,along=cx*tx+cz*tz;
  const speedNow=dt>0?planned/dt:0;
  body.wantX=tx*speedNow+clamp((cx-along*tx)*.65,-.55,.55);
  body.wantZ=tz*speedNow+clamp((cz-along*tz)*.65,-.55,.55);
 }
 function finish(dt){
  const progress=clamp(body.dx*tx+body.dz*tz,0,planned);
  state.distance=closed?(oldDistance+progress)%route.length:clamp(oldDistance+state.direction*progress,0,route.length);
  const speed=dt>0?body.travel/dt:0,target=speed>.06?Math.atan2(-body.dz,body.dx):state.yaw;
  const delta=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));yaw+=clamp(delta,-dt*2.5,dt*2.5);
  motion+=(clamp(speed/.3,0,1)-motion)*(1-Math.exp(-dt*7));
  return {x:body.x,y:body.y,z:body.z,yaw,speed,travel:body.travel,motion};
 }
 return {body,route,state,prepare,finish};
}
