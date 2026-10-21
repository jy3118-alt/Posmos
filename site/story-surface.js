import * as T from 'three';
import {gridTriangleHeight} from './terrain-grid.js?v=ebada2d6e6f2';
import {gameMaterial} from './game-material.js?v=ebada2d6e6f2';
import {planSwimmingBay,beachHeight} from './water-space.js?v=ebada2d6e6f2';

// Feet, props and camera use the rendered triangles, not an approximated heightfield.
export function triangleSurface(geometries,minimumHeight=-11){
 const cell=5,min=-160,size=64,bins=Array.from({length:size*size},()=>[]);
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
export async function prepareIsland(scene,gltf,sites,study={}){
 gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene),s=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3());
 const transform=new T.Matrix4().makeScale(260/s.x,48/s.y,260/s.z).multiply(new T.Matrix4().makeTranslation(-c.x,-box.min.y,-c.z));transform.elements[13]-=16;
 const parts=[];gltf.scene.traverse(o=>{if(o.isMesh){const geometry=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(transform,o.matrixWorld));parts.push({geometry,source:o.material});}});
 const before=triangleSurface(parts.map(p=>p.geometry)),central=before(0,0),smooth=(a,b,v)=>{const u=T.MathUtils.clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);};
 const pads=[{x:0,z:0,r:15,y:central},...sites.map(p=>({x:p.x,z:p.z,r:p.asset==='atelier'?7.8:6.2,y:before(p.x,p.z)}))];
 for(const {geometry}of parts){const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),initial=p.getY(i);if(initial<-6)continue;let y=initial;for(const pad of pads){if(pad.y<-4)continue;const w=1-smooth(pad.r,pad.r+4,Math.hypot(x-pad.x,z-pad.z));y=T.MathUtils.lerp(y,pad.y,w);}p.setY(i,y);}geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();}
 // A single upper envelope replaces the folded/overlapping faces created
 // when a generated island is flattened under houses. The same triangles
 // drive rendering, feet, roads and camera height.
 const sourceUpper=triangleSurface(parts.map(p=>p.geometry));
 const upper=study.height||study.heightTransform?.(sourceUpper)||sourceUpper,geometry=new T.PlaneGeometry(304,304,256,256);geometry.rotateX(-Math.PI/2);const vertices=geometry.attributes.position,heights=new Float32Array(vertices.count),stride=257;
 for(let i=0;i<vertices.count;i++)heights[i]=upper(vertices.getX(i),vertices.getZ(i));
 // Heal isolated source pinholes; leave coastline and open water intact.
 for(let pass=0;pass<2;pass++){const copy=heights.slice();for(let z=1;z<256;z++)for(let x=1;x<256;x++){const i=z*stride+x;if(copy[i]>-10)continue;let count=0,sum=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const h=copy[i+dz*stride+dx];if(h>-8){count++;sum+=h;}}if(count>=7)heights[i]=sum/count;}}
 const swimmingBay=planSwimmingBay(upper,-9);
 for(let i=0;i<vertices.count;i++){
  const x=vertices.getX(i),z=vertices.getZ(i);let y=beachHeight(swimmingBay,x,z,heights[i]);
  // The experimental cove must not scoop away an existing house foundation.
  if(study.height||study.heightTransform)for(const p of sites)y=T.MathUtils.lerp(y,heights[i],1-smooth(8.3,13,Math.hypot(x-p.x,z-p.z)));
  if(study.carveFinal)y=study.carveFinal(x,z,y);
  vertices.setY(i,y);
 }
 study.finishGround?.(geometry,gridTriangleHeight(geometry));
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const map=await new T.TextureLoader().loadAsync('./assets/polish-v18/island-albedo.png?v=4327b5c37434');map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const material=gameMaterial({map,side:T.DoubleSide},false),mesh=new T.Mesh(geometry,material);mesh.name='continuous-repaired-island';mesh.receiveShadow=true;scene.add(mesh);for(const p of parts)p.geometry.dispose();
 const groundHeight=gridTriangleHeight(geometry),extraSurfaces=study.addSurfaces?.(scene,groundHeight)||[];
 return {meshes:[mesh],groundHeight,height:gridTriangleHeight(geometry,extraSurfaces.length?triangleSurface(extraSurfaces,-20):null),swimmingBay};
}
export function paintGround(meshes,paths,bay){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;const ctx=canvas.getContext('2d'),scale=2048/304,xy=p=>[(p.x+152)*scale,(p.z+152)*scale];
 if(bay){ctx.save();ctx.translate((bay.x+152)*scale,(bay.z+152)*scale);ctx.rotate(Math.atan2(bay.nz,bay.nx));const sand=ctx.createRadialGradient(1*scale,0,2*scale,2*scale,0,19*scale);sand.addColorStop(0,'#efd39c');sand.addColorStop(.55,'#e4c38be8');sand.addColorStop(1,'#dfbd8200');ctx.fillStyle=sand;ctx.beginPath();for(let j=0;j<=64;j++){const a=j/64*Math.PI*2,r=1+.05*Math.sin(a*7)+.035*Math.cos(a*11);const x=2*scale+Math.cos(a)*18*scale*r,z=Math.sin(a)*14*scale*r;ctx[j?'lineTo':'moveTo'](x,z);}ctx.closePath();ctx.fill();ctx.clip();for(let i=0;i<180;i++){ctx.fillStyle=i%3?'#fff2d52a':'#b7906540';const x=(Math.sin(i*83.31)*16+2)*scale,z=Math.cos(i*73.15)*13*scale;ctx.fillRect(x,z,(.15+(i%7)*.08)*scale,.11*scale);}ctx.restore();}
 ctx.lineCap=ctx.lineJoin='round';for(const path of paths){ctx.strokeStyle='#e9cd99';ctx.lineWidth=2.9*scale;ctx.beginPath();path.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...xy(p)));ctx.stroke();ctx.strokeStyle='#f5deb3';ctx.lineWidth=1.6*scale;ctx.stroke();}
 // Irregular pigment marks are painted onto the same triangles as the road.
 let seed=921;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const palette=['#f29b68','#ed6d8a','#71c9c6','#9686d2','#efc861','#638bc5'];
 for(const [n,[x,z,r]]of [[42,6,10],[-36,22,9],[32,55,7],[-10,-13,8],[5,5,3]].entries()){ctx.fillStyle=palette[n%palette.length];ctx.beginPath();for(let j=0;j<=48;j++){const a=j/48*Math.PI*2,rr=r*(.88+.12*Math.sin(a*7)+.05*Math.cos(a*13));const px=(x+Math.cos(a)*rr+152)*scale,pz=(z+Math.sin(a)*rr+152)*scale;ctx[j?'lineTo':'moveTo'](px,pz);}ctx.fill();}
 for(let i=0;i<180;i++){const x=(random()-.5)*155,z=(random()-.5)*155,r=.3+random()*1.6;ctx.globalAlpha=.55+random()*.3;ctx.fillStyle=palette[i%palette.length];ctx.beginPath();ctx.ellipse((x+152)*scale,(z+152)*scale,r*scale,r*(.25+random()*.5)*scale,random()*6.28,0,6.28);ctx.fill();}ctx.globalAlpha=1;
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;map.flipY=false;
 for(const mesh of meshes){mesh.material.onBeforeCompile=s=>{s.uniforms.storyGround={value:map};s.vertexShader='varying vec2 storyUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstoryUv=(position.xz+152.)/304.;');s.fragmentShader='uniform sampler2D storyGround;varying vec2 storyUv;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec4 paint=texture2D(storyGround,storyUv);diffuseColor.rgb=mix(diffuseColor.rgb,paint.rgb,paint.a);');};mesh.material.customProgramCacheKey=()=> 'actual-ground-paint-v14';}
}
export function colourCanopy(material){
 material.onBeforeCompile=s=>{s.vertexShader='varying float canopyY;varying vec3 canopyColour;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncanopyY=position.y;canopyColour=instanceColor;');s.fragmentShader='varying float canopyY;varying vec3 canopyColour;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`float leaf=smoothstep(.24,.48,canopyY);float detail=clamp(dot(diffuseColor.rgb,vec3(.3,.6,.1))*1.5+.52,.68,1.12);diffuseColor.rgb=mix(diffuseColor.rgb,canopyColour*detail,leaf);`);};material.customProgramCacheKey=()=> 'vivid-canopy-v56';
}
