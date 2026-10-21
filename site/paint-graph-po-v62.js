// Artist recipe: JSON data, no character-name branches in the operators.
// A future painter can use another graph, eye layout or pigment behaviour.
export const PO_PAINT_GRAPH={
 version:1,id:'po-observed-paint-v1',artist:'Po',
 inputs:{capture:'capture',identity:'identity',variation:'variation'},output:'finish',
 nodes:[
  {id:'observe',type:'sample',label:'대상 보기',inputs:{capture:'$capture',identity:'$identity'},params:{columns:32,rows:40,alphaThreshold:.32}},
  {id:'structure',type:'structure',label:'형태 읽기',inputs:{observation:'observe'},params:{masses:8,iterations:7,radialSectors:12}},
  {id:'gaze',type:'dual-gaze',label:'Po의 두 시점',inputs:{structure:'structure'},params:{eyes:[[.30,.27],[.70,.64]],gazes:[-.65,.72],magnification:[1.32,.86],strength:1}},
  {id:'gestures',type:'gestures',label:'물감의 면과 선',inputs:{vision:'gaze',variation:'$variation'},params:{abstraction:1,variation:.16,maxMarks:24}},
  {id:'spit',type:'spit',label:'뱉고 튀기기',inputs:{painting:'gestures',variation:'$variation'},params:{impacts:5,satellites:3,strength:1}},
  {id:'finish',type:'finish',label:'작품으로 남기기',inputs:{painting:'spit',variation:'$variation'},params:{version:62}}
 ]
};
export function configurePoGraph(changes={}){
 const graph=JSON.parse(JSON.stringify(PO_PAINT_GRAPH));
 for(const node of graph.nodes)if(changes[node.id])Object.assign(node.params,changes[node.id]);
 return graph;
}
