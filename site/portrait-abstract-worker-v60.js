import {abstractPreset,buildAbstractWork,renderAbstract} from './portrait-abstract-v60.js?v=d644c435c5eb';
let canvas=null,ctx=null;
self.onmessage=({data:d})=>{try{
 if(!canvas){canvas=new OffscreenCanvas(d.width,d.height);ctx=canvas.getContext('2d',{willReadFrequently:true});}
 const style=abstractPreset(d.style,d.art),work=buildAbstractWork(new Uint8ClampedArray(d.pixels),d.width,d.height,style,d.seed);renderAbstract(ctx,work,d.width,d.height);const pixels=ctx.getImageData(0,0,d.width,d.height).data;
 self.postMessage({job:d.job,pixels:pixels.buffer,marks:work.marks.length,guideCells:work.guideCells},[pixels.buffer]);
}catch(e){self.postMessage({job:d.job,error:String(e)});}};
