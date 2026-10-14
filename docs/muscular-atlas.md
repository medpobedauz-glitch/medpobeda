# Muscular atlas implementation and asset requirements

## Existing architecture and asset audit

The existing app uses Three.js, GLTFLoader and OrbitControls. `anatomy-viewer.js` owns loading, real mesh raycasts, independent structure groups, highlighting, isolation, camera fitting, visibility, context loss and disposal. `anatomy-3d.js` owns search, information and controls. Dashboard cards and their previews resolve through `anatomy-topic.js`.

The original Head & Neck card used a geometric height cutoff. Trunk/limb cards likewise depended on geometry centres. This could misclassify structures crossing regions. Muscle cards now resolve named metadata in the same shared topic resolver used by previews and the viewer.

Local assets are `human-body.glb`, `muscular.glb`, `cardiovascular.glb` and `nervous.glb`, with gzip counterparts and `structure-index.json`. The muscle file contains 414 individually tagged source meshes, 673,542 triangles, positions and normals. It has no UV coordinates or texture maps. Five entries describe cardiac papillary muscles and are excluded from the skeletal-muscle atlas. The remaining 409 original entries plus 8 licensed Z-Anatomy abdominal entries (417 total) are **source structures**, not a claim of 409 unique muscles: some are separate heads, muscle sets or connective tissue.

`muscular-coverage.json` is a reproducible source-to-requirement audit. Run `node scripts/verify-muscular-atlas.mjs` after an asset update. The current request has 22 named muscle requirements with no matching source mesh. Many facial muscles, pyramidalis, latissimus dorsi, subscapularis and other structures require replacement/additional assets. Some source names do not specify laterality; left/right views exclude these instead of guessing from coordinates. Bilateral completeness is not guaranteed by a coverage match.

## Changes implemented

- One whole-body card plus regional cards for head/neck, thorax, abdomen, back, shoulder, arm, forearm, hand, pelvis, gluteal region, thigh, leg and foot. Existing grouped cards remain valid.
- Shared name-based region metadata, independently selectable source structures and explicit unclassified annotations. No generated anatomy.
- Both/left/right filtering, regional group toggles, conservative depth layers, individual visibility list, hide/restore and isolation.
- Search uses source names and aliases (including peroneus/fibularis and quadratus plantae/flexor accessorius), focuses a real structure, reveals its necessary filters and makes other structures translucent. Transparent context is excluded from raycast targets to avoid occluding the selected deep muscle.
- Six canonical camera views; orbiting supplies arbitrary medial/lateral inspection. Reset keeps the originating card scope and restores that card's system, fixing empty muscle-topic resets.
- Real bone/skin context can be toggled in the whole-body atlas. Unsupported separate tendon and fascia layers are disabled and labelled unavailable.
- Structured information fields preserve missing values. Biceps heads have a sourced educational example with head-specific origin; most clinical fields still require authored, reviewed content.
- Optional detailed lighting adds real geometry shadows and SSAO. Source texture maps are retained if supplied. Existing untextured muscle materials use subtle per-structure color variation and a matte finish; the iliotibial tract is distinguished as connective tissue.
- English, Uzbek and Russian controls follow the website language. Source anatomical names and the initial biceps content remain English where no reviewed translation is available.

## Structured metadata and new asset contract

`src/data/muscular-atlas.js` adapts the source index to:

```js
{
  id, name, latinName, region, compartment, side, layer,
  origin, insertion, action, innervation, bloodSupply,
  clinicalRelevance, modelId, aliases, sourceParts,
  annotationStatus, referenceUrl
}
```

Unknown anatomical/clinical fields are `null`, not fabricated facts. `side` is `left`, `right`, `midline` or `unknown`. Region keys are exported in `MUSCLE_REGIONS`. Layer keys are `superficial`, `intermediate`, `deep`, `unclassified`, `connective`. Layer mappings are conservative educational metadata, pending professional review; they are regional dissection categories, not continuous shells. Incomplete annotation must not be mistaken for absence of the model.

For a replacement asset, use one independently addressable GLTF node/group per side and anatomical structure, with `extras.structureId` matching the index key. Multiple primitives for a single structure are supported. Distinct heads may retain individual IDs. Preserve source provenance and license rights. Use the existing anatomical world coordinate frame (metres, Y superior, +X anatomical left, +Z anterior), or export a correctly registered transform. Do not infer left/right from a mirrored filename.

A source index entry should retain existing `name`, `system`, `layer`, `center`, `file`, `sourceId` and `sourceParts`, and may add `anatomy`:

```js
{
  "name": "Left example muscle",
  "system": "muscular",
  "layer": "muscles",
  "center": [0.1, 1.0, 0.0],
  "file": "muscular.glb",
  "sourceId": "licensed-provider-version",
  "sourceParts": [{"id":"provider-id","conceptId":"FMA-id","name":"Source name"}],
  "anatomy": {
    "region":"arm", "side":"left", "layer":"deep",
    "latinName":null, "compartment":null,
    "origin":null, "insertion":null, "action":null,
    "innervation":null, "bloodSupply":null, "clinicalRelevance":null,
    "aliases":[], "annotationStatus":"awaiting review"
  }
}
```

