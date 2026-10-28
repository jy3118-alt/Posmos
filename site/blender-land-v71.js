import * as T from 'three';
import {yieldTask} from './runtime-budget-v69.js?v=d644c435c5eb';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The visible surface is the Blender-exported mesh. The same triangles answer
// ground queries, rather than a separate procedural approximation of the sculpt.
export async function nativeSurface(geometries){
 const size=96,cell=5,min=-240,counts=new Uint32Array(size*size);
 const capacity=geometries.reduce((sum,g)=>sum+(g.index?.count||g.attributes.position.count)/3,0),tri=new Float32Array(capacity*10);let count=0;
 for(const g of geometries){const p=g.attributes.position,ix=g.index,total=ix?.count||p.count;
  for(let i=0;i<total;i+=3){if(i%24000===0)await yieldTask();const a=ix?ix.getX(i):i,b=ix?ix.getX(i+1):i+1,c=ix?ix.getX(i+2):i+2,ax=p.getX(a),az=p.getZ(a),bx=p.getX(b),bz=p.getZ(b),cx=p.getX(c),cz=p.getZ(c),ay=p.getY(a),by=p.getY(b),cy=p.getY(c),den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<.0001||Math.max(ay,by,cy)<-12)continue;
   const k=count++*10;tri[k]=ax;tri[k+1]=az;tri[k+2]=bx;tri[k+3]=bz;tri[k+4]=cx;tri[k+5]=cz;tri[k+6]=ay;tri[k+7]=by;tri[k+8]=cy;tri[k+9]=den;
  }
 }
 function bounds(k,fn){const x0=Math.max(0,Math.floor((Math.min(tri[k],tri[k+2],tri[k+4])-min)/cell)),x1=Math.min(size-1,Math.floor((Math.max(tri[k],tri[k+2],tri[k+4])-min)/cell)),z0=Math.max(0,Math.floor((Math.min(tri[k+1],tri[k+3],tri[k+5])-min)/cell)),z1=Math.min(size-1,Math.floor((Math.max(tri[k+1],tri[k+3],tri[k+5])-min)/cell));for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)fn(z*size+x);}
 for(let k=0;k<count*10;k+=10)bounds(k,b=>counts[b]++);
 const offsets=new Uint32Array(counts.length+1);for(let i=0;i<counts.length;i++)offsets[i+1]=offsets[i]+counts[i];const cursor=offsets.slice(0,-1),refs=new Uint32Array(offsets.at(-1));
 for(let k=0;k<count*10;k+=10)bounds(k,b=>refs[cursor[b]++]=k);
 const height=(x,z)=>{const ix=Math.floor((x-min)/cell),iz=Math.floor((z-min)/cell);if(ix<0||iz<0||ix>=size||iz>=size)return -15;const bin=iz*size+ix;let y=-15;for(let i=offsets[bin];i<offsets[bin+1];i++){const k=refs[i],u=((tri[k+3]-tri[k+5])*(x-tri[k+4])+(tri[k+4]-tri[k+2])*(z-tri[k+5]))/tri[k+9],v=((tri[k+5]-tri[k+1])*(x-tri[k+4])+(tri[k]-tri[k+4])*(z-tri[k+5]))/tri[k+9];if(u>=-.00001&&v>=-.00001&&u+v<=1.00001)y=Math.max(y,tri[k+6]*u+tri[k+7]*v+tri[k+8]*(1-u-v));}return y;};
 return {height,bytes:tri.byteLength+offsets.byteLength+refs.byteLength,triangles:count};
}

export function paintMaterial(source,lighting,{white=false}={}){
 const m=new T.MeshLambertMaterial({map:white?null:source.map,color:white?'#fffdf8':source.color,side:T.FrontSide});
 m.onBeforeCompile=s=>{s.uniforms.pigmentLit=lighting.lit;s.uniforms.pigmentShade=lighting.shadow;s.fragmentShader='uniform vec3 pigmentLit,pigmentShade;\n'+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
  float facing=.7,coverage=1.,shine=0.;
  #if NUM_DIR_LIGHTS > 0
   facing=max(0.,dot(normal,directionalLights[0].direction));
   float grey=max(.015,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));
   float actual=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))/grey;
   float full=facing*RECIPROCAL_PI*dot(directionalLights[0].color,vec3(.2126,.7152,.0722));
   coverage=clamp(actual/max(.0001,full),0.,1.);
   shine=pow(max(0.,dot(normal,normalize(directionalLights[0].direction+normalize(vViewPosition)))),22.)*.20*coverage;
  #endif
  float band=(.30+.70*smoothstep(.05,.85,facing))*coverage;
  outgoingLight=${white?'diffuseColor.rgb*pigmentLit*(mix(vec3(.80,.86,.93),vec3(1.),smoothstep(0.,.85,facing))+shine*.6)':'diffuseColor.rgb*(mix(pigmentShade,pigmentLit,band)+pigmentLit*shine)'};
  #include <opaque_fragment>`);};m.customProgramCacheKey=()=> 'native-blender-pigment-v71-'+white;return m;
}

export async function makeBlenderLand(scene,gltf,material){
 gltf.scene.updateMatrixWorld(true);const geometries=[],meshes=[];
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld),mesh=new T.Mesh(g,material);mesh.name='blender-sculpted-pigment-island';mesh.receiveShadow=true;scene.add(mesh);geometries.push(g);meshes.push(mesh);});
 const surface=await nativeSurface(geometries);gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of[o.material].flat())m.dispose();}});gltf.scene.clear();gltf.parser=null;
 return {height:surface.height,meshes,lockSurfaces(){},update(){},diagnostics:()=>({nativeBlenderMesh:true,triangles:geometries.reduce((n,g)=>n+(g.index?.count||g.attributes.position.count)/3,0),surfaceTriangles:surface.triangles,collisionMiB:+(surface.bytes/1048576).toFixed(2),surface:'same exported triangles as rendering'})};
}

export function makeBlenderClouds(scene,gltf,lighting){
 gltf.scene.updateMatrixWorld(true);const pieces=[];gltf.scene.traverse(o=>{if(o.isMesh)pieces.push(o.geometry.clone().applyMatrix4(o.matrixWorld));});
 const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());const material=paintMaterial({color:new T.Color('white')},lighting,{white:true}),mesh=new T.Mesh(geometry,material);mesh.name='blender-white-paint-clouds';scene.add(mesh);
 gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of[o.material].flat())m.dispose();}});gltf.scene.clear();gltf.parser=null;
 return {update:t=>mesh.position.set(Math.sin(t*.0035)*55,0,Math.sin(t*.0035)*14),diagnostics:()=>({source:'Blender editable pressure curves',count:7,batches:1,triangles:geometry.index.count/3,windMetres:mesh.position.toArray()})};
}
