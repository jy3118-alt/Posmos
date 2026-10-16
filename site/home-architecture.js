import * as T from 'three';
import {paintMaterial} from './paint.js?v=7bd6e17631b5';
export function homeContour(config){
 const path=new T.CatmullRomCurve3(config.homeOutline.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');
 return path.getSpacedPoints(112).map(p=>[p.x,p.z]);
}
export function makeArtistHome(scene,cell,config){
 const contour=homeContour(config),[cx,cy,cz]=cell.origin,[w,d]=cell.size;
 const shape=new T.Shape(contour.map(([x,z])=>new T.Vector2(x,-z)));shape.closePath();
 const floor=new T.ShapeGeometry(shape),p=floor.attributes.position,uv=floor.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/d+.5);floor.rotateX(-Math.PI/2);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#e1cfb0';ctx.fillRect(0,0,1024,1024);
 const inks=['#e79b60','#559d9e','#bc86a3','#e6bf67'];
 for(let i=0;i<90;i++){const x=(i*193)%1024,y=(i*359)%1024;ctx.globalAlpha=.28+(i%4)*.1;ctx.fillStyle=inks[i%4];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+50+(i%7)*15,y+8);ctx.lineTo(x+34+(i%5)*11,y+150+(i%4)*65);ctx.lineTo(x+4,y+123);ctx.fill();}
 ctx.globalAlpha=1;for(let i=0;i<5;i++){const x=i*230+22;ctx.fillStyle='#425675';ctx.beginPath();ctx.moveTo(x,400);ctx.lineTo(x,690);ctx.lineTo(x+100,690);ctx.lineTo(x+100,400);ctx.bezierCurveTo(x+100,325,x,325,x,400);ctx.fill();ctx.fillStyle='#9aabaf';ctx.fillRect(x+14,416,18,241);ctx.strokeStyle='#e6b771';ctx.lineWidth=7;ctx.strokeRect(x-7,386,114,312);}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
 const vertices=[],uvs=[],indices=[];let distance=0;const base=config.foundationBase;
 for(let i=0;i<contour.length-1;i++){
  const a=contour[i],b=contour[i+1],length=Math.hypot(a[0]-b[0],a[1]-b[1]),offset=vertices.length/3;
  vertices.push(cx+a[0],cy,cz+a[1],cx+b[0],cy,cz+b[1],cx+a[0]*.79,base,cz+a[1]*.79,cx+b[0]*.79,base,cz+b[1]*.79);
  uvs.push(distance/12,0,(distance+length)/12,0,distance/12,(base-cy)/23,(distance+length)/12,(base-cy)/23);
  indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3);distance+=length;
 }
 const walls=new T.BufferGeometry();walls.setAttribute('position',new T.Float32BufferAttribute(vertices,3));walls.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));walls.setIndex(indices);walls.computeVertexNormals();
 const structure=new T.Mesh(walls,paintMaterial({map:texture,side:T.DoubleSide},'artist-home'));structure.castShadow=structure.receiveShadow=true;scene.add(structure);
 const guide=new T.Object3D(),bands=[];
 for(const yy of [.15,-4.6,-11.5,-19])for(let i=0;i<contour.length-1;i++){const a=contour[i],b=contour[i+1];bands.push({a,b,yy});}
 const trim=new T.InstancedMesh(new T.BoxGeometry(1,1,1),paintMaterial({},'artist-home'),bands.length);
 bands.forEach(({a,b,yy},i)=>{const k=1-Math.max(0,-yy)*.003;guide.position.set(cx+(a[0]+b[0])/2*k,cy+yy,cz+(a[1]+b[1])/2*k);guide.rotation.set(0,Math.atan2(b[0]-a[0],b[1]-a[1]),0);guide.scale.set(.24,yy===.15?.34:.14,Math.hypot(b[0]-a[0],b[1]-a[1])*k+.04);guide.updateMatrix();trim.setMatrixAt(i,guide.matrix);trim.setColorAt(i,new T.Color(yy===.15?'#e7c796':yy===-4.6?'#c78370':yy===-11.5?'#5d949f':'#ad85a1'));});trim.castShadow=trim.receiveShadow=true;trim.computeBoundingSphere();scene.add(trim);
 const dripParts=[];for(let i=0;i<contour.length-1;i+=5){const a=contour[i],r=.16+(i%4)*.06,length=3+(i%7);dripParts.push({a,r,length,index:i});}
 const drips=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,8),paintMaterial({},'artist-home'),dripParts.length),tips=new T.InstancedMesh(new T.SphereGeometry(1,8,6),paintMaterial({},'artist-home'),dripParts.length);
 dripParts.forEach(({a,r,length,index},i)=>{guide.position.set(cx+a[0]*1.006,cy-length/2,cz+a[1]*1.006);guide.rotation.set(0,0,0);guide.scale.set(r,length,r);guide.updateMatrix();drips.setMatrixAt(i,guide.matrix);guide.position.y=cy-length;guide.scale.set(r*1.1,r*1.9,r*1.1);guide.updateMatrix();tips.setMatrixAt(i,guide.matrix);const color=new T.Color(inks[index%4]);drips.setColorAt(i,color);tips.setColorAt(i,color);});drips.receiveShadow=tips.receiveShadow=true;drips.computeBoundingSphere();tips.computeBoundingSphere();scene.add(drips,tips);
 // A thumb-hole pool makes the roof read as a painter's palette.
 const pool=new T.Mesh(new T.CircleGeometry(2.15,40),paintMaterial({color:'#58b5c4'},'water'));pool.rotation.x=-Math.PI/2;pool.position.set(-16,.020,5);scene.add(pool);
 const rim=new T.Mesh(new T.TorusGeometry(2.2,.15,8,48),paintMaterial({color:'#e8c284'},'artist-home'));rim.rotation.x=-Math.PI/2;rim.position.copy(pool.position);rim.castShadow=rim.receiveShadow=true;scene.add(rim);
 return {floorGeometry:floor,contour};
}
