import { fetchAnatomyGLB } from './anatomy-loader.js';
import { muscleCatalog, muscleMatches, defaultMuscleFilters } from '../data/muscular-atlas.js';
import { finishAnatomyMaterial } from './anatomy-materials.js';
// MedPobeda - Anatomy 3D viewer (Three.js + WebGL).
// Loads the replaceable licensed provider with picking, system visibility and camera controls.
import * as THREE from 'three';
import { packAnatomy } from './anatomy-layout.js';
import { expandSkullIndex, bindSkullPrimitives } from '../data/skull-anatomy.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ANATOMY_PROVIDER, SYSTEMS, ORGAN_SYSTEMS, inRegion } from '../data/anatomy-provider.js';

export default class AnatomyViewer {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.dom = opts.dom || {};
    this.onSelect = opts.onSelect || (() => {});
    this.onHover = opts.onHover || (() => {});
    this.labelName = opts.labelName || ((id) => id);
    this.structureIds = opts.structureIds || [];
    this.isPlaceholder = false;
    this.camAnim = null;
    this.explodeCurrent = 0;
    this.explodeTarget = 0;
    this.labelsVisible = false;
    // Interaction-ready state exists from the start so page wiring (system
    // buttons, search, layer toggles) can safely call viewer methods while
    // the async init is still waiting for container size or the GLB download.
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.layerGroups = {};
    this.allMeshes = [];
    this.structureGroups = new Map();
    this.structureMeshes = new Map();
    this.labels = new Map();
    this.highlighted = [];
    this.activeSystem = null;
    this.selectedId = null;
    this._stopped = false;
    this._diag = [];
    this._state = {
      webgl2: 'probing…', gpu: 'unknown', renderer: 'pending', size: '—',
      glb: 'pending', draco: 'not required', context: 'active',
    };
    this.enabledSystems = new Set(['skeletal', ...ORGAN_SYSTEMS]);
    this.muscleFilters = defaultMuscleFilters();
    this.muscles = {};
    this.opacities = {};
    this.loadedFiles = new Set();
    this.pendingFiles = new Map();
    this.hiddenStructures = new Set();
    this.dissectionHistory = [];
    this.explodeOffsets = new Map();
    this.abort = new AbortController();
    this.ready = this.init().catch((err) => {
      // Any unexpected crash inside async init must surface with its real
      // message — never as a silent unhandled rejection behind a spinner.
      console.error('[Anatomy3D] init crashed:', err);
      this._diag.push('init: ' + ((err && (err.stack || err.message)) || String(err)));
      this._state.renderer = 'crashed';
      this.showErrorPanel(
        this.dom.webglTitle || 'Viewer error',
        String((err && err.message) || err),
        null,
        false
      );
    });
  }

  async init() {
    this.setupDebugPanel();
    // Never create a renderer inside a 0×0 container (layout pending, hidden
    // tab): wait for a real size first. A ResizeObserver (bindEvents) handles
    // every resize AFTER initialization.
    await this.waitForSize();
    if (this._stopped) return;
    this.renderer = this.createRenderer();
    if (!this.renderer) {
      this._state.renderer = 'failed';
      this._state.context = 'none';
      this.showWebGLError();
      this.updateDebugPanel();
      return;
    }
    // Success — clear any stale error panel left over from an earlier failed
    // attempt (retry, double mount, transient GPU block) so the working 3D
    // view is never hidden behind an outdated "WebGL unavailable" message.
    if (this.dom.error) this.dom.error.hidden = true;
    if (this.dom.loading) this.dom.loading.hidden = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    this._state.size = this.container.clientWidth + '×' + this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, this.container.clientWidth / Math.max(1, this.container.clientHeight), .002, 500);
    this.camera.position.set(0, 0.85, 2.4);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.85, 0);
    this.controls.minDistance = .025;
    this.controls.maxDistance = 5.5;
    this.controls.update();
    this.dirty=true;

    // Lights (no shadow maps — keeps mobile frame rates healthy).
    this.ambientLight=new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 0.95);
    this.scene.add(this.ambientLight);
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(1.5, 2.2, 1.6);
    this.scene.add(key);this.keyLight=key;
    key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-1,right:1,top:2,bottom:-1,near:.1,far:6});
    key.shadow.bias=-.00015;key.shadow.normalBias=.001;
    key.shadow.radius=2;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-1.2, 1.0, -1.4);
    this.scene.add(fill);this.fillLight=fill;
    this.muscleRim=new THREE.DirectionalLight(0xe4edff,0);
    this.muscleRim.position.set(-1.4,1.8,-2);
    this.scene.add(this.muscleRim);
    // A camera-mounted soft flash keeps the skull illuminated as it rotates.
    // Directional light avoids exposure changes when zooming in on a tooth.
    this.skullFlash = new THREE.DirectionalLight(0xfff3df, 0);
    this.skullFlash.position.set(.12, .18, 0);
    this.skullFlash.target.position.set(0, 0, -1);
    this.camera.add(this.skullFlash, this.skullFlash.target);
    this.scene.add(this.camera);

    // Soft medical grid at feet level.
    const grid = new THREE.GridHelper(4, 16, 0x1a6bcc, 0xcbd5e1);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.position.y = 0.002;
    this.scene.add(grid);this.floorGrid=grid;

    this.bindContextLoss();
    await this.loadModel();
    if (this._stopped) return;
    this.fitVisible();
    this.bindEvents();
    this.animate();
    this.updateDebugPanel();
  }

  async loadModel() {
    try {
      this._state.glb='loading index';
      this.lastModelError=null;
      const res = await fetch(ANATOMY_PROVIDER.indexUrl, { signal: this.abort.signal });
      if (!res.ok) throw new Error('Index HTTP ' + res.status);
      const data=await res.json();
      if(!data?.structures || typeof data.structures!=='object')throw new Error('Invalid anatomy structure index: '+ANATOMY_PROVIDER.indexUrl);
      this.structureIndex = expandSkullIndex(data.structures);
      this.muscles = muscleCatalog(this.structureIndex);
      this.opts.onIndex?.(this.structureIndex);
      await this.loadFile(ANATOMY_PROVIDER.baseFile);
      if (this._stopped) return;
      this._state.glb = 'loaded';
      this.dom.loading.hidden = true;
      this.opts.onReady?.();
      this.updateDebugPanel();
    } catch (error) {
      if (this._stopped) return;
      this.lastModelError=error;
      this._state.glb='failed';
      console.error('[Anatomy3D] model load failed', error);
      this.showModelError();
      this.dom.loading.hidden = true;
    }
  }

  async loadFile(file) {
    if (this.loadedFiles.has(file)) return;
    if (this.pendingFiles.has(file)) return this.pendingFiles.get(file);
    const task = (async () => {
      this.opts.onProgress?.(0);
      try {
        this._state.glb='loading '+file;
        const buffer=await fetchAnatomyGLB(file,{signal:this.abort.signal,onProgress:percent=>this.opts.onProgress?.(percent)});
        const loader = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        loader.setDRACOLoader(draco);
        let gltf;
        try { gltf = await loader.parseAsync(buffer, '/models/'); } finally { draco.dispose(); }
        if (this._stopped) { this.disposeScene(gltf.scene); return; }
        bindSkullPrimitives(gltf,this.structureIndex);
        this.finalizeModel(await this.adaptRealScene(gltf.scene));
        this.loadedFiles.add(file);
        this._state.glb='loaded';
      } finally { this.opts.onProgress?.(100); }
    })();
    this.pendingFiles.set(file, task);
    try { await task; } finally { this.pendingFiles.delete(file); }
  }

  async ensureSystems(systems) {
    // Sequential decoding limits peak memory on mobile. Concurrent requests share promises.
    for (const file of new Set(systems.flatMap(s => ANATOMY_PROVIDER.files[s]||[]))) await this.loadFile(file);
  }

  // Definitive capability gate. Three.js r163+ is WebGL2-only, so ONE small
  // canvas probe decides everything: if WebGL2 exists, renderer creation
  // below will succeed; if not, no configuration can help and the error is
  // accurate ("could not initialize WebGL" — confirmed, not assumed).
  probeWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
      if (!gl) { this._state.webgl2 = 'unavailable'; return false; }
      let gpu = 'gpu name hidden by browser';
      try {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      } catch (e) { /* GPU info hidden by privacy settings */ }
      // A software rasterizer (SwiftShader etc.) is still real WebGL — the
      // viewer proceeds, just slower. Only a null context fails the gate.
      const software = /swiftshader|llvmpipe|software|basic render/i.test(gpu);
      this._state.gpu = software ? 'software — ' + gpu : 'hardware — ' + gpu;
      this._state.webgl2 = 'available';
      // Release the probe context immediately — only the renderer's own
      // context stays alive during normal initialization.
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (err) {
      this._state.webgl2 = 'probe threw: ' + ((err && err.message) || err);
      return false;
    }
  }

  // Standard renderer first, one simpler retry second. Three.js creates and
  // owns its context on its own canvas — no manual context passing. A failed
  // high-performance request NEVER means "no WebGL": that is what the retry
  // (default power preference) is for.
  createRenderer() {
    if (!this.probeWebGL2()) return null;
    const configs = [
      { antialias: true, alpha: true, powerPreference: 'high-performance' },
      { antialias: false, alpha: true }, // default power preference
    ];
    for (let i = 0; i < configs.length; i++) {
      try {
        const r = new THREE.WebGLRenderer(configs[i]);
        this._state.renderer = 'created (config ' + (i + 1) + ')';
        return r;
      } catch (err) {
        this._diag.push(((err && err.message) || String(err)) + ' [' + JSON.stringify(configs[i]) + ']');
      }
    }
    return null;
  }

  // Resolve only once the container has a real size — a renderer created
  // inside a 0×0 box (layout pending) mis-sizes and can fail outright.
  waitForSize(timeoutMs) {
    const limit = timeoutMs || 4000;
    const c = this.container;
    const read = () => ({ w: c.clientWidth, h: c.clientHeight });
    const first = read();
    if (first.w > 0 && first.h > 0) { this._state.size = first.w + '×' + first.h; return Promise.resolve(true); }
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (this._stopped) return resolve(false);
        const s = read();
        if ((s.w > 0 && s.h > 0) || Date.now() - started > limit) {
          this._state.size = s.w + '×' + s.h + (s.w > 0 && s.h > 0 ? '' : ' (timeout)');
          resolve(s.w > 0 && s.h > 0);
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // Where is this page actually running? Embedded previews (VS Code Simple
  // Browser, Live Preview iframes) render inside the host app's process and
  // usually have NO GPU access — the user's standalone Chrome/Safari settings
  // don't apply there at all.
  envInfo() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
    const isElectron = ua.indexOf('Electron') !== -1;
    const isVSCode = /Code\/\d/.test(ua) || /VSCode/i.test(ua);
    return { ua, inIframe, isElectron, isVSCode };
  }

  showWebGLError() {
    const env = this.envInfo();
    const embedded = env.isVSCode || (env.isElectron && env.inIframe);
    const tips = embedded
      ? (this.dom.vscodeTip || 'This page is open in an embedded preview (VS Code Simple Browser), which usually cannot use your GPU for WebGL. Copy the address below into Chrome, Safari, Edge or Firefox.')
      : (this.dom.webglTips || null);
    this.showErrorPanel(
      this.dom.webglTitle || '3D rendering is unavailable',
      this.dom.webglMsg || 'Your browser or device could not initialize WebGL.',
      tips,
      embedded
    );
  }

  showContextLost() {
    this.showErrorPanel(
      this.dom.contextLostTitle || '3D rendering temporarily stopped',
      this.dom.contextLostMsg || 'The WebGL context was interrupted. It will restore automatically, or press “Try again”.',
      null
    );
  }

  // Model problems get their own panel — never the WebGL one. Shown when the
  // real GLB is missing or cannot be parsed (placeholder never renders).
  showModelError(glb) {
    this.showErrorPanel(
      this.dom.modelTitle || '3D anatomy model could not be loaded',
      this.dom.modelMsg || 'The anatomy model file (/models/human-body.glb) is missing or could not be read. Please deploy the model files and reload.',
      null
    );
    if (this.dom.loading) this.dom.loading.hidden = true;
    const det = this.dom.error && this.dom.error.querySelector('.anat3d-error__diag pre');
    if (det) {
      det.textContent = 'GLB: ' + (glb || this._state.glb || 'unknown') + '\n'
        + 'path: /models/human-body.glb (+ muscular.glb, cardiovascular.glb, nervous.glb)\n'
        + (this.lastModelError ? 'loader: ' + ((this.lastModelError && this.lastModelError.message) || this.lastModelError) + '\n' : '')
        + 'WebGL initialized successfully. See the loader error above for the failed request or setup step.';
    }
  }

  // One panel, two accurate flavors: renderer-creation failure vs context
  // loss. Model problems NEVER route here (see loadModel).
  showErrorPanel(title, msg, tips, showUrl) {
    if (this.dom.loading) this.dom.loading.hidden = true;
    const err = this.dom.error;
    if (!err) return;
    // Drop previous tips/retry, then re-add fresh ones so the retry button
    // always targets the current viewer instance.
    err.querySelectorAll('.anat3d-error__tips, .anat3d-error__retry, .anat3d-error__diag').forEach((n) => n.remove());
    const h3 = err.querySelector('h3');
    if (h3) h3.textContent = title;
    const p = err.querySelector('p');
    if (p) p.textContent = msg;
    err.hidden = false;
    if (tips) {
      const tipsEl = document.createElement('p');
      tipsEl.className = 'anat3d-error__tips';
      tipsEl.textContent = tips;
      err.appendChild(tipsEl);
    }
    // For embedded previews: the exact address to paste into a real browser
    // (user-select:all — one click selects the whole URL).
    if (showUrl) {
      const urlEl = document.createElement('div');
      urlEl.className = 'anat3d-error__url';
      urlEl.textContent = window.location.href;
      err.appendChild(urlEl);
    }
    if (this.opts.onRetry) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--primary anat3d-error__retry';
      btn.textContent = this.dom.retryLabel || 'Try again';
      btn.addEventListener('click', () => {
        err.hidden = true;
        if (this.dom.loading) this.dom.loading.hidden = false;
        this.opts.onRetry();
      });
      err.appendChild(btn);
    }
    // Collapsible technical diagnostics — shows the exact capability test
    // results so support/browser settings can be targeted precisely.
    const det = document.createElement('details');
    det.className = 'anat3d-error__diag';
    const sum = document.createElement('summary');
    sum.textContent = this.dom.detailsLabel || 'Technical details';
    const pre = document.createElement('pre');
    const env = this.envInfo();
    const envLabel = env.isVSCode ? 'VS Code Simple Browser (Electron webview)'
      : env.isElectron ? 'Electron app'
      : env.inIframe ? 'embedded iframe'
      : 'standalone browser';
    const lines = [
      'WebGL2: ' + this._state.webgl2,
      'gpu: ' + this._state.gpu,
      'renderer: ' + this._state.renderer,
      'environment: ' + envLabel,
      'canvas: ' + this._state.size,
      'GLB: ' + this._state.glb,
      'DRACO: ' + this._state.draco,
      'context: ' + this._state.context,
      'three.js: r' + THREE.REVISION + ' (WebGL2-only since r163)',
      'ua: ' + ((typeof navigator !== 'undefined' && navigator.userAgent) || ''),
    ];
    if (this._diag.length) {
      lines.push('attempts:');
      this._diag.forEach((l) => lines.push('  • ' + l));
    }
    pre.textContent = lines.join('\n');
    det.appendChild(sum);
    det.appendChild(pre);
    err.appendChild(det);
  }

  // Context loss is recoverable: preventDefault keeps the canvas eligible for
  // restore, the render loop pauses, and a restore triggers a clean rebuild
  // through the page's onRetry lifecycle (dispose → fresh viewer).
  bindContextLoss() {
    const el = this.renderer.domElement;
    this._onCtxLost = (e) => {
      e.preventDefault();
      this._state.context = 'lost';
      this._stopped = true;
      if (this._raf) cancelAnimationFrame(this._raf);
      this.showContextLost();
      this.updateDebugPanel();
    };
    this._onCtxRestored = () => {
      this._state.context = 'restored → rebuilding';
      this.updateDebugPanel();
      if (this.opts.onRetry) this.opts.onRetry();
    };
    el.addEventListener('webglcontextlost', this._onCtxLost);
    el.addEventListener('webglcontextrestored', this._onCtxRestored);
  }

  // Dev-only diagnostics overlay (localhost / 127.0.0.1 / ?debug=1).
  // Never rendered in production.
  setupDebugPanel() {
    const dev = /[?&]debug=1/.test(window.location.search);
    this._debugVisible = dev;
    if (!dev) return;
    this.debugEl = document.createElement('div');
    this.debugEl.className = 'anat3d-debug';
    this.debugEl.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.debugEl);
    this.updateDebugPanel();
  }

  updateDebugPanel() {
    if (!this._debugVisible || !this.debugEl) return;
    const s = this._state;
    this.debugEl.textContent = 'WebGL2: ' + s.webgl2
      + ' | gpu: ' + s.gpu
      + ' | renderer: ' + s.renderer
      + ' | canvas: ' + s.size
      + ' | GLB: ' + s.glb
      + ' | DRACO: ' + s.draco
      + ' | ctx: ' + s.context;
  }

  /* ---------- Model indexing ---------- */
  // Wrap a real anatomical GLTF scene into the viewer's model shape:
  // layer groups (skin/muscles/bones/organs/vessels/nerves) > structure groups
  // (one per selectable id) > meshes. Structure metadata comes from
  // /models/structure-index.json (generated alongside the GLBs).
  async adaptRealScene(scene) {
    scene.updateMatrixWorld(true);
    const meshes = [];
    scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    const group = new THREE.Group();
    const layers = new Map();
    const structureGroups = new Map();
    const originalMaterials = new Set(meshes.map(m => m.material));
    for (const mesh of meshes) {
      let node = mesh;
      while (node && !node.userData.structureId) node = node.parent;
      const id = mesh.userData.anatomyId || node?.userData.structureId || mesh.name;
      const entry = this.structureIndex[id];
      if (!entry || this.structureMeshes.has(id)) { mesh.geometry.dispose(); continue; }
      const layer = entry.layer;
      if (!layers.has(layer)) { const g = new THREE.Group(); layers.set(layer,g); group.add(g); }
      if (!structureGroups.has(id)) { const g = new THREE.Group(); g.name = id; structureGroups.set(id,g); layers.get(layer).add(g); }
      const originalGeometry = mesh.geometry;
      mesh.geometry = originalGeometry.clone().applyMatrix4(mesh.matrixWorld);
      originalGeometry.dispose();
      // All exported geometry is world-space; reset transforms when reparenting.
      mesh.position.set(0,0,0); mesh.quaternion.identity(); mesh.scale.set(1,1,1);
      const materialKey=mesh.material.uuid;
      mesh.material = mesh.material.clone();
      finishAnatomyMaterial(mesh.material,entry,id);
      mesh.userData = { structure:id, system:entry.system, layer, materialKey, skull:!!entry.skull, sourceMeshIds:entry.sourceParts.map(p => p.id) };
      mesh.castShadow=true;mesh.receiveShadow=true;
      mesh.geometry.computeBoundingBox();
      mesh.userData.center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
      structureGroups.get(id).add(mesh);
    }
    originalMaterials.forEach(m => m.dispose());
    // One draw call per selectable structure. Source IDs remain on the group metadata.
    structureGroups.forEach(g => {
      if (g.children.length < 2 || this.structureIndex[g.name]?.skull) return;
      if(g.children.some(m=>m.userData.materialKey!==g.children[0].userData.materialKey))return;
      const children = [...g.children];
      const merged = mergeGeometries(children.map(m => m.geometry));
      if (!merged) return;
      const first = children[0];
      children.forEach(m => { m.geometry.dispose(); if (m !== first) { m.material.dispose(); g.remove(m); } });
      first.geometry = merged; merged.computeBoundingBox();
      first.userData.center = merged.boundingBox.getCenter(new THREE.Vector3());
    });
    return { group, layers, structureGroups };
  }

  finalizeModel(model) {
    if (!this.model) this.model = { group: new THREE.Group(), structureGroups: new Map() };
    this.scene.add(model.group);
    model.group.traverse(m => {
      if (!m.isMesh) return;
      this.allMeshes.push(m); this.collectStructure(m);
    });
    model.structureGroups.forEach((g,id) => {
      g.userData.base = g.position.clone();
      const bounds = new THREE.Box3().setFromObject(g);
      g.userData.center = bounds.getCenter(new THREE.Vector3());
      g.userData.size = bounds.getSize(new THREE.Vector3());
      this.model.structureGroups.set(id,g);
    });
    this.applyVisibility();
  }

  collectStructure(mesh) {
    const sid = mesh.userData.structure;
    if (!sid) return;
    if (!this.structureMeshes.has(sid)) this.structureMeshes.set(sid, []);
    this.structureMeshes.get(sid).push(mesh);
  }

  anchorFor(sid) {
    const box = new THREE.Box3();
    (this.structureMeshes.get(sid) || []).forEach(m => box.expandByObject(m));
    return box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  }

  bindEvents() {
    const canvas = this.renderer.domElement;
    this._ptDown = e => { this.down = { x:e.clientX, y:e.clientY }; this.dragged = false; this.camAnim = null; };
    this._ptMove = e => {
      if (this.down && Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6) this.dragged = true;
      if (e.buttons || e.pointerType === 'touch') return;
      const now=performance.now(); if(now-(this.lastHoverTime||0)<65)return; this.lastHoverTime=now;
      this.updatePointer(e); const hit = this.pickVisible();
      this.hoverStructure(hit?.userData.structure || null,e);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    };
    this._ptClick = e => {
      if (!this.down || this.dragged || e.button !== 0) { this.down = null; return; }
      this.down = null;
      this.updatePointer(e); const hit = this.pickVisible();
      if (hit) this.selectStructure(hit.userData.structure);
    };
    this._ptLeave = () => { this.hoverStructure(null); };
    canvas.addEventListener('pointerdown',this._ptDown);
    canvas.addEventListener('pointermove',this._ptMove);
    canvas.addEventListener('pointerup',this._ptClick);
    canvas.addEventListener('pointerleave',this._ptLeave);
    this._resize = () => this.resize();
    window.addEventListener('resize',this._resize);
    this._ro = new ResizeObserver(this._resize); this._ro.observe(this.container);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if(this.explodeTarget) {this.explodeLayoutKey=null;this.updateExplodeLayout();}
    this.renderer.setSize(w, h);
    this.qualityRenderer?.resize(w,h);
    if(this.selectedId && w<900 && !this.structureIndex[this.selectedId]?.skull)this.fitMeshes(this.structureMeshes.get(this.selectedId)||[]);
    this.dirty = true;
    this._state.size = w + '×' + h;
    this.updateDebugPanel();
  }

  updatePointer(e) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  pickVisible() {
    if (!this.camera || !this.renderer) return null;
    const targets = this.pickTargets || [];
    if (!targets.length) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    const tagged = hits.find((h) => h.object.userData.structure);
    return (tagged || hits[0])?.object || null;
  }

  effectiveVisible(m) {
    let node = m;
    while (node) {
      if (node.visible === false) return false;
      node = node.parent;
    }
    return true;
  }

  /* ---------- Render loop ---------- */
  animate() {
    if (this._stopped) return;
    const moving = this.controls.update();
    const changing = !!this.camAnim || Math.abs(this.explodeTarget-this.explodeCurrent) > .001;
    this.tickCameraAnim(); this.tickExplode();
    if (this.skullFlash) this.skullFlash.intensity = this.skullMode ? 2.1 : this.enabledSystems.has('muscular') ? .55 : 1.65;
    if (moving || changing || this.dirty) { if(this.qualityRenderer && !this.muscleFilters.context)this.qualityRenderer.render();else this.renderer.render(this.scene,this.camera); this.dirty=false; }
    this._raf = requestAnimationFrame(() => this.animate());
  }

  tickCameraAnim() {
    if (!this.camAnim) return;
    const c = this.camAnim;
    c.t = Math.min(1,(performance.now()-c.started)/350);
    if (c.t >= 1) {
      this.camera.position.copy(c.toPos);
      this.controls.target.copy(c.toTarget);
      this.camAnim = null;
      return;
    }
    const e = c.t * c.t * (3 - 2 * c.t);
    this.camera.position.lerpVectors(c.fromPos, c.toPos, e);
    this.controls.target.lerpVectors(c.fromTarget, c.toTarget, e);
  }

  tickExplode() {
    const diff = this.explodeTarget - this.explodeCurrent;
    if (Math.abs(diff) < .001) return;
    const elapsed = performance.now() - (this.explodeStarted || 0);
    this.explodeCurrent += diff * Math.min(1, Math.max(.12, elapsed/350));
    if (Math.abs(this.explodeTarget-this.explodeCurrent)<.001)this.explodeCurrent=this.explodeTarget;
    if (this.model) this.applyExplode(this.explodeCurrent);
  }
  updateExplodeLayout() {
    if(!this.model || !this.explodeTarget)return;
    const groups=[...this.model.structureGroups].filter(([id])=>(this.structureMeshes.get(id)||[]).some(m=>m.visible && m.material.opacity>.03));
    const key=groups.map(([id])=>id).join('|')+'@'+this.camera.aspect.toFixed(2);
    if(key===this.explodeLayoutKey)return;
    this.explodeLayoutKey=key;
    const slots=packAnatomy(groups.map(([id,g])=>({id,width:g.userData.size.x,height:g.userData.size.y})),this.camera.aspect);
    this.explodeOffsets.clear();
    const bounds=new THREE.Box3();
    for(const slot of slots){
      const g=this.model.structureGroups.get(slot.id);
      const center=new THREE.Vector3(slot.x,slot.y,0);
      this.explodeOffsets.set(slot.id,center.clone().sub(g.userData.center));
      bounds.expandByPoint(center.clone().addScaledVector(g.userData.size,.5));
      bounds.expandByPoint(center.clone().addScaledVector(g.userData.size,-.5));
    }
    this.applyExplode(this.explodeCurrent);
    if(!bounds.isEmpty())this.fitBox(bounds,true);
  }

  applyExplode(e) {
    if(this.floorGrid)this.floorGrid.visible=e<.001 && !this.skullMode && !this.enabledSystems.has('muscular');
    this.model?.structureGroups.forEach((g,id) => {
      g.position.copy(g.userData.base);
      const offset=this.explodeOffsets.get(id);
      if(offset)g.position.addScaledVector(offset,e);
    });
    this.scene?.updateMatrixWorld(true);
  }

  async setDetailedLighting(enabled) {
    const token=this.qualityToken=(this.qualityToken||0)+1;
    this.qualityRenderer?.dispose();this.qualityRenderer=null;
    this.renderer.shadowMap.enabled=false;this.keyLight.castShadow=false;
    if(enabled){
      const {createAnatomyQuality}=await import('./anatomy-quality.js');
      if(this._stopped || token!==this.qualityToken)return;
      this.qualityRenderer=createAnatomyQuality(this.renderer,this.scene,this.camera,this.container.clientWidth,this.container.clientHeight);
      this.renderer.shadowMap.enabled=true;this.keyLight.castShadow=true;
    }
    this.dirty=true;
  }
  disposeScene(scene) {
    const materials = new Set();
    scene?.traverse(m => { if (m.isMesh) { m.geometry.dispose(); materials.add(m.material); } });
    materials.forEach(m => m.dispose());
  }

  dispose() {
    this._stopped = true; this.abort.abort();
    cancelAnimationFrame(this._raf); this._ro?.disconnect();
    window.removeEventListener('resize',this._resize);
    this.controls?.dispose(); this.removeOutlines(this.hoverOutlines);this.clearHighlight();
    this.qualityRenderer?.dispose();this.keyLight?.shadow.dispose();
    this.disposeScene(this.scene);
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('pointerdown',this._ptDown);
      canvas.removeEventListener('pointermove',this._ptMove);
      canvas.removeEventListener('pointerup',this._ptClick);
      canvas.removeEventListener('pointerleave',this._ptLeave);
      canvas.removeEventListener('webglcontextlost',this._onCtxLost);
      canvas.removeEventListener('webglcontextrestored',this._onCtxRestored);
      this.renderer.dispose(); this.renderer.forceContextLoss(); canvas.remove();
    }
    this.selectedOutlineMaterial?.dispose();this.hoverOutlineMaterial?.dispose();
    this.debugEl?.remove();
  }

  applyVisibility() {
    this.dirty = true;
    const muscular=this.enabledSystems.has('muscular')&&!this.skullMode;
    if(this.renderer){
      this.renderer.toneMapping=muscular?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
      this.renderer.toneMappingExposure=muscular?1.08:1;
    }
    if(this.keyLight){
      this.keyLight.color.set(muscular?0xfff8f3:0xffffff);
      this.keyLight.intensity=muscular?2.2:1.05;
      this.ambientLight.intensity=muscular?1.15:.95;
      this.ambientLight.groundColor.set(muscular?0x666777:0x8fa3b8);
      this.fillLight.intensity=muscular?.65:.4;
      this.muscleRim.intensity=muscular?.8:0;
    }
    if(this.floorGrid)this.floorGrid.visible=!muscular&&!this.skullMode&&this.explodeCurrent<.001;
    for (const m of this.allMeshes) {
      const u = m.userData;
      m.visible = (!this.topicIds || this.topicIds.has(u.structure) || this.topicContextSystems?.includes(u.system)) && (!this.skullMode || u.skull) && this.enabledSystems.has(u.system) && !this.hiddenStructures.has(u.structure) && (!this.isolatedId || u.structure === this.isolatedId)
        && (!this.region || inRegion(this.region,u.center.toArray()))
        && muscleMatches(this.muscles[u.structure],this.muscleFilters);
      const context = this.muscleFilters.context && this.selectedId && u.structure!==this.selectedId;
      const opacity = context ? .12 : (this.opacities[u.system] ?? 1);
      const mat = m.userData.origMat || m.material;
      for (const material of new Set([mat,m.material])) {
        const transparent = opacity < 1;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.opacity = opacity; material.depthWrite = !transparent;
      }
    }
    this.pickTargets=this.allMeshes.filter(m=>m.visible && m.material.opacity>.15);
    if(this.selectedId && !(this.structureMeshes.get(this.selectedId)||[]).some(m=>m.visible))this.selectStructure(null);
    this.hoverStructure(null);
    this.updateExplodeLayout();
    this.opts.onState?.(this.snapshot());
  }

  snapshot() { return { muscleFilters:structuredClone(this.muscleFilters), skullMode:!!this.skullMode, systems:[...this.enabledSystems], opacities:{...this.opacities}, region:this.region || null, selectedId:this.selectedId, isolatedId:this.isolatedId || null, exploded:this.explodeTarget > .5, hiddenIds:[...this.hiddenStructures], canUndo:!!this.dissectionHistory.length, visibleCount:this.allMeshes.filter(m=>m.visible && m.material.opacity>.03).length }; }

  async setSystemEnabled(id,on) {
    this.isolationPrevious=null;
    if (on) this.enabledSystems.add(id); else this.enabledSystems.delete(id);
    this.isolatedId = null; this.applyVisibility();
    if (on) await this.ensureSystems([id]);
    if (!this._stopped) this.applyVisibility();
  }

  setMuscleFilters(patch) {
    this.muscleFilters={...this.muscleFilters,...patch};
    this.isolatedId=null;this.isolationPrevious=null;this.applyVisibility();
  }
  showStructure(id,on) {
    if(!this.structureIndex[id] || this.hiddenStructures.has(id)===!on)return;
    this.dissectionHistory.push([...this.hiddenStructures]);
    if(on)this.hiddenStructures.delete(id);else this.hiddenStructures.add(id);
    this.muscleFilters.context=false;this.isolatedId=null;this.isolationPrevious=null;this.applyVisibility();
  }
  setOpacity(id,value) { this.opacities[id] = Math.max(0,Math.min(1,value)); this.applyVisibility(); }

  async setPreset(id) {
    if(id==='skull'){await this.loadFile(ANATOMY_PROVIDER.baseFile);this.skullMode=true;this.resetView();return;}
    this.skullMode=false;
    this.muscleFilters=defaultMuscleFilters();
    this.isolationPrevious=null;
    this.hiddenStructures.clear();this.dissectionHistory=[];
    this.region = ['head','upper','lower','thorax','abdomen','pelvis'].includes(id) ? id : null;
    this.isolatedId = null; this.selectStructure(null);
    const systems = id === 'all' ? SYSTEMS : id === 'vessels' ? ['arterial','venous'] : id === 'organs' ? ORGAN_SYSTEMS : this.region ? SYSTEMS.filter(s => s !== 'skin') : [id];
    this.enabledSystems = new Set(systems); this.applyVisibility();
    await this.ensureSystems(systems);
    if (this._stopped) return;
    this.applyVisibility(); if(!this.explodeTarget)this.fitVisible();
  }

  outlineFor(id,hover=false) {
    const outlines=[];
    (this.structureMeshes.get(id)||[]).forEach(mesh=>{
      if(!mesh.userData.skull)return;
      const key=hover?'hoverOutlineMaterial':'selectedOutlineMaterial';
      const material=this[key] || (this[key]=new THREE.ShaderMaterial({
        uniforms:{tint:{value:new THREE.Color(hover?0xffe4a1:0xffcf52)},thickness:{value:hover?.00045:.0008}},
        vertexShader:'uniform float thickness; void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*thickness,1.0);}',
        fragmentShader:'uniform vec3 tint; void main(){gl_FragColor=vec4(tint,0.8);}',
        side:THREE.BackSide,transparent:true,depthWrite:false,
      }));
      const outline=new THREE.Mesh(mesh.geometry,material);outline.userData.selectionEffect=true;outline.renderOrder=2;
      mesh.add(outline);outlines.push(outline);
    });
    return outlines;
  }
  removeOutlines(outlines=[]) {outlines.forEach(o=>{o.removeFromParent();});}
  hoverStructure(id,event) {
    if(id!==this.hoveredId){this.removeOutlines(this.hoverOutlines);this.hoverOutlines=[];this.hoveredId=id;
      if(id && id!==this.selectedId)this.hoverOutlines=this.outlineFor(id,true);this.dirty=true;
    }
    this.onHover(id,event);
  }
  clearHighlight() {
    this.removeOutlines(this.selectionOutlines);this.selectionOutlines=[];
    this.highlighted.forEach(m => { if (m.userData.origMat) { m.material.dispose(); m.material = m.userData.origMat; delete m.userData.origMat; } });
    this.highlighted = [];
  }

  selectStructure(id) {
    this.dirty = true;
    this.hoverStructure(null);this.clearHighlight(); this.selectedId = id;
    this.selectionOutlines=this.outlineFor(id);
    (this.structureMeshes.get(id) || []).forEach(m => {
      m.userData.origMat = m.material; m.material = m.material.clone();
      if(m.userData.system==='muscular'){
        // A distinct selection colour, rather than gold blended into red tissue.
        // Clone only the material: preserve authored normals and geometry.
        m.material.color.set(0x24bce0);
        m.material.emissive.set(0x087c9b);m.material.emissiveIntensity=.18;
      }else{
        m.material.color.lerp(new THREE.Color(0xffca55),.6);
        m.material.emissive.set(0x805000);m.material.emissiveIntensity=.22;
      }
      this.highlighted.push(m);
    });
    if(this.muscleFilters.context)this.applyVisibility();
    this.onSelect(id); this.opts.onState?.(this.snapshot());
  }

  async focusStructure(id) {
    if(id==='skull'||id==='teeth'){await this.setPreset('skull');if(id==='teeth'){const ids=Object.keys(this.structureIndex).filter(k=>this.structureIndex[k].sourceParent==='teeth');this.fitMeshes(ids.flatMap(k=>this.structureMeshes.get(k)||[]));}return true;}
    const entry = this.structureIndex?.[id]; if (!entry?.file || (this.topicIds && !this.topicIds.has(id))) return false;
    await this.loadFile(entry.file);
    if (this._stopped || !this.structureMeshes.has(id)) return false;
    if(this.skullMode && !entry.skull)this.skullMode=false;
    this.region = null; this.isolatedId = null;
    if(this.hiddenStructures.has(id)){this.dissectionHistory.push([...this.hiddenStructures]);this.hiddenStructures.delete(id);}
    const muscle=this.muscles[id];
    if(muscle){
      if(!this.muscleFilters.regions.includes(muscle.region))this.muscleFilters.regions.push(muscle.region);
      if(!this.muscleFilters.layers.includes(muscle.layer))this.muscleFilters.layers.push(muscle.layer);
      if(this.muscleFilters.side!=='both'&&muscle.side!==this.muscleFilters.side)this.muscleFilters.side='both';
      // Make occluding anatomy translucent so a located deep structure is visible.
      this.muscleFilters.context=true;
    }
    // Remove occluding outer layers when locating an internal structure.
    if (entry.system !== 'skin') this.enabledSystems.delete('skin');
    if (entry.system !== 'muscular') this.enabledSystems.delete('muscular');
    this.enabledSystems.add(entry.system); this.opacities[entry.system] = 1;
    this.applyVisibility(); this.selectStructure(id); this.fitMeshes(this.structureMeshes.get(id)); return true;
  }

  isolateSelected() {
    if (!this.selectedId) return;
    this.isolationPrevious = {systems:[...this.enabledSystems],region:this.region,hiddenIds:[...this.hiddenStructures]};
    this.isolatedId = this.selectedId; this.region = null;this.hiddenStructures.delete(this.selectedId);
    this.enabledSystems.add(this.structureIndex[this.selectedId].system);
    this.applyVisibility(); this.fitVisible();
  }

  focusSelected() {if(this.selectedId)this.fitMeshes(this.structureMeshes.get(this.selectedId)||[]);}
  resetCamera() {
    if(!this.camera)return;
    const box=new THREE.Box3();
    if(this.skullMode){
      this.model?.structureGroups.forEach((g,id)=>{
        if(!this.structureIndex[id]?.skull)return;
        box.expandByPoint(g.userData.center.clone().addScaledVector(g.userData.size,.5));
        box.expandByPoint(g.userData.center.clone().addScaledVector(g.userData.size,-.5));
      });
    } else this.allMeshes.filter(m=>m.visible).forEach(m=>box.expandByObject(m));
    if(!box.isEmpty())this.fitBox(box,true);
  }
  hideSelected() {
    if(!this.selectedId)return;
    this.showStructure(this.selectedId,false);
  }
  undoDissection() {
    const previous=this.dissectionHistory.pop();if(!previous)return;
    this.hiddenStructures=new Set(previous);this.isolatedId=null;this.applyVisibility();
  }
  revealAbdominals() {
    this.dissectionHistory.push([...this.hiddenStructures]);
    for(const [id,r] of Object.entries(this.muscles)) {
      if(this.topicIds&&!this.topicIds.has(id))continue;
      if(/external oblique|internal oblique/i.test(r.name))this.hiddenStructures.add(id);
      if(/rectus abdominis/i.test(r.name))this.hiddenStructures.delete(id);
    }
    this.enabledSystems.add('muscular');this.enabledSystems.delete('skin');
    this.muscleFilters=defaultMuscleFilters();this.isolatedId=null;this.isolationPrevious=null;
    this.selectStructure(null);this.applyVisibility();
    const meshes=Object.entries(this.muscles).filter(([id,r])=>/rectus abdominis/i.test(r.name)&&(!this.topicIds||this.topicIds.has(id))).flatMap(([id])=>this.structureMeshes.get(id)||[]);
    this.scene.updateMatrixWorld(true);const box=new THREE.Box3();meshes.forEach(m=>box.expandByObject(m));if(!box.isEmpty())this.fitBox(box,true);
  }
  restoreContext() {
    this.dissectionHistory=[];
    const previous=this.isolationPrevious;
    if(previous){this.enabledSystems=new Set(previous.systems);this.region=previous.region;this.hiddenStructures=new Set(previous.hiddenIds);}
    else this.hiddenStructures.clear();
    this.isolatedId=null;this.isolationPrevious=null;this.applyVisibility();this.fitVisible();
  }
  setView(view) {
    const directions={front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0],superior:[0,1,.001],inferior:[0,-1,.001]};
    if(!this.camera||!directions[view])return;
    const target=this.controls.target.clone();
    const distance=this.camera.position.distanceTo(target);
    this.animateCamera(target.clone().addScaledVector(new THREE.Vector3(...directions[view]),distance),target);
  }
  fitMeshes(meshes) {
    if (!this.camera || !meshes.length) return;
    this.scene.updateMatrixWorld(true);
    const box = new THREE.Box3(); meshes.forEach(m => box.expandByObject(m));
    this.fitBox(box);
  }
  fitBox(box,front=false) {
    const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    const fit=Math.max(size.y,size.x/this.camera.aspect,.04);
    const margin=this.enabledSystems.has('muscular')&&this.container.clientWidth<600?1.75:1.3;
    const distance=Math.max(.08,fit/(2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)))*margin+size.z/2);
    this.controls.maxDistance=Math.max(5.5,distance*3);
    const direction=front?new THREE.Vector3(0,0,1):this.camera.position.clone().sub(this.controls.target).normalize();
    this.animateCamera(center.clone().addScaledVector(direction,distance),center);
  }
  fitVisible() { this.fitMeshes(this.allMeshes.filter(m => this.effectiveVisible(m))); }
  animateCamera(toPos,toTarget) { this.camAnim = { t:0, started:performance.now(), fromPos:this.camera.position.clone(), fromTarget:this.controls.target.clone(), toPos, toTarget }; }
  zoom(factor) {
    if (!this.controls) return;
    this.camAnim = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,this.controls.minDistance,this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(offset); this.controls.update(); this.dirty=true;
  }
  setControlMode(mode) {
    if (!this.controls) return;
    this.controls.enableRotate = true; this.controls.enablePan = true; this.controls.enableZoom = true;
    this.controls.mouseButtons.LEFT = mode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = mode === 'pan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  }
  resetView() {
    this.muscleFilters=defaultMuscleFilters();
    this.hiddenStructures.clear();this.dissectionHistory=[];this.isolationPrevious=null;this.explodeLayoutKey=null;
    this.explodeTarget = 0; this.explodeCurrent = 0; this.applyExplode(0);
    this.camAnim = null;
    this.opacities = {}; this.region = null; this.isolatedId = null;
    this.enabledSystems = new Set(this.topicSystem?[this.topicSystem]:this.skullMode?['skeletal']:['skeletal',...ORGAN_SYSTEMS]);
    this.selectStructure(null); this.applyVisibility(); this.setControlMode('rotate');
    this.allMeshes.forEach(m=>{m.material.clippingPlanes=null;});
    if(this.skullMode){const box=new THREE.Box3();this.allMeshes.filter(m=>m.visible).forEach(m=>box.expandByObject(m));if(!box.isEmpty())this.fitBox(box,true);}
    else {this.camera?.position.set(0,.85,2.4);this.controls?.target.set(0,.85,0);this.fitVisible();}
  }
  toggleExplode() {
    this.explodeStarted=performance.now(); this.explodeTarget=this.explodeTarget>.5?0:1;
    if(this.explodeTarget){this.explodeLayoutKey=null;this.updateExplodeLayout();}
    else {
      this.applyExplode(0);this.fitVisible();this.applyExplode(this.explodeCurrent);
    }
    this.opts.onState?.(this.snapshot());return this.explodeTarget>.5;
  }
}
