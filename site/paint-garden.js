import * as T from 'three';
import {paintMaterial} from './paint.js?v=a2b9f13c5d88';
import {inPolygon} from './paint-city.js?v=a2b9f13c5d88';

function clumpGeometry(crossed=true){
  const positions=[],uvs=[],normals=[],indices=[],angles=crossed?[0,Math.PI/3,Math.PI*2/3]:[0];
  for(const angle of angles){
    const offset=positions.length/3,s=Math.sin(angle),c=Math.cos(angle);
    for(let row=0;row<3;row++)for(let side=0;side<2;side++){
      const x=side-.5,y=row/2;positions.push(x*c,y,-x*s);uvs.push(side,y);normals.push(s,0,c);
    }
    for(let row=0;row<2;row++){const i=offset+row*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);return g;
}

export function makePaintedGarden(scene,config,texture,wind,city=null){
  let seed=447;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const material=paintMaterial({map:texture,alphaTest:.38,side:T.DoubleSide,paintAtlas:{columns:4,rows:2,instanced:true}},'botanical');
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{compile(shader);shader.uniforms.uGardenTime=wind;shader.vertexShader='uniform float uGardenTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uGardenTime*.35+instanceMatrix[3].x*.7+instanceMatrix[3].z*.4)*.012*position.y*position.y;');};
  material.customProgramCacheKey=()=> 'paint-garden-atlas-breeze-v5';
  const guide=new T.Object3D(),clump=clumpGeometry(),flat=clumpGeometry(false);
  function batch(geometry,plants,receiveShadow=true){
    geometry=geometry.clone();const packed=new Float32Array(plants.length*4);
    plants.forEach((plant,i)=>packed.set([plant.frame%4,1-Math.floor(plant.frame/4),1,1],i*4));
    geometry.setAttribute('aPaintAtlas',new T.InstancedBufferAttribute(packed,4));
    const mesh=new T.InstancedMesh(geometry,material,plants.length);
    plants.forEach((p,i)=>{guide.position.fromArray(p.position);guide.rotation.set(0,p.yaw||0,p.hanging?Math.PI:0);guide.scale.set(p.width,p.height,p.width);guide.updateMatrix();mesh.setMatrixAt(i,guide.matrix);});
    mesh.receiveShadow=receiveShadow;mesh.castShadow=false;mesh.computeBoundingSphere();scene.add(mesh);return mesh;
  }
  function gardenAt(x,z){return config.gardens.findIndex(g=>inPolygon(x,z,g.points));}
  function nearSegment(x,z,a,b,r){const dx=b[0]-a[0],dz=b[1]-a[1],t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<r;}
  function available(x,z){
    if(gardenAt(x,z)<0)return false;
    if((config.clearings||[]).some(c=>c.radius?Math.hypot(x-c.center[0],z-c.center[1])<c.radius:Math.abs(x-c.center[0])<c.halfSize[0]&&Math.abs(z-c.center[1])<c.halfSize[1]))return false;
    return !(config.walkCorridors||[]).some(c=>c.points.some((b,i)=>i&&nearSegment(x,z,c.points[i-1],b,c.radius)));
  }
  const weights=[[0,1,1,4,6,7],[0,2,4,4,5,6],[0,0,2,3,5,6]],plants=[],hanging=[];
  for(const cell of config.cells.filter(c=>c.enabled)){
    for(let i=0;i<(config.gardenDensity||1550);i++){
      let x,z,tries=0;do{x=(random()-.5)*(cell.size[0]-.5);z=(random()-.5)*(cell.size[1]-.5);}while(!available(x,z)&&++tries<250);
      if(!available(x,z))continue;
      const frames=weights[gardenAt(x,z)%weights.length],frame=frames[Math.floor(random()*frames.length)],height=.28+random()*.38;
      plants.push({position:[x+cell.origin[0],cell.origin[1]+.017,z+cell.origin[2]],width:height*(1.05+random()*.55),height,frame,yaw:random()*Math.PI*2});
    }
    const [w,d]=cell.size;
    for(let edge=0;edge<3;edge++)for(let i=0;i<44;i++){
      const t=(i+.5)/44;
      const x=edge===0?-w/2+.3+t*(w-.6):edge===1?w/2-.36:-w/2+.36,z=edge===0?d/2-.36:-d/2+.45+t*(d-.9);
      if(gardenAt(x,z)<0)continue;
      hanging.push({position:[cell.origin[0]+(edge===0?x:edge===1?w/2+.13:-w/2-.13),cell.origin[1]-.08,cell.origin[2]+(edge===0?d/2+.14:z)],width:.34+random()*.45,height:.55+random()*1.1,frame:i%5===0?2:0,yaw:edge===0?0:edge===1?Math.PI/2:-Math.PI/2,hanging:true});
    }
  }
  const ground=batch(clump,plants),ivy=batch(flat,hanging),crowns=[];
  config.trees.forEach((tree,index)=>{
    const frame=[1,0,2,3][index%4];
    for(let i=0;i<25;i++){
      const angle=random()*Math.PI*2,radius=Math.sqrt(random())*tree.height*.27;
      const height=tree.height*(.19+random()*.095);
      crowns.push({position:[tree.position[0]+Math.cos(angle)*radius,tree.position[1]+tree.height*(.43+random()*.34),tree.position[2]+Math.sin(angle)*radius],width:height*(1.1+random()*.35),height,frame,yaw:random()*Math.PI*2});
    }
  });
  for(const [j,tree] of (city?.parkTrees||[]).entries())for(let i=0;i<8;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*tree.height*.23,height=tree.height*(.23+random()*.10);crowns.push({position:[tree.position[0]+Math.cos(a)*r,tree.position[1]+tree.height*(.46+random()*.28),tree.position[2]+Math.sin(a)*r],width:height*1.45,height,frame:j%5===0?2:1,yaw:random()*Math.PI*2});}
  const foliage=batch(clump,crowns),meadowPlants=[];
  for(const [j,p] of (city?.parks||[]).entries())for(let i=0;i<300;i++){
   const a=random()*Math.PI*2,r=Math.sqrt(random())*.96,x=p.center[0]+Math.cos(a)*p.radius[0]*r,z=p.center[1]+Math.sin(a)*p.radius[1]*r,height=.7+random()*1.6;
   meadowPlants.push({position:[x,city.hillHeight(p,x,z)+.03,z],width:height*1.6,height,frame:[0,1,4,6,7][(i+j)%5],yaw:random()*Math.PI*2});
  }
  const meadow=meadowPlants.length?batch(clump,meadowPlants,false):null;
  return {plantCount:plants.length,canopyCards:crowns.length,hangingCount:hanging.length,
    setQuality(light){if(meadow)meadow.count=light?Math.ceil(meadowPlants.length*.4):meadowPlants.length;ground.count=light?Math.ceil(plants.length*.58):plants.length;foliage.count=light?Math.ceil(crowns.length*.55):crowns.length;ivy.count=hanging.length;}};
}
