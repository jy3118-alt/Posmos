import * as T from 'three';
import {paintMaterial} from './paint.js?v=7bd6e17631b5';
import {makeArtistHome} from './home-architecture.js?v=7bd6e17631b5';
import {CITY_BASE,createCityLayout} from './city-layout.js?v=7bd6e17631b5';

export function inPolygon(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < (xj-xi)*(z-zi)/(zj-zi)+xi) inside = !inside;
  }
  return inside;
}
function randomSource(seed) {return () => {seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const palette=['#edb544','#ef756c','#43ada7','#458ccd','#bd7bad','#e9c54e'];

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const texture = new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

// Code-native painted floor, with the very same polygon data used for grass placement.
function roofTexture(cell, gardens, config) {
  return canvasTexture(2048,1802,(ctx,w,h)=>{
    const r=randomSource(810),sx=w/cell.size[0],sz=h/cell.size[1];
    ctx.fillStyle='#d5c2a6';ctx.fillRect(0,0,w,h);
    const stroke=(x,y,width,length,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width,y+2);ctx.lineTo(x+width*.97,y+length);ctx.lineTo(x+width*.08,y+length-4);ctx.closePath();ctx.fill();};
    for(let i=0;i<1800;i++)stroke(r()*w,r()*h,8+r()*80,3+r()*13,['#e1d1b4','#c8bca6','#ddcfb9','#bcb4ae'][Math.floor(r()*4)]);
    // Broken concrete seams give the walkways a readable scale.
    ctx.strokeStyle='#a69da4';ctx.lineWidth=2;ctx.globalAlpha=.42;
    for(let z=-cell.size[1]/2;z<cell.size[1]/2;z+=1.5){ctx.beginPath();ctx.moveTo(0,(z+cell.size[1]/2)*sz);ctx.lineTo(w,(z+cell.size[1]/2)*sz);ctx.stroke();}
    for(let x=-cell.size[0]/2;x<cell.size[0]/2;x+=1.8){ctx.beginPath();ctx.moveTo((x+cell.size[0]/2)*sx,0);ctx.lineTo((x+cell.size[0]/2)*sx,h);ctx.stroke();}ctx.globalAlpha=1;
    for(const garden of gardens){
      ctx.save();ctx.beginPath();garden.points.forEach(([x,z],i)=>{const px=(x+cell.size[0]/2)*sx,pz=(z+cell.size[1]/2)*sz;i?ctx.lineTo(px,pz):ctx.moveTo(px,pz);});ctx.closePath();ctx.clip();
      ctx.fillStyle=garden.base;ctx.fillRect(0,0,w,h);
      for(let i=0;i<4000;i++){ctx.globalAlpha=.35+r()*.50;stroke(r()*w,r()*h,1+r()*9,5+r()*23,garden.strokes[Math.floor(r()*garden.strokes.length)]);}ctx.globalAlpha=1;
      ctx.restore();
    }
    // Clear both the painted garden substrate and its matching 3D planting.
    ctx.fillStyle='#d5c2a6';
    for(const clearing of config.clearings||[]){
     const [x,z]=clearing.center,xx=(x+cell.size[0]/2)*sx,zz=(z+cell.size[1]/2)*sz;
     if(clearing.radius){ctx.beginPath();ctx.ellipse(xx,zz,clearing.radius*sx,clearing.radius*sz,0,0,Math.PI*2);ctx.fill();}
     else ctx.fillRect(xx-clearing.halfSize[0]*sx,zz-clearing.halfSize[1]*sz,clearing.halfSize[0]*sx*2,clearing.halfSize[1]*sz*2);
    }
    ctx.strokeStyle='#d5c2a6';ctx.lineJoin=ctx.lineCap='round';
    for(const corridor of config.walkCorridors||[]){ctx.lineWidth=corridor.radius*2*sx;ctx.beginPath();corridor.points.forEach(([x,z],i)=>{const xx=(x+cell.size[0]/2)*sx,zz=(z+cell.size[1]/2)*sz;i?ctx.lineTo(xx,zz):ctx.moveTo(xx,zz);});ctx.stroke();}
    ctx.save();ctx.beginPath();config.workArea.forEach(([x,z],i)=>{const px=(x+cell.size[0]/2)*sx,pz=(z+cell.size[1]/2)*sz;i?ctx.lineTo(px,pz):ctx.moveTo(px,pz);});ctx.closePath();ctx.clip();ctx.fillStyle='#c57658';ctx.fillRect(0,0,w,h);for(let i=0;i<1100;i++)stroke(r()*w,r()*h,4+r()*50,2+r()*9,['#dd925e','#c96159','#dcaa66','#997184'][i%4]);ctx.restore();
    // Paint spilled around the existing work table, rather than random confetti everywhere.
    for(const center of config.paintSpills)for(let i=0;i<70;i++){const x=(center[0]+cell.size[0]/2+(r()-.5)*2.7)*sx,z=(center[1]+cell.size[1]/2+(r()-.5)*2.3)*sz;ctx.fillStyle=palette[i%palette.length];ctx.globalAlpha=.45+r()*.35;ctx.beginPath();ctx.ellipse(x,z,5+r()*22,2+r()*8,r()*3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  });
}

function facadeTexture(base, seed, rows=7, cols=6) {
  return canvasTexture(512,768,(ctx,w,h)=>{
    const r=randomSource(seed);ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
    for(let i=0;i<700;i++){ctx.globalAlpha=.06+r()*.13;ctx.fillStyle=i%3?'#fbe0b0':'#5e457a';ctx.fillRect(r()*w,r()*h,3+r()*24,8+r()*100);}ctx.globalAlpha=1;
    const cw=w/cols,rh=h/rows;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const x=col*cw+cw*.24,y=row*rh+rh*.20,ww=cw*.46,hh=rh*.58;
      ctx.fillStyle='#725d82';ctx.fillRect(x-3,y-3,ww+6,hh+9);
      ctx.fillStyle=r()>.14?'#374d70':'#cfad80';ctx.fillRect(x,y,ww,hh);
      ctx.fillStyle='#9aaac0';ctx.fillRect(x+3,y+3,ww*.22,hh*.88);
      ctx.fillStyle='#e8c093';ctx.fillRect(x-5,y+hh+3,ww+12,4);
      ctx.fillStyle='#a99cb7';ctx.fillRect(x+ww*.49,y,2,hh);ctx.fillRect(x,y+hh*.48,ww,2);
    }
    for(let stain=0;stain<8;stain++){
      const x=r()*w,y=r()*h;ctx.fillStyle=palette[stain%palette.length];ctx.globalAlpha=.65;
      ctx.beginPath();ctx.ellipse(x,y,15+r()*25,12+r()*26,r()*2,0,Math.PI*2);ctx.fill();
      for(let drip=0;drip<3;drip++)ctx.fillRect(x-12+drip*12,y,3+r()*5,20+r()*90);
    }ctx.globalAlpha=1;
  });
}

function box(scene, geometry, material, x,y,z, shadow=true) {
  const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=shadow;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}

export function openBoxGeometry(){
  const g=new T.BoxGeometry(1,1,1),indices=[],groups=[];
  for(const group of g.groups){if(group.materialIndex===3)continue;groups.push({start:indices.length,count:group.count,materialIndex:group.materialIndex});for(let i=group.start;i<group.start+group.count;i++)indices.push(g.index.array[i]);}
  g.setIndex(indices);g.clearGroups();for(const group of groups)g.addGroup(group.start,group.count,group.materialIndex);
  return g;
}
function gableGeometry(){
  const shape=new T.Shape();shape.moveTo(-.5,0);shape.lineTo(0,.7);shape.lineTo(.5,0);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});geometry.translate(0,0,-.5);return geometry;
}
function spireGeometry(){return new T.ConeGeometry(.5,1,8);}
function slenderGeometry(){const g=new T.CylinderGeometry(.018,.5,1,12,12,true),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)+.5;const k=1+.22*Math.sin(y*Math.PI);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}g.computeVertexNormals();return g;}
function taperedGeometry(){
  const geometry=openBoxGeometry(),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)if(p.getY(i)>.4)p.setX(i,p.getX(i)*.72+.11);
  geometry.computeVertexNormals();return geometry;
}

