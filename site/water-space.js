const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
const mix=(a,b,u)=>a+(b-a)*u;

// Find a real shoreline facing the village's initial view, then soften only
// one cove in the SAME terrain mesh queried by feet and navigation.
export function planSwimmingBay(height,sea=-9){
 let best=null,score=Infinity;
 for(let i=0;i<31;i++){
  const angle=.10+i*.075,nx=Math.cos(angle),nz=Math.sin(angle);
  for(let r=45;r<142;r+=.5){
   if(height(nx*r,nz*r)>sea+.65||height(nx*(r-1),nz*(r-1))<=sea+.65)continue;
   const slope=Math.abs(height(nx*(r-6),nz*(r-6))-height(nx*(r+6),nz*(r+6)))/12;
   const value=slope+Math.abs(angle-.83)*.32;
   if(value<score){score=value;best={x:nx*r,z:nz*r,nx,nz,sea,width:34,length:46};}
   break;
  }
 }
 if(!best)throw Error('수영장을 연결할 해안을 찾지 못했습니다.');
 return best;
}
export function bayLocal(bay,x,z){const dx=x-bay.x,dz=z-bay.z;return {u:-dx*bay.nz+dz*bay.nx,v:dx*bay.nx+dz*bay.nz};}
export function bayPoint(bay,u,v){return {x:bay.x-bay.nz*u+bay.nx*v,z:bay.z+bay.nx*u+bay.nz*v};}
export function beachHeight(bay,x,z,original){
 const {u,v}=bayLocal(bay,x,z),weight=(1-smooth(11,17,Math.abs(u)))*smooth(-19,-10,v)*(1-smooth(19,27,v));
 return mix(original,bay.sea+.65-.18*v+.0008*u*u,weight);
}

// Six separated lanes use continuous cycles; no reset/teleport at a loop seam.
export function swimmingState(bay,index,time,height,ground){
 const u=(index-2.5)*3.6,kind=index%3,cycle=(time+(index===5?45:index===2?8:index*13.7))%110;
 let v=13,du=0,mode='tread',speed=0;
 if(kind===0){
  const phase=time*.12+index;v=13+Math.sin(phase)*2.2;du=Math.sin(phase*.7)*.22;mode='swim';speed=.264*Math.abs(Math.cos(phase));
 }else if(kind===1){v=13+Math.sin(time*.14+index)*.30;mode='float';}
 else if(cycle<6||cycle>=94){v=-7;mode='idle';}
 else if(cycle<24){v=mix(-7,3,smooth(6,24,cycle));mode='wade';speed=.60;}
 else if(cycle<40){v=mix(3,15,smooth(24,40,cycle));mode='swim';speed=.85;}
 else if(cycle<60){v=15;mode='tread';}
 else if(cycle<76){v=mix(15,3,smooth(60,76,cycle));mode='swim';speed=.85;}
 else{v=mix(3,-7,smooth(76,94,cycle));mode='wade';speed=.60;}
 const p=bayPoint(bay,u+du,v),floor=ground(p.x,p.z),depth=bay.sea-floor,waterMix=smooth(.42,1.2,depth);
 if(mode==='swim'&&depth<=.42)mode='wade';
 if(waterMix>.75&&mode==='wade')mode='swim';
 const treadMix=kind===2?smooth(40,43,cycle)*(1-smooth(57,60,cycle)):0,floatMix=kind===1?1:0;
 const waterPose=floatMix?'float':treadMix>.5?'tread':'swim';
 const afloat=bay.sea-height*(floatMix?.34:mix(.30,.63,treadMix))+Math.sin(time*2.2+index)*.035;
 return {...p,y:mix(floor+.035,afloat,waterMix),depth,mode,waterPose,waterMix,treadMix,floatMix,speed,cycle,u:u+du,v};
}
