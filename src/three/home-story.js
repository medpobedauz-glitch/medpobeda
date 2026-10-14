// A single, continuous scroll-driven scene. Geometry is original and stylized.
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const ease = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };

function material(color, metalness = 0, roughness = .42) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
function mesh(parent, geometry, mat, position, scale) {
  const m = new THREE.Mesh(geometry, mat);
  if (position) m.position.set(...position);
  if (scale) m.scale.set(...scale);
  parent.add(m);
  return m;
}
function oval(parent, mat, position, scale) {
  return mesh(parent, new THREE.SphereGeometry(1, 32, 24), mat, position, scale);
}
function tube(parent, points, radius, mat) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 64, radius, 12, false), mat);
}
function stethoscope() {
  const g = new THREE.Group();
  g.name = 'neck-fitted-stethoscope';
  const geometry = new THREE.PlaneGeometry(1.5,1);
  const mat=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.65,toneMapped:false,depthWrite:true});
  const worn=mesh(g,geometry,mat,[0,0,0]);
  worn.name='photographic-worn-scope';worn.visible=false;
  return g;
}
function person(name) {
  const group=new THREE.Group();group.name=name;
  group.userData.photographic=true;
  const portrait=mesh(group,new THREE.PlaneGeometry(2.2,3.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0,toneMapped:false,depthWrite:false}),[0,.03,0]);
  portrait.name='portrait-with-fitted-stethoscope';
  return {group,portrait};
}

