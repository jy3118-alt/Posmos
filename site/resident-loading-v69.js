import * as T from 'three';
import {checkedJSON,fetchResource,yieldTask} from './runtime-budget-v69.js?v=5bc4fcffc216';

export async function loadPoVariants(config,load){
 const result=[];
 for(const item of config||[]){
  const gltf=await load(item.file),meta=await checkedJSON(item.poseMetadata);
  const half=new Uint16Array(await fetchResource(meta.texture,'arrayBuffer'));
  result.push({...item,gltf,meta,frames:Float32Array.from(half,T.DataUtils.fromHalfFloat)});await yieldTask();
 }
 return result;
}
export async function loadViewDetails(url){
 const manifest=await checkedJSON(url),result={};
 for(const [key,parts]of Object.entries(manifest.lods)){
  result[key]=[];for(const part of parts)result[key].push({...part,indices:new Uint32Array(await fetchResource(part.file,'arrayBuffer'))});
 }
 return result;
}
