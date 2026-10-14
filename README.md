# MedPobeda

Existing multilingual education platform (vanilla JavaScript, Vite, Express).

```sh
npm install
npm run dev:spa  # existing Vite frontend at http://localhost:3000
npm run build
```

The frontend's existing API proxy expects the Express service on port 4000.

## Anatomy 3D implementation

The existing `/{uz|en|ru}/anatomy-3d` route now hosts the interactive atlas. No new
route, site, navigation, authentication, payment or curriculum functionality was
introduced. Changes are confined to the anatomy page, viewer, styles, anatomy
metadata/messages/provider, the three dictionaries' anatomy additions, models,
anatomy build/check scripts and this documentation.

- `src/pages/anatomy-3d.js`: existing shell, collapsible system sidebar, canvas,
  structure panel, multilingual search, saved list, local lessons and MCQs.
- `src/three/anatomy-viewer.js`: lazy Three.js viewer with orbit/touch controls,
  actual mesh picking, system visibility/opacity, isolate, exploded views,
  region presets, context-loss recovery and GPU/resource cleanup.
- `src/data/anatomy-provider.js`: replaceable dataset/file mapping. Each exported
  GLB node carries `structureId`, `sourceId`, and `sourceMeshIds`. The JSON index
  retains original FJ mesh IDs, FMA concept IDs, source names and source revision.
- `src/data/anatomy-content.js`: 23 study entries covering the requested 20
  structures plus aorta, venae cavae and diaphragm. Paired limb meshes resolve
  to shared medical content with localized side labels. Uzbek, English, Russian
  and Latin names are searchable. Exact names rank above incidental source matches.
- `src/data/anatomy-messages.js`: anatomy-only translations merged into the
  existing `src/i18n/{en,uz,ru}.js` dictionaries. The existing site switcher is
  retained. Its language event updates this page immediately; selection and
  visibility survive the switcher's subsequent localized-route reload.

The starting view shows the whole skeleton and organs. Full Body enables every
available system, including opaque skin; remove skin/muscles using checkboxes
or lower opacity to reveal inner anatomy. Presets replace the visible systems;
checkboxes add/remove systems. Reset restores the initial view, opacity, orbit
mode, selection and exploded state. Region presets filter by geometry centre,
so they are study aids rather than precise anatomical dissection boundaries.

Models are loaded only on this page. The base file loads first; muscle, vessel
and nervous files load on demand with progress and shared in-flight requests.
The `.glb.gz` files reduce transfers; browsers without `DecompressionStream`
receive regular GLB. Static hosts should serve `.gz` as raw gzip file bytes
(no additional `Content-Encoding` required). The loader tolerates a host that
already decompresses them. Geometry is merged per selectable structure,
pixel ratio is capped at 2, shadows are omitted, and idle frames skip drawing.
Raw base ~14.6 MiB / gzip ~10.5 MiB; optional systems are separately fetched.

Saved IDs are stored on this device in `medpobeda-anatomy-saved`; no account sync
is claimed. `medpobeda-anatomy-view` in session storage preserves study state.
Related lessons and function-identification MCQs are local anatomy study
activities backed by these metadata entries. They do not invent links to
unpublished platform lessons or modify the existing question bank. Reference
reading links open the appropriate OpenStax Anatomy & Physiology 2e chapter.

## Data attribution and limits

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution
4.0 International.

- Official license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- License terms: https://creativecommons.org/licenses/by/4.0/
- Official downloads: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Geometry packaging: https://github.com/ashemag/human-atlas (the exact revision
  is recorded in `public/models/structure-index.json` and the builder).

Verified against the official archive license on 2026-09-08. See
`public/models/LICENSE.txt`. Adaptations: grouping, corrected classifications,
separate mandible/aorta/vena-cava mapping, retained source identifiers, GLB
conversion and gzip compression. No commercial anatomy-platform assets or UI
were copied.

This is an adult male reference dataset, not a complete clinical atlas. All
medical notes and translations are explicitly marked for anatomist review.
Uncurated structures retain their original source terminology and show a
localized missing-content notice rather than an invented translation.

**Spinal cord limitation:** the source manifest and official IS-A name table
provide FJ1737 / FMA78497, *central canal of spinal cord*, not a complete spinal
cord surface. This mesh is correctly named `central_canal`. The spinal-cord
study entry is searchable and its lesson/MCQ work, but its panel explicitly
reports that the full mesh is unavailable and disables isolation. Female
reproductive anatomy and full system completeness are not claimed. The public
page includes a visible attribution link and educational disclaimer.

## Rebuilding and verification

Prepare `atlas.json` from the pinned human-atlas revision in a local source
folder, then run (network needed only for missing source chunks):

```sh
node scripts/build-anatomy-glb.mjs --src /path/to/anatomy-source
node scripts/verify-anatomy.mjs
npm run build
```

