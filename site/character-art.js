// Character identity lives here once; painting and emitted pigment share it.
// New residents may supply art in their definition. Otherwise their unlit GLB
// texture supplies a stable palette at loading time, never from scene lighting.
export const CHARACTER_ART={
 base:{label:'Po',palette:['#f1ecdc','#086dcc','#f3c72c','#a77348'],weights:[.29,.40,.26,.05],rhythm:.45},
 crown:{label:'왕관 Po',palette:['#dfac32','#ba2944','#f3e5cc','#165abb'],weights:[.39,.32,.16,.13],rhythm:.9},
 ribbon:{label:'리본 Po',palette:['#e95894','#127acb','#f1d751','#efe5db'],weights:[.37,.28,.19,.16],rhythm:.2},
 coral:{label:'코랄 Po',palette:['#f07c55','#efca3a','#f5e9dd','#478bc0'],weights:[.43,.24,.22,.11],rhythm:.6},
 short:{label:'작은 Po',palette:['#f0e8da','#1776cf','#edc82c'],weights:[.28,.44,.28],rhythm:.35},
 plump:{label:'통통 Po',palette:['#efe6d4','#186dcc','#e9c52d'],weights:[.34,.40,.26],rhythm:.15},
 dress:{label:'드레스 Po',palette:['#1e4fac','#edbb4e','#d13c53','#e9e5dc'],weights:[.40,.28,.18,.14],rhythm:.05},
 moa:{label:'Moa',palette:['#c18a5b','#f1ede2','#282a35','#8eb8c5'],weights:[.39,.30,.21,.10],rhythm:.7}
};
export function normaliseArt(id,art){
 const palette=(art?.palette||[]).filter(c=>/^#[a-f\d]{6}$/i.test(c)).slice(0,5);
 if(palette.length<2)throw Error('Character palette needs at least two colours: '+id);
 const raw=palette.map((_,i)=>Math.max(.01,Number(art.weights?.[i])||1)),sum=raw.reduce((a,b)=>a+b,0);
 return {id,label:art.label||id,palette,weights:raw.map(v=>v/sum),rhythm:Math.max(0,Math.min(1,art.rhythm??.5)),source:art.source||'authored'};
}
export function sampleTexturePalette(gltf){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d',{willReadFrequently:true}),bins=new Map(),seen=new Set();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){
  const texture=m.map;if(!texture?.image||seen.has(texture.image))continue;seen.add(texture.image);ctx.clearRect(0,0,64,64);ctx.drawImage(texture.image,0,0,64,64);const px=ctx.getImageData(0,0,64,64).data,uv=o.geometry.attributes.uv;
  if(!uv)continue;for(let i=0;i<uv.count;i+=3){const x=Math.max(0,Math.min(63,Math.floor(uv.getX(i)*63))),v=uv.getY(i),y=Math.max(0,Math.min(63,Math.floor((texture.flipY?1-v:v)*63))),k=(y*64+x)*4;if(px[k+3]<128)continue;
   const c=[px[k],px[k+1],px[k+2]],key=c.map(v=>Math.round(v/40)).join(',');const b=bins.get(key)||{sum:[0,0,0],count:0};b.count++;c.forEach((v,j)=>b.sum[j]+=v);bins.set(key,b);
  }
 }});
 const ranked=[...bins.values()].sort((a,b)=>b.count-a.count),selected=[];
 for(const b of ranked){const rgb=b.sum.map(v=>v/b.count);if(selected.some(c=>Math.hypot(...rgb.map((v,i)=>v-c.rgb[i]))<65))continue;selected.push({rgb,count:b.count});if(selected.length===5)break;}
 if(selected.length<2)throw Error('Cannot determine character colours; provide art.palette in the resident definition.');
 return {palette:selected.map(c=>'#'+c.rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')),weights:selected.map(c=>c.count),source:'unlit-model-texture'};
}
export function createCharacterArtRegistry(definitions){
 const entries=new Map();for(const [id,d]of definitions)entries.set(id,normaliseArt(id,d.art||d.config?.art||CHARACTER_ART[id]||sampleTexturePalette(d.gltf)));
 return {get(id){const art=entries.get(id);if(!art)throw Error('Unregistered character art: '+id);return art;},register(id,gltf,art){const entry=normaliseArt(id,art||sampleTexturePalette(gltf));entries.set(id,entry);return entry;},diagnostics(){return Object.fromEntries(entries);}};
}
