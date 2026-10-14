// Replace this provider/index to change anatomy datasets without rewriting the UI.
export const ANATOMY_PROVIDER = {
 id: 'bodyparts3d-4', indexUrl: '/models/structure-index.json', baseFile: 'human-body.glb',
 files: { muscular: ['muscular.glb','abdominal.glb'], nervous: 'nervous.glb', arterial: 'cardiovascular.glb', venous: 'cardiovascular.glb' },
 sourceUrl: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
 licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
 attribution: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
};
export const SYSTEMS = ['skeletal','muscular','nervous','arterial','venous','lymphatic','respiratory','digestive','urinary','reproductive','endocrine','skin','cardiac','sensory'];
export const PRESETS = ['skull','all','skeletal','muscular','nervous','vessels','organs','head','upper','lower','thorax','abdomen','pelvis'];
export const ORGAN_SYSTEMS = ['cardiac','respiratory','digestive','urinary','reproductive','endocrine','lymphatic','sensory'];
// Region presets use individual geometry bounds/centres, including unannotated parts.
export function inRegion(region, center) {
 const [x,y] = center;
 if (region === 'head') return y > 1.43;
 if (region === 'upper') return Math.abs(x) > .18 && y > .68 && y < 1.48;
 if (region === 'lower') return y < .88;
 if (region === 'thorax') return y > 1.04 && y <= 1.43 && Math.abs(x) < .22;
 if (region === 'abdomen') return y > .87 && y <= 1.13 && Math.abs(x) < .2;
 if (region === 'pelvis') return y > .68 && y <= .97 && Math.abs(x) < .2;
 return true;
}
