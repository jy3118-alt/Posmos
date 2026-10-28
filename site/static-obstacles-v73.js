// Conservative broad phase for the static island. Exact rectangle/trunk tests
// are unchanged; movement still uses the original rendered terrain triangles.
export function indexVillageObstacles(city,cell=8){
 const bins=new Map(),items=[],seen=[];let generation=0,queries=0,checks=0;
 function insert(item,x0,z0,x1,z1){const id=items.length;items.push(item);seen.push(0);for(let z=Math.floor(z0/cell);z<=Math.floor(z1/cell);z++)for(let x=Math.floor(x0/cell);x<=Math.floor(x1/cell);x++){const key=x+','+z;let list=bins.get(key);if(!list)bins.set(key,list=[]);list.push(id);}}
 for(const b of city.buildings){const c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0),w=b.width*.48,d=b.depth*.48,ex=Math.abs(c)*w+Math.abs(s)*d,ez=Math.abs(s)*w+Math.abs(c)*d;insert({x:b.x,z:b.z,c,s,w,d},b.x-ex,b.z-ez,b.x+ex,b.z+ez);}
 for(const t of city.treePositions){const radius=Math.max(.38,Number.isFinite(t.r)?t.r:(Number.isFinite(t.h)?t.h*.035:.38));insert({x:t.x,z:t.z,radius},t.x-radius,t.z-radius,t.x+radius,t.z+radius);}
 const clear=(x,z,r)=>{
  queries++;if(++generation===Number.MAX_SAFE_INTEGER){seen.fill(0);generation=1;}
  // Expanding a rotated rectangle by r on each local axis can reach sqrt(2)*r
  // along a world axis. This bound also covers the circular trunk expansion.
  const reach=r*Math.SQRT2;
  for(let iz=Math.floor((z-reach)/cell);iz<=Math.floor((z+reach)/cell);iz++)for(let ix=Math.floor((x-reach)/cell);ix<=Math.floor((x+reach)/cell);ix++){
   const list=bins.get(ix+','+iz);if(!list)continue;
   for(const id of list){if(seen[id]===generation)continue;seen[id]=generation;checks++;const b=items[id],dx=x-b.x,dz=z-b.z;
    if(b.radius!==undefined){if(Math.hypot(dx,dz)<b.radius+r)return false;}
    else if(Math.abs(b.c*dx-b.s*dz)<b.w+r&&Math.abs(b.s*dx+b.c*dz)<b.d+r)return false;
   }
  }
  return true;
 };
 clear.diagnostics=()=>({obstacles:items.length,cells:bins.size,queries,exactChecks:checks,checksPerQuery:queries?+(checks/queries).toFixed(2):0});return clear;
}
