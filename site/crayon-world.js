import * as T from 'three';
import {storybookBeds,pathDistance} from './storybook-landscape.js?v=4463ff4f4170';
import {makeStorybookGarden} from './storybook-garden.js?v=4463ff4f4170';
import {chapterGroundTexture} from './chapter-paint.js?v=4463ff4f4170';
import {paintIslandGroundTexture} from './paint-island-ground.js?v=4463ff4f4170';

// Wax grain is baked once, shared by every material, and sampled in bind/local
// space. There is no animated noise, extra full-screen pass or outline skin.
function waxTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d'),pixels=ctx.createImageData(256,256);let state=713531;
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const pressure=Float32Array.from({length:256},()=>random());
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4,r=random(),fibres=(Math.sin(x*.55+y*1.9)+Math.sin(x*1.73-y*.16))*.08;
  const cx=Math.floor(x/16),cy=Math.floor(y/16),u=x/16-cx,v=y/16-cy;
  const a=pressure[cy*16+cx],b=pressure[cy*16+(cx+1)%16],d=pressure[((cy+1)%16)*16+cx],e=pressure[((cy+1)%16)*16+(cx+1)%16];
  const p=(a+(b-a)*u)*(1-v)+(d+(e-d)*u)*v;
  pixels.data[i]=Math.round(120+r*110+fibres*80);
  pixels.data[i+1]=Math.round(92+p*120+fibres*150+r*38);
  pixels.data[i+2]=Math.round(Math.pow(r,5)*255);pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);ctx.lineCap='round';
 for(let i=0;i<150;i++){
  const x=random()*256,y=random()*256;ctx.strokeStyle=`rgba(245,245,${i%3===0?210:80},${.10+random()*.23})`;ctx.lineWidth=.6+random()*2;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12+random()*54,y-5-random()*10);ctx.stroke();
 }
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;
 return t;
}

