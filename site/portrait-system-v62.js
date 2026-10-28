import {ABSTRACT_PRESETS,abstractPreset as presetV61,artLayers,paintAbstractRows,renderAbstract,exportArtworkSVG as svgV61} from './portrait-vision-v61.js?v=5bc4fcffc216';
import {compilePaintGraph} from './paint-graph-runtime-v62.js?v=5bc4fcffc216';
import {PAINT_OPERATORS} from './paint-operators-v62.js?v=5bc4fcffc216';
import {PO_PAINT_GRAPH} from './paint-graph-po-v62.js?v=5bc4fcffc216';
export {ABSTRACT_PRESETS,artLayers,paintAbstractRows,renderAbstract};
export function abstractPreset(id,art){return {...presetV61(id,art),graph:PO_PAINT_GRAPH};}
export function abstractStyleForWork(seed,serial,fixed,art){return abstractPreset(Number.isInteger(fixed)?fixed:((seed%100)+serial*37)%100,art);}
const compiledDefault=compilePaintGraph(PO_PAINT_GRAPH,PAINT_OPERATORS);
export function runPainting(capture,identity,preset,seed,graph=PO_PAINT_GRAPH){
 const compiled=graph===PO_PAINT_GRAPH?compiledDefault:compilePaintGraph(graph,PAINT_OPERATORS),run=compiled.run({capture,identity,variation:{preset,seed:seed>>>0}});
 return {...run.output,pipeline:{id:graph.id,version:graph.version,graph:compiled.definition,trace:run.trace},recipe:{preset:{id:preset.id,paper:preset.paper,markCount:preset.markCount,direction:preset.direction},seed:seed>>>0}};
}
export function buildAbstractWork(pixels,width,height,preset,seed=1){return runPainting({pixels,width,height},{id:preset.modelId,label:preset.name,palette:preset.pigments,weights:preset.weights,rhythm:preset.rhythm},preset,seed,preset.graph||PO_PAINT_GRAPH);}
export function replayPainting(work,{graph=work.pipeline.graph,seed=work.seed,preset=work.recipe.preset}={}){return runPainting({observation:work.observation},work.identity,preset,seed,graph);}
export function exportArtworkSVG(work,title){
 const svg=svgV61(work,title),metadata=JSON.stringify({graph:work.pipeline.graph,recipe:work.recipe,subject:work.subject,observation:work.observation,identity:work.identity}).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
 return svg.replace(/<metadata>[\s\S]*?<\/metadata>/,`<metadata>${metadata}</metadata>`);
}
