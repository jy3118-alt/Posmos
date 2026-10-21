const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function makeRoute(points){const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));return {points,lengths,length:lengths.at(-1)};}
function sample(route,d){d=clamp(d,0,route.length);let lo=0,hi=route.points.length-2;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(route.lengths[mid+1]<d)lo=mid+1;else hi=mid;}const a=route.points[lo],b=route.points[lo+1],u=(d-route.lengths[lo])/Math.max(1e-8,route.lengths[lo+1]-route.lengths[lo]);return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,dx:b.x-a.x,dz:b.z-a.z};}
function bearing(route,state){const here=sample(route,state.distance),ahead=sample(route,state.distance+state.direction*1.2);let dx=ahead.x-here.x,dz=ahead.z-here.z;if(Math.hypot(dx,dz)<.01){dx=here.dx*state.direction;dz=here.dz*state.direction;}return Math.atan2(-dz,dx);}
export function makeRouteState(route,fraction,direction){const state={distance:route.length*fraction,direction,speed:0,yaw:0,motion:0,travel:0};state.yaw=bearing(route,state);return state;}
// Integrated distance never depends on an animation loop or resets on a clock.
// Brake at each open path end, turn in place, then accelerate in the new direction.
export function advanceRoute(route,state,cruiseSpeed,dt){
 dt=clamp(dt,0,.05);const remaining=state.direction>0?route.length-state.distance:state.distance;
 if(remaining<.015&&state.speed<.18){state.direction*=-1;state.speed=0;}
 const target=bearing(route,state),delta=Math.atan2(Math.sin(target-state.yaw),Math.cos(target-state.yaw));state.yaw+=clamp(delta,-dt*1.8,dt*1.8);
 const left=state.direction>0?route.length-state.distance:state.distance,desired=Math.min(cruiseSpeed,Math.sqrt(Math.max(0,left)*2*1.1))*Math.max(0,Math.cos(delta));
 state.speed+=(desired-state.speed)*(1-Math.exp(-dt*5.5));const old=state.distance;state.distance=clamp(old+state.direction*state.speed*dt,0,route.length);state.travel=Math.abs(state.distance-old);
 if(state.travel<1e-8&&left<.02)state.speed=0;
 state.motion+=(clamp(state.speed/Math.max(.001,cruiseSpeed*.65),0,1)-state.motion)*(1-Math.exp(-dt*5));
 return sample(route,state.distance);
}

export {sample as sampleRoute};
