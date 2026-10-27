(() => {
 'use strict';
 const allowed=new Set(['profile','resume','job','business-edit','apply','workflow-business-contact','workflow-person-contact','workflow-next-step','workflow-report']);
 const mounted=new WeakSet(),fields=form=>Array.from(form.elements||[]).filter(el=>el.name&&!el.disabled&&!['password','file','checkbox','radio','submit','button','hidden'].includes(el.type)&&!/(password|token|secret|consent)/i.test(el.name));
 function owner(){try{return JSON.parse(localStorage.getItem('cc_auth_session_v1')||'null')?.user?.id||'';}catch{return '';}}
 function key(form){const id=owner();return id&&allowed.has(form.dataset.form)?'cc_workflow_draft_'+id+'_'+[form.dataset.form,form.dataset.id||'new',form.dataset.section||'',form.dataset.jobId||''].join('_'):'';}
 function values(form){return Object.fromEntries(fields(form).map(el=>[el.name,String(el.value).slice(0,12000)]));}
 function read(form){try{const data=JSON.parse(sessionStorage.getItem(key(form))||'null');if(data&&Date.now()-data.at<7*24*60*60*1000)return data;return null;}catch{return null;}}
 function save(form){const k=key(form);if(!k)return false;try{sessionStorage.setItem(k,JSON.stringify({at:Date.now(),values:values(form)}));return true;}catch{return false;}}
 function clear(form){try{sessionStorage.removeItem(key(form));}catch{}}
 function mount(form){
  if(mounted.has(form)||!key(form))return;mounted.add(form);
  const draft=read(form);if(!draft||!Object.keys(draft.values||{}).some(k=>form.elements.namedItem(k)&&String(form.elements.namedItem(k).value)!==draft.values[k]))return;
  const box=document.createElement('div');box.className='workflow-draft';box.setAttribute('role','status');
  const text=document.createElement('span');text.textContent='Tienes un borrador de este formulario en esta pestaña. ';box.append(text);
  const restore=document.createElement('button');restore.type='button';restore.className='text-btn';restore.textContent='Recuperar borrador';
  restore.onclick=()=>{for(const el of fields(form)){if(Object.hasOwn(draft.values,el.name))el.value=draft.values[el.name];}form.dataset.dirty='true';for(const select of form.querySelectorAll('select[data-other]'))select.dispatchEvent(new Event('change',{bubbles:true}));box.remove();};
  const discard=document.createElement('button');discard.type='button';discard.className='text-btn';discard.textContent='Descartar';discard.onclick=()=>{clear(form);box.remove();};
  box.append(restore,discard);form.prepend(box);
 }
 function scan(){document.querySelectorAll('form[data-form]').forEach(mount);}
 function init(){
  const connection=document.createElement('div');connection.className='workflow-status';connection.setAttribute('role','status');connection.textContent='Sin conexión. Puedes seguir escribiendo; los cambios no se envían automáticamente. Reintenta cuando vuelva la conexión.';
  const syncConnection=()=>{connection.hidden=navigator.onLine!==false;};syncConnection();document.body.prepend(connection);
  window.addEventListener('online',syncConnection);window.addEventListener('offline',syncConnection);
  document.addEventListener('input',e=>{const form=e.target.closest('form[data-form]');if(form&&key(form)){form.dataset.dirty='true';save(form);}},true);
  document.addEventListener('change',e=>{const form=e.target.closest('form[data-form]');if(form&&key(form)){form.dataset.dirty='true';save(form);}},true);
  if(typeof MutationObserver!=='undefined'){const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});}
  scan();
 }
 window.CC_DRAFTS={key,values,save,read,clear,mount,init};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();