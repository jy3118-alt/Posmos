export function triangleSurface(geometries,minimumHeight=-11){
 const cell=5,min=-240,size=96,bins=Array.from({length:size*size},()=>[]);
 for(const g of geometries){const p=g.attributes.position,index=g.index;
  for(let i=0;i<(index?.count||p.count);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const ax=p.getX(a),az=p.getZ(a),bx=p.getX(b),bz=p.getZ(b),cx=p.getX(c),cz=p.getZ(c),ay=p.getY(a),by=p.getY(b),cy=p.getY(c),den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
   if(Math.abs(den)<.0001||Math.max(ay,by,cy)<minimumHeight)continue;
   const t=[ax,az,bx,bz,cx,cz,ay,by,cy,den];
   const x0=Math.max(0,Math.floor((Math.min(ax,bx,cx)-min)/cell)),x1=Math.min(size-1,Math.floor((Math.max(ax,bx,cx)-min)/cell)),z0=Math.max(0,Math.floor((Math.min(az,bz,cz)-min)/cell)),z1=Math.min(size-1,Math.floor((Math.max(az,bz,cz)-min)/cell));
   for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)bins[z*size+x].push(t);
  }
 }
 return (x,z)=>{const ix=Math.floor((x-min)/cell),iz=Math.floor((z-min)/cell);if(ix<0||iz<0||ix>=size||iz>=size)return -15;let y=-15;
  for(const t of bins[iz*size+ix]){const u=((t[3]-t[5])*(x-t[4])+(t[4]-t[2])*(z-t[5]))/t[9],v=((t[5]-t[1])*(x-t[4])+(t[0]-t[4])*(z-t[5]))/t[9];if(u>=-.00001&&v>=-.00001&&u+v<=1.00001)y=Math.max(y,t[6]*u+t[7]*v+t[8]*(1-u-v));}return y;
 };
}