export function makePaintedRooftops(scene, config, paintedFacade) {
  const cells=config.cells.filter(c=>c.enabled),gardens=config.gardens,base=config.foundationBase??CITY_BASE;
  const facade=paintedFacade||facadeTexture('#c18c9d',413,8,8),isAtlas=!!config.facadeAtlas;
  const atlas=(frame,repeat,instanced=false)=>isAtlas?{columns:2,rows:2,tile:[frame%2,1-Math.floor(frame/2)],repeat,instanced}:null;
  const capMap=canvasTexture(512,512,(ctx,w,h)=>{
    const r=randomSource(851);ctx.fillStyle='#dac29c';ctx.fillRect(0,0,w,h);
    for(let i=0;i<1000;i++){ctx.globalAlpha=.10+r()*.3;ctx.fillStyle=['#ebc36c','#53a7ad','#c477a3','#ea8d6a'][i%4];ctx.fillRect(r()*w,r()*h,14+r()*94,1+r()*6);}ctx.globalAlpha=1;
  });
  const edge=paintMaterial({map:capMap},'architecture'),trim=paintMaterial({color:'#517fae'},'architecture');
  const bodyGeometry=openBoxGeometry();
  for(const cell of cells){
    const [x,y,z]=cell.origin,[w,d]=cell.size,h=y-base;
    const artist=config.homeArchitecture==='palette'?makeArtistHome(scene,cell,config):null;
    if(!artist){const wall=paintMaterial({map:facade,paintAtlas:atlas(cell.paletteFrame??0,[w/8,h/16])},'architecture');const structure=new T.Mesh(bodyGeometry,wall);structure.position.set(x,y-h/2-.04,z);structure.scale.set(w,h,d);structure.castShadow=structure.receiveShadow=true;scene.add(structure);}
    const floorMap=roofTexture(cell,gardens,config),floorMat=paintMaterial({map:floorMap},'floor');
    const floorGeometry=artist?.floorGeometry||new T.PlaneGeometry(w,d);if(!artist)floorGeometry.rotateX(-Math.PI/2);
    // CanvasTexture flips image rows on upload; this plane's original UVs already
    // map the canvas back garden (top row) to negative Z. Do not mirror it again.
    box(scene,floorGeometry,floorMat,x,y+.008,z,false);
    const segments=gardens.flatMap(g=>g.points.map((p,i)=>[p,g.points[(i+1)%g.points.length]]));
    const curbs=new T.InstancedMesh(new T.BoxGeometry(1,1,1),edge,segments.length),guide=new T.Object3D();
    segments.forEach(([a,b],i)=>{guide.position.set(x+(a[0]+b[0])/2,y+.037,z+(a[1]+b[1])/2);guide.rotation.set(0,Math.atan2(b[0]-a[0],b[1]-a[1]),0);guide.scale.set(.07,.07,Math.hypot(b[0]-a[0],b[1]-a[1]));guide.updateMatrix();curbs.setMatrixAt(i,guide.matrix);});
    curbs.receiveShadow=true;curbs.computeBoundingSphere();scene.add(curbs);
    if(!artist){
    const adjacent=side=>cells.some(c=>c!==cell&&Math.abs(c.origin[2]-z)<.01&&Math.abs(c.origin[0]-x-side*(w+c.size[0])/2)<.01);
    for(const side of [-1,1]){
      if(!adjacent(side))box(scene,new T.BoxGeometry(.18,.33,d+.18),edge,x+side*w/2,y+.16,z);
      box(scene,new T.BoxGeometry(w,.33,.18),edge,x,y+.16,z+side*d/2);
    }
    const bands=[];for(let row=0;row<Math.ceil(cell.buildingHeight/2.6);row++)bands.push({position:[x,y-1-row*2.6,z+d/2+.04],scale:[w+.12,.08,.14]},{position:[x+w/2+.04,y-1-row*2.6,z],scale:[.14,.08,d+.12]});
    const ledges=new T.InstancedMesh(new T.BoxGeometry(1,1,1),edge,bands.length);
    bands.forEach((band,i)=>{guide.position.fromArray(band.position);guide.rotation.set(0,0,0);guide.scale.fromArray(band.scale);guide.updateMatrix();ledges.setMatrixAt(i,guide.matrix);});ledges.receiveShadow=true;ledges.computeBoundingSphere();scene.add(ledges);
    for(const xx of [-w*.40,w*.36])box(scene,new T.CylinderGeometry(.065,.065,h,7),trim,x+xx,y-h/2,z+d/2+.11);
    }
    const shedMat=paintMaterial({map:facade,paintAtlas:atlas(3,[.44,.27])},'architecture');
    const [ax,az]=config.accessPosition;
    box(scene,new T.BoxGeometry(2.25,1.85,1.65),shedMat,x+ax,y+.925,z+az);
    box(scene,new T.BoxGeometry(2.45,.15,1.87),paintMaterial({color:'#ea9873'},'architecture'),x+ax,y+1.92,z+az);
    box(scene,new T.BoxGeometry(.65,1.24,.07),paintMaterial({color:'#455184'},'architecture'),x+ax+.3,y+.62,z+az+.86);
  }

  const buildings=createCityLayout(config),batches=new Map(),dummy=new T.Object3D();
  const geometries={box:bodyGeometry,round:new T.CylinderGeometry(.5,.5,1,12,1,true),tank:new T.CylinderGeometry(.5,.5,1,10),gable:gableGeometry(),dome:new T.SphereGeometry(.5,12,6,0,Math.PI*2,0,Math.PI/2),taper:taperedGeometry(),spire:spireGeometry(),slender:slenderGeometry()};
  let roofPropCount=0;const cityMeshes=[];
  const roofColours=['#66b9b0','#dc877e','#e5bd56','#b486be'];
  function part(b,shape,width,height,depth,yy,ox=0,oz=0,role='wall'){
    const key=shape+'-'+role;
    if(!batches.has(key))batches.set(key,{shape,role,frame:b.frame,parts:[]});
    const cx=Math.cos(b.yaw),sn=Math.sin(b.yaw);
    batches.get(key).parts.push({position:[b.x+ox*cx+oz*sn,yy,b.z-ox*sn+oz*cx],scale:[width,height,depth],yaw:b.yaw,frame:b.frame,depth:Math.hypot(b.x,b.z),repeat:[shape==='round'?Math.PI*width/6:width/6,height/22]});
  }
  function foundation(b,top,width=b.width,depth=b.depth){part(b,b.type==='round'?'round':'box',width,top-base,depth,(top+base)/2);}
  function flatRoof(b,w,d,yy,ox=0,oz=0){part(b,'box',w+.22,.16,d+.22,yy+.08,ox,oz,'roof');}
  for(const [buildingIndex,b] of buildings.entries()){
    if(b.type==='lotus-tower'){
      foundation(b,b.top-43,b.width*.94,b.depth*.94);
      part(b,'slender',b.width,43,b.depth,b.top-21.5);
      part(b,'tank',.16,3,.16,b.top+1.5,0,0,'roof');
    }else if(b.type==='temple'){
      foundation(b,b.top-7);flatRoof(b,b.width,b.depth,b.top-7);
      for(const x of [-.39,-.13,.13,.39])for(const z of [-.37,.37]){
       part(b,'round',b.width*.065,5,b.width*.065,b.top-4.5,x*b.width,z*b.depth);
       part(b,'box',b.width*.10,.3,b.width*.10,b.top-1.9,x*b.width,z*b.depth,'roof');
      }
      part(b,'box',b.width*.60,4,b.depth*.43,b.top-5);
      part(b,'box',b.width*1.05,.65,b.depth*1.05,b.top-1.5,0,0,'roof');
      part(b,'gable',b.width*1.06,2.15,b.depth*1.07,b.top-1.15,0,0,'roof');
    }else if(b.type==='cathedral'||b.type==='basilica'){
      foundation(b,b.top-12);flatRoof(b,b.width,b.depth,b.top-12);
      part(b,'box',b.width*.58,7,b.depth*.80,b.top-8.5);
      part(b,'gable',b.width*.66,3,b.depth*.88,b.top-5,0,0,'roof');
      const towers=b.type==='basilica'?[-.37,-.13,.13,.37]:[-.33,.33];
      for(const [i,x] of towers.entries()){
       const h=b.type==='basilica'?9+(i%2)*4:9;
       part(b,'round',b.width*.15,h,b.width*.15,b.top-12+h/2,x*b.width,-b.depth*.29);
       part(b,'spire',b.width*.19,4.2,b.width*.19,b.top-12+h+2.1,x*b.width,-b.depth*.29,'roof');
      }
      if(b.type==='basilica')for(const x of [-.27,0,.27]){part(b,'round',b.width*.10,9,b.width*.10,b.top-7.5,x*b.width,b.depth*.29);part(b,'spire',b.width*.13,5,b.width*.13,b.top-.5,x*b.width,b.depth*.29,'roof');}
      for(const x of [-.43,.43])for(const z of [-.1,.18,.4])part(b,'taper',b.width*.12,4.5,b.depth*.12,b.top-9.75,x*b.width,z*b.depth);
    }else if(b.type==='terraced'){
      foundation(b,b.top-11);flatRoof(b,b.width,b.depth,b.top-11);
      part(b,'box',b.width*.80,5,b.depth*.78,b.top-8.5,-b.width*.07);flatRoof(b,b.width*.80,b.depth*.78,b.top-6,-b.width*.07);
      part(b,'box',b.width*.59,3.5,b.depth*.59,b.top-4.25,b.width*.04);flatRoof(b,b.width*.59,b.depth*.59,b.top-2.5,b.width*.04);
      part(b,'box',b.width*.38,2.5,b.depth*.42,b.top-1.25,b.width*.14);flatRoof(b,b.width*.38,b.depth*.42,b.top,b.width*.14);
    }else if(b.type==='round'){
      foundation(b,b.top);part(b,'dome',b.width,2.7,b.depth,b.top,0,0,'roof');
      part(b,'round',b.width+ .18,.24,b.depth+.18,b.top-.3,0,0,'roof');
    }else if(b.type==='gabled'){
      foundation(b,b.top);part(b,'gable',b.width+ .35,2.3,b.depth+.32,b.top,0,0,'roof');
      part(b,'box',.35,2.9,.45,b.top+1.5,b.width*.26,-b.depth*.18,'roof');
    }else if(b.type==='twin'){
      foundation(b,b.top-5.5);flatRoof(b,b.width,b.depth,b.top-5.5);
      for(const side of [-1,1]){part(b,'box',b.width*.35,5.5,b.depth*.70,b.top-2.75,side*b.width*.28);flatRoof(b,b.width*.35,b.depth*.70,b.top,side*b.width*.28);}
      part(b,'box',b.width*.55,.8,b.depth*.34,b.top-2.2,0,0,'roof');
    }else if(b.type==='slab'){
      foundation(b,b.top);flatRoof(b,b.width,b.depth,b.top);
      part(b,'box',b.width*.32,1.1,b.depth*.37,b.top+.65,-b.width*.20,-b.depth*.17,'roof');
    }else if(b.type==='stepped'){
      foundation(b,b.top-6);flatRoof(b,b.width,b.depth,b.top-6);
      part(b,'box',b.width*.76,3.5,b.depth*.83,b.top-4.25,-b.width*.06);flatRoof(b,b.width*.76,b.depth*.83,b.top-2.5,-b.width*.06);
      part(b,'box',b.width*.55,2.5,b.depth*.60,b.top-1.25,-b.width*.08);flatRoof(b,b.width*.55,b.depth*.60,b.top,-b.width*.08);
    }else if(b.type==='needle'){
      foundation(b,b.top-8);flatRoof(b,b.width,b.depth,b.top-8);
      part(b,'box',b.width*.43,8,b.depth*.45,b.top-4);flatRoof(b,b.width*.43,b.depth*.45,b.top);
      part(b,'tank',.16,3,.16,b.top+1.65,0,0,'roof');
    }else{
      foundation(b,b.top-14);part(b,'taper',b.width,14,b.depth,b.top-7);flatRoof(b,b.width*.77,b.depth,b.top,b.width*.10);
      part(b,'box',b.width*.48,.28,b.depth*.78,b.top+1.1,b.width*.13,0,'roof');
      for(const side of [-1,1])part(b,'box',.14,.95,.15,b.top+.55,b.width*(.13+side*.18),b.depth*.24,'roof');
    }
    const r=Math.hypot(b.x,b.z);if(r>210||['temple','cathedral','basilica','lotus-tower'].includes(b.type))continue;
    const roofScale=b.type==='terraced'?.38:b.type==='twin'?.35:b.type==='stepped'?.55:b.type==='needle'?.43:1;
    const roofX=b.type==='terraced'?b.width*.14:b.type==='twin'?b.width*.28:b.type==='stepped'?-b.width*.08:b.type==='tapered'?b.width*.10:0;
    const roofY=b.top+(b.type==='round'?1.35:b.type==='gabled'?1.62:.17),rw=b.width*roofScale;
    if(buildingIndex%3===0&&b.type!=='gabled'){
      const diameter=Math.min(1.2,rw*.40),height=.7+(buildingIndex%5)*.20;
      part(b,'tank',diameter,height,diameter,roofY+height/2,roofX,0,'roof');
      part(b,'tank',diameter*1.07,.09,diameter*1.07,roofY+height,roofX,0,'roof');
      part(b,'box',.10,.35,.10,roofY+height+.17,roofX,0,'roof');roofPropCount++;
    }
    if(buildingIndex%4===0){
      part(b,'box',.08,2.2,.08,roofY+1.1,roofX+rw*.21,0,'roof');
      part(b,'box',Math.min(1.1,rw*.6),.05,.05,roofY+1.8,roofX+rw*.21,0,'roof');roofPropCount++;
    }
    if(buildingIndex%6===0&&!['round','gabled','needle'].includes(b.type)){
      const size=Math.min(1.6,rw*.60);
      for(const xx of [-1,1])for(const zz of [-1,1])part(b,'box',.09,.85,.09,roofY+.425,roofX+xx*size*.4,zz*size*.35,'roof');
      part(b,'box',size,.10,size*.9,roofY+.90,roofX,0,'roof');roofPropCount++;
    }
  }
  for(const batch of batches.values()){
    batch.parts.sort((a,b)=>a.depth-b.depth);
    const geometry=geometries[batch.shape].clone(),packed=new Float32Array(batch.parts.length*4);
    batch.parts.forEach((p,i)=>packed.set([p.frame%2,1-Math.floor(p.frame/2),...p.repeat],i*4));
    geometry.setAttribute('aPaintAtlas',new T.InstancedBufferAttribute(packed,4));
    const material=batch.role==='wall'?paintMaterial({map:facade,paintAtlas:atlas(0,[1,1],true)},'city-architecture'):paintMaterial({map:capMap},'city-architecture');
    const mesh=new T.InstancedMesh(geometry,material,batch.parts.length);
    batch.parts.forEach((p,i)=>{dummy.position.fromArray(p.position);dummy.rotation.set(0,p.yaw,0);dummy.scale.fromArray(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);const color=new T.Color(batch.role==='wall'?['#dae0e7','#e4d8c4','#c8e0de','#d6cde0'][p.frame]:roofColours[p.frame]);color.lerp(new T.Color('#c0bfd9'),T.MathUtils.clamp((p.depth-50)/200,0,.12));mesh.setColorAt(i,color);});
    mesh.castShadow=mesh.receiveShadow=false;mesh.computeBoundingSphere();scene.add(mesh);cityMeshes.push({mesh,fullCount:batch.parts.length,lightCount:batch.parts.filter(p=>p.depth<(config.lightCityRadius||145)).length});
  }
  const trees=buildings.filter((b,i)=>Math.hypot(b.x,b.z)<95&&i%4===0&&(b.type==='terraced'||b.type==='twin')).slice(0,48).map(b=>{
    const ox=b.type==='terraced'?b.width*.40:0,oz=b.depth*.43;
    return {position:[b.x+ox*Math.cos(b.yaw)+oz*Math.sin(b.yaw),b.top-(b.type==='terraced'?11:5.5)+.17,b.z-ox*Math.sin(b.yaw)+oz*Math.cos(b.yaw)],height:1.7+(Math.abs(b.x)%1)*1.2,yaw:b.yaw};
  });
  if(config.citySurround){
    // Paint actual streets and lots below the buildings; no empty beige plane.
    const extent=(config.cityRadius||258)*2+40,groundY=config.cityGroundY??-54;
    const groundMap=canvasTexture(2048,2048,(ctx,w,h)=>{
      const scale=w/extent,r=randomSource(244),px=x=>(x+extent/2)*scale,pz=z=>(z+extent/2)*scale;
      ctx.fillStyle='#7f7c9b';ctx.fillRect(0,0,w,h);
      for(let i=0;i<3600;i++){ctx.globalAlpha=.15+r()*.2;ctx.fillStyle=['#94799c','#738faf','#ab927e','#627f97'][i%4];ctx.fillRect(r()*w,r()*h,3+r()*18,2+r()*9);}ctx.globalAlpha=1;
      for(const b of buildings){ctx.fillStyle=['#b18790','#72a8a7','#bfa57b','#a58aaf'][b.frame];ctx.fillRect(px(b.x-b.width/2)-3,pz(b.z-b.depth/2)-3,b.width*scale+6,b.depth*scale+6);}
      ctx.strokeStyle='#4b83ab';ctx.lineWidth=9*scale;ctx.beginPath();for(let z=-extent/2;z<=extent/2;z+=3){const x=-88+Math.sin(z*.018)*15;z===-extent/2?ctx.moveTo(px(x),pz(z)):ctx.lineTo(px(x),pz(z));}ctx.stroke();
      for(const x of [-42,36]){ctx.strokeStyle='#d0bca3';ctx.lineWidth=3.4*scale;ctx.beginPath();ctx.moveTo(px(x),0);ctx.bezierCurveTo(px(x-12),h*.30,px(x+14),h*.65,px(x),h);ctx.stroke();ctx.strokeStyle='#59687d';ctx.lineWidth=.8*scale;ctx.stroke();}
      for(const z of [-48,48,126,-132]){ctx.strokeStyle='#c5ae94';ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(0,pz(z));ctx.lineTo(w,pz(z));ctx.stroke();}
    });
    const groundGeometry=new T.PlaneGeometry(extent,extent);groundGeometry.rotateX(-Math.PI/2);
    const paintedStreets=box(scene,groundGeometry,paintMaterial({map:groundMap},'city-ground'),0,groundY,0,false);paintedStreets.renderOrder=-80;
    for(const z of [-132,-48,48,126]){const x=-88+Math.sin(z*.018)*15;box(scene,new T.BoxGeometry(16,.35,3.5),edge,x,groundY+.3,z,false);}
  }
  const parkTrees=[],parks=config.cityParks||[],groundY=config.cityGroundY??-54;
  const terrainVertices=[],terrainColours=[],terrainIndices=[];
  const hillHeight=(p,x,z)=>{const r=Math.hypot((x-p.center[0])/p.radius[0],(z-p.center[1])/p.radius[1]);return groundY+p.height*Math.pow(Math.max(0,1-r*r),1.45);};
  const pigments=['#75aa9a','#b1a45f','#cf829f','#678dbc','#5fa5a8'];
  for(const [index,p] of parks.entries()){
   const offset=terrainVertices.length/3,segments=32,rings=10;
   for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){
    const t=j/segments*Math.PI*2,r=ring/rings,x=p.center[0]+Math.cos(t)*p.radius[0]*r,z=p.center[1]+Math.sin(t)*p.radius[1]*r;
    terrainVertices.push(x,hillHeight(p,x,z)+.02,z);
    const color=new T.Color(pigments[index%pigments.length]).lerp(new T.Color(pigments[(index+1)%pigments.length]),(Math.sin(x*.14+z*.19)+1)*.24);terrainColours.push(color.r,color.g,color.b);
    if(ring<rings&&j<segments){const a=offset+ring*(segments+1)+j,b=a+segments+1;terrainIndices.push(a,a+1,b,a+1,b+1,b);}
   }
   const r=randomSource(477+index),count=Math.round((config.parkTreeCount||176)/parks.length);
   for(let i=0;i<count;i++){const a=r()*Math.PI*2,rr=Math.sqrt(r())*.85,x=p.center[0]+Math.cos(a)*p.radius[0]*rr,z=p.center[1]+Math.sin(a)*p.radius[1]*rr;parkTrees.push({position:[x,hillHeight(p,x,z),z],height:5+r()*6,yaw:r()*Math.PI*2});}
  }
  if(terrainVertices.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(terrainVertices,3));g.setAttribute('color',new T.Float32BufferAttribute(terrainColours,3));g.setIndex(terrainIndices);g.computeVertexNormals();const terrain=new T.Mesh(g,paintMaterial({vertexColors:true},'landscape'));scene.add(terrain);}
  return {gardens,parks,parkTrees,hillHeight,buildingCount:buildings.length,roofPropCount,buildingBatchCount:batches.size,buildings,trees,setQuality(light){for(const b of cityMeshes)b.mesh.count=light?b.lightCount:b.fullCount;}};
}
