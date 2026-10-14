// Concise educational annotations. References are linked in the study panel;
// model surfaces do not imply separately segmented fascia/tendons or attachment markers.
const table='https://anatomy.ttuhscep.edu/gastrointestinal_system/abdo_wall_tables.html';
const relations='https://anatomy.ttuhscep.edu/gastrointestinal_system/abdo_wall_ans.html';
export const ABDOMINAL_ANATOMY={
 'rectus abdominis':{
  latinName:'Musculus rectus abdominis',location:'Anterior abdominal wall, beside the midline.',compartment:'Rectus sheath',
  origin:'Pubis: crest and symphysis.',insertion:'Sternum: xiphoid; ribs 5–7: costal cartilage.',
  action:'Bends the trunk forward.',innervation:'Thoracoabdominal nerves (T7–T11); subcostal nerve (T12).',
  bloodSupply:'Epigastric arteries (superior and inferior), with segmental contributions.',
  relations:'Paired vertical muscles within the rectus sheath. The linea alba separates the two sides. Overlying oblique aponeuroses contribute to the sheath.',
  clinicalRelevance:'The epigastric vessels run within the rectus sheath—an important relationship when studying the abdominal wall.',
  referenceUrl:table,relationsUrl:relations,
 },
 'external oblique':{
  latinName:'Musculus obliquus externus abdominis',location:'Superficial lateral abdominal wall.',compartment:'Anterolateral abdominal wall',
  origin:'Outer surfaces of ribs 5–12.',insertion:'Linea alba; pubis; anterior iliac crest.',
  action:'Bends the trunk forward and sideways.',innervation:'Thoracoabdominal and subcostal nerves.',
  bloodSupply:'Intercostal branches superiorly; deep circumflex iliac branches inferiorly (with variation).',additionalReferences:['https://pubmed.ncbi.nlm.nih.gov/10409811/'],
  relations:'Fibers descend toward the midline. Internal oblique lies underneath. Its broad aponeurosis covers the front of rectus abdominis; this source mesh does not segment the aponeurosis separately.',
  clinicalRelevance:'Its inferior aponeurotic border contributes to the inguinal ligament.',
  referenceUrl:table,relationsUrl:relations,
 },
 'internal oblique':{
  latinName:'Musculus obliquus internus abdominis',location:'Middle muscular layer of the lateral abdominal wall.',compartment:'Anterolateral abdominal wall',
  origin:'Thoracolumbar fascia; iliac crest; lateral inguinal ligament.',insertion:'Inferior ribs; linea alba; pubis through the conjoint tendon.',
  action:'Bends the trunk forward and sideways.',innervation:'Lower thoracic nerves; iliohypogastric and ilioinguinal nerves.',
  bloodSupply:'Deep circumflex iliac and lower posterior intercostal branches, among other abdominal wall vessels.',additionalReferences:['https://pubmed.ncbi.nlm.nih.gov/14578789/'],
  relations:'Between external oblique and transversus abdominis. Anterior fibers generally ascend toward the midline. Its aponeurosis contributes to the rectus sheath.',
  clinicalRelevance:'Abdominal wall nerves pass in the plane between internal oblique and transversus abdominis.',
  referenceUrl:table,relationsUrl:relations,
 },
 'transversus abdominis':{
  latinName:'Musculus transversus abdominis',location:'Deep muscular layer of the lateral abdominal wall.',compartment:'Anterolateral abdominal wall',
  origin:'Lower six ribs; thoracolumbar fascia; iliac crest; lateral inguinal ligament.',insertion:'Linea alba and pubis.',
  innervation:'Lower thoracic nerves; iliohypogastric and ilioinguinal nerves.',
  action:'Compresses the abdominal contents.',bloodSupply:'Segmental abdominal-wall vessels, with inferior epigastric branches supplying its medial portion.',additionalReferences:['https://www.ncbi.nlm.nih.gov/books/NBK551649/','https://pubmed.ncbi.nlm.nih.gov/9047190/','https://www.ncbi.nlm.nih.gov/books/NBK525975/'],
  relations:'Deep to internal oblique; transversalis fascia lies on its inner surface. Its aponeurosis contributes to the rectus sheath.',
  clinicalRelevance:'The adjacent neurovascular plane is useful for understanding abdominal wall innervation.',
  referenceUrl:table,relationsUrl:relations,
 },
 'quadratus lumborum':{
  latinName:'Musculus quadratus lumborum',location:'Posterior abdominal wall, lateral to the lumbar vertebral column.',compartment:'Posterior abdominal wall',
  origin:'Inner iliac crest and iliolumbar ligament.',insertion:'Rib 12 and transverse processes of L1–L4.',
  action:'Side-bends and stabilizes the lumbar spine; assists extension and fixation of rib 12.',
  innervation:'Anterior rami of T12–L4.',bloodSupply:'Lumbar arteries and the lumbar branch of the iliolumbar artery.',
  relations:'Connects the pelvis, lumbar spine and lowest rib. The kidneys lie anterior to this posterior-wall muscle.',
  clinicalRelevance:'An anatomical landmark for posterior abdominal wall nerves and quadratus lumborum regional blocks.',
  referenceUrl:'https://www.ncbi.nlm.nih.gov/books/NBK535407/',
  relationsUrl:'https://www.ncbi.nlm.nih.gov/books/NBK557605/',
 },
};
export function abdominalAnnotation(name){const key=Object.keys(ABDOMINAL_ANATOMY).find(k=>name.toLowerCase().includes(k));return key?ABDOMINAL_ANATOMY[key]:{};}