function paintedSky(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
 x.fillStyle='#afe7fa';x.fillRect(0,0,1024,512);
 const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#188bdf');g.addColorStop(.48,'#68cafa');g.addColorStop(.63,'#afe7fa');g.addColorStop(1,'#afe7fa');x.fillStyle=g;x.fillRect(0,0,1024,512);
 let seed=92;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 x.lineCap='round';for(let i=0;i<800;i++){const y=r()*512;x.strokeStyle=i%4?'#fff8e711':'#2866a210';x.lineWidth=.6+r()*2.4;x.beginPath();const a=r()*1024;x.moveTo(a,y);x.lineTo(a+18+r()*75,y+(r()-.5)*3);x.stroke();}
 // Flat scalloped clouds retain paper holes and visibly hand-coloured edges.
 for(let i=0;i<13;i++){
  const cx=i*83+20,cy=155+(i%4)*23,s=.7+r()*.8;
  for(let j=0;j<6;j++){x.fillStyle=j%2?'#fff7dfb0':'#fff9eac9';x.beginPath();x.ellipse(cx+(j-2.5)*13*s,cy+Math.sin(j*2.7)*7*s,16*s,9*s,0,0,Math.PI*2);x.fill();}
  x.strokeStyle='#ece7d7bb';x.lineWidth=1.4;x.beginPath();x.moveTo(cx-36*s,cy+9*s);x.quadraticCurveTo(cx,cy+13*s,cx+37*s,cy+8*s);x.stroke();
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;return t;
}

function waterTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#159fc9';x.fillRect(0,0,512,512);
 let seed=443;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 x.lineCap='round';for(let i=0;i<800;i++){const a=r()*512,b=r()*512;x.strokeStyle=['#81e1eb24','#1269b722','#fff0b812'][i%3];x.lineWidth=1+r()*4;x.beginPath();x.moveTo(a,b);x.lineTo(a+12+r()*48,b+(r()-.5)*5);x.stroke();}
 for(let row=0;row<13;row++)for(let col=0;col<8;col++){
  const a=col*68+(row%2)*30-20,b=row*43+10;x.strokeStyle=row%3?'#c5e4e5b0':'#fff0c99a';x.lineWidth=1.4+r()*1.8;
  x.beginPath();x.moveTo(a,b);x.bezierCurveTo(a+9,b-6,a+20,b+5,a+30,b-2);x.stroke();
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(24,24);t.anisotropy=4;return t;
}

function groundTexture(city){
 const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d'),scale=2048/304;
 const point=(px,pz)=>[(px+152)*scale,(pz+152)*scale];
 let seed=9723;const r=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const paths=city.paintPaths||city.paths||[];
 x.fillStyle='#83b75d';x.fillRect(0,0,2048,2048);
 function patch(cx,cz,rx,rz,angle,colour,phase=0){
  x.save();x.translate(...point(cx,cz));x.rotate(angle);x.fillStyle=colour;x.beginPath();
  for(let j=0;j<=96;j++){const a=j/96*Math.PI*2,f=1+.035*Math.sin(a*5+phase)+.025*Math.cos(a*7-phase);x[j?'lineTo':'moveTo'](Math.cos(a)*rx*scale*f,Math.sin(a)*rz*scale*f);}x.closePath();x.fill();x.restore();
 }
 // Large connected meadow shapes establish a readable composition. The coast
 // and hills share the actual geometry; paths are painted on it, never floated.
 for(const [cx,cz,rx,rz,angle,colour]of [
  [-36,-52,32,31,.2,'#4b9e89'],[49,-26,25,30,-.4,'#64aa71'],[-50,42,31,24,.1,'#429e88'],
  [47,51,27,24,.4,'#9abd62'],[-18,42,29,18,-.3,'#a2bf63'],[23,-2,24,15,.5,'#66ae7c'],
  [-20,13,25,18,-.3,'#79b970'],[-3,66,28,15,.2,'#74b56c'],[76,7,17,23,.1,'#a9c752'],
  [-73,-18,18,26,.5,'#3f9f91'],[10,-50,20,18,.2,'#a6bf52']])patch(cx,cz,rx,rz,angle,colour,cx);
 // Small expressive pigment gardens, surrounded by grass instead of covering
 // every metre of the island with unrelated pastel blobs.
 patch(-30,24,5,3,-.2,'#ed8e86');patch(28,47,5,3,.5,'#ba8dc6');patch(43,7,7,5,.3,'#e8ba4c');
 const small=document.createElement('canvas');small.width=small.height=512;const sx=small.getContext('2d'),image=sx.createImageData(512,512);
 const beach=new T.Color('#edc985').convertLinearToSRGB().toArray(),rock=new T.Color('#7b9bb0').convertLinearToSRGB().toArray();
 for(let j=0;j<512;j++)for(let i=0;i<512;i++){
  const wx=i/511*304-152,wz=j/511*304-152,y=city.height(wx,wz),n=(j*512+i)*4;
  let alpha=0,colour=beach;
  if(y<city.sea+4.8)alpha=1-T.MathUtils.smoothstep(y,city.sea+1.0,city.sea+4.8);
  else if(y>20){alpha=T.MathUtils.smoothstep(y,20,31)*.38;colour=rock;}
  image.data[n]=Math.round(colour[0]*255);image.data[n+1]=Math.round(colour[1]*255);image.data[n+2]=Math.round(colour[2]*255);image.data[n+3]=Math.round(alpha*255);
 }
 sx.putImageData(image,0,0);x.drawImage(small,0,0,2048,2048);
 x.lineCap=x.lineJoin='round';for(const path of paths){
  x.strokeStyle='#bc9b60';x.lineWidth=4.0*scale;x.beginPath();path.forEach((p,i)=>x[i?'lineTo':'moveTo'](...point(p.x,p.z)));x.stroke();
  x.strokeStyle='#f4dfad';x.lineWidth=3.3*scale;x.stroke();
  x.strokeStyle='#fff0c736';x.lineWidth=1.5*scale;x.stroke();
 }
 // The atelier is one small cream page framed by distinct flower beds.
 patch(0,8,6.5,5.2,.12,'#d4b574');patch(0,8,6.28,4.98,.12,'#f2dcb1');
 for(const b of storybookBeds)patch(b.x,b.z,b.rx,b.rz,b.angle,b.colour,b.x);
 // Distant flowers are tiny painted groups. Nearby ones use two shared batches.
 for(let i=0;i<700;i++){
  const px=(r()-.5)*174,pz=(r()-.5)*170;if(city.height(px,pz)<city.sea+5||pathDistance(px,pz,paths)<2.3||Math.hypot(px,pz-8)<7)continue;
  const [a,b]=point(px,pz);x.fillStyle=['#f7d550','#fff0c5','#ed7b98'][i%3];x.beginPath();x.arc(a,b,1.3+r()*1.2,0,Math.PI*2);x.fill();
 }
 // Fewer, low-opacity wax marks; the pressure map supplies the remaining grain.
 for(let i=0;i<1350;i++){const a=r()*2048,b=r()*2048;x.strokeStyle=i%3?'#fbefc516':'#315e7412';x.lineWidth=.6+r()*.8;x.beginPath();x.moveTo(a,b);x.lineTo(a+4+r()*10,b-1-r()*3);x.stroke();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.flipY=false;t.anisotropy=8;return t;
}

export function createCrayonWorld(scene,{forest,hemisphere,sunlight,renderer,managedAtmosphere=false,outlineActors=null,surfaceStyle='crayon'}){
 const clean=surfaceStyle==='clean-cel';
 const garden=forest.city.storybook?makeStorybookGarden(scene,forest.city):null;
 let terrainChecks=null;
 if(garden){
  const p=forest.city.groundMeshes[0].geometry.attributes.position;let finite=true,edgeMax=-Infinity;
  for(let i=0;i<p.count;i++){finite&&=Number.isFinite(p.getY(i));if(Math.abs(p.getX(i))>151.9||Math.abs(p.getZ(i))>151.9)edgeMax=Math.max(edgeMax,p.getY(i));}
  terrainChecks={finite,edgeMax,sea:forest.city.sea,minHousePadHeight:Math.min(...forest.city.buildings.map(b=>forest.city.height(b.x,b.z))),studioGround:forest.city.height(0,8)};
 }
 const wax=waxTexture(),sky=paintedSky(),water=waterTexture(),ground=forest.city.paintWorld?paintIslandGroundTexture(forest.city):forest.city.multiverse?chapterGroundTexture(forest.city):groundTexture(forest.city),entries=[],transforms=[],cache=new Map();
 if(forest.city.chapterMaterialAtlas){forest.city.chapterMaterialAtlas.dispose();forest.city.chapterMaterialAtlas=null;}
 const paper=new T.Color('#fff1d3'),ink=new T.Color('#493384');
 const night={value:0},sunset={value:0};
 function phaseShader(material,isSky){
  material.onBeforeCompile=s=>{
   Object.assign(s.uniforms,{crayonNight:night,crayonSunset:sunset});
   s.fragmentShader='uniform float crayonNight,crayonSunset;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
    float paintedL=dot(outgoingLight,vec3(.2126,.7152,.0722));
    vec3 dusk=${isSky?'mix(vec3(.20,.09,.35),vec3(1.,.49,.22),smoothstep(.16,.84,paintedL))':'vec3(.10,.065,.22)+outgoingLight*.30'};
    outgoingLight=mix(outgoingLight,dusk,crayonSunset*.92);
    outgoingLight=mix(outgoingLight,${isSky?'vec3(.006,.017,.060)+outgoingLight*.025':'outgoingLight*vec3(.08,.15,.31)'},crayonNight*.94);
    #include <opaque_fragment>`);
  };material.customProgramCacheKey=()=> 'crayon-phase-v51-'+isSky;
  return material;
 }
 const clearIslandFog=forest.city.paintWorld?new T.Fog('#afe7fa',520,1080):null;
 const before={fogObject:scene.fog,fog:scene.fog?.color.clone(),fogDensity:scene.fog?.density,environment:scene.environment,hemisphere:hemisphere.color.clone(),hemiGround:hemisphere.groundColor.clone(),hemiIntensity:hemisphere.intensity,sun:sunlight.color.clone(),sunPosition:sunlight.position.clone(),sunIntensity:sunlight.intensity,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure};
 const marks={daylight:'warm-sun-clear-blue-v50',surfaceStyle,colourFilter:!clean,waxOverlay:!clean,meshes:0,materials:0,extraGeometry:garden?2:0,nearOutlineDraws:0,fullScreenPasses:0,texturePixels:256*256+1024*512+512*512+2048*2048,landscape:garden?{...garden,...forest.city.chapterMetrics,trees:forest.treeCount,paths:forest.city.paintPaths.length,terrainTriangles:forest.city.groundMeshes[0].geometry.index.count/3,terrainChecks}:null};
 function material(source,mesh){
  const isGround=mesh.name==='continuous-repaired-island',isSkin=mesh.isSkinnedMesh||mesh.name==='crayon-crowd-skin'||mesh.name==='animated-hidden-friends'||mesh.name.startsWith('po-variant-');
  const key=source.uuid+':'+(isGround?'ground':isSkin?'skin':'world');if(cache.has(key))return cache.get(key);
  const m=new T.MeshLambertMaterial({map:isGround?null:source.map||null,color:source.color?.clone()||new T.Color('white'),vertexColors:source.vertexColors||false,side:source.side,transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest,alphaMap:source.alphaMap,depthWrite:source.depthWrite});
  m.name='crayon-'+(source.name||mesh.name);const hook=source.onBeforeCompile;
  m.onBeforeCompile=s=>{
   if(!isGround)hook?.call(source,s,renderer);
   Object.assign(s.uniforms,{crayonNight:night,crayonSunset:sunset,crayonWax:{value:wax},crayonGroundMap:{value:ground},crayonPaper:{value:paper},crayonInk:{value:ink},crayonScale:{value:isGround?.55:3.4},crayonAmount:{value:isSkin?.52:1},crayonSubject:{value:isSkin?1:0},crayonGround:{value:isGround?1:0}});
   s.vertexShader='varying vec3 vWaxPosition;varying vec3 vWaxNormal;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('void main() {','void main() {\nvWaxPosition=position;vWaxNormal=normal;');
   s.fragmentShader=`uniform sampler2D crayonWax,crayonGroundMap;uniform vec3 crayonPaper,crayonInk;uniform float crayonNight,crayonSunset,crayonScale,crayonAmount,crayonGround,crayonSubject;varying vec3 vWaxPosition,vWaxNormal;\n`+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',clean?`
    // Keep the authored albedo. No paper tint, pigment quantization or grain.
    if(crayonGround>.5)diffuseColor.rgb=texture2D(crayonGroundMap,(vWaxPosition.xz+152.)/304.).rgb;
    #include <normal_fragment_begin>`:`
    if(crayonGround>.5)diffuseColor.rgb=texture2D(crayonGroundMap,(vWaxPosition.xz+152.)/304.).rgb;
    vec3 waxN=abs(normalize(vWaxNormal));vec2 waxUv=vWaxPosition.xy;
    if(waxN.y>waxN.x&&waxN.y>waxN.z)waxUv=vWaxPosition.xz;
    else if(waxN.x>waxN.z)waxUv=vWaxPosition.zy;
    vec3 wax=texture2D(crayonWax,waxUv*crayonScale).rgb;
    float pigmentL=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    vec3 pigment=diffuseColor.rgb;
    pigment=pow(max(pigment,vec3(0.)),vec3(.97));
    pigment=mix(pigment,floor(pigment*9.+.5)/9.,crayonAmount*.24);
    pigment*=mix(.96,1.035,wax.g);
    float holes=smoothstep(.88,.995,wax.b)*.12*crayonAmount;
    diffuseColor.rgb=mix(pigment,crayonPaper,holes);
    if(crayonGround>.5)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.39,.20),(1.-smoothstep(.35,.82,waxN.y))*.13);
    #include <normal_fragment_begin>`);
   s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',clean?`
    float colourL=max(.015,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));
    float directL=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))/colourL;
    // Quantize surface lighting, not shadow-map texels. Keep the existing PCF
    // coverage across cast-shadow edges instead of thresholding it into stairs.
    float sunBand=1.;
    #if NUM_DIR_LIGHTS > 0
     float facingSun=max(0.,dot(normal,directionalLights[0].direction));
     float bandWidth=max(.018,fwidth(facingSun)*.85);
     float faceBand=smoothstep(.22-bandWidth,.22+bandWidth,facingSun);
     float unshadowed=facingSun*RECIPROCAL_PI*dot(directionalLights[0].color,vec3(.2126,.7152,.0722));
     float coverage=clamp(directL/max(.0001,unshadowed),0.,1.);
     sunBand=faceBand*coverage;
    #endif
    vec3 shadowFactor=mix(vec3(.40,.43,.60),vec3(.64,.66,.76),crayonSubject);
    outgoingLight=diffuseColor.rgb*mix(shadowFactor,vec3(1.),sunBand);
    float viewDot=abs(dot(normal,normalize(vViewPosition)));
    float lineWidth=max(.009,fwidth(viewDot)*.75);
    float edge=1.-smoothstep(.055-lineWidth,.055+lineWidth,viewDot);
    outgoingLight=mix(outgoingLight,outgoingLight*.26,edge*mix(.72,.38,crayonGround)*(1.-crayonSubject));
    // These are time-of-day lighting changes, not a permanent colour grade.
    outgoingLight*=mix(vec3(1.),vec3(1.,.70,.50),crayonSunset*.50);
    outgoingLight*=mix(vec3(1.),vec3(.20,.28,.50),crayonNight*.89);
    #include <opaque_fragment>`:`
    float colourL=max(.015,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));
    float directL=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))/colourL;
    // Keep actual directional light and shadow visibility in the painted bands.
    // The old near-binary threshold flattened every lit face to one dim value.
    float sunBand=smoothstep(.07,.62,directL);
    vec3 shade=mix(diffuseColor.rgb*vec3(.40,.40,.65),crayonInk,.28);
    shade=mix(shade,diffuseColor.rgb*vec3(.63,.64,.78),crayonSubject);
    vec3 lit=diffuseColor.rgb*vec3(1.14,1.075,.96)+vec3(.045,.027,.005);
    vec3 flatColour=mix(shade,lit,sunBand);
    outgoingLight=mix(outgoingLight,flatColour,.94);
    float edge=1.-smoothstep(.04,.24,abs(dot(normal,normalize(vViewPosition))));
    float brokenInk=mix(.40,.85,wax.r);
    outgoingLight=mix(outgoingLight,crayonInk*.64,edge*brokenInk*crayonAmount*mix(.43,.19,crayonGround));
    outgoingLight*=mix(.985,1.015,wax.r);
    outgoingLight*=mix(vec3(1.),vec3(1.,.72,.58),crayonSunset*.55);
    outgoingLight*=mix(vec3(1.),vec3(.22,.30,.56),crayonNight*.87);
    #include <opaque_fragment>`);
  };m.customProgramCacheKey=()=> (clean?'clean-cel-v53-':'crayon-sun-v51-')+(isGround?'ground':isSkin?'skin':'world')+'-'+(source.customProgramCacheKey?.()||'plain');
  cache.set(key,m);return m;
 }
 const palette=['#e97060','#f0be3b','#36acae','#a17bcb','#89ba50'];
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if(mesh.userData.keepCrayonMaterial)return;
  // Keep portrait pixels, contact shadows and transparent helper marks intact.
  if(mesh.name==='actual-painted-portrait'||mesh.name==='po-paint-droplets'||mesh.material?.transparent&&mesh.name!=='clear-turquoise-ocean')return;
  let replacement;
  if(mesh.name==='clear-summer-sky')replacement=phaseShader(new T.MeshBasicMaterial({map:sky,side:T.BackSide,depthWrite:false,fog:false}),true);
  else if(mesh.name==='clear-turquoise-ocean')replacement=phaseShader(new T.MeshBasicMaterial({map:water,color:'white',fog:true}),false);
  else if(mesh.name==='sun-disc')replacement=new T.MeshBasicMaterial({color:'#ffe29a',map:clean?null:wax,toneMapped:false,fog:false});
  else if(mesh.material?.isShaderMaterial)return;
  else replacement=Array.isArray(mesh.material)?mesh.material.map(m=>material(m,mesh)):material(mesh.material,mesh);
  entries.push({mesh,original:mesh.material,crayon:replacement});marks.meshes++;
  if(!managedAtmosphere&&mesh.isInstancedMesh&&/tripo-(atelier|cottage|lookout|paint-hut|paint-mill|tree)$/.test(mesh.name)){
   const originalMatrix=mesh.instanceMatrix.array.slice(),originalColor=mesh.instanceColor?.array.slice(),matrix=originalMatrix.slice(),colors=originalColor?.slice(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),m=new T.Matrix4(),lean=new T.Quaternion(),colour=new T.Color();
   for(let i=0;i<mesh.count;i++){
    m.fromArray(matrix,i*16);m.decompose(p,q,s);
    const n=i+mesh.name.length*17,isTree=mesh.name==='tripo-tree';
    lean.setFromEuler(new T.Euler(Math.sin(n*3.17)*(isTree?.045:.025),0,Math.sin(n*1.73)*(isTree?.065:.045)));q.multiply(lean);
    s.x*=.93+.15*Math.sin(n*1.91);s.y*=.99+.07*Math.sin(n*2.31);m.compose(p,q,s);m.toArray(matrix,i*16);
    if(colors&&!isTree&&!mesh.userData.chapterArt&&!forest.city.paintWorld){colour.set(palette[n%palette.length]);colour.toArray(colors,i*3);}
   }
   transforms.push({mesh,originalMatrix,originalColor,matrix,colors});
  }
 });
 // Only the two foreground performers get an inverted hull. It shares their
 // geometry and live skeleton; background batches never duplicate their draws.
 const outlines=[];
 const outlinedSkins=new Set();for(const actor of outlineActors||[])actor?.traverse(o=>{if(o.isSkinnedMesh)outlinedSkins.add(o);});
 for(const a of entries.filter(a=>a.mesh.isSkinnedMesh&&(!outlineActors||outlinedSkins.has(a.mesh)))){
  const m=new T.MeshBasicMaterial({color:'#45416b',side:T.BackSide});
  m.onBeforeCompile=s=>{
   if(clean)s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normal*.0055;');
   else{s.uniforms.outlineWax={value:wax};s.vertexShader='uniform sampler2D outlineWax;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat pressure=texture2D(outlineWax,position.xy*3.4).r;transformed+=normal*(.0035+pressure*.0025);');}
  };m.customProgramCacheKey=()=> clean?'near-clean-outline-v53':'near-wax-outline-v40';
  const o=a.mesh.clone(false);o.name='crayon-near-outline';o.material=m;o.skeleton=a.mesh.skeleton;o.castShadow=o.receiveShadow=false;o.frustumCulled=false;o.visible=false;
  a.mesh.parent.add(o);outlines.push(o);marks.nearOutlineDraws++;
 }
 marks.materials=cache.size+3+outlines.length;
 let enabled=false;
 function setEnabled(on){
  enabled=!!on;for(const a of entries)a.mesh.material=enabled?a.crayon:a.original;for(const o of outlines)o.visible=enabled;
  for(const a of transforms){a.mesh.instanceMatrix.array.set(enabled?a.matrix:a.originalMatrix);a.mesh.instanceMatrix.needsUpdate=true;if(a.originalColor){a.mesh.instanceColor.array.set(enabled?a.colors:a.originalColor);a.mesh.instanceColor.needsUpdate=true;}a.mesh.computeBoundingSphere();}
  if(clearIslandFog)scene.fog=enabled?clearIslandFog:before.fogObject;
  else if(scene.fog){scene.fog.color.copy(enabled?new T.Color('#b7dbd8'):before.fog);scene.fog.density=enabled?.0011:before.fogDensity;}
  scene.environment=before.environment;
  if(!managedAtmosphere){
   hemisphere.color.copy(enabled?new T.Color('#b9dfff'):before.hemisphere);hemisphere.groundColor.copy(enabled?new T.Color('#75619e'):before.hemiGround);hemisphere.intensity=enabled?.78:before.hemiIntensity;
   sunlight.color.copy(enabled?new T.Color('#fff0c2'):before.sun);sunlight.intensity=enabled?3.00:before.sunIntensity;
   sunlight.position.copy(before.sunPosition);if(enabled){const aim=sunlight.target.position;sunlight.position.set(aim.x-18,aim.y+15,aim.z+21);}
  }
  // Display authored pigment colours directly instead of the desaturating
  // filmic shoulder. This uses the existing output pass; no extra pass needed.
  renderer.toneMapping=enabled?T.LinearToneMapping:before.toneMapping;
  renderer.toneMappingExposure=enabled?1.00:before.exposure;renderer.shadowMap.needsUpdate=true;
 }
 return {setEnabled,setAtmosphere(n,s){night.value=n;sunset.value=s;},get enabled(){return enabled;},metrics:marks,update(t){if(enabled){water.offset.x=t*.00035;water.offset.y=-t*.00015;}},dispose(){setEnabled(false);for(const o of outlines){o.removeFromParent();o.material.dispose();}for(const m of new Set(entries.flatMap(a=>Array.isArray(a.crayon)?a.crayon:[a.crayon])))m.dispose();wax.dispose();sky.dispose();water.dispose();ground.dispose();}};
}
