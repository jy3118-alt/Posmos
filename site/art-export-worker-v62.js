import {renderAbstract} from './portrait-system-v62.js?v=caf5cc4587a0';
self.onmessage=async({data:d})=>{let canvas;try{
 canvas=new OffscreenCanvas(d.width,d.height);renderAbstract(canvas.getContext('2d'),d.work,d.width,d.height);
 const blob=await canvas.convertToBlob({type:'image/png'});self.postMessage({blob,width:d.width,height:d.height});
}catch(error){self.postMessage({error:String(error)});}finally{if(canvas)canvas.width=canvas.height=1;self.close();}};
