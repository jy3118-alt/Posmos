// Exact O(1) barycentric lookup for the final regular PlaneGeometry. Keep the
// source-mesh upper-envelope search at load time; moving feet need only one cell.
export function gridTriangleHeight(geometry,overlay=null,minimum=-15){
 const {width,height,widthSegments:cols,heightSegments:rows}=geometry.parameters;
 const p=geometry.attributes.position,values=p.array,stride=cols+1,itemSize=p.itemSize;
 if(p.count!==stride*(rows+1))throw Error('Terrain grid dimensions do not match.');
 const dx=width/cols,dz=height/rows,minX=-width/2,minZ=-height/2;
 return (x,z)=>{
  let y=minimum;
  if(x>=minX&&x<=-minX&&z>=minZ&&z<=-minZ){
   const fx=(x-minX)/dx,fz=(z-minZ)/dz,i=Math.min(cols-1,Math.floor(fx)),j=Math.min(rows-1,Math.floor(fz)),u=fx-i,v=fz-j,k=j*stride+i;
   const a=values[k*itemSize+1],b=values[(k+1)*itemSize+1],c=values[(k+stride)*itemSize+1],d=values[(k+stride+1)*itemSize+1];
   y=Math.max(y,u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v));
  }
  return overlay?Math.max(y,overlay(x,z)):y;
 };
}
