(() => {
 'use strict';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const typeNames={business:'Negocios',professional:'Profesionales',service:'Servicios',shop:'Tiendas'};
 function filterEntries(entries,{q='',type='',province=''}={}){return entries.filter(e=>(!type||e.type===type)&&(!province||e.province===province)&&(!q||normalize([e.name,e.category,e.municipality,e.province,e.description,...(e.services||[])].join(' ')).includes(normalize(q))));}
 function create(ctx){
  let entries=[],filters={q:'',type:'',province:''},lastRows=[],epoch=0;
  const esc=escape,user=()=>ctx.getProfile?.(),enabled=()=>window.CC_CAPABILITIES?.connectionDirectory===true;
  const rpc=(name,value={},publicRead=false)=>publicRead?ctx.request('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(value)}):ctx.db('rpc/'+name,{method:'POST',body:JSON.stringify(value)});
  const back='<button type="button" class="app-back" data-account-page="explore">‹ Explorar</button>';
  const status=s=>({pending:'Enviada',contacted:'En conversación',accepted:'Aceptada',declined:'No disponible',withdrawn:'Retirada'}[s]||'Enviada');
  function cards(rows){
   return rows.map(e=>'<article class="connect-row"><button type="button" class="connect-open" data-explore-id="'+esc(e.id)+'"><span class="connect-avatar connect-tone-'+esc(Object.hasOwn(typeNames,e.type)?e.type:'business')+'" aria-hidden="true">'+esc(e.name.split(/\s+/).slice(0,2).map(w=>w[0]).join(''))+'</span><span class="connect-row-content"><span class="connect-kicker">'+esc(e.category)+'</span><strong>'+esc(e.name)+'</strong><span>'+esc(e.municipality+', '+e.province)+'</span><small>'+esc((e.services||[]).slice(0,2).join(' · '))+'</small></span><span class="connect-chevron" aria-hidden="true">›</span></button></article>').join('');
  }
  async function renderHome(){
   if(!enabled())return '<section class="connect-hero"><span class="connect-kicker">CONECTACUBA</span><h1>Una conexión<br>abre posibilidades.</h1><p>La exploración de negocios y profesionales se habilitará al conectar el directorio público.</p><button class="btn btn-primary" data-home="#vacantes">Explorar empleos</button></section>';
   const seq=++epoch;const result=await rpc('cc_explore_directory',{},true);if(seq!==epoch)throw Object.assign(new Error('La vista cambió'),{code:'STALE_REQUEST'});entries=result||[];
   return '<section class="connect-hero"><div><span class="connect-kicker">PERSONAS · NEGOCIOS · OPORTUNIDADES</span><h1>¿Qué necesitas<br><em>conectar hoy?</em></h1><p>Descubre talento, encuentra servicios y conoce negocios en Cuba.</p></div><span class="connect-orbit" aria-hidden="true">↗</span></section><form class="connect-search" data-form="explore-search"><label class="sr-only" for="connect-query">Buscar personas, negocios o servicios</label><input id="connect-query" name="q" type="search" maxlength="120" value="'+esc(filters.q)+'" placeholder="Un servicio, una profesión, un negocio…"><button type="submit" aria-label="Buscar conexiones">⌕</button></form><div class="connect-categories" role="group" aria-label="Qué quieres descubrir">'+[['','Todo'],...Object.entries(typeNames)].map(([value,title])=>'<button data-explore-type="'+value+'" type="button" aria-pressed="'+(filters.type===value)+'">'+title+'</button>').join('')+'</div><div class="connect-section-head"><div><span class="connect-kicker">EXPLORAR POR INTERÉS</span><h2>Personas y lugares para conectar</h2></div><label class="connect-location"><span class="sr-only">Filtrar por provincia</span><select id="connect-province"><option value="">Toda Cuba</option>'+[...new Set(entries.map(e=>e.province))].sort().map(p=>'<option'+(filters.province===p?' selected':'')+'>'+esc(p)+'</option>').join('')+'</select></label></div><p class="connect-demo-note">Perfiles y servicios ficticios para probar esta nueva sección.</p><div id="connect-results" class="connect-list">'+renderResults()+'</div><section class="connect-employment"><div><span class="connect-kicker">TU PRÓXIMO PASO</span><h2>¿Buscas empleo o talento?</h2><p>Las ofertas y postulaciones siguen en tu espacio de Empleo.</p></div><button class="btn btn-primary" '+(user()?.account_type==='business'?'data-account-page="jobs"':'data-home="#vacantes"')+'>Ir a Empleo ↗</button></section>';
  }
  function renderResults(){const rows=filterEntries(entries,filters);return rows.length?cards(rows):'<div class="connect-empty"><h3>No encontramos conexiones con esos filtros.</h3><p>Prueba otra palabra o provincia.</p><button class="text-btn" data-explore-clear>Quitar filtros</button></div>';}
  function updateResults(){const node=ctx.document.getElementById('connect-results');if(node)node.innerHTML=renderResults();}
  async function renderProfile(id){
   if(!enabled())return back+'<p>El directorio aún no está conectado.</p>';
   const entry=(await rpc('cc_explore_directory',{entry_id:id},true))?.[0];if(!entry)return back+'<section class="soft-card"><h1>Este perfil no está disponible.</h1></section>';
   const own=entry.owner_id===user()?.id;
   const wa=entry.public_whatsapp?window.CC_WORKFLOW.whatsapp(entry.public_whatsapp,'Hola, me interesa '+entry.name+' en ConectaCuba.'):'';
   return back+'<section class="connect-profile"><div class="connect-profile-cover"><span>'+esc(entry.category)+'</span><span>Perfil de muestra</span></div><div class="connect-profile-head"><span class="connect-avatar large connect-tone-'+esc(entry.type)+'" aria-hidden="true">'+esc(entry.name.split(/\s+/).slice(0,2).map(w=>w[0]).join(''))+'</span><span class="connect-kicker">'+esc(typeNames[entry.type]||'Conexión')+'</span><h1>'+esc(entry.name)+'</h1><p>'+esc(entry.municipality+', '+entry.province)+'</p></div><div class="connect-profile-body"><h2>Sobre este perfil</h2><p>'+esc(entry.description)+'</p><h2>Qué puedes encontrar</h2><ul class="connect-service-list">'+(entry.services||[]).map(s=>'<li><span>'+esc(s)+'</span><span>A convenir</span></li>').join('')+'</ul><p class="small-note">Ubicación pública aproximada por municipio. No se publican direcciones privadas.</p><div class="connect-profile-actions">'+(own?'<button class="btn btn-primary" data-account-page="'+(user()?.account_type==='business'?'business':'profile')+'">Gestionar mi cuenta</button>':'<button class="btn btn-primary" data-connect-request="'+esc(entry.id)+'">Solicitar información o servicio</button>')+(wa?'<a class="btn btn-outline" href="'+esc(wa)+'" target="_blank" rel="noopener noreferrer">WhatsApp público</a>':'')+'</div><p class="small-note">Una solicitud no es una compra ni garantiza disponibilidad. Esta beta no procesa pagos.</p></div></section>';
  }
  async function myPhone(){
   if(user()?.account_type==='business')return (await rpc('cc_business_contact',{business_id:user().id,application_id:null})).whatsapp||'';
   return (await ctx.db('resumes?user_id=eq.'+user().id+'&select=cv_contact&limit=1'))?.[0]?.cv_contact||'';
  }
  async function requestForm(id){
   if(!user()){ctx.requireLogin({page:'explore-profile',entryId:id});return;}
   const entry=(await rpc('cc_explore_directory',{entry_id:id},true))?.[0];if(!entry)throw new Error('Perfil no disponible.');
   const number=window.CC_WORKFLOW.phone(await myPhone())||'';
   ctx.modal('Conectar con '+entry.name,'<form class="form-grid" data-form="connect-request" data-entry-id="'+esc(id)+'"><p class="span2">Cuenta qué necesitas. '+esc(entry.name)+' podrá responder desde su actividad en esta prueba.</p><label class="field span2">Tu solicitud<textarea name="body" minlength="15" maxlength="2000" rows="5" required placeholder="Qué servicio necesitas, en qué municipio y otros detalles útiles…"></textarea></label><div class="workflow-contact-confirm span2"><span>Contacto que compartirás</span><strong>'+esc(number||'Completa tu WhatsApp en tu perfil')+'</strong>'+(!number?'<button type="button" class="text-btn" data-account-page="'+(user()?.account_type==='business'?'business':'profile')+'">Completar datos y contacto</button>':'')+'</div><input name="contact" type="hidden" value="'+esc(number)+'"><label class="check-field span2"><input type="checkbox" name="consent" required><span>Autorizo compartir mi nombre y este contacto con este perfil para responder a mi solicitud.</span></label><div class="notice span2" role="status"></div><div class="form-actions span2"><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button><button type="submit" class="btn btn-primary">Enviar solicitud de prueba</button></div></form>');
  }
  async function getNotifications(){return enabled()&&user()?await rpc('cc_connection_requests',{}):[];}
  async function renderActivity(providedRows=null){
   if(!enabled())return '';
   const rows=providedRows||await getNotifications();lastRows=rows;
   return '<section class="connect-activity"><div class="connect-section-head"><div><span class="connect-kicker">MÁS ALLÁ DEL EMPLEO</span><h2>Solicitudes y conexiones</h2></div></div>'+(rows.length?'<div class="connect-list">'+rows.map(r=>'<button type="button" class="connect-request-row" data-connection-request="'+esc(r.id)+'"><span class="connect-request-symbol" aria-hidden="true">'+(r.provider_id===user().id?'↙':'↗')+'</span><span><strong>'+esc(r.entry_name)+'</strong><small>'+(r.provider_id===user().id?'Recibida de '+esc(r.requester_name):'Solicitud enviada')+'</small></span><span class="outcome">'+esc(status(r.status))+'</span></button>').join('')+'</div>':'<p class="connect-empty">Aquí aparecerán tus solicitudes de servicios y contactos.</p>')+'</section>';
  }
  async function renderRequest(id){
   const r=await rpc('cc_connection_requests',{request_id:id});if(!r)return '<button class="app-back" data-account-page="notifications">‹ Actividad</button><p>Solicitud no disponible.</p>';
   ctx.markSeen?.(r);
   const incoming=r.provider_id===user().id,closed=['withdrawn','declined'].includes(r.status);
   const thread=(r.thread||[]).length?'<ol class="workflow-message-list">'+r.thread.map(m=>'<li class="workflow-message '+(m.sender_id===user().id?'mine':'theirs')+'"><span class="workflow-message-author">'+(m.sender_id===user().id?'Tú':incoming?'Solicitante':'Perfil')+'</span><p>'+esc(m.body)+'</p><time>'+esc(ctx.date(m.created_at))+'</time></li>').join('')+'</ol>':'';
   const reply=closed?'':'<form data-form="connect-message" data-id="'+esc(r.id)+'" class="workflow-message-form"><label class="sr-only" for="connect-message-input">Responder a esta conexión</label><textarea id="connect-message-input" name="body" required minlength="1" maxlength="2000" rows="3" placeholder="Responder a esta solicitud…"></textarea><div class="notice" role="status"></div><button type="submit" class="btn btn-primary">Enviar mensaje</button></form>';
   const phone=window.CC_WORKFLOW.phone(r.contact),wa=phone?window.CC_WORKFLOW.whatsapp(phone,'Hola, te contacto por tu solicitud en ConectaCuba sobre '+r.entry_name+'.'):'';
   return '<button class="app-back" data-account-page="notifications">‹ Actividad</button><section class="connect-request-detail"><span class="connect-kicker">'+(incoming?'SOLICITUD RECIBIDA':'TU SOLICITUD')+'</span><h1>'+esc(r.entry_name)+'</h1><span class="outcome">'+esc(status(r.status))+'</span><p class="preserve-lines">'+esc(r.body||'La solicitud fue retirada.')+'</p><p class="small-note">Actualizada el '+esc(ctx.date(r.updated_at))+'</p>'+(incoming&&!closed?'<p><strong>'+esc(r.requester_name)+'</strong></p>'+(wa?'<a class="btn btn-outline" href="'+esc(wa)+'" target="_blank" rel="noopener noreferrer">Responder por WhatsApp</a>':'')+'<form class="form-grid" data-form="connect-response" data-id="'+esc(r.id)+'"><label class="field span2">Respuesta<textarea name="response" minlength="5" maxlength="1000" rows="4" required>'+esc(r.response||'')+'</textarea></label><label class="field span2">Estado<select name="status"><option value="contacted">En conversación</option><option value="accepted"'+(r.status==='accepted'?' selected':'')+'>Puedo atender la solicitud</option><option value="declined">No disponible</option></select></label><div class="notice span2" role="status"></div><button class="btn btn-primary" type="submit">Guardar respuesta en la app</button></form>':'')+((r.response&&!(r.thread||[]).length)?'<section class="connect-response"><h2>Respuesta del perfil</h2><p class="preserve-lines">'+esc(r.response)+'</p></section>':'')+thread+reply+(!incoming&&!closed?'<button class="text-destructive" data-connect-withdraw="'+esc(r.id)+'">Retirar solicitud</button>':'')+'</section>';
  }
  async function handleSubmit(form,d){
   if(form.dataset.form==='explore-search'){filters.q=d.q.trim().slice(0,120);updateResults();return true;}
   if(form.dataset.form==='connect-request'){
    if(d.consent!=='on')throw new Error('Autoriza compartir tu contacto para esta solicitud.');
    if(d.body.trim().length<15)throw new Error('Describe lo que necesitas con al menos 15 caracteres.');
    const number=window.CC_WORKFLOW.phone(d.contact);if(!number)throw new Error('Completa tu WhatsApp desde tu perfil antes de enviar.');
    const r=await rpc('cc_create_connection',{entry_id:form.dataset.entryId,body:d.body.trim(),contact:number,consent:true});
    ctx.markSeen?.(r);form.dataset.dirty='false';window.CC_DRAFTS?.clear(form);ctx.closeModal();await ctx.goRequest(r.id);ctx.toast(r.alreadyExists?'Ya tenías una solicitud abierta; aquí puedes continuarla.':'Solicitud guardada en esta prueba.');return true;
   }
   if(form.dataset.form==='connect-message'){
    const body=d.body.trim();if(!body||body.length>2000)throw new Error('Escribe un mensaje de 1 a 2000 caracteres.');
    if(!form.dataset.messageKey||form.dataset.messageBody!==body){form.dataset.messageKey=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);form.dataset.messageBody=body;}
    const r=await rpc('cc_connection_message',{request_id:form.dataset.id,body,client_key:form.dataset.messageKey});
    ctx.markSeen?.(r);form.dataset.dirty='false';window.CC_DRAFTS?.clear(form);await ctx.goRequest(form.dataset.id);ctx.toast('Mensaje guardado en esta conexión.');return true;
   }
   if(form.dataset.form==='connect-response'){
    if(d.response.trim().length<5)throw new Error('Escribe una respuesta para la persona.');
    await rpc('cc_update_connection',{request_id:form.dataset.id,status:d.status,response:d.response.trim()});
    form.dataset.dirty='false';window.CC_DRAFTS?.clear(form);await ctx.goRequest(form.dataset.id);ctx.toast('Respuesta guardada.');return true;
   }
   return false;
  }
  async function handleClick(event){
   const b=event.target.closest('button,a');if(!b)return false;
   if(b.dataset.exploreId){await ctx.goExplore(b.dataset.exploreId);return true;}
   if(b.hasAttribute('data-explore-type')){filters.type=Object.hasOwn(typeNames,b.dataset.exploreType)?b.dataset.exploreType:'';ctx.document.querySelectorAll('[data-explore-type]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.exploreType===filters.type)));updateResults();return true;}
   if(b.hasAttribute('data-explore-clear')){filters={q:'',type:'',province:''};await ctx.goExplore();return true;}
   if(b.dataset.connectRequest){await requestForm(b.dataset.connectRequest);return true;}
   if(b.dataset.connectionRequest){await ctx.goRequest(b.dataset.connectionRequest);return true;}
   if(b.dataset.connectWithdraw){if(ctx.confirm('¿Retirar esta solicitud? Se dejará de compartir tu contacto.')){await rpc('cc_update_connection',{request_id:b.dataset.connectWithdraw,status:'withdrawn'});await ctx.goRequest(b.dataset.connectWithdraw);}return true;}
   return false;
  }
  function handleChange(event){if(event.target.id!=='connect-province')return false;filters.province=event.target.value;updateResults();return true;}
  function reset(){epoch++;entries=[];lastRows=[];filters={q:'',type:'',province:''};}
  return {renderHome,renderProfile,renderRequest,renderActivity,getNotifications,handleSubmit,handleClick,handleChange,reset};
 }
 window.CC_CONNECT={filterEntries,create};
})();