export function mountHomeStory(root) {
  const stage = root.querySelector('.med-journey__stage');
  const canvas = root.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true}); }
  catch { root.classList.add('med-journey--fallback'); return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36,1,.1,60);
  camera.position.set(0,0,7.5);
  scene.add(new THREE.HemisphereLight(0xdff6ff,0x34485e,1.6));
  for (const [color,power,position] of [[0xffe4c9,3,[3,4,5]],[0x72d8ed,1.3,[-4,1,2]],[0x729bff,3,[1,3,-3]]]) {
    const light = new THREE.DirectionalLight(color,power); light.position.set(...position); scene.add(light);
  }
  const scope = stethoscope(); scene.add(scope);
  const student = person('medical-student'), doctor = person('surgeon'), graduate = person('graduate');
  for(const p of [student,doctor,graduate]) scene.add(p.group);
  const platformMat = material(0x17374c,.45,.35);
  const platform = mesh(scene,new THREE.CylinderGeometry(1,1.1,.1,64),platformMat,[0,-1.58,0]);
  const ring = mesh(scene,new THREE.TorusGeometry(1.02,.012,12,96),material(0x57d9ce,.4,.25),[0,-1.515,0]);
  ring.rotation.x = -Math.PI/2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const captions = [...root.querySelectorAll('.med-journey__chapter')];
  const steps = [...root.querySelectorAll('[data-journey-step]')];
  const progress = root.querySelector('.med-journey__progress span');
  let frame = 0, disposed = false, activeIndex = -1, current = null, previousTime = 0;
  const render = (now = performance.now()) => {
    frame = 0; if(disposed) return;
    const bounds=root.getBoundingClientRect();
    const raw=clamp(-bounds.top/Math.max(1,root.offsetHeight-stage.offsetHeight),0,1)*3;
    const dt=previousTime?Math.min(now-previousTime,50):16.7; previousTime=now;
    if(current===null||reduce.matches)current=raw;
    else current=mix(current,raw,1-Math.exp(-dt/85));
    if(Math.abs(current-raw)<.0001)current=raw;
    const p=reduce.matches?Math.round(raw):current;
    // Hold the settled poses; travel takes place between these short pauses.
    const first=ease(p), second=ease(p-1), third=ease(p-2);
    const mobile=stage.clientWidth<700;
    const x=mobile?0:1.15;
    const personScale=mobile?.87:1.08;
    const subjects=[student,doctor,graduate];
    // Three photographs of the same fictional person, with the instrument
    // already worn in each image. No independently positioned neck overlay.
    // One shared chapter index controls the portrait, caption and step button.
    // Equal boundaries prevent the student caption lingering into the next step.
    const index=clamp(Math.floor(p+.5),0,3);
    const chapter=Math.max(0,index-1);
    subjects.forEach((person,i)=>{
      person.group.position.set(x,-(1-first)*.12,0);
      person.group.scale.setScalar(personScale);
      person.group.visible=index>0 && i===chapter && !!person.group.userData.ready;
      person.portrait.material.opacity=index>0?1:0;
      person.group.rotation.y=0;
    });
    // One photographic asset from introduction to collar: no crossfade,
    // distortion or competing silhouettes during the transition.
    const worldHeight=2*7.5*Math.tan(THREE.MathUtils.degToRad(18));
    const worldWidth=worldHeight*camera.aspect;
    scope.position.set(mix(mobile?0:worldWidth*.13,x,first),mix(-worldHeight*.30,.65*personScale,first),.1);
    scope.scale.setScalar(mix(mobile?.8:1.15,.34*personScale,first));
    scope.rotation.set(0,0,mix(-.10,-.60,first));
    scope.visible=!!scope.children[0].userData.ready && index===0;
    scope.children[0].material.opacity=1-ease((first-.78)/.16);
    root.style?.setProperty('--desk-opacity',String(1-ease(first/.72)));
    platform.position.x=x; ring.position.x=x;
    platform.visible=ring.visible=false;
    platform.scale.setScalar(personScale);ring.scale.setScalar(personScale);
    if(mobile) { camera.position.y=.25; camera.lookAt(0,.25,0); } else { camera.position.y=0;camera.lookAt(0,0,0); }
    if(index!==activeIndex) {
      activeIndex=index; root.dataset.chapter=String(index);
      captions.forEach((caption,i)=>{caption.hidden=i!==index;});
      steps.forEach((step,i)=>{step.setAttribute('aria-current',i===index?'step':'false');});
    }
    progress.style.transform='scaleX('+raw/3+')';
    renderer.render(scene,camera);
    if(current!==raw&&!disposed)frame=requestAnimationFrame(render);
  };
  const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(render);};
  const resize=()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/Math.max(1,stage.clientHeight);camera.updateProjectionMatrix();schedule();};
  const observer=new ResizeObserver(resize);observer.observe(stage);
  const go=(event)=>{
    const button=event.target.closest('[data-journey-step]');if(!button)return;
    const top=scrollY+root.getBoundingClientRect().top;
    window.scrollTo({top:top+Number(button.dataset.journeyStep)/3*(root.offsetHeight-stage.offsetHeight),behavior:reduce.matches?'instant':'smooth'});
  };
  const contextLost=(event)=>{event.preventDefault();root.classList.add('med-journey--fallback');};
  const contextRestored=()=>{root.classList.remove('med-journey--fallback');schedule();};
  root.addEventListener('click',go);
  canvas.addEventListener('webglcontextlost',contextLost);
  canvas.addEventListener('webglcontextrestored',contextRestored);
  window.addEventListener('scroll',schedule,{passive:true});
  reduce.addEventListener('change',schedule);
  resize();
  const loader=new THREE.TextureLoader();
  const loadPhoto=(target,color,mask)=>Promise.allSettled([loader.loadAsync(color),loader.loadAsync(mask)]).then(results=>{
    if(disposed||results.some(r=>r.status==='rejected')){results.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});return;}
    target.material.map=results[0].value;target.material.map.colorSpace=THREE.SRGBColorSpace;
    target.material.map.anisotropy=4;
    target.material.alphaMap=results[1].value;target.material.needsUpdate=true;
    target.userData.ready=true;target.visible=true;schedule();
  });
  const portraits=[
    [student,'/images/home/student-with-stethoscope.png'],
    [doctor,'/images/home/surgeon-with-stethoscope.png'],
    [graduate,'/images/home/doctor-waving.png'],
  ];
  for(const [subject,url] of portraits){
    const maskUrl=url.replace('.png','-mask.png');
    Promise.allSettled([loader.loadAsync(url),loader.loadAsync(maskUrl)]).then(results=>{
      if(disposed||results.some(r=>r.status==='rejected')){
        results.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});
        if(!disposed)root.classList.add('med-journey--fallback');
        return;
      }
      const [texture,mask]=results.map(r=>r.value);
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
      subject.portrait.material.map=texture;
      subject.portrait.material.alphaMap=mask;
      subject.portrait.material.alphaTest=.04;
      subject.portrait.material.needsUpdate=true;
      subject.group.userData.ready=true;schedule();
    });
  }
  loadPhoto(scope.children[0],'/images/home/stethoscope-photo.png','/images/home/stethoscope-mask.png');
  return ()=>{
    disposed=true;cancelAnimationFrame(frame);observer.disconnect();
    window.removeEventListener('scroll',schedule);reduce.removeEventListener('change',schedule);root.removeEventListener('click',go);
    canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);
    const geometries=new Set(),materials=new Set();
    scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.alphaMap?.dispose();m.dispose();});renderer.dispose();
  };
}
