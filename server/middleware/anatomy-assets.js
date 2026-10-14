import express from 'express';
// Use the stable source assets, not the output directory emptied during builds.
// A missing binary must return 404, never the SPA HTML with status 200.
export function anatomyAssets(directory){
 const router=express.Router();
 router.use(express.static(directory,{index:false}));
 router.use((_req,res)=>res.status(404).json({error:'Anatomy asset not found.'}));
 return router;
}