The builder uses valid GLB buffer/accessor declarations, signed 16-bit normals,
and compact indices. `verify-anatomy.mjs` parses the actual GLBs with Three.js,
checks mesh-to-index mappings, all translations, required study coverage,
source identifiers, gzip round trips, and the explicit missing-cord exception.

Browser regression script: `scripts/e2e-anatomy.mjs`. It requires Playwright in
a test environment and a local Chrome executable (paths configurable through
`PLAYWRIGHT_MODULE` and `CHROME_PATH`). Run against the Vite dev server:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/e2e-anatomy.mjs
```

The script tests desktop and 390px mobile layouts, direct raycast clicks,
rotation/pan/zoom, search across languages, systems, opacity, isolate, explode,
reset, save, lessons/MCQs, full screen and the existing header language switcher.
`?debug=1` exposes the viewer on the anatomy root **in Vite development only**
for these checks; regular production pages expose no viewer test hook.

Verification completed: `npm run build`, asset/translation validation, desktop
and mobile browser workflows, and `scripts/e2e-anatomy-resilience.mjs` (immediate
localization, download failure/retry, navigation cleanup, missing base model,
and unsupported WebGL). Browser checks ran in Chrome with software WebGL;
performance on physical mobile GPUs still needs device testing. The build
retains existing Vite warnings about environment configuration, a shared modal
import, and the size of the lazy Three.js chunk.

### Viewer interaction improvements

The exploded view now packs visible structures by their real front-plane bounds
with gaps, preserving scale and source IDs. It repacks on system/visibility or
aspect changes and fits the inventory into the camera. Front/back/left/right
buttons and Fit Visible provide quick orientation. Hide Selected removes one
structure; Restore Context returns to the systems/region before isolation or
restores hidden structures. Hidden IDs persist with the existing session state.
The visible-structure count and new controls use all three existing languages.

On mobile, selecting anatomy scrolls the viewer into view and reduces its height
so the selected structure remains above the information sheet. Hover picking is
throttled, and close inspection can zoom further into small structures.

Checks: `node scripts/verify-anatomy-layout.mjs` validates non-overlapping,
deterministic layout slots for all 1,599 structures at three aspect ratios.
`scripts/e2e-anatomy-improvements.mjs` checks explode/assemble, hide/restore,
isolation context, viewing angles and mobile framing. The original desktop/mobile
regression suite and production build also pass.

### Skull inspection

The existing viewer now has a Skull preset with 46 selectable source parts:
17 skull bone primitives, the mandible, and 28 individual tooth primitives.
`src/data/skull-anatomy.js` validates GLTFLoader primitive associations against
the original source IDs before assigning names. Selection uses an outline
overlay; the source geometry, PBR materials and asset file remain unchanged.
The asset contains no embedded textures, so a textured specimen appearance
requires an actual licensed textured model.

The existing information pane opens as a compact name/Latin-name card with
INFO, Focus, Isolate, Show All and Reset Camera controls. Details open on request.
Skull search supports English, Uzbek, Russian and source IDs. Paired bones and
teeth retain their source side/order. No separate suture, orbit, lacrimal or
inferior nasal concha meshes are invented. Frontal and maxilla study notes link
to OpenStax; existing mandible content remains available. Missing educational
fields are explicitly marked unavailable.

No new application dependencies, backend changes or configuration are required.
Run `node scripts/verify-skull.mjs` for source mapping checks and
`PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/e2e-skull.mjs`
against the local dev server for desktop/mobile picking, details, localization,
isolation and exact material/vertex preservation checks. Browser verification
uses software WebGL; physical touch-device performance remains unverified.

Skull appearance update: untextured skeletal materials now use a warm ivory
finish (lighter enamel for teeth) and the Skull preset adds a camera-mounted
flash light. Source files and geometry remain unchanged; authored textures,
when present, are retained. This adjusts runtime material appearance and does
not add photographic surface textures.

### Anatomy dashboard topic boundaries

Anatomy 3D navigation now enters the authenticated `/anatomy` dashboard.
Login preserves the requested destination. Thirteen curriculum sections
include fifteen alimentary topics. `src/data/anatomy-topic.js` resolves the
same structure IDs for the preview renderer and the existing viewer. Skull,
trunk, upper/lower limb and individual organ cards stay within their topic,
including after Reset; unrelated system controls are hidden in topic views.

Previews use actual source meshes, inherited GLB structure IDs, 512px renders,
a shared lazily imported renderer, and shared in-flight model/index requests.
No new anatomy geometry or dependencies were added. Unsegmented intestinal
proxies, unavailable peripheral nerve regions and dedicated joint models are
marked Coming Soon rather than opening unrelated models.

`scripts/e2e-anatomy-dashboard.mjs` checks the login redirect with mocked auth
responses, section counts, real bone previews, exact skull/trunk/heart scopes,
reset boundaries and desktop/mobile layout. Real backend authentication is
unchanged; these checks do not validate production credentials.

### Rotating anatomy previews

Dashboard previews orbit real geometry through 360 degrees using one shared
renderer. Only visible cards animate, at a capped frame rate; reduced-motion
preferences and a Pause/Resume control are supported. Preview-only mesh batches
reduce draw calls without changing the interactive viewer's selection meshes.
The shared material palette uses muted red muscles, red arteries, blue veins
and pale nerves. These are educational display colours, not photographic
textures. Head/neck vessel previews include translucent source musculature.
Joint cards have explicitly labelled skeletal reference previews; dedicated
joint geometry and joint-motion simulation remain unavailable.
Run `scripts/e2e-anatomy-motion.mjs` with the existing Playwright configuration
to check real orbit, pause and reference/muscle/vessel previews.

### Immersive topic viewer

Topic cards open a viewport-filling anatomy workspace with the site header,
footer and introductory topic copy removed. Back returns to the dashboard.
Search, Reset, Help and Exploded View remain; zoom/rotation use existing mouse
and touch gestures. Selection opens the information panel as a side overlay
or mobile bottom sheet. Source attribution remains in a compact disclosure.
Verified the mobile canvas fills 390×844, zoom buttons are hidden, explosion
works, and dashboard navigation restores the site shell; production build passes.

Selection panels now reserve canvas space instead of overlaying anatomy.
All topics initially show a compact name/Info/Focus/Isolate card. On mobile,
expanded information scrolls in a separate lower pane while the viewer fits
visible anatomy above it. Desktop uses a separate right pane. The selection
layout browser test covers skull and heart, expand/collapse and clear.

### Homepage 3D journey

The homepage now opens with a four-chapter scroll story: a large stethoscope,
medical student, doctor in scrubs, and a waving young doctor. All objects are
original stylized Three.js geometry. One stethoscope remains in the scene as
characters move beneath it; scrolling backwards reverses the transitions.
Chapter buttons and a skip link provide direct navigation. Existing homepage
information follows the story, with Uzbek, English and Russian story copy.
The viewer is lazy-loaded, renders on scroll/resize rather than continuously,
and releases geometry, materials and listeners on route changes. Reduced-motion
mode uses discrete poses; unavailable WebGL displays all story text and links.
`node scripts/verify-home-story.mjs` checks scene stages, transforms, reverse
scrolling and cleanup without a GPU; this is not visual browser validation.

The student chapter now uses original AI-generated artwork depicting a fictional
Uzbek adult medical student, rendered as a photographic plane with a separate
silhouette alpha map. This character is a 2.5D image layer, not a rigged human
mesh. The stethoscope remains 3D, with a separate collar fit for this portrait.
The surgeon and final waving character retain their existing stylized geometry.
Portrait textures load asynchronously, fall back to the geometric student on
failure, and are disposed with the scene. Assets live in `public/images/home/`.

Current homepage portraits: chapters 2–4 now all use matching photographic
AI-generated portraits (`student-with-stethoscope.png`,
`surgeon-with-stethoscope.png`, `doctor-waving.png`). Each portrait includes its
own naturally worn stethoscope; the independent opening instrument is hidden
before portraits appear. Procedural people and the previous neck overlay are
removed. These are photographic planes, not rigged human meshes. The generated
portrait assets were visually inspected; browser layout remains unverified.
The regression check now requires a loaded photographic portrait in every
character chapter and no second stethoscope overlay.

The current opening uses reference-inspired daylight desk artwork with a tablet,
medical books and Uzbekistan flag. A separate masked stethoscope moves from the
desktop toward the first portrait, then hands off to the instrument already worn
in that portrait. This is a photographic scroll composition, not a rigged 3D
instrument. The story is 250svh (approximately half a viewport per chapter).
Hindi is available in the language selector, homepage narrative and navigation;
other Hindi content currently falls back to English. Existing Russian support
and backend content languages remain available and unchanged.

Language correction: Hindi was removed from the selector, homepage copy and
supported locales at the user's request; Uzbek, English and Russian remain.
Student/doctor chapters include a small freestanding Uzbekistan flag beside the
portrait. Its vector artwork has the crescent, twelve stars, and national stripe
colours; the opening retains its existing desk flag.

### Whole-body muscular atlas

The existing Three.js atlas now includes whole-body and regional muscle cards,
side and depth filters, individual visibility controls, transparent context,
and optional geometry-based shadows/occlusion. It retains real segmented source
geometry and marks asset/annotation gaps explicitly. See
[architecture, asset contract and verification](docs/muscular-atlas.md) and the
[generated coverage report](docs/muscular-coverage.json). Open
`/en/anatomy-3d?topic=muscles-all` after signing in. This source dataset does not
contain all requested muscles, fiber textures or reviewed clinical annotations.
