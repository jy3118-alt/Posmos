// A small serializable, typed DAG. Connections, not array order, define execution.
// Compile once per recipe change; never run this system inside the render loop.
export function compilePaintGraph(graph,operators){
 graph=JSON.parse(JSON.stringify(graph));
 if(graph.version!==1||!Array.isArray(graph.nodes)||!graph.nodes.length||graph.nodes.length>24)throw Error('Invalid painting graph');
 const nodes=new Map(),order=[],visiting=new Set(),visited=new Set();
 for(const node of graph.nodes){if(!node.id||nodes.has(node.id)||!operators[node.type])throw Error('Unknown or duplicate painting node: '+node.id);nodes.set(node.id,node);}
 function visit(id){
  if(visited.has(id))return;if(visiting.has(id))throw Error('Painting graph contains a cycle: '+id);
  const node=nodes.get(id);if(!node)throw Error('Missing painting node: '+id);visiting.add(id);
  const op=operators[node.type];
  for(const [port,type]of Object.entries(op.inputs)){
   const ref=node.inputs?.[port];if(!ref)throw Error(`Missing input ${id}.${port}`);
   let actual;if(ref.startsWith('$'))actual=graph.inputs?.[ref.slice(1)];
   else{visit(ref);actual=operators[nodes.get(ref).type].output;}
   if(actual!==type)throw Error(`Wrong connection ${id}.${port}: expected ${type}, received ${actual}`);
  }
  visiting.delete(id);visited.add(id);order.push(node);
 }
 visit(graph.output);
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 const definition=freeze(graph);
 return {definition,order:order.map(n=>n.id),run(external){
  const values=new Map(),trace=[];
  for(const node of order){const op=operators[node.type],inputs={};for(const [port,ref]of Object.entries(node.inputs))inputs[port]=ref.startsWith('$')?external[ref.slice(1)]:values.get(ref);const value=op.run(inputs,node.params||{});values.set(node.id,value);trace.push({id:node.id,type:node.type,label:node.label,output:op.output});}
  return {output:values.get(graph.output),values,trace};
 }};
}
