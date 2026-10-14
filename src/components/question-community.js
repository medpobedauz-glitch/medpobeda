import {t} from '../i18n/index.js';

export async function submitCommunityAnswer(question,selectedKeys){
 const me=await fetch('/api/auth/me',{credentials:'same-origin',signal:AbortSignal.timeout(15000)});
 if(!me.ok)throw Error('Sign in required');
 const {csrfToken}=await me.json();
 const response=await fetch('/api/auth/questions/'+encodeURIComponent(question.question_id)+'/answer',{
  method:'POST',credentials:'same-origin',signal:AbortSignal.timeout(15000),
  headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},
  body:JSON.stringify({selected_keys:selectedKeys,content_revision:question.content_revision}),
 });
 if(!response.ok)throw Error('Could not load response statistics');
 return response.json();
}

// The host belongs to this question render. A slow response cannot update the
// next question or an exited practice session.
export async function showCommunityAnswer(body,question,selectedKeys){
 const host=body.querySelector('.pq__community');
 if(!host)return;
 host.hidden=false;host.textContent=t('learnpage.community.loading');
 try{
  const stats=await submitCommunityAnswer(question,selectedKeys);
  if(!host.isConnected)return;
  for(const option of question.options){
   const badge=[...body.querySelectorAll('.pq__percentage')].find(b=>b.dataset.option===option.key);
   const value=stats.options.find(o=>o.key===option.key);
   if(!badge||!value)continue;
   const percent=Math.max(0,Math.min(100,Math.round(value.percentage)));
   badge.hidden=false;badge.textContent=percent+'%';badge.style.setProperty('--percentage',percent+'%');
   badge.classList.toggle('pq__percentage--correct',Boolean(option.is_correct));
   const description=t('learnpage.community.option',{percent:String(percent),count:String(value.count),total:String(stats.total_learners)});
   badge.setAttribute('aria-label',description);badge.title=description;
  }
  host.replaceChildren();
  const summary=document.createElement('p');summary.className='pq__community-summary';
  summary.textContent=t('learnpage.community.summary',{total:String(stats.total_learners),correct:String(stats.correct_percent),incorrect:String(stats.incorrect_percent)});
  const note=document.createElement('p');note.className='pq__community-note';
  note.textContent=t('learnpage.community.first')+(question.question_type==='multiple_correct'?' '+t('learnpage.community.multiple'):'');
  host.append(summary,note);
 }catch{
  if(!host.isConnected)return;
  host.textContent=t('learnpage.community.unavailable')+' ';
  const retry=document.createElement('button');retry.type='button';retry.className='btn btn--outline';retry.textContent=t('learnpage.community.retry');
  retry.addEventListener('click',()=>showCommunityAnswer(body,question,selectedKeys));host.append(retry);
 }
}
