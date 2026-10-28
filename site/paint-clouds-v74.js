import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cloudShape} from './cloud-shape-v74.js?v=caf5cc4587a0';

export const CLOUD_LAYOUT=[
 // One westerly drift, separated into loose clusters. The eastern sea and
 // foreground stay open; the clouds never form a frame around the island.
 {at:[-282,16,-242],size:[96,28,54],yaw:.35,layer:0},
 {at:[-329,25,-263],size:[82,34,49],yaw:.24,layer:0},
 {at:[-373,13,-282],size:[89,24,50],yaw:.40,layer:0},
 {at:[-241,19,-210],size:[62,22,40],yaw:.31,layer:0},
 {at:[-292,12,-112],size:[87,26,51],yaw:.32,layer:1},
 {at:[-333,21,-144],size:[93,32,54],yaw:.26,layer:1},
 {at:[-378,10,-163],size:[79,23,46],yaw:.4,layer:1},
 {at:[-265,13,-80],size:[57,21,36],yaw:.3,layer:1},
 {at:[-295,7,23],size:[80,25,48],yaw:.28,layer:1},
 {at:[-332,16,2],size:[72,30,43],yaw:.36,layer:1},
 {at:[-361,6,-17],size:[68,22,42],yaw:.25,layer:1}
];

export function makePaintClouds(scene,lighting){
 const prototypes=[0,1,2].map(i=>{const shape=cloudShape(i),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(shape.positions,3));g.setIndex(new T.BufferAttribute(shape.indices,1));g.computeVertexNormals();return g;}),guide=new T.Object3D();
 const layers=[[],[]];CLOUD_LAYOUT.forEach((p,i)=>{guide.position.fromArray(p.at);guide.rotation.set(0,p.yaw,0);guide.scale.fromArray(p.size);guide.updateMatrix();layers[p.layer].push(prototypes[i%3].clone().applyMatrix4(guide.matrix));});
 const material=new T.MeshLambertMaterial({color:'#fffdf7',flatShading:true});
 material.onBeforeCompile=s=>{s.uniforms.cloudLit=lighting.lit;s.uniforms.cloudShade=lighting.shadow;s.fragmentShader='uniform vec3 cloudLit,cloudShade;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
  float facing=.5;
  #if NUM_DIR_LIGHTS > 0
   facing=max(0.,dot(normal,directionalLights[0].direction));
  #endif
  vec3 softShade=mix(cloudShade,cloudLit,.50)*vec3(.83,.94,1.08);
  outgoingLight=diffuseColor.rgb*mix(softShade,cloudLit*1.06,smoothstep(.05,.95,facing));
  #include <opaque_fragment>`);};material.customProgramCacheKey=()=> 'faceted-cumulus-v74';
 const meshes=layers.map((pieces,i)=>{const mesh=new T.Mesh(mergeGeometries(pieces),material);mesh.name=i?'foreground-paint-cloud-banks':'distant-paint-cloud-layer';mesh.castShadow=mesh.receiveShadow=false;mesh.userData.pickThrough=true;scene.add(mesh);return mesh;});for(const g of[...layers.flat(),...prototypes])g.dispose();
 return {mesh:meshes[1],update(t){meshes.forEach((mesh,i)=>mesh.position.set(Math.sin(t*(i?.0035:.0018))*(i?5:2),Math.sin(t*.007+i)*.3,Math.sin(t*.0028+i)*(i?3:1)));},diagnostics:()=>({source:'approved v06 cloud silhouette',style:'one-sided westward drift with open eastern sea',count:CLOUD_LAYOUT.length,batches:meshes.length,triangles:meshes.reduce((sum,m)=>sum+m.geometry.index.count/3,0),oldCloudDownloadAvoided:1188216,windMetres:meshes.map(m=>m.position.toArray())})};
}

// The old photographic cloud panorama is replaced along with the 3D clouds.
// Existing sun position, sunset/night uniforms and water environment survive.
export const facetedSkyFragment=`
 varying vec3 direction;uniform vec3 tint,sunDirection;uniform float night,clock,sunset;
 float starHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec3 d=normalize(direction);float h=clamp(d.y,0.,1.);
  vec3 c=mix(vec3(.52,.78,.88),vec3(.09,.38,.66),smoothstep(-.035,.82,d.y));
  vec3 dusk=mix(vec3(.94,.43,.20),vec3(.22,.12,.34),smoothstep(-.02,.65,d.y));c=mix(c,dusk,sunset);
  float alignment=max(dot(d,sunDirection),0.);c+=vec3(1.,.85,.55)*(pow(alignment,24.)*.11+pow(alignment,170.)*.21)*(1.-night);
  vec3 nightSky=mix(vec3(.024,.065,.14),vec3(.003,.012,.045),pow(h,.6));c=mix(c,nightSky,night*.95);
  float stars=step(.998,starHash(floor(vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*vec2(160.,140.))));c+=vec3(.52,.70,1.)*stars*night*smoothstep(.06,.2,d.y);
  gl_FragColor=vec4(c*tint,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
