import {abstractPreset,buildAbstractWork,renderAbstract} from './portrait-system-v62.js?v=4baf9416a5b8';
let canvas=null,ctx=null;
self.onmessage=({data:d})=>{try{
 if(!canvas){canvas=new OffscreenCanvas(d.width,d.height);ctx=canvas.getContext('2d',{willReadFrequently:true});}
 const work=buildAbstractWork(new Uint8ClampedArray(d.pixels),d.width,d.height,abstractPreset(d.style,d.art),d.seed);renderAbstract(ctx,work,d.width,d.height);
 const pixels=ctx.getImageData(0,0,d.width,d.height).data;
 self.postMessage({job:d.job,pixels:pixels.buffer,work,marks:work.marks.length,guideCells:work.guideCells},[pixels.buffer]);
}catch(e){self.postMessage({job:d.job,error:String(e)});}};
