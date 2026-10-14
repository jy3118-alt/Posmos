import * as T from 'three';

// A light accessory on the existing rig; the character's mesh/skin is unchanged.
export function makeRoyalOutfit(scene){
 const crown=new T.Group();crown.name='unique-golden-crown';const vertices=[],indices=[],segments=12;
 for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,top=i%2?.075:.22;for(const [r,y]of [[.20,0],[.20,top],[.168,top],[.168,0]])vertices.push(Math.cos(a)*r,y,Math.sin(a)*r);}
 for(let i=0;i<segments;i++)for(let side=0;side<4;side++){const a=i*4+side,b=i*4+(side+1)%4,c=(i+1)*4+side,d=(i+1)*4+(side+1)%4;indices.push(a,c,b,b,c,d);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const gold=new T.MeshStandardMaterial({color:'#ffd066',metalness:.62,roughness:.32,envMapIntensity:.75,side:T.DoubleSide}),band=new T.Mesh(geometry,gold);crown.add(band);
 const jewelMaterial=new T.MeshStandardMaterial({color:'#d83448',roughness:.25,metalness:.12});for(let i=0;i<6;i++){const a=i/6*Math.PI*2,jewel=new T.Mesh(new T.OctahedronGeometry(.030,0),jewelMaterial);jewel.position.set(Math.cos(a)*.205,.075,Math.sin(a)*.205);crown.add(jewel);}
 const cape=new T.Group();cape.name='unique-scarlet-cape';const pos=[],uv=[],faces=[],cols=12,rows=10;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols*2-1,v=y/rows;pos.push(-.29-v*.18-Math.cos(u*Math.PI/2)*.05, -v*.48,u*(.23+v*.11));uv.push(x/cols,v);}
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;faces.push(a,b,a+1,a+1,b,b+1);}
 const clothGeometry=new T.BufferGeometry();clothGeometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));clothGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));clothGeometry.setIndex(faces);clothGeometry.computeVertexNormals();
 const clock={value:0},clothMaterial=new T.MeshLambertMaterial({color:'#ce2b44',side:T.DoubleSide});clothMaterial.onBeforeCompile=s=>{s.uniforms.royalTime=clock;s.vertexShader='uniform float royalTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat hem=uv.y*uv.y;transformed.x+=sin(uv.x*18.+royalTime*2.2)*.020*hem;transformed.z+=sin(royalTime*1.6+uv.y*4.)*.018*hem;');};clothMaterial.customProgramCacheKey=()=> 'scarlet-cape';
 const cloth=new T.Mesh(clothGeometry,clothMaterial);cape.add(cloth);const collar=new T.Mesh(new T.TorusGeometry(.21,.024,4,16,Math.PI),new T.MeshLambertMaterial({color:'#fff1d4'}));collar.rotation.x=Math.PI/2;collar.rotation.z=Math.PI/2;collar.position.x=-.10;cape.add(collar);
 const pickSphere=new T.Sphere(),pickPoint=new T.Vector3();crown.raycast=(raycaster,hits)=>{pickSphere.center.set(0,.09,0).applyMatrix4(crown.matrixWorld);pickSphere.radius=.255*crown.scale.x;if(raycaster.ray.intersectSphere(pickSphere,pickPoint)){const distance=pickPoint.distanceTo(raycaster.ray.origin);if(distance>=raycaster.near&&distance<=raycaster.far)hits.push({object:crown,distance,point:pickPoint.clone()});}};
 scene.add(crown,cape);return {crown,cape,clock,pickMeshes:[crown,...crown.children,...cape.children]};
}
