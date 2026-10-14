// Display just the illustration areas of the user-supplied reference image.
// No reference captions or sample counts are used: those come from live data.
import { subjectArtHtml } from './subject-art.js';
const groups = [
 ['anatomy','anatomiya'],['farmakologiya','pharmacology'],['biokimyo','biochemistry'],['mikrobiologiya','microbiology'],
 ['patologiya','pathology'],['ichki-kasalliklar','internal-medicine','internal-diseases'],['umumiy-jarrohlik','general-surgery'],['pediatriya','pediatrics'],
 ['akusherlik-va-ginekologiya','obstetrics-and-gynecology'],['gistologiya-va-embriologiya','histology-and-embryology'],['otorinolaringologiya','otorinolaringologiya-lor','ent'],['oftalmologiya','ophthalmology'],
 ['onkologiya','oncology'],['urologiya','urology'],['shoshilinch-tibbiyot','emergency-medicine'],['radiologiya','radiology'],
 ['fiziologiya','physiology'],['nevrologiya','neurology'],['gistologiya','histology'],['embriologiya','embryology'],
];
export function qbankArtHtml(slug) {
 const index=groups.findIndex(names=>names.includes(String(slug).toLowerCase()));
 if(index<0)return subjectArtHtml(slug);
 const row=Math.floor(index/4),col=index%4;
 const x=[19,331,642,953][col],y=[24,280,534,784,1022][row];
 const height=[122,112,106,104,88][row];
 return '<svg class="qcard__photo" viewBox="'+x+' '+y+' 290 '+height+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/images/qbank/subject-reference.png" width="1262" height="1246"/></svg>';
}
