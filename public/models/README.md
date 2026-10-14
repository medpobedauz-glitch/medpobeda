# Anatomy 3D model assets

These are real BodyParts3D 4.0 derived GLBs, not procedural placeholders.

- `human-body.glb`: skeleton, skin, organs, aorta and venae cavae.
- `muscular.glb`: selectable muscle structures.
- `cardiovascular.glb`: separate arterial and venous structures.
- `nervous.glb`: available brain and nerve structures.
- `*.glb.gz`: compressed equivalents used by the provider.
- `structure-index.json`: stable viewer IDs, file/system/layer/centres, original
  source mesh and FMA concept identifiers, and pinned upstream revision.

The source includes the central canal, but no complete spinal cord mesh.
Do not rename the canal to spinal cord. The latter's study notes are available
separately with an explicit missing-mesh state.

Rebuild with `scripts/build-anatomy-glb.mjs`; see the project README for provider
replacement, browser checks, licensing and medical-content review requirements.
Keep `LICENSE.txt` and the visible page attribution when redistributing.
