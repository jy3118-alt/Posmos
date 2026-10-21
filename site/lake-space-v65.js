// Inland water uses the actual carved terrain. The same query drives dry-route
// eligibility, entry/wading/swimming, contact height and the visible lake plane.
export function lakeRadius(lake,x,z){const dx=(x-lake.centre[0])/lake.radii[0],dz=(z-lake.centre[1])/lake.radii[1],a=Math.atan2(dz,dx);return Math.hypot(dx,dz)*(1+.045*Math.sin(a*3+.7)+.025*Math.sin(a*5-.5));}
export function attachLakeWater(city,lakes){
 const riverNear=city.streamNear,riverAt=city.waterAt;
 const near=(x,z,out)=>{for(const lake of lakes){const r=lakeRadius(lake,x,z);if(r>1.37)continue;const width=Math.min(...lake.radii);Object.assign(out,{region:lake.id,d:r*width,width,level:lake.level,flowX:0,flowZ:0,lake:true,normalizedRadius:r});return out;}return null;};
 city.streamNear=(x,z,out={})=>{const lake=near(x,z,out);if(lake)return lake;out.lake=false;out.region='stream';return riverNear(x,z,out);};
 city.waterAt=(x,z,out={})=>{const lake=near(x,z,out);if(!lake){out.lake=false;out.region='stream';return riverAt(x,z,out);}if(lake.normalizedRadius>1.006)return null;const depth=lake.level-city.height(x,z);if(depth<=.035)return null;out.waterDepth=depth;out.surfaceY=lake.level;return out;};
 city.lakes=lakes;return {near};
}
