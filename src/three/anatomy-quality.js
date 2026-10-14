// Optional geometry-based occlusion. No generated fiber maps or surface anatomy.
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export function createAnatomyQuality(renderer,scene,camera,width,height){
 const composer=new EffectComposer(renderer);
 // Bound postprocessing memory independently from the main canvas pixel ratio.
 composer.setPixelRatio(1);composer.setSize(width,height);
 const ao=new SSAOPass(scene,camera,width,height,16);
 ao.kernelRadius=8;ao.minDistance=.0001;ao.maxDistance=.015;
 const beauty=new RenderPass(scene,camera);
 const output=new OutputPass();composer.addPass(beauty);composer.addPass(ao);composer.addPass(output);
 return {render:()=>composer.render(),resize:(w,h)=>composer.setSize(w,h),dispose:()=>{beauty.dispose();ao.dispose();output.dispose();composer.dispose();}};
}
