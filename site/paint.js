import * as T from 'three';

// Shared, matte illustration lighting. The GLB's colour atlas and real skin survive;
// metallic/normal maps do not define this world's look.
const ramp = new T.DataTexture(new Uint8Array([36, 142, 255]), 3, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;
export const paintInk = {value: new T.Color().setRGB(.23, .23, .43)};

export function paintMaterial(source = {}, kind = 'surface') {
  const atlas = source.paintAtlas;
  const material = new T.MeshToonMaterial({
    color: source.color?.clone?.() || source.color || '#ffffff',
    map: source.map || null,
    gradientMap: ramp,
    vertexColors: !!source.vertexColors,
    side: source.side ?? T.FrontSide,
    transparent: !!source.transparent,
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest || 0,
    emissive: source.emissive?.clone?.() || '#000000',
    emissiveMap: source.emissiveMap || null,
    emissiveIntensity: source.emissiveIntensity ?? 0,
  });
  material.name = `paint-${kind}`;
  material.userData.paint = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.paintInk = paintInk;
    shader.vertexShader = 'varying vec3 vPaintLocal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvPaintLocal = position;');
    shader.fragmentShader = 'uniform vec3 paintInk;\nvarying vec3 vPaintLocal;\n' + shader.fragmentShader;
    if (atlas) {
      shader.uniforms.uPaintGrid = {value: new T.Vector2(atlas.columns,atlas.rows)};
      const varyings='varying vec2 vPaintTile;\nvarying vec2 vPaintRepeat;\n';
      shader.vertexShader=varyings+(atlas.instanced?'attribute vec4 aPaintAtlas;\n':'uniform vec2 uPaintTile,uPaintRepeat;\n')+shader.vertexShader;
      if(!atlas.instanced){
        shader.uniforms.uPaintTile={value:new T.Vector2(...atlas.tile)};
        shader.uniforms.uPaintRepeat={value:new T.Vector2(...atlas.repeat)};
      }
      shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>\n${atlas.instanced?'vPaintTile=aPaintAtlas.xy;vPaintRepeat=aPaintAtlas.zw;':'vPaintTile=uPaintTile;vPaintRepeat=uPaintRepeat;'}`);
      shader.fragmentShader='uniform vec2 uPaintGrid;\n'+varyings+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        #ifdef USE_MAP
          vec2 paintUV=(vPaintTile+${(kind==='botanical'||kind==='mural')?'clamp(vMapUv,vec2(.006),vec2(.994))':'clamp(fract(vMapUv*vPaintRepeat),vec2(.006),vec2(.994))'})/uPaintGrid;
          vec4 paintedSample=texture2D(map,paintUV);
          diffuseColor*=paintedSample;
        #endif
      `);
    }
    if(kind==='botanical'){
      // Painted cards share an upward-facing light plane, avoiding black back faces
      // on intersecting leaf panels while still receiving the camp's actual shadows.
      shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\ntransformedNormal=normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0));');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(vNormal);');
    }
    if(kind==='camp-tent'){
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        #include <map_fragment>
        float broadStroke=smoothstep(.25,.70,sin(vPaintLocal.x*8.+vPaintLocal.z*4.+sin(vPaintLocal.y*9.)*.4));
        vec3 fabricPigment=mix(vec3(.025,.23,.36),vec3(.72,.24,.12),broadStroke);
        float oldValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=mix(diffuseColor.rgb,fabricPigment*(.65+oldValue*.5),.63);
      `);
    }
    if(kind==='city-architecture')shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`float cityLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(cityLuma),diffuseColor.rgb,.42);\n#include <color_fragment>`);
    if (kind === 'tree') {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec3 treePigment=diffuseColor.rgb;
        #include <map_fragment>
        // Keep the source trunk/leaf structure, but lift dark photogrammetric leaves
        // into broad painted pigment before the shared instance colours are applied.
        float leafMask = smoothstep(.17,.34,vPaintLocal.y);
        float leafValue = dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb = mix(diffuseColor.rgb,treePigment*(.68+leafValue*.65),leafMask*.88);
      `);
    }
    // Large coloured light planes; the normal-map micro-detail is intentionally absent.
    shader.fragmentShader = shader.fragmentShader.replace('#include <gradientmap_pars_fragment>', `
      uniform sampler2D gradientMap;
      vec3 getGradientIrradiance(vec3 n, vec3 l) {
        float dotNL = dot(n,l);
        float band = texture2D(gradientMap,vec2(dotNL*.5+.5,.5)).r;
        return band * mix(vec3(.72,.79,1.12),vec3(1.06,.99,.88),smoothstep(.25,.65,dotNL));
      }
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      // The shadow map still comes from the actual geometry. Give its dark regions
      // an opaque violet paint colour instead of physically black diffuse shading.
      float baseLuma = dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      vec3 illumination = reflectedLight.directDiffuse / max(diffuseColor.rgb,vec3(.045));
      float amount = dot(illumination,vec3(.2126,.7152,.0722));
      vec3 shadowPaint = mix(vec3(baseLuma),diffuseColor.rgb,.48) * paintInk;
      outgoingLight = mix(shadowPaint + totalEmissiveRadiance,outgoingLight,smoothstep(.13,.23,amount));
      // Static object-space dry-brush modulation: no random changes between frames.
      float brush = sin(vPaintLocal.x*24.+sin(vPaintLocal.z*11.)*1.4)
                  * sin(vPaintLocal.y*32.+vPaintLocal.z*19.);
      outgoingLight *= 1.0 + brush * ${kind === 'character' ? '.025' : '.085'};
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => `paint-planes-v10-${kind}-${atlas?atlas.instanced?'instanced-atlas':'fixed-atlas':'map'}`;
  return material;
}

const objectMaterialCache=new WeakMap();
export function paintObject(object, kind = 'surface') {
  object.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    const convert = original => {
      if (original.userData.paint) return original;
      let variants=objectMaterialCache.get(original);
      if(!variants){variants=new Map();objectMaterialCache.set(original,variants);}
      if (!variants.has(kind)) variants.set(kind, paintMaterial(original, kind));
      return variants.get(kind);
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
  });
}
