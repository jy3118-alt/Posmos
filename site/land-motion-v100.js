// Small pure rules shared by the controller and its regression checks.
export function eligibleResident(a){
 const p=a.person,b=a.body;
 return !!b&&!b.social&&!b.inStream&&!p?.social&&!p?.water&&!p?.sky&&!p?.inStream&&b.y>.7&&a.root.visible;
}
export function chooseDistantResident(actors,current,{random=Math.random,recent=[],minimum=60}={}){
 let list=actors.filter(a=>a!==current&&eligibleResident(a));
 if(!list.length)return null;
 const fresh=list.filter(a=>!recent.includes(a.id));if(fresh.length)list=fresh;
 if(!current)return list[Math.min(list.length-1,Math.floor(random()*list.length))];
 const distance=a=>Math.hypot(a.body.x-current.body.x,a.body.z-current.body.z);
 const farthest=Math.max(...list.map(distance)),threshold=Math.min(minimum,farthest*.7);
 list=list.filter(a=>distance(a)>=threshold);
 return list[Math.min(list.length-1,Math.floor(random()*list.length))];
}
export function localResumeRoute(body,yaw,height,safe){
 // Start at the exact controlled position; do not teleport back to an old route.
 let best=[{x:body.x,z:body.z}];
 for(let n=0;n<12;n++){
  const angle=yaw+n*Math.PI/6,points=[{x:body.x,z:body.z}];let lastY=body.y;
  for(let i=1;i<=24;i++){
   const x=body.x+Math.cos(angle)*i*.24,z=body.z-Math.sin(angle)*i*.24,y=height(x,z);
   if(!safe(x,z,body)||Math.abs(y-lastY)>.22)break;
   points.push({x,z});lastY=y;
  }
  if(points.length>best.length)best=points;
  if(best.length===25)break;
 }
 return best.length>1?best:[best[0],{...best[0]}];
}
export function landCameraPoint(focus,goal,height,buildings=[]){
 const length=Math.hypot(goal.x-focus.x,goal.y-focus.y,goal.z-focus.z),steps=Math.min(256,Math.max(4,Math.ceil(length/.45)));
 let x=focus.x,y=focus.y,z=focus.z;
 for(let i=1;i<=steps;i++){
  const t=i/steps,nx=focus.x+(goal.x-focus.x)*t,ny=focus.y+(goal.y-focus.y)*t,nz=focus.z+(goal.z-focus.z)*t;
  if(ny<height(nx,nz)+.32)break;
  if(buildings.some(b=>{if(ny>b.y+b.height+.25||ny<b.y-.2)return false;const dx=nx-b.x,dz=nz-b.z,c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0);return Math.abs(c*dx-s*dz)<b.width*.5+.25&&Math.abs(s*dx+c*dz)<b.depth*.5+.25;}))break;
  x=nx;y=ny;z=nz;
 }
 return {x,y,z};
}