This is a schema example, not an anatomical annotation. `anatomy` overrides name-derived defaults. Text fields may be strings or `{en,uz,ru}` objects. New files should be registered in the provider's file loading configuration; an existing `muscular.glb` can be replaced without changing application code. The parser follows explicit index IDs and does not manufacture missing geometry.

Professional visual quality requires properly segmented, high-resolution licensed geometry with authored UVs, anatomically aligned fiber normal/color maps, separately identified tendon/aponeurosis primitives where available, and reviewed attachment metadata. Optional LODs must preserve structure IDs and pickability. **This change does not create those missing assets or claim photographic anatomical detail.**

## Rendering and performance

Existing lazy system loading, shared in-flight downloads, gzip transfer, full source geometry, frustum culling, bounded device pixel ratio and dirty-frame rendering remain. Structures are never merged across anatomical IDs. No decimation has been added. Detailed lighting is opt-in; SSAO uses a 16-sample kernel at CSS resolution and is bypassed for transparent context. Postprocessing buffers and shadow resources are disposed. Transparent rendering retains the normal limitations of sorted alpha surfaces; opacity is a study aid, not volumetric dissection.

No LODs or texture compression were invented for an asset without LODs or textures. Draco decoding remains supported by the original loader. The provider uses the original muscle bundle plus a small abdominal supplement; additional regional streaming requires provider file registration and coordinated asset export.

## References and verification

Educational classification references:
- https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back
- https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax
- https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs
- https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs
- Biceps data reference: https://www.ncbi.nlm.nih.gov/books/NBK519538/

The supplied geometry's existing BodyParts3D CC BY attribution remains visible. Clinical and layer annotations still require anatomist review. The later screenshot reference was used for tissue color direction; it was not traced into artificial anatomy.

Validation commands:

```sh
node scripts/verify-muscular-atlas.mjs
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/e2e-muscular-atlas.mjs
```

Browser tests mock authentication only, load the real GLBs and exercise desktop/mobile interaction. They do not validate production login, clinical correctness or physical-device GPU performance.

Verification completed on 2026-10-04: production build, original GLB integrity test (all four bundles), dashboard data/i18n validation, new coverage audit, real-GLB desktop/mobile muscular workflows, lighting pixel check, and existing skull/heart selection layout regression all passed. Desktop and mobile screenshots were inspected after correcting the optional postprocessing pipeline. Existing Vite environment, mixed-import and bundle-size warnings remain. The audit currently records 28 unspecified sides and 318 unclassified depth annotations. This is an implemented atlas upgrade with explicit dataset limitations, not a complete professionally reviewed muscular dataset.

### Model-loading recovery (2026-10-04)

The production server now serves `/models` directly from `public/models`, independently of Vite clearing/rebuilding `dist`. Missing model URLs return a JSON 404 instead of the SPA HTML. The client validates GLB signatures, version and declared length, handles already-decompressed responses, and retries the plain GLB after gzip/network/validation failures. Abort remains cancellation rather than triggering another download. Initial loading failures retain the actual error in the technical-details panel instead of reporting `GLB: pending`.

Validation: `node scripts/verify-anatomy-loader.mjs`, production build, and `scripts/e2e-anatomy-loading.mjs` passed. The browser regression targets the user's production-serving origin `http://localhost:4000`, mocks authentication only, verifies real model downloads, injects an HTML gzip response and 404s, then verifies Retry recovers to 417 visible structures. A fresh load succeeded before the patch; the exact original transient failure could not be reproduced.


### Abdominal anatomy and student dissection (2026-10-04)

- Added eight actual Z-Anatomy meshes: bilateral rectus abdominis, internal oblique, transversus abdominis and quadratus lumborum. The original external oblique remains source geometry; it includes a broad, unsegmented aponeurotic surface. No guessed tendon boundaries, generated abs, or anatomical texture were painted onto it.
- `abdominal.glb` has a separate CC BY-SA 4.0 license/attribution. `public/models/abdominal-provenance.json` records its pinned BodyExplorer source revision, SHA-256 and exact coordinate transform. Reproduce with `node scripts/import-abdominal-models.mjs /path/to/pinned/anatomy.glb`.
- Source topology is retained. Original authored normals are retained. Recomputing normals on the source topology caused dark facets on the obliques and was removed after default-view visual verification; vertex positions and triangle connectivity remain unchanged. The oblique material uses reduced specular shine.
- **Reveal abs** explicitly hides the bilateral external/internal obliques, restores the real rectus meshes and fits an anterior abdominal view. Its visible study-view notice identifies the hidden layers. Restore context returns the intact model.
- Direct **Hide muscle**, Undo, a named hidden-structure list and per-item Show enable reversible dissection. Hide clears transparent-context picking and preserves the current camera. Delete/Backspace hides the selected muscle and Ctrl/Cmd+Z undoes visibility changes while focus is within the atlas, excluding form fields.
- Abdominal origin/insertion, location and structural relationships are linked to Texas Tech anatomy teaching tables and NCBI anatomical references. The schema continues to support all muscles, but comprehensive reviewed attachment metadata is **not present** for the full atlas. Missing fields are explicitly unannotated. An investigated bulk reference snapshot contained contradictory anatomical claims and was rejected rather than published.
- New tests: `scripts/e2e-muscle-dissection.mjs` covers actual pointer selection of rectus, facts, hide-camera preservation, undo, individual restore, full restore and mobile interaction. It mocks authentication only and loads real assets.
