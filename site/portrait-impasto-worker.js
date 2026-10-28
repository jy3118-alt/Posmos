import {IMPASTO_PRESETS,buildImpastoWork,renderImpasto} from './portrait-impasto-rules.js?v=d644c435c5eb';
let canvas=null,ctx=null;
self.onmessage=({data:d})=>{
 try{
  if(!canvas){canvas=new OffscreenCanvas(d.width,d.height);ctx=canvas.getContext('2d',{willReadFrequently:true});}
  if(canvas.width!==d.width||canvas.height!==d.height){canvas.width=d.width;canvas.height=d.height;}
  const work=buildImpastoWork(new Uint8ClampedArray(d.pixels),d.width,d.height,IMPASTO_PRESETS[d.style],d.seed);
  renderImpasto(ctx,work,d.width,d.height);const pixels=ctx.getImageData(0,0,d.width,d.height).data;
  self.postMessage({job:d.job,pixels:pixels.buffer,marks:work.marks.length,guideCells:work.guideCells},[pixels.buffer]);
 }catch(e){self.postMessage({job:d.job,error:String(e)});}
};
