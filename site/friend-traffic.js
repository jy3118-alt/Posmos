import {indexVillageObstacles} from './static-obstacles-v73.js?v=5bc4fcffc216';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=(x,z)=>Math.hypot(x,z);
// Everyone proposes before anyone moves. Anticipatory steering passes on the
// right; a final disc constraint prevents bodies tunnelling through each other.
export function createFriendTraffic({height=()=>0,safe=()=>true,water=()=>null,spatial=false}={}){
 const agents=[];let contacts=0,yielding=0;
 const bins=new Map(),scratch=[];let checks=0;
 function index(projected=false){for(const list of bins.values())list.length=0;for(const a of agents){const key=Math.floor((projected?a.nx:a.x)/8)*4096+Math.floor((projected?a.nz:a.z)/8);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(a);}}
 function neighbours(a,radius=1,projected=false){if(!spatial)return agents;scratch.length=0;const x=Math.floor((projected?a.nx:a.x)/8),z=Math.floor((projected?a.nz:a.z)/8);for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){const list=bins.get((x+dx)*4096+z+dz);if(list)for(const b of list)scratch.push(b);}return scratch;}
 function add({id,x,z,y=height(x,z),radius=.61,height:bodyHeight=1.65,movable=true}){
  const a={id,index:agents.length,x,z,y,radius,height:bodyHeight,movable,vx:0,vz:0,wantX:0,wantZ:0,dx:0,dz:0,travel:0,yielding:false};agents.push(a);return a;
 }
 const sameLevel=(a,b)=>Math.abs((a.contactY??a.y)-(b.contactY??b.y))<Math.min(a.height,b.height)*.72;
 function allowed(a,x,z){const drop=a.y-height(x,z);return safe(x,z,a)&&(Math.abs(drop)<.42||a.canSwim&&water(x,z)&&drop>=0&&drop<2.6);}
 function step(dt){
  dt=clamp(dt,0,.05);if(!dt)return;contacts=0;yielding=0;checks=0;if(spatial)index();
  for(const a of agents){a.nx=a.x;a.nz=a.z;a.yielding=false;if(!a.movable)continue;
   const speed=length(a.wantX,a.wantZ),fx=speed>.001?a.wantX/speed:0,fz=speed>.001?a.wantZ/speed:0,rx=fz,rz=-fx;
   let brake=1,side=0,pushX=0,pushZ=0;
   for(const b of neighbours(a,2)){if(a===b||!sameLevel(a,b))continue;checks++;
    const dx=b.x-a.x,dz=b.z-a.z,distance=length(dx,dz),clear=a.radius+b.radius+.10;
    if(distance>clear+speed*2.5+1.0)continue;
    const ahead=dx*fx+dz*fz,lateral=dx*rx+dz*rz;
    const rvx=a.wantX-b.wantX,rvz=a.wantZ-b.wantZ,rv2=rvx*rvx+rvz*rvz;
    const closest=clamp((dx*rvx+dz*rvz)/Math.max(.001,rv2),0,2.4),miss=length(dx-rvx*closest,dz-rvz*closest);
    if(speed>.01&&ahead>-.15&&miss<clear+.32){
     const threat=clamp((clear+.32-miss)/.8,0,1)*clamp((2.8-closest)/1.8,0,1);
     const opposite=a.wantX*b.wantX+a.wantZ*b.wantZ<-.05;
     const sign=opposite||Math.abs(lateral)<.18?1:-Math.sign(lateral);
     side+=sign*threat*Math.max(.65,speed*.8);
     brake=Math.min(brake,clamp((distance-clear+.05)/1.4,.12,1));a.yielding=true;
    }
    if(distance<clear+.35&&distance>.001){const strength=(clear+.35-distance)*1.2;pushX-=dx/distance*strength;pushZ-=dz/distance*strength;}
   }
   if(a.yielding)yielding++;
   let vx=a.wantX*brake+rx*clamp(side,-1.2,1.2)+pushX,vz=a.wantZ*brake+rz*clamp(side,-1.2,1.2)+pushZ;
   const cap=Math.max(speed,.55),n=length(vx,vz);if(n>cap){vx*=cap/n;vz*=cap/n;}
   const change=length(vx-a.vx,vz-a.vz),accel=3.2*dt,f=change>accel?accel/change:1;
   a.vx+=(vx-a.vx)*f;a.vz+=(vz-a.vz)*f;
   const x=a.x+a.vx*dt,z=a.z+a.vz*dt;
   if(allowed(a,x,z)){a.nx=x;a.nz=z;}
   else if(allowed(a,x,a.z))a.nx=x;
   else if(allowed(a,a.x,z))a.nz=z;
  }
  // Position projection is normally tiny: steering starts before contact.
  // Resting friends, including rooftop poses, are immovable obstacles.
  for(let pass=0;pass<5;pass++){if(spatial)index(true);for(let i=0;i<agents.length;i++)for(const b of neighbours(agents[i],1,true)){
   const a=agents[i],j=b.index;if(j<=i||(!a.movable&&!b.movable)||!sameLevel(a,b))continue;checks++;
   let dx=a.nx-b.nx,dz=a.nz-b.nz,d=length(dx,dz),limit=a.radius+b.radius;
   if(d>=limit)continue;if(pass===0)contacts++;
   if(d<1e-7){dx=i%2?1:-1;dz=0;}else{dx/=d;dz/=d;}
   const overlap=limit-d+.0001,aw=a.movable?(b.movable?.5:1):0,bw=b.movable?(a.movable?.5:1):0;
   const ax=a.nx+dx*overlap*aw,az=a.nz+dz*overlap*aw,bx=b.nx-dx*overlap*bw,bz=b.nz-dz*overlap*bw;
   const canA=aw&&allowed(a,ax,az),canB=bw&&allowed(b,bx,bz);
   if(canA){a.nx=ax;a.nz=az;}if(canB){b.nx=bx;b.nz=bz;}
   if(aw&&!canA&&bw&&allowed(b,b.nx-dx*overlap,b.nz-dz*overlap)){b.nx-=dx*overlap;b.nz-=dz*overlap;}
   else if(bw&&!canB&&aw&&allowed(a,a.nx+dx*overlap,a.nz+dz*overlap)){a.nx+=dx*overlap;a.nz+=dz*overlap;}
  }}
  for(const a of agents){a.dx=a.nx-a.x;a.dz=a.nz-a.z;a.travel=length(a.dx,a.dz);if(!a.movable)continue;a.x=a.nx;a.z=a.nz;a.y=height(a.x,a.z);
   // Contact projection is a constraint, never an impulse. In particular a
   // crowded initial spawn must not launch a walker across the village.
   const v=a.travel/dt,cap=Math.max(.55,length(a.wantX,a.wantZ)),f=v>cap?cap/v:1;a.vx=a.dx/dt*f;a.vz=a.dz/dt*f;
  }
 }
 function metrics(){let minGap=Infinity,overlaps=0;for(let i=0;i<agents.length;i++)for(let j=i+1;j<agents.length;j++){const a=agents[i],b=agents[j];if((!a.movable&&!b.movable)||!sameLevel(a,b))continue;const gap=length(a.x-b.x,a.z-b.z)-a.radius-b.radius;minGap=Math.min(minGap,gap);if(gap<-.015)overlaps++;}return {agents:agents.length,movers:agents.filter(a=>a.movable).length,contacts,yielding,overlaps,minGap:Number(minGap.toFixed(3)),spatial,neighbourChecks:checks};}
 return {agents,add,step,metrics};
}
export function villageTrafficSafety(city){
 const obstacles=city.obstacleIndex||(city.obstacleIndex=indexVillageObstacles(city));city.obstacleDiagnostics=obstacles.diagnostics;
 return (x,z,a)=>{
  const y=city.height(x,z);if(y<city.sea+.7)return false;
  const water=city.waterAt?.(x,z,a.waterProbe||(a.waterProbe={}));if(water&&water.waterDepth>.18&&!a.canSwim)return false;
  const bank=a.canSwim&&city.streamNear?.(x,z,a.bankProbe||(a.bankProbe={})),r=a.radius*.7;
  if(!bank&&(Math.abs(city.height(x+r,z)-y)>.6||Math.abs(city.height(x-r,z)-y)>.6||Math.abs(city.height(x,z+r)-y)>.6||Math.abs(city.height(x,z-r)-y)>.6))return false;
  return obstacles(x,z,r);
 };
}
