import {renderPortraitStyle,PORTRAIT_STYLE_PRESETS} from './portrait-style-rules.js?v=4463ff4f4170';
self.onmessage=({data:d})=>{try{const pixels=renderPortraitStyle(new Uint8ClampedArray(d.pixels),d.width,d.height,PORTRAIT_STYLE_PRESETS[d.style],d.seed);self.postMessage({job:d.job,pixels:pixels.buffer},[pixels.buffer]);}catch(e){self.postMessage({job:d.job,error:String(e)});}};
