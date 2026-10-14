// Smooth only lighting normals. Preserve the mesh, UVs, rig weights and silhouette.
// The graph also joins UV seams; disconnected teeth/eyes retain their own normals.
export function prepareSmoothNormals(geometry){
 const p=geometry.attributes.position,index=geometry.index,groups=[],keys=new Map(),groupOf=new Uint32Array(p.count);
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*100000)).join(',');if(!keys.has(key)){keys.set(key,groups.length);groups.push([]);}const k=keys.get(key);groups[k].push(i);groupOf[i]=k;}
 const neighbours=groups.map(()=>new Set());for(let i=0;i<(index?.count||p.count);i+=3){const ids=[0,1,2].map(j=>groupOf[index?index.getX(i+j):i+j]);for(const a of ids)for(const b of ids)if(a!==b)neighbours[a].add(b);}
 const links=neighbours.map(s=>Array.from(s)),current=new Float32Array(groups.length*3),next=new Float32Array(current.length);
 return (target,passes=3)=>{const n=target.attributes.normal;for(let k=0;k<groups.length;k++){let x=0,y=0,z=0;for(const i of groups[k]){x+=n.getX(i);y+=n.getY(i);z+=n.getZ(i);}const l=Math.hypot(x,y,z)||1;current.set([x/l,y/l,z/l],k*3);}
  for(let pass=0;pass<passes;pass++){for(let k=0;k<groups.length;k++){const j=k*3,ox=current[j],oy=current[j+1],oz=current[j+2];let x=ox*2,y=oy*2,z=oz*2;for(const a of links[k]){const q=a*3,dot=ox*current[q]+oy*current[q+1]+oz*current[q+2],w=dot>.15?1:.03;x+=current[q]*w;y+=current[q+1]*w;z+=current[q+2]*w;}const l=Math.hypot(x,y,z)||1;next.set([x/l,y/l,z/l],j);}current.set(next);}
  for(let k=0;k<groups.length;k++)for(const i of groups[k])n.setXYZ(i,current[k*3],current[k*3+1],current[k*3+2]);n.needsUpdate=true;
 };
}
