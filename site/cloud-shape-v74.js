// A small closed isosurface: broad joined lobes, a calm underside and no seams
// between overlapping spheres. Generated once; no density work runs per frame.
export function cloudShape(variant=0){
 const nx=10,ny=6,nz=6,points=[],values=[],vertices=[],indices=[],edges=new Map();
 const lobes=[[-.70,.10,0,.52,.44,.46],[-.08,.34,-.035,.53,.73,.55],[.63,.16,.03,.54,.49,.47],[-.13,-.02,.23,.83,.28,.45]];
 if(variant===1){lobes[1][0]=-.18;lobes[1][4]=.61;lobes[2][1]=.23;lobes[2][4]=.57;}
 if(variant===2){lobes[0][1]=.24;lobes[0][4]=.58;lobes[1][0]=.18;lobes[1][4]=.65;lobes[2][3]=.45;}
 const smoothMin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
 const field=(x,y,z)=>{let d=10;for(const [cx,cy,cz,rx,ry,rz] of lobes){const q=(Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz)-1)*Math.min(rx,ry,rz);d=smoothMin(d,q,.19);}return Math.max(d,-y-.24);};
 const id=(x,y,z)=>(z*(ny+1)+y)*(nx+1)+x;
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
  const i=id(x,y,z),jitter=(Math.sin(i*73.17+variant*11.3)*.5+.5)-.5;
  const p=[-1.45+x/nx*2.9+jitter*.07,-.55+y/ny*1.8+jitter*.055,-.85+z/nz*1.7-jitter*.065];points.push(p);values.push(field(...p));
 }
 const tetrahedra=[[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]],pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
 function cut(a,b){const key=Math.min(a,b)+':'+Math.max(a,b);if(edges.has(key))return edges.get(key);const t=values[a]/(values[a]-values[b]),p=points[a].map((v,k)=>v+(points[b][k]-v)*t),i=vertices.length/3;vertices.push(...p);edges.set(key,i);return i;}
 function face(a,b,c){const p=vertices.slice(a*3,a*3+3),u=vertices.slice(b*3,b*3+3).map((v,k)=>v-p[k]),v=vertices.slice(c*3,c*3+3).map((v,k)=>v-p[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);if(length<1e-9)return;
  const mid=p.map((q,k)=>(q+vertices[b*3+k]+vertices[c*3+k])/3),epsilon=.0001,gradient=mid.map((q,k)=>{const hi=mid.slice(),lo=mid.slice();hi[k]+=epsilon;lo[k]-=epsilon;return field(...hi)-field(...lo);});if(n.reduce((s,q,k)=>s+q*gradient[k],0)<0)[b,c]=[c,b];indices.push(a,b,c);
 }
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const cube=[id(x,y,z),id(x+1,y,z),id(x+1,y+1,z),id(x,y+1,z),id(x,y,z+1),id(x+1,y,z+1),id(x+1,y+1,z+1),id(x,y+1,z+1)];
  for(const t of tetrahedra){const ids=t.map(i=>cube[i]),poly=[];for(const [i,j] of pairs)if((values[ids[i]]<0)!==(values[ids[j]]<0))poly.push(cut(ids[i],ids[j]));if(poly.length===3)face(...poly);else if(poly.length===4){
   const centre=[0,0,0];for(const i of poly)for(let k=0;k<3;k++)centre[k]+=vertices[i*3+k]/4;
   const a=poly[0],axis=vertices.slice(a*3,a*3+3).map((q,k)=>q-centre[k]),p=vertices.slice(poly[1]*3,poly[1]*3+3).map((q,k)=>q-centre[k]),normal=[axis[1]*p[2]-axis[2]*p[1],axis[2]*p[0]-axis[0]*p[2],axis[0]*p[1]-axis[1]*p[0]],side=[normal[1]*axis[2]-normal[2]*axis[1],normal[2]*axis[0]-normal[0]*axis[2],normal[0]*axis[1]-normal[1]*axis[0]],axisLength=Math.hypot(...axis),sideLength=Math.hypot(...side);
   poly.sort((i,j)=>{const angle=id=>{let u=0,v=0;for(let k=0;k<3;k++){const d=vertices[id*3+k]-centre[k];u+=d*axis[k]/axisLength;v+=d*side[k]/sideLength;}return Math.atan2(v,u);};return angle(i)-angle(j);});face(poly[0],poly[1],poly[2]);face(poly[0],poly[2],poly[3]);
  }}
 }
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<vertices.length;i++)min[i%3]=Math.min(min[i%3],vertices[i]),max[i%3]=Math.max(max[i%3],vertices[i]);
 // The underside is y=0, with unit extents so layout dimensions are explicit.
 for(let i=0;i<vertices.length;i++){const k=i%3;vertices[i]=(vertices[i]-min[k])/(max[k]-min[k])-(k===1?0:.5);}
 return {positions:new Float32Array(vertices),indices:new Uint16Array(indices)};
}
