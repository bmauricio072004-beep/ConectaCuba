(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function phone(value){
    let raw=String(value||'').trim();
    if(!raw||!/^(\+|00)?[\d\s().-]+$/.test(raw))return '';
    let digits=raw.replace(/\D/g,'');if(raw.startsWith('00'))digits=digits.slice(2);
    if(digits.length===8&&!raw.startsWith('+')&&!raw.startsWith('00'))digits='53'+digits;
    return /^[1-9]\d{7,14}$/.test(digits)?'+'+digits:'';
  }
  function whatsapp(value,message=''){const p=phone(value);return p?'https://wa.me/'+p.slice(1)+(message?'?text='+encodeURIComponent(String(message).slice(0,1200)):''):'';}
  const label=s=>({submitted:'Enviada',reviewing:'En revisión',contacted:'Invitación a entrevista',accepted:'Seleccionada',not_selected:'No seleccionada',withdrawn:'Retirada'}[s]||'Enviada');
  function meetingDate(value){if(!value)return '';const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Havana'}).format(d)+' · hora de Cuba':'';}
  function create(ctx){
    let pendingJobForm=null,pendingJobOwner=null,noticeRows=[],noticeOwner=null,noticeAt=0,noticeEpoch=0;
    const capable=()=>window.CC_CAPABILITIES?.employmentWorkflow===true;
    const user=()=>ctx.getProfile?.();
    const key=(type,id='')=>'cc_workflow_'+type+'_'+(user()?.id||'guest')+'_'+id;
    const storage=()=>window.sessionStorage;
    function read(type,id){try{return JSON.parse(storage().getItem(key(type,id))||'null');}catch{return null;}}
    function write(type,id,value){try{storage().setItem(key(type,id),JSON.stringify(value));return true;}catch{return false;}}
    const back='<button type="button" class="app-back" data-back-page="menu">‹ Cuenta</button>';
    const end=label=>'<div class="notice span2" role="status"></div><div class="form-actions span2"><button type="submit" class="btn btn-primary">'+label+'</button></div></form>';
    const field=(title,name,value='',attrs='')=>'<label class="field span2">'+title+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
    const area=(title,name,value='',attrs='')=>'<label class="field span2">'+title+'<textarea name="'+name+'" '+attrs+'>'+esc(value)+'</textarea></label>';
    const rpc=(name,value)=>ctx.db('rpc/'+name,{method:'POST',body:JSON.stringify(value)});
    function settingsLinks(){return '<section class="settings-group"><h3 class="settings-group-label">Contacto y ayuda</h3><div class="account-group"><button type="button" class="account-row" data-account-page="contacts"><span class="account-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><span><strong>Mi contacto laboral</strong><small>WhatsApp, teléfono y privacidad</small></span><span aria-hidden="true">›</span></button><button type="button" class="account-row" data-account-page="notifications"><span class="account-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><span><strong>Novedades</strong><small>Actualizaciones de tus postulaciones</small></span><span aria-hidden="true">›</span></button><button type="button" class="account-row" data-account-page="help"><span class="account-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><span><strong>Ayuda y privacidad</strong><small>Cómo funciona, precauciones y borradores</small></span><span aria-hidden="true">›</span></button></div></section>';}
    async function renderContacts(){
      if(user()?.account_type==='business'){
        if(!capable())return back+'<section class="soft-card"><h2>Contacto laboral del negocio</h2><p>Actualiza los datos de contacto desde Mi negocio. La opción para compartirlos solo al invitar se habilitará cuando el backend esté preparado.</p><button class="btn btn-primary" data-account-page="business">Ir a Mi negocio</button></section>';
        const b=await rpc('cc_business_contact',{business_id:user().id,application_id:null});
        return back+'<section class="soft-card"><h1>Contacto laboral del negocio</h1><p>El correo de acceso no se publica como contacto laboral. Elige quién puede ver tu WhatsApp.</p><form class="form-grid" data-form="workflow-business-contact">'+field('WhatsApp laboral *','whatsapp',b.whatsapp,'type="tel" inputmode="tel" autocomplete="tel" required maxlength="24" placeholder="+53 5XXX XXXX"')+field('Teléfono alternativo (opcional)','phone',b.phone,'type="tel" inputmode="tel" maxlength="24"')+field('Persona responsable *','contact_person',b.contact_person,'required minlength="2" maxlength="100"')+field('Horario de contacto','contact_hours',b.contact_hours,'maxlength="150" placeholder="Ej.: lunes a viernes, de 9:00 a 17:00"')+'<label class="field span2">Visibilidad<select name="visibility"><option value="invited"'+(b.visibility!=='public'?' selected':'')+'>Solo personas a las que invite o seleccione</option><option value="public"'+(b.visibility==='public'?' selected':'')+'>Público en el perfil del negocio</option></select></label><p class="small-note span2">Cambiar esta preferencia no envía mensajes. Si antes publicaste tu número, alguien podría haberlo guardado.</p>'+end('Guardar contacto laboral')+'</section>';
      }
      const rows=await ctx.db('resumes?user_id=eq.'+user().id+'&select=*&limit=1'),r=rows?.[0]||{};
      return back+'<section class="soft-card"><h1>Tu contacto laboral</h1><p>Tu WhatsApp no aparece públicamente. Al postularte podrás revisar y autorizar el número que compartirás con ese negocio.</p><form class="form-grid" data-form="workflow-person-contact">'+field('WhatsApp para postulaciones y CV *','whatsapp',r.cv_contact,'type="tel" inputmode="tel" autocomplete="tel" required maxlength="24" placeholder="+53 5XXX XXXX"')+'<p class="small-note span2">Si escribes un número cubano de 8 cifras, añadiremos +53. Para otro país, incluye el prefijo internacional. Este contacto también aparecerá en el PDF de tu CV.</p>'+end('Guardar mi WhatsApp')+'</section>';
    }
    function contactCard(b,jobTitle=''){
      if(!b?.shared||(!phone(b.whatsapp)&&!phone(b.phone)))return '<section class="soft-card workflow-contact"><h2>Contacto del negocio</h2><p>El negocio comparte su contacto al invitar o seleccionar a una persona. Revisa aquí las novedades de tu postulación.</p></section>';
      const message='Hola, te contacto por la vacante '+jobTitle+' en '+(b.business_name||'tu negocio')+'.';
      return '<section class="soft-card workflow-contact"><h2>Contacto del negocio</h2><p><strong>'+esc(b.contact_person||b.business_name)+'</strong></p>'+(b.contact_hours?'<p>Horario: '+esc(b.contact_hours)+'</p>':'')+(phone(b.whatsapp)?'<p>'+esc(phone(b.whatsapp))+'</p><a class="btn btn-primary" href="'+esc(whatsapp(b.whatsapp,message))+'" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>':'')+(phone(b.phone)?'<p><a class="contact-link" href="tel:'+esc(phone(b.phone))+'">Llamar al teléfono alternativo</a></p>':'')+'<p class="small-note">Revisa el mensaje antes de enviarlo. ConectaCuba no envía mensajes en tu nombre.</p></section>';
    }
    function jobPreview(data){
      const min=data.salary_min==null||data.salary_min===''?null:Number(data.salary_min),max=data.salary_max==null||data.salary_max===''?null:Number(data.salary_max);
      if([min,max].some(n=>n!==null&&(!Number.isFinite(n)||n<0))||(min!==null&&max!==null&&min>max))throw new Error('Revisa el rango salarial antes de continuar.');
      const job={...data,salary_min:min,salary_max:max,work_schedule:data.work_schedule==='Otro'?data.work_schedule_other:data.work_schedule};
      return '<section class="offer-identity"><h2>'+esc(job.title)+'</h2><p>'+esc([job.municipality,job.province].filter(Boolean).join(', '))+'</p><p><strong>'+esc(ctx.salaryLabel?.(job)||'Salario a convenir')+'</strong></p><p>'+esc([job.work_modality,job.work_schedule].filter(Boolean).join(' · '))+'</p></section><section class="offer-description"><h3>Descripción, funciones y requisitos</h3><p class="preserve-lines">'+esc(job.description)+'</p></section><p class="small-note">Revisa el horario, los requisitos y las condiciones. Esta vista previa todavía no guarda ni publica la vacante.</p>';
    }
    function paintBadges(){
      if(typeof document==='undefined'||typeof document.createElement!=='function')return;
      document.querySelectorAll('.workflow-badge').forEach(node=>node.remove());
      const business=user()?.account_type==='business',count=noticeOwner===user()?.id?noticeRows.filter(isNew).length:0;
      const targets=business?['account-jobs-link','mobile-jobs']:['account-applications-link','mobile-activity'];
      for(const id of ['account-jobs-link','mobile-jobs','account-applications-link','mobile-activity']){const node=document.getElementById(id);if(node?.dataset.workflowLabel){node.removeAttribute('aria-label');delete node.dataset.workflowLabel;}}
      if(!count)return;
      for(const id of targets){const node=document.getElementById(id);if(!node)continue;const badge=document.createElement('span');badge.className='workflow-badge';badge.setAttribute('aria-hidden','true');badge.textContent=count>99?'99+':String(count);node.append(badge);node.dataset.workflowLabel='true';node.setAttribute('aria-label',(business?'Vacantes':'Postulaciones')+': '+count+' novedades');}
    }
    async function refreshBadges(force=false){
      if(typeof document==='undefined'||typeof document.createElement!=='function'||!user()?.id)return;
      const id=user().id,business=user().account_type==='business';
      if(!force&&noticeOwner===id&&Date.now()-noticeAt<30000){paintBadges();return;}
      const epoch=++noticeEpoch,filter=business?'business_user_id':'applicant_id';
      const rows=await ctx.db('job_applications?'+filter+'=eq.'+id+'&select=id,status,created_at,updated_at&order=updated_at.desc&limit=100');
      if(epoch!==noticeEpoch||user()?.id!==id)return;
      noticeOwner=id;noticeRows=rows||[];noticeAt=Date.now();paintBadges();
    }
    function reset(){pendingJobForm=null;pendingJobOwner=null;noticeEpoch++;noticeOwner=null;noticeRows=[];noticeAt=0;paintBadges();}
    function shareButton(job){
      return job?.status==='published'?'<button type="button" class="text-btn" data-workflow-share="'+esc(job.id)+'" aria-label="Compartir '+esc(job.title)+'">Compartir oferta</button>':'';
    }
    function publicContactButton(b,job){
      if(b?.shared===false)return '';
      const url=whatsapp(b?.whatsapp,'Hola, me interesa la vacante '+(job?.title||'publicada')+' en '+(job?.business_name||'tu negocio')+'. ¿Podrían orientarme?');
      return url?'<a class="text-btn workflow-wa-inline" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" aria-label="Contactar al negocio por WhatsApp sobre '+esc(job?.title||'la oferta')+'">WhatsApp del negocio</a>':'';
    }
    function candidateContact(a,job){
      if(user()?.account_type!=='business'||!a||a.status==='withdrawn')return '';
      const normalized=phone(a.contact);if(!normalized)return '';
      const message='Hola, te contactamos de '+(job?.business_name||'nuestro negocio')+' por tu postulación a '+(job?.title||'la vacante')+'.';
      return '<a class="btn btn-primary" href="'+esc(whatsapp(normalized,message))+'" target="_blank" rel="noopener noreferrer">Abrir WhatsApp de la persona</a><p><a class="contact-link" href="tel:'+esc(normalized)+'">Llamar al '+esc(normalized)+'</a></p><p class="small-note">Usa este contacto únicamente para el proceso de esta vacante. El mensaje no se envía automáticamente.</p>';
    }
    async function publicContact(businessId,jobTitle=''){
      if(!capable())return '';
      try{return contactCard(await rpc('cc_business_contact',{business_id:businessId,application_id:null}),jobTitle);}catch{return '<p class="small-note">No pudimos actualizar el contacto del negocio.</p>';}
    }
    function timeline(a){
      const events=Array.isArray(a.status_history)?a.status_history:[{status:'submitted',at:a.created_at},{status:a.status,at:a.updated_at}].filter((e,i,all)=>i===0||e.status!==all[0].status);
      return '<section class="soft-card"><h2>Seguimiento</h2><ol class="workflow-timeline">'+events.slice(-30).map(e=>'<li><strong>'+esc(e.status==='contacted'&&!a.employer_message?'Contacto iniciado':label(e.status))+'</strong><time>'+esc(ctx.date(e.at))+'</time></li>').join('')+'</ol></section>';
    }
    async function applicationExtras(a){
      markSeen(a);
      let html=timeline(a);
      if(a.status==='withdrawn')return html;
      if(a.employer_message&&['contacted','accepted'].includes(a.status))html+='<section class="soft-card workflow-next-step"><h2>'+esc(a.status==='accepted'?'Tu siguiente paso':'Invitación del negocio')+'</h2><p class="preserve-lines">'+esc(a.employer_message)+'</p>'+(a.meeting_at?'<p><strong>Cuándo:</strong> '+esc(meetingDate(a.meeting_at))+'</p>':'')+(a.meeting_place?'<p><strong>Dónde o por qué canal:</strong> '+esc(a.meeting_place)+'</p>':'')+'<p class="small-note">Confirma la coordinación con el negocio. Ser seleccionada o seleccionado no equivale a un contrato.</p></section>';
      if(capable()){
        try{const b=await rpc('cc_business_contact',{business_id:a.business_user_id,application_id:a.id});html+=contactCard(b,a.job_title);}catch{html+='<p class="small-note">No pudimos cargar el contacto. Vuelve a abrir esta postulación para reintentar.</p>';}
      }else{
        try{const rows=await ctx.request('/rest/v1/business_directory?user_id=eq.'+a.business_user_id+'&select=*&limit=1');const b=rows?.[0];if(b)html+=contactCard({...b,shared:!!b.whatsapp,contact_person:b.business_name},a.job_title);}catch{}
      }
      return html;
    }
    function employerPanel(a,job){
      if(!capable()||a.status==='withdrawn')return '';
      return '<section class="candidate-section workflow-next-step"><h2>Invitación y próximos pasos</h2><p>Escribe lo que la persona necesita para continuar. Se mostrará dentro de su postulación.</p>'+(a.employer_message?'<blockquote>'+esc(a.employer_message)+'</blockquote>':'')+'<button class="btn btn-primary" type="button" data-workflow-invite="'+a.id+'" data-job-id="'+job.id+'">Preparar invitación</button><button class="btn btn-outline" type="button" data-workflow-select="'+a.id+'" data-job-id="'+job.id+'">Seleccionar y explicar próximos pasos</button></section>';
    }
    function signature(a){return [a.status,a.updated_at].join('|');}
    function isNew(a){return read('seen',a.id)!==signature(a);}
    function markSeen(a){write('seen',a.id,signature(a));paintBadges();}
    function novelty(a){return isNew(a)?'<span class="workflow-new">Novedad</span>':'';}
    async function renderNotifications(){
      const business=user()?.account_type==='business';
      const filter=business?'business_user_id':'applicant_id';
      const rows=await ctx.db('job_applications?'+filter+'=eq.'+user().id+'&select=id,job_id,job_title,business_name,status,created_at,updated_at&order=updated_at.desc&limit=100');
      noticeOwner=user().id;noticeRows=rows||[];noticeAt=Date.now();paintBadges();
      const news=(rows||[]).filter(isNew);
      return back+'<section class="soft-card"><h1>Novedades</h1><p>Consulta aquí los cambios recientes. Los avisos se actualizan al abrir esta pantalla y se marcan como vistos al abrir el detalle.</p><button class="btn btn-outline" data-account-page="notifications">Actualizar</button></section><div class="application-list">'+(news.length?news.map(a=>'<button class="application-card" '+(business?'data-hiring-person="'+a.id+'" data-job-id="'+a.job_id+'"':'data-view-application="'+a.id+'"')+'><strong>'+esc(a.job_title)+'</strong><span>'+esc(a.business_name)+'</span><span>'+esc(a.status==='contacted'?'En coordinación':label(a.status))+'</span><small>'+esc(ctx.date(a.updated_at||a.created_at))+'</small></button>').join(''):'<section class="soft-card"><h2>Estás al día</h2><p>No hay novedades sin consultar en este dispositivo.</p></section>')+'</div>';
    }
    async function renderReports(){
      if(!capable())return back+'<p>La gestión de reportes se habilitará con el backend.</p>';
      const rows=await rpc('cc_reports_moderation',{});
      return back+'<section class="soft-card"><h1>Reportes de ofertas</h1><p>Revisa el contenido antes de tomar una decisión. Marcar como revisado no elimina la oferta automáticamente.</p></section>'+(rows.length?rows.map(r=>'<section class="soft-card"><h2>'+esc(r.job_title)+'</h2><p><strong>'+esc(r.reason)+'</strong> · '+esc(r.status==='pending'?'Pendiente':'Revisado')+'</p><p class="preserve-lines">'+esc(r.detail)+'</p><small>'+esc(ctx.date(r.created_at))+'</small>'+(r.status==='pending'?'<p><button class="btn btn-outline" data-workflow-reviewed="'+esc(r.id)+'">Marcar revisado</button></p>':'')+'</section>').join(''):'<section class="soft-card"><p>No hay reportes en esta prueba.</p></section>');
    }
    function renderHelp(){return back+'<section class="soft-card workflow-help"><h1>Ayuda y privacidad</h1><details open><summary>¿Cómo contacto con el negocio?</summary><p>Abre la oferta y su pestaña Negocio. Si el contacto es privado, estará disponible dentro de tu postulación cuando te inviten o seleccionen.</p></details><details><summary>¿Qué comparto al postularme?</summary><p>Nombre, municipio, provincia, el CV enviado y el contacto que autorizaste. El correo de acceso, la dirección privada y el contacto de recuperación no se publican automáticamente.</p></details><details><summary>¿Qué ocurre si retiro mi postulación?</summary><p>El negocio deja de tener acceso al CV, mensaje y contacto dentro de ConectaCuba. Esto no puede borrar copias que haya descargado ni conversaciones externas que ya hayas iniciado.</p></details><details><summary>¿Qué significa que me seleccionaron?</summary><p>Es una decisión del negocio dentro del proceso. Confirma las condiciones y los próximos pasos antes de aceptar. No constituye un contrato laboral.</p></details><details><summary>¿Cómo reconozco una oferta sospechosa?</summary><p>No compartas contraseñas, códigos de acceso ni documentos sensibles por un enlace inesperado. Desconfía de solicitudes de dinero para obtener una entrevista.</p></details><details><summary>Borradores y mala conexión</summary><p>Los formularios laborales pueden conservar un borrador en esta pestaña. No se guardan contraseñas ni archivos. Un borrador no es una postulación enviada y puede perderse al cerrar la pestaña.</p><button type="button" class="btn btn-outline" data-workflow-clear-drafts>Eliminar mis borradores de esta pestaña</button></details><details><summary>Soporte y eliminación de cuenta</summary><p>Puedes reportar una oferta desde su detalle; en esta prueba el reporte se guarda solo en el simulador y se revisa desde Administración. La entrega de reportes y la eliminación de cuentas reales requieren conectar el backend.</p></details></section>';}
    async function report(id){
      ctx.modal('Reportar una oferta','<form class="form-grid" data-form="workflow-report" data-job-id="'+id+'"><p class="small-note span2">Describe el problema sin incluir contraseñas, documentos personales ni datos privados de otras personas.</p><label class="field span2">Motivo<select name="reason" required><option value="">Selecciona un motivo</option><option value="Posible fraude">Posible fraude o solicitud de dinero</option><option value="Datos engañosos">Datos engañosos o incompletos</option><option value="Contenido inapropiado">Contenido inapropiado</option><option value="Otro">Otro problema</option></select></label>'+area('Explica el problema *','detail','','required minlength="15" maxlength="2000" rows="5"')+end('Guardar reporte de prueba'));
    }
    async function invite(id,jobId,selected){
      const rows=await ctx.db('job_applications?id=eq.'+id+'&job_id=eq.'+jobId+'&business_user_id=eq.'+user().id+'&select=*&limit=1'),a=rows?.[0];
      if(!a||a.status==='withdrawn')throw new Error('Esta postulación no está disponible.');
      ctx.modal(selected?'Seleccionar y coordinar':'Invitar a entrevista','<form class="form-grid" data-form="workflow-next-step" data-id="'+id+'" data-job-id="'+jobId+'" data-status="'+(selected?'accepted':'contacted')+'">'+area('Mensaje para la persona *','employer_message',a.employer_message||'','required minlength="10" maxlength="2000" rows="5"')+field('Fecha y hora de Cuba (opcional)','meeting_at',a.meeting_at&&new Date(a.meeting_at).getTime()>Date.now()?cubaInput(a.meeting_at):'','type="datetime-local"')+field('Lugar, llamada o indicaciones','meeting_place',a.meeting_place||'','maxlength="300"')+'<p class="small-note span2">Se compartirá el contacto laboral del negocio con esta persona. La fecha es opcional; deja el campo vacío si todavía no hay una cita. No se enviará un WhatsApp automáticamente.</p>'+end(selected?'Seleccionar y guardar próximos pasos':'Guardar invitación'));
    }
    // Convert using Havana timezone rules, never the employer device timezone.
    function cubaInput(iso){const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Havana',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));return parts.replace(' ','T');}
    function cubaToISO(value){
      if(!value)return null;
      if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Revisa la fecha y la hora.');
      const [date,time]=value.split('T'),[y,m,d]=date.split('-').map(Number),[h,n]=time.split(':').map(Number);
      const target=Date.UTC(y,m-1,d,h,n);let guess=target;
      for(let i=0;i<3;i++){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Havana',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess));const obj=Object.fromEntries(p.map(x=>[x.type,x.value]));const rendered=Date.UTC(+obj.year,+obj.month-1,+obj.day,+obj.hour,+obj.minute);guess+=target-rendered;}
      if(cubaInput(new Date(guess).toISOString())!==value)throw new Error('Esa hora no existe por el cambio de horario en Cuba. Elige otra.');
      if(guess<=Date.now())throw new Error('Elige una fecha y hora futuras.');
      return new Date(guess).toISOString();
    }
    async function handleSubmit(form,d){
      if(d===undefined)return false;
      if(form.dataset.form==='workflow-report'){
        if(!capable())throw new Error('La vía de reportes no está conectada.');
        if(!['Posible fraude','Datos engañosos','Contenido inapropiado','Otro'].includes(d.reason)||d.detail.trim().length<15||d.detail.trim().length>2000)throw new Error('Selecciona un motivo y describe el problema con 15 a 2000 caracteres.');
        await rpc('cc_report_job',{job_id:form.dataset.jobId,reason:d.reason,detail:d.detail.trim()});
        form.dataset.dirty='false';ctx.closeModal();ctx.toast('Reporte guardado en esta prueba. No se envió a un servicio real.');return true;
      }
      if(form.dataset.form==='workflow-person-contact'){
        const p=phone(d.whatsapp);if(!p)throw new Error('Escribe un teléfono válido con prefijo internacional.');
        const rows=await ctx.db('resumes?user_id=eq.'+user().id+'&select=*&limit=1');
        if(rows?.length)await ctx.patchOne('resumes?user_id=eq.'+user().id,{cv_contact:p});else await ctx.db('resumes',{method:'POST',body:JSON.stringify({user_id:user().id,cv_contact:p})});
        form.dataset.dirty='false';await ctx.goAccount('contacts',false);ctx.toast('WhatsApp laboral guardado.');return true;
      }
      if(form.dataset.form==='workflow-business-contact'){
        if(!capable())throw new Error('Esta función requiere preparar el backend.');
        const p=phone(d.whatsapp),alt=d.phone.trim()?phone(d.phone):'';
        if(!p||(d.phone.trim()&&!alt))throw new Error('Revisa los teléfonos e incluye el prefijo del país.');
        if(!['public','invited'].includes(d.visibility))throw new Error('Selecciona quién puede ver el contacto.');
        if(d.contact_person.trim().length<2)throw new Error('Indica la persona responsable.');
        await rpc('cc_save_business_contact',{whatsapp:p,phone:alt,contact_person:d.contact_person.trim(),contact_hours:d.contact_hours.trim(),visibility:d.visibility});
        form.dataset.dirty='false';await ctx.goAccount('contacts',false);ctx.toast('Contacto laboral actualizado.');return true;
      }
      if(form.dataset.form==='workflow-next-step'){
        if(!capable())throw new Error('Esta función requiere preparar el backend.');
        const message=d.employer_message.trim();if(message.length<10||message.length>2000)throw new Error('Escribe un mensaje de 10 a 2000 caracteres.');
        await rpc('cc_application_next_step',{application_id:form.dataset.id,job_id:form.dataset.jobId,status:form.dataset.status,employer_message:message,meeting_at:cubaToISO(d.meeting_at),meeting_place:d.meeting_place.trim()});
        form.dataset.dirty='false';ctx.closeModal();await ctx.goPerson(form.dataset.jobId,form.dataset.id,{history:'replace'});ctx.toast('Próximos pasos guardados en la postulación.');return true;
      }
      return false;
    }
    async function handleClick(e){
      const b=e.target.closest('button,a');if(!b)return false;
      if(b.hasAttribute('data-workflow-preview-job')){
        const form=b.closest('form');if(!form||!form.reportValidity())return true;
        const values=Object.fromEntries(new FormData(form).entries());
        const html=jobPreview(values);pendingJobForm=form;pendingJobOwner=user()?.id;
        ctx.modal('Vista previa de la vacante',html+'<div class="form-actions"><button class="btn btn-outline" type="button" data-close-modal>Volver a editar</button><button class="btn btn-primary" type="button" data-workflow-submit-job>'+(form.dataset.id?'Guardar cambios':'Publicar vacante')+'</button></div>');return true;
      }
      if(b.hasAttribute('data-workflow-submit-job')){
        const form=pendingJobForm,owner=pendingJobOwner;reset();ctx.closeModal();
        if(form?.isConnected&&owner===user()?.id)form.requestSubmit();else ctx.toast('La vista cambió. Abre de nuevo el editor de la vacante.');
        return true;
      }
      if(b.hasAttribute('data-workflow-copy-message')){
        const text=document.getElementById('workflow-preview-message')?.value||'';
        if(!text)return true;
        try{await navigator.clipboard.writeText(text);ctx.toast('Mensaje copiado. No se envió a WhatsApp.');}catch{ctx.toast('Mantén pulsado el texto para copiarlo manualmente.');}
        return true;
      }
      if(b.dataset.workflowReport){await report(b.dataset.workflowReport);return true;}
      if(b.dataset.workflowReviewed){await rpc('cc_reports_moderation',{report_id:b.dataset.workflowReviewed,status:'reviewed'});await ctx.goAccount('reports',false);ctx.toast('Reporte marcado como revisado.');return true;}
      if(b.dataset.workflowShare){
        const url=new URL('/app/',location.origin);url.hash='oferta/'+b.dataset.workflowShare;
        if(navigator.share){try{await navigator.share({title:'Oferta en ConectaCuba',url:url.href});}catch(error){if(error.name!=='AbortError')ctx.toast('No se pudo abrir el menú para compartir.');}}
        else if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(url.href);ctx.toast('Enlace copiado.');}catch{ctx.modal('Enlace de la oferta','<label class="field">Copia este enlace<input readonly value="'+esc(url.href)+'"></label>');}}
        else ctx.modal('Enlace de la oferta','<label class="field">Copia este enlace<input readonly value="'+esc(url.href)+'"></label>');
        return true;
      }
      if(b.dataset.workflowInvite||b.dataset.workflowSelect){await invite(b.dataset.workflowInvite||b.dataset.workflowSelect,b.dataset.jobId,!!b.dataset.workflowSelect);return true;}
      if(b.hasAttribute('data-workflow-clear-drafts')){if(ctx.confirm('¿Eliminar los borradores de esta cuenta en esta pestaña?')){try{const s=storage(),prefix=key('draft');const keys=[];for(let i=0;i<s.length;i++){const k=s.key(i);if(k?.startsWith(prefix))keys.push(k);}keys.forEach(k=>s.removeItem(k));ctx.toast('Borradores eliminados.');}catch{ctx.toast('No se pudo acceder al almacenamiento.');}}return true;}
      return false;
    }
    return {capable,reset,refreshBadges,jobPreview,shareButton,publicContactButton,candidateContact,settingsLinks,renderContacts,renderNotifications,renderHelp,renderReports,contactCard,publicContact,applicationExtras,employerPanel,novelty,markSeen,handleSubmit,handleClick,cubaToISO};
  }
  window.CC_WORKFLOW={phone,whatsapp,label,meetingDate,create};
})();
