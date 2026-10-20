import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {paintMaterial} from './paint.js?v=678b68d9df9d';

// Enlarged paint stays on its physical surface. Cropping changes UV coverage,
// never shrinks the requested mural; round facades bend the painted plane.
export function makeMurals(scene,config,texture,city){
  if(!texture||!config)return null;
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const parts=[],surfaces=[],roof=config.roofSize||[22.63,18.38];
  for(const item of config.placements){
    const desired=item.size,position=new T.Vector3().fromArray(item.position),rotation=new T.Euler().fromArray(item.rotation||[0,0,0]);
    let width=desired[0],height=desired[1],uStart=0,vStart=0,round=null;
    if(item.buildingAnchor){
      const b=city?.buildings.find(b=>b.sourceAnchor[0]===item.buildingAnchor[0]&&b.sourceAnchor[1]===item.buildingAnchor[1]);
      if(!b)continue;
      const tier=b.type==='terraced'?11:b.type==='twin'?5.5:b.type==='tapered'?14:0;
      const cy=Math.min(b.top+item.belowRoof,b.top-tier-.08-height/2);
      width=Math.min(width,b.type==='round'?Math.PI*b.width*.425:b.width*.97);uStart=(1-width/desired[0])/2;
      if(b.type==='round'){round=b;position.set(b.x,cy,b.z);}
      else {const offset=new T.Vector3(0,0,b.depth/2+.028).applyAxisAngle(new T.Vector3(0,1,0),b.yaw);position.set(b.x,cy,b.z).add(offset);}
      rotation.set(0,b.yaw,0);
    }else if(item.id==='home-front-painter'){
      const originalLeft=position.x-width/2,left=Math.max(originalLeft,-roof[0]/2+.012),right=Math.min(position.x+width/2,roof[0]/2-.012);
      width=right-left;uStart=(left-originalLeft)/desired[0];position.x=(left+right)/2;
    }
    if(width<=0||height<=0)continue;
    const g=new T.PlaneGeometry(width,height,round?28:1,1),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++){
      const u=uStart+uv.getX(i)*width/desired[0],v=vStart+uv.getY(i)*height/desired[1];
      uv.setXY(i,((item.frame%2)+T.MathUtils.clamp(u,.006,.994))/2,(1-Math.floor(item.frame/2)+T.MathUtils.clamp(v,.006,.994))/2);
    }
    if(round){const p=g.attributes.position;for(let i=0;i<p.count;i++){const angle=p.getX(i)/(round.width/2);p.setXYZ(i,Math.sin(angle)*round.width/2,p.getY(i),Math.cos(angle)*round.depth/2+.028);}g.computeVertexNormals();}
    g.applyMatrix4(new T.Matrix4().compose(position,new T.Quaternion().setFromEuler(rotation),new T.Vector3(1,1,1)));
    parts.push(g);surfaces.push({id:item.id,desiredSize:desired,visibleSize:[width,height],curved:!!round});
  }
  const geometry=mergeGeometries(parts),material=paintMaterial({map:texture,alphaTest:.09},'mural');
  material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=false;mesh.receiveShadow=true;scene.add(mesh);
  return {mesh,count:parts.length,surfaces};
}
