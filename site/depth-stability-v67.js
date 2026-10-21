// All custom world surfaces must write the same logarithmic depth as Three's
// built-in materials. Otherwise an ocean can cover land or erase characters.
function mainEnd(source){
 const main=/void\s+main\s*\([^)]*\)\s*\{/.exec(source);
 if(!main)throw Error('World shader has no main function.');
 let depth=1,i=main.index+main[0].length;
 for(;i<source.length&&depth;i++){if(source[i]==='{')depth++;else if(source[i]==='}')depth--;}
 if(depth)throw Error('World shader has an incomplete main function.');
 return {start:main.index+main[0].length,end:i-1};
}
export function logarithmicWorldShader(material){
 if(!material.isShaderMaterial||material.vertexShader.includes('logdepthbuf_pars_vertex'))return false;
 const vertex=mainEnd(material.vertexShader),fragment=mainEnd(material.fragmentShader);
 material.vertexShader=material.vertexShader.slice(0,vertex.end)+'\n#include <logdepthbuf_vertex>\n'+material.vertexShader.slice(vertex.end);
 material.vertexShader='#include <logdepthbuf_pars_vertex>\n'+material.vertexShader;
 if(!material.vertexShader.includes('#include <common>'))material.vertexShader='#include <common>\n'+material.vertexShader;
 material.fragmentShader=material.fragmentShader.slice(0,fragment.start)+'\n#include <logdepthbuf_fragment>\n'+material.fragmentShader.slice(fragment.start);
 material.fragmentShader='#include <logdepthbuf_pars_fragment>\n'+material.fragmentShader;
 material.needsUpdate=true;return true;
}
export function prepareWorldDepth(scene){
 const done=new Set();let custom=0;
 scene.traverse(o=>{for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){if(done.has(material))continue;done.add(material);if(logarithmicWorldShader(material))custom++;}});
 return {mode:'logarithmic',customShaders:custom,unifiedWaterDepth:true};
}
