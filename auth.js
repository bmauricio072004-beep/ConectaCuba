(() => {
  'use strict';
  const cfg=window.CC_SUPABASE;
  if(!cfg?.url||!cfg?.key)return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const provinces=['La Habana','Artemisa','Mayabeque','Matanzas','Pinar del Río','Villa Clara','Cienfuegos','Sancti Spíritus','Ciego de Ávila','Camagüey','Las Tunas','Granma','Holguín','Santiago de Cuba','Guantánamo','Isla de la Juventud'];
  const activities=['Electricidad y electrónica','Construcción','Servicios técnicos','Comercio','Alimentos y gastronomía','Transporte','Salud','Educación','Belleza','Turismo','Tecnología','Servicios profesionales','Agricultura','Manufactura','Limpieza y mantenimiento','Otra'];
  const sessionKey='cc_auth_session_v1';
  const state={profile:null,business:null,resume:null,isAdmin:false,jobs:[],applications:[],page:'overview',render:0,pendingJob:null,afterLoginPage:null,selectedJob:null,ownerJobId:null,ownerApplicationId:null,lastURL:location.pathname+location.search+location.hash,lastHistory:null};
  let workflow=null;
  let refreshPromise=null,previousFocus=null,hiring=null,opportunities=null,sessionEpoch=0;
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(sessionKey)||'null');}catch{return null;}};
  function staleSession(){const e=new Error('La sesión cambió.');e.code='STALE_REQUEST';return e;}
  function sameSession(a,b){return a?.access_token===b?.access_token&&a?.refresh_token===b?.refresh_token&&a?.user?.id===b?.user?.id;}
  function guardSession(epoch,userId){const current=readSession();if(epoch!==sessionEpoch||!current?.access_token||current.user?.id!==userId)throw staleSession();}
  function saveSession(s){
    const before=readSession();
    try{s?localStorage.setItem(sessionKey,JSON.stringify(s)):localStorage.removeItem(sessionKey);}catch{throw new Error('Permite el almacenamiento del navegador para mantener tu sesión.');}
    if(!!before?.access_token!==!!s?.access_token||before?.user?.id!==s?.user?.id)sessionEpoch++;
  }
  function clearPrivateAccount(){
    workflow?.reset();
    window.CC_DRAFTS?.clearAccount(state.profile?.id||readSession()?.user?.id);
    sessionEpoch++;state.render++;refreshPromise=null;hiring?.reset();opportunities?.reset();
    Object.assign(state,{profile:null,business:null,resume:null,isAdmin:false,applications:[],reviews:[],ownJobs:[],pendingJob:null,afterLoginPage:null,ownerJobId:null,ownerApplicationId:null,failedRoute:null});
    $('account-content').removeAttribute('aria-busy');$('account-content').innerHTML='';$('modal-content').innerHTML='';$('account-welcome').textContent='Mi cuenta';$('account-subtitle').textContent='';
    $('sidebar-user-name').textContent='Mi cuenta';$('sidebar-user-role').textContent='';$('sidebar-avatar').textContent='';
  }
  function rememberSession(s){
    const before=readSession();if(before?.access_token&&before?.user?.id!==s.user?.id)clearPrivateAccount();
    s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600);saveSession(s);updateHeader();
  }
  async function request(path,options={},token=null){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const h={apikey:cfg.key,...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})};
      if(options.body&&typeof options.body==='string')h['Content-Type']='application/json';
      const response=await fetch(cfg.url+path,{...options,headers:h,signal:controller.signal,cache:'no-store'});
      const body=response.status===204?null:await response.json().catch(()=>null);
      if(!response.ok){const e=new Error(body?.msg||body?.message||body?.error_description||body?.error||'No se pudo completar la solicitud.');e.status=response.status;e.code=body?.code||body?.error_code;throw e;}
      return body;
    }catch(e){if(e.name==='AbortError')throw new Error('La conexión está tardando. Tus datos siguen en el formulario; inténtalo otra vez.');throw e;}
    finally{clearTimeout(timer);}
  }
  async function session(){
    let s=readSession();if(!s?.access_token)return null;
    if(s.expires_at&&Date.now()/1000>s.expires_at-60&&s.refresh_token){
      if(!refreshPromise||refreshPromise.epoch!==sessionEpoch||!sameSession(refreshPromise.snapshot,s)){
        const pending={epoch:sessionEpoch,snapshot:s,promise:null};
        const replacement=()=>{
          const current=readSession();
          if(pending.epoch!==sessionEpoch||!current?.access_token||current.user?.id!==pending.snapshot.user?.id)throw staleSession();
          return sameSession(current,pending.snapshot)?null:current;
        };
        pending.promise=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})})
          .then(next=>{const current=replacement();if(current)return current;rememberSession(next);return next;})
          .catch(e=>{
            const current=replacement();if(current)return current;
            if(e.status===400||e.status===401){
              saveSession(null);clearPrivateAccount();showHome('#inicio',false);
              toast('Tu sesión venció. Inicia sesión otra vez.','info');throw staleSession();
            }
            throw e;
          }).finally(()=>{if(refreshPromise===pending)refreshPromise=null;});
        refreshPromise=pending;
      }
      s=await refreshPromise.promise;
    }return s;
  }
  async function db(path,options={}){
    const epoch=sessionEpoch,s=await session();if(!s)throw new Error('Inicia sesión para continuar.');
    const guard=()=>guardSession(epoch,s.user?.id);
    guard();
    try{const result=await request('/rest/v1/'+path,options,s.access_token);guard();return result;}
    catch(e){guard();throw e;}
  }
  const json=(method,value)=>({method,headers:{Prefer:'return=representation'},body:JSON.stringify(value)});
  async function patchOne(path,value){const rows=await db(path,json('PATCH',value));if(!rows?.length)throw new Error('No se guardó el cambio. Actualiza la página e inténtalo de nuevo.');return rows[0];}
  function humanError(e){
    const m=String(e?.message||e||'');
    if((e?.code==='23505'||/duplicate key/i.test(m))&&/business_reviews/i.test(m))return 'Ya tienes una reseña de este negocio. Puedes editarla desde Cuenta → Mis reseñas.';
    if(e?.code==='23505'||/duplicate key/i.test(m))return /job_applications|job_id.*applicant/i.test(m)?'Ya enviaste una postulación a esta vacante. Revísala en “Mis postulaciones”.':'Ya existe una vacante igual abierta o una cuenta con esos datos. Revisa lo que has publicado.';
    if(/invalid login credentials/i.test(m))return 'El correo o la contraseña no coinciden.';
    if(/already registered|already been registered|user already exists/i.test(m))return 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.';
    if(/email not confirmed/i.test(m))return 'Confirma tu correo antes de entrar. Puedes solicitar otro mensaje desde “Reenviar confirmación”.';
    if(/email.*not authorized/i.test(m))return 'El envío de correo aún está limitado para este piloto. Falta configurar el correo del servicio.';
    if(/rate limit|too many requests|over_email_send_rate_limit/i.test(m))return 'Se hicieron muchos intentos. Espera unos minutos antes de volver a intentar.';
    if(/password.*(least|weak)|weak_password/i.test(m))return 'Usa una contraseña de 8 caracteres o más.';
    if(/fetch|network/i.test(m))return 'No hay conexión con el servidor. Conservamos el formulario abierto; vuelve a intentarlo cuando tengas internet.';
    if(/violates.*(policy|constraint)|permission denied|row.level security/i.test(m))return 'No se pudo guardar. Revisa los campos o vuelve a iniciar sesión para actualizar tus permisos.';
    return m||'No se pudo completar la acción. Inténtalo de nuevo.';
  }
  function toast(message,kind='ok'){const n=document.createElement('div');n.className='notice show toast '+kind;n.setAttribute('role','status');n.textContent=message;document.body.append(n);setTimeout(()=>n.remove(),5000);}
  function notice(form,message,kind='info'){const n=form.querySelector('.notice');if(n){n.className='notice show span2 '+kind;n.textContent=message;n.scrollIntoView({block:'nearest'});}}
  function options(list,selected='',blank='Selecciona'){return(blank!==null?'<option value="">'+esc(blank)+'</option>':'')+list.map(v=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(v)+'</option>').join('');}
  function field(label,name,value='',attrs='',hint='',wide=false){return '<div class="field'+(wide?' span2':'')+'"><label for="f-'+name+'">'+label+'</label><input id="f-'+name+'" name="'+name+'" value="'+esc(value)+'" '+attrs+'>'+(hint?'<p class="hint">'+hint+'</p>':'')+'</div>';}
  function area(label,name,value='',max=3000,required=false){return '<div class="field span2"><label for="f-'+name+'">'+label+'</label><textarea id="f-'+name+'" name="'+name+'" maxlength="'+max+'"'+(required?' required minlength="10"':'')+'>'+esc(value)+'</textarea></div>';}
  function select(label,name,list,value='',blank='Selecciona'){return '<div class="field"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'" required>'+options(list,value,blank)+'</select></div>';}
  function otherSelect(label,name,otherName,list,value='',other='',otherValue='Otra'){
    return '<div class="field"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'" data-other="'+otherName+'" data-other-value="'+otherValue+'" required>'+options(list,value)+'</select><label for="f-'+otherName+'" data-other-label="'+otherName+'" '+(value===otherValue?'':'hidden')+'>Especifica</label><input id="f-'+otherName+'" name="'+otherName+'" value="'+esc(other)+'" maxlength="120" '+(value===otherValue?'required':'hidden disabled')+'></div>';
  }
  function locationFields(p={}){return select('Provincia *','province',provinces,p.province)+field('Municipio *','municipality',p.municipality,'required minlength="2" maxlength="100" autocomplete="address-level2"','Escribe el nombre del municipio.');}
  function passwordField(name='password',label='Contraseña *',isNew=true){return '<div class="field span2"><label for="f-'+name+'">'+label+'</label><div class="password-control"><input id="f-'+name+'" name="'+name+'" required '+(isNew?'minlength="8" maxlength="72"':'')+' type="password" autocomplete="'+(isNew?'new-password':'current-password')+'"><button type="button" class="password-toggle" aria-label="Mostrar '+label.replace(' *','').toLowerCase()+'" aria-pressed="false">Mostrar</button></div>'+(isNew&&name==='password'?'<p class="hint">Mínimo 8 caracteres. Nunca compartas tu contraseña.</p>':'')+'</div>';}
  const switchLogin='<div class="auth-switch"><span>¿Ya estás registrado?</span><button type="button" class="text-btn" data-open="login">Iniciar sesión</button></div>';
  const formEnd=(label,cancel=true)=>'<div class="notice span2" role="status"></div><div class="form-actions span2">'+(cancel?'<button type="button" class="btn btn-outline" data-close-modal>Cancelar</button>':'')+'<button type="submit" class="btn btn-primary">'+label+'</button></div></form>';
  function signupFields(){return field('Correo electrónico *','email','','type="email" required maxlength="254" autocomplete="email"','Confirma tu cuenta y recupera el acceso desde este correo.',true)+passwordField()+passwordField('confirm_password','Repite la contraseña *')+field('Contacto alternativo (opcional)','contact_recovery','','maxlength="200"','WhatsApp, teléfono o Telegram. Queda privado; el acceso se recupera por correo.',true);}
  function businessFields(b={}){
    return field('Nombre del negocio *','business_name',b.business_name,'required minlength="2" maxlength="120"')+
      field('Nombre y apellidos de la persona de contacto *','contact_person',b.contact_person,'required minlength="2" maxlength="100" autocomplete="name"')+
      otherSelect('Actividad principal *','business_activity','business_activity_other',activities,b.business_activity,b.business_activity_other)+locationFields(b)+
      area('¿A qué se dedica y qué servicios ofrece?','description',b.description)+
      (workflow?.capable()?'<div class="span2 account-note">El WhatsApp, horario y privacidad se gestionan en Mi contacto laboral. <button type="button" class="text-btn" data-account-page="contacts">Gestionar contacto laboral</button></div>':field('WhatsApp o teléfono del negocio (opcional)','whatsapp',b.whatsapp,'type="tel" maxlength="100"','Para el contacto profesional de tu negocio.')+
      field('Otro contacto del negocio (opcional)','other_contact',b.other_contact,'maxlength="200"','Ej.: Telegram o página web.'))+
      field('Enlace a redes, web o evidencia del negocio *','proof_url',b.proof_url,'required maxlength="500"','La evidencia solo la ve administración.',true)+
      field('Dirección o zona donde opera (privada)','business_address',b.business_address,'maxlength="300"', '',true);
  }
  function signupForm(type){
    const person=type==='person';
    return switchLogin+'<p class="account-note">'+(person?'Tu correo, dirección personal y currículum son privados. Compartes un currículum con un negocio cuando te postulas.':'El negocio queda pendiente de revisión manual. Después de entrar podrás añadir su imagen y completar la información.')+'</p><form class="form-grid" data-form="'+type+'">'+
      signupFields()+'<div class="form-section span2">'+(person?'Tu perfil':'Tu negocio')+'</div>'+
      (person?field('Nombre y apellidos *','display_name','','required minlength="2" maxlength="100" autocomplete="name"')+locationFields()+
        field('Dirección o zona (opcional)','address','','maxlength="300" autocomplete="street-address"','Queda privada.',true)+
        field('¿Qué trabajo buscas?','desired_job','','maxlength="120"','Puedes ampliarlo luego en tu perfil.',true)+area('Habilidades o experiencia principal','profile_summary')+otherSelect('Canal de contacto preferido','public_contact','public_contact_other',['WhatsApp','Teléfono','Telegram','Otro'],'WhatsApp','','Otro'):
        businessFields())+formEnd(person?'Crear mi perfil':'Enviar negocio para revisión');
  }
  function loginForm(){return '<p class="account-note">Entra con el correo de tu cuenta.</p><form class="form-grid" data-form="login">'+
    field('Correo electrónico','email','','type="email" required maxlength="254" autocomplete="email"','',true)+passwordField('password','Contraseña',false)+
    '<div class="span2"><button class="text-btn" type="button" data-open="forgot">¿Olvidaste tu contraseña?</button> · <button class="text-btn" type="button" data-action="resend">Reenviar confirmación</button></div>'+
    '<div class="auth-switch span2"><span>¿Todavía no tienes cuenta?</span><button class="text-btn" type="button" data-open="join">Crear cuenta</button></div>'+formEnd('Entrar a mi cuenta');}
  function updateHeader(){
    const stored=readSession(),on=!!stored?.access_token,known=on&&state.profile?.id===stored.user?.id,business=known&&state.profile.account_type==='business';
    document.querySelector('header').classList.toggle('has-session',on);document.querySelector('.app-context').textContent=known?(business?'Espacio del negocio':'Tu búsqueda de empleo'):'Tu espacio de empleo';
    $('nav-login').textContent=on?'Mi cuenta':'Iniciar sesión';$('nav-login').dataset.open=on?'account':'login';$('nav-signup').hidden=on;
    $('site-footer').hidden=on;
    $('sidebar-guest').hidden=on;$('sidebar-user').hidden=!known;$('account-signout').hidden=true;
    $('account-home').hidden=true;$('nav-jobs').hidden=business;
    document.querySelectorAll('[data-session-only]').forEach(n=>n.hidden=!known);
    for(const [id,visible] of Object.entries({'account-resume-link':false,'account-applications-link':known&&!business,'account-business-link':business,'account-jobs-link':business}))$(id).hidden=!visible;
    if(known){$('sidebar-user-name').textContent=state.profile.display_name;$('sidebar-user-role').textContent=business?'Cuenta de negocio':'Cuenta personal';$('sidebar-avatar').textContent=state.profile.display_name.split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();}
    const businessButton=$('empty').querySelector('[data-open="business"]');if(businessButton)businessButton.hidden=on;
    const emptyPrimary=$('empty').querySelector('[data-account-page]');if(emptyPrimary){emptyPrimary.dataset.accountPage=business?'jobs':'resume';emptyPrimary.textContent=business?'Ver mis vacantes':'Preparar mi currículum';}
    for(const [id,page,label] of [['mobile-activity',business?'business':'applications',business?'Mi negocio':'Postulaciones'],['mobile-account','menu','Cuenta']]){
      $(id).dataset.accountPage=page;$(id).querySelector('.mobile-label').textContent=label;
    }
    $('mobile-resume').hidden=true;$('mobile-resume').dataset.accountPage='resume';
    $('mobile-app-nav').dataset.role=business?'business':'person';
    for(const [targetId,sourceId] of [['mobile-jobs',business?'account-jobs-link':'nav-jobs'],['mobile-activity',business?'account-business-link':'account-applications-link']]){
      const icon=$(sourceId).querySelector('.nav-icon'),destination=$(targetId).querySelector('.mobile-icon');if(icon&&destination)destination.innerHTML=icon.innerHTML;
    }
    if(business){delete $('mobile-jobs').dataset.home;$('mobile-jobs').dataset.accountPage='jobs';$('mobile-jobs').querySelector('.mobile-label').textContent='Vacantes';}
    else{delete $('mobile-jobs').dataset.accountPage;$('mobile-jobs').dataset.home='#vacantes';$('mobile-jobs').querySelector('.mobile-label').textContent='Empleos';}
    $('install-app').hidden=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  }
  function markNavigation(page=null){
    const target=['job','candidate','editor'].includes(page)?'jobs':page==='application'?'applications':['profile','resume','resume-edit','resume-preview','security','my-reviews','admin','review-admin','contacts','notifications','help','reports'].includes(page)?'menu':page==='saved'?null:page;
    document.querySelectorAll('.workspace-nav button,.mobile-app-nav button').forEach(b=>{
      const active=target?b.dataset.accountPage===target:!!b.dataset.home;
      b.classList.toggle('active',active);active?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
    });
  }
  function setAppView(page){
    document.body.dataset.appView=page;
    document.body.classList.toggle('focused-view',!['search','applications','menu','jobs','business'].includes(page));
  }
  function accountRoute(hash=location.hash){
    const parts=hash.replace(/^#/,'').split('/');
    if(parts[0]==='guardadas')return {page:'saved'};
    if(parts[0]==='oferta')return {page:'offer',jobId:parts[1]||'',tab:parts[2]||'offer'};
    if(parts[0]!=='cuenta')return {page:'search'};
    if(parts[1]==='postulacion')return {page:'application',applicationId:parts[2]||''};
    if(parts[1]==='resume'&&parts[2]==='editar')return {page:'resume-edit',section:parts[3]||'all'};
    if(parts[1]==='resume'&&parts[2]==='vista')return {page:'resume-preview'};
    if(parts[1]==='vacante')return {page:parts[3]==='postulante'?'candidate':'job',jobId:parts[2]||'',applicationId:parts[4]||''};
    return {page:parts[1]||'menu'};
  }
  function writeRoute(hash,mode='push',meta={}){
    const url=location.pathname+location.search+hash,current=location.pathname+location.search+location.hash;
    if(mode!=='none'&&(url!==current||!history.state?.ccApp)){
      const data={ccApp:true,fromHash:mode==='push'?location.hash:(history.state?.fromHash||null),...meta};
      if(mode==='push'&&url!==current)history.pushState(data,'',url);else history.replaceState(data,'',url);
    }
    state.lastURL=url;state.lastHistory=history.state;
  }
  async function loadAccountContext(){
    const {s,p}=await loadProfile();
    const result=await Promise.all([p.account_type==='business'?db('business_applications?user_id=eq.'+s.user.id+'&select=*&limit=1'):Promise.resolve([]),db('rpc/cc_is_admin',{method:'POST',body:'{}'})]);
    if(readSession()?.user?.id!==s.user.id)throw new Error('La sesión cambió. Vuelve a entrar.');
    state.business=result[0][0]||null;state.isAdmin=result[1]===true;updateHeader();workflow?.refreshBadges().catch(()=>{});return {s,p};
  }
  async function enterWorkspace(){
    const context=await loadAccountContext(),requested=state.afterLoginPage;state.afterLoginPage=null;
    if(requested){const route=typeof requested==='string'?{page:requested}:requested;await showAccount(route.page,false,context,{...route,history:'replace'});}
    else if(context.p.account_type==='business')await showAccount('jobs',false,context,{history:'replace'});
    else showHome('#vacantes',false,{history:'replace'});
  }
  function openEmployerJob(id,options={}){return showAccount('job',true,null,{jobId:id,...options});}
  function openEmployerPerson(jobId,id,options={}){return showAccount('candidate',true,null,{jobId,applicationId:id,...options});}
  async function hiringBack(to,jobId){
    const hash=to==='job'?'#cuenta/vacante/'+jobId:'#cuenta/jobs';
    if(history.state?.ccApp&&history.state.fromHash===hash&&typeof history.back==='function'){history.back();return;}
    if(to==='job')return showAccount('job',true,null,{jobId,history:'replace'});
    return showAccount('jobs',true,null,{history:'replace'});
  }
  async function goBackTo(page){
    const hash=page==='search'?'#empleos':page==='saved'?'#guardadas':'#cuenta/'+page;
    if(history.state?.ccApp&&history.state.fromHash===hash&&typeof history.back==='function'){history.back();return;}
    if(page==='search')showHome('#vacantes',true,{history:'replace',restore:true});
    else await showAccount(page,true,null,{history:'replace'});
  }
  function modalContent(title,html){
    if(!$('modal').classList.contains('open'))previousFocus=document.activeElement;
    $('modal-title').textContent=title;$('modal-content').innerHTML=html;$('modal').hidden=false;$('modal').classList.add('open');
    document.body.style.overflow='hidden';
    for(const id of ['inicio','account-app','site-footer','workspace-sidebar','mobile-app-nav'])$(id).inert=true;
    document.querySelector('header').inert=true;document.querySelector('.modal').scrollTop=0;$('close-modal').focus({preventScroll:true});
  }
  function closeModal(){
    $('modal').classList.remove('open');$('modal').hidden=true;document.body.style.overflow='';
    for(const id of ['inicio','account-app','site-footer','workspace-sidebar','mobile-app-nav'])$(id).inert=false;
    document.querySelector('header').inert=false;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function openModal(kind){
    if(kind==='account'){showAccount('menu');return;}
    if(readSession()?.access_token&&['join','person','business','login'].includes(kind)){enterWorkspace().catch(e=>{if(e.code!=='STALE_REQUEST')toast(humanError(e),'info');});return;}
    if(kind==='join')return modalContent('Únete a ConectaCuba',switchLogin+'<div class="path-grid"><article class="path-card"><h3>Soy una persona</h3><p>Busco trabajo y quiero crear mi currículum.</p><button type="button" class="btn btn-primary" data-open="person">Crear perfil de persona</button></article><article class="path-card"><h3>Soy un negocio</h3><p>Quiero presentar mi negocio y publicar vacantes.</p><button type="button" class="btn btn-dark" data-open="business">Registrar negocio</button></article></div>');
    if(kind==='person'||kind==='business')return modalContent(kind==='person'?'Crear perfil de persona':'Registrar negocio',signupForm(kind));
    if(kind==='forgot')return modalContent('Recuperar contraseña','<p>Recibirás un enlace para elegir una contraseña nueva.</p><form class="form-grid" data-form="forgot">'+field('Correo electrónico','email',readSession()?.user?.email||'','type="email" required autocomplete="email"','',true)+formEnd('Enviar enlace')+'<div class="auth-switch"><button type="button" class="text-btn" data-open="login">Volver a iniciar sesión</button></div>');
    modalContent('Iniciar sesión',loginForm());
  }
  function allowLeave(){const f=document.querySelector('form[data-dirty="true"]');return !f||confirm('Tienes cambios sin guardar. ¿Quieres salir de este formulario?');}
  function showHome(anchor='#vacantes',leave=true,routeOptions={}){
    if(leave&&!allowLeave())return;opportunities?.cancelOffer();$('account-content').removeAttribute('aria-busy');state.render++;state.page='search';closeModal();
    setAppView('search');
    $('account-app').hidden=true;$('inicio').hidden=false;$('site-footer').hidden=false;
    writeRoute('#empleos',routeOptions.history||(leave?'push':'replace'),{page:'search'});updateHeader();markNavigation();
    if(state.jobs.length)renderPublicJobs(!!state.publicFailed);
    document.title='Buscar empleo · ConectaCuba';window.scrollTo({top:routeOptions.restore?(state.feedScroll||0):0});
  }
  async function loadProfile(){
    const s=await session();if(!s)throw new Error('Inicia sesión para continuar.');
    const p=await db('profiles?id=eq.'+encodeURIComponent(s.user.id)+'&select=*&limit=1');if(!p[0])throw new Error('No encontramos tu perfil. Vuelve a entrar o contacta con el administrador.');
    if(readSession()?.user?.id!==s.user.id)throw new Error('La sesión cambió. Vuelve a entrar.');state.profile=p[0];return {s,p:p[0]};
  }
  async function loadResume(){const s=await session();const rows=await db('resumes?user_id=eq.'+s.user.id+'&select=*&limit=1');state.resume=rows[0]||null;return state.resume;}
  async function showAccount(page='menu',leave=true,context=null,routeOptions={}){
    if(page==='offer')return openPublicJob(routeOptions.jobId,routeOptions.tab||'offer',{...routeOptions,leave});
    if(page==='saved')return openSaved(leave,routeOptions);
    if(!readSession()?.access_token){state.afterLoginPage={page,...routeOptions};openModal('login');return;}
    if(leave&&!allowLeave())return;
    opportunities?.cancelOffer();$('account-content').removeAttribute('aria-busy');
    const version=++state.render;closeModal();$('inicio').hidden=true;$('site-footer').hidden=false;$('account-app').hidden=false;updateHeader();
    $('account-content').innerHTML='<p class="loading" role="status">Cargando tu espacio…</p>';
    try{
      const {s,p}=context||await loadAccountContext();if(version!==state.render)return;
      const business=p.account_type==='business';
      if(page==='overview')page=business?'jobs':'applications';
      if(page==='candidates')page='jobs';
      const permitted={reports:state.isAdmin&&!!workflow,contacts:!!workflow,notifications:!!workflow,help:!!workflow,menu:true,profile:true,security:true,resume:!business,'resume-edit':!business,'resume-preview':!business,applications:!business,application:!business,'my-reviews':!business,saved:!business,business,jobs:business,job:business,candidate:business,admin:state.isAdmin,'review-admin':state.isAdmin};
      if(!permitted[page])page=business?'jobs':'menu';state.page=page;setAppView(page);
      if(routeOptions.jobId!==undefined)state.ownerJobId=routeOptions.jobId;
      if(routeOptions.applicationId!==undefined)state.ownerApplicationId=routeOptions.applicationId;
      const titles={reports:'Reportes de ofertas',contacts:'Mi contacto laboral',notifications:'Novedades',help:'Ayuda y privacidad',menu:'Mi cuenta',profile:'Datos personales',security:'Acceso y seguridad',resume:'Mi currículum','resume-edit':'Editar currículum','resume-preview':'Vista previa del currículum',applications:'Mis postulaciones',application:'Detalle de mi postulación','my-reviews':'Mis reseñas',business:'Mi negocio',jobs:'Vacantes',job:'Detalle de la vacante',candidate:'Postulación',admin:'Revisión de negocios','review-admin':'Revisión de reseñas'};
      let hash='#cuenta/'+page;
      if(page==='job'||page==='candidate')hash='#cuenta/vacante/'+(state.ownerJobId||'')+(page==='candidate'?'/postulante/'+(state.ownerApplicationId||''):'');
      if(page==='application')hash='#cuenta/postulacion/'+(state.ownerApplicationId||'');
      if(page==='resume-edit')hash='#cuenta/resume/editar/'+(routeOptions.section||'all');
      if(page==='resume-preview')hash='#cuenta/resume/vista';
      writeRoute(hash,routeOptions.history||(leave?'push':'replace'),{page,jobId:state.ownerJobId,applicationId:state.ownerApplicationId});
      $('account-app').dataset.page=page;$('account-welcome').hidden=['job','candidate','application','resume-preview'].includes(page);$('account-welcome').textContent=titles[page];$('account-subtitle').textContent=business?(state.business?.business_name||p.display_name):p.display_name;
      document.title=titles[page]+' · ConectaCuba';markNavigation(page);
      const html=await ({reports:()=>workflow.renderReports(),contacts:()=>workflow.renderContacts(),notifications:()=>workflow.renderNotifications(),help:()=>workflow.renderHelp(),menu:renderAccountSettings,profile:()=>accountBack()+'<section class="soft-card account-form-card"><h2>Datos personales</h2>'+renderProfile()+'</section>',security:renderSecurity,resume:renderResume,'resume-edit':()=>renderCvEditor(routeOptions.section||'all'),'resume-preview':async()=>{await loadResume();return renderCvPreview();},business:renderBusiness,jobs:renderJobsPage,job:()=>hiring.renderJob(state.ownerJobId),candidate:()=>hiring.renderPerson(state.ownerJobId,state.ownerApplicationId),applications:renderApplications,application:()=>opportunities.renderApplication(state.ownerApplicationId),saved:()=>opportunities.renderSaved(),'my-reviews':()=>opportunities.renderMyReviews(),admin:renderAdmin,'review-admin':()=>opportunities.renderReviewAdmin()}[page])();
      if(version!==state.render)return;$('account-content').innerHTML=html;
      window.scrollTo({top:0});
    }catch(e){
      if(version!==state.render||e.code==='STALE_REQUEST')return;
      const business=state.profile?.account_type==='business';
      state.failedRoute={page,jobId:routeOptions.jobId??state.ownerJobId,applicationId:routeOptions.applicationId??state.ownerApplicationId};
      $('account-app').dataset.page='error';$('account-welcome').textContent='No pudimos cargar esta vista';$('account-subtitle').textContent='';
      const recovery=readSession()?.access_token?'<button class="btn btn-primary" data-action="retry-account">Volver a intentar</button>':'<button class="btn btn-primary" data-action="relogin">Iniciar sesión</button>';
      $('account-content').innerHTML='<div class="notice show info" role="alert">'+esc(humanError(e))+'</div><div class="account-actions">'+(business?'<button class="btn btn-outline" data-account-page="jobs">Volver a mis vacantes</button>':'<button class="btn btn-outline" data-action="home">Ver empleos</button>')+recovery+'</div>';
    }
  }

  const statusLabel=s=>({pending:'Pendiente de revisión',approved:'Aprobado',rejected:'Requiere correcciones',submitted:'Enviada',reviewing:'En revisión',contacted:'Contacto iniciado',accepted:'Aceptada',not_selected:'No seleccionada',withdrawn:'Retirada',published:'Publicada',closed:'Cerrada'})[s]||s;
  const chip=s=>'<span class="status-chip '+(s==='approved'||s==='published'?'approved':s==='rejected'?'rejected':'')+'">'+esc(statusLabel(s))+'</span>';
  const date=v=>new Date(v).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
  const pageButton=(page,label,kind='primary')=>'<button type="button" class="btn btn-'+kind+'" data-account-page="'+page+'">'+label+'</button>';
  const accountBack=()=>'<button type="button" class="app-back" data-back-page="menu"><span aria-hidden="true">‹</span> Cuenta</button>';
  function accountRow(label,detail,attrs,icon){
    return '<button type="button" class="account-row" '+attrs+'><span class="account-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">'+icon+'</svg></span><span><strong>'+label+'</strong><small>'+detail+'</small></span><span class="row-chevron" aria-hidden="true">›</span></button>';
  }
  function renderAccountSettings(){
    const p=state.profile,person=p.account_type==='person';
    return '<section class="account-identity"><span class="account-avatar" aria-hidden="true">'+esc(p.display_name.split(/\s+/).slice(0,2).map(x=>x[0]).join(''))+'</span><div><h2>'+esc(p.display_name)+'</h2><p>'+esc([p.municipality,p.province].filter(Boolean).join(', '))+'</p></div></section><section class="settings-group"><h3 class="settings-group-label">Mi perfil</h3><div class="account-group">'+
      (person?accountRow('Mi currículum','Experiencia, estudios y PDF','data-account-page="resume"','<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>'):'')+
      accountRow('Datos personales','Nombre, ubicación y contacto privado','data-account-page="profile"','<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>')+
      (person?accountRow('Mis reseñas','Tu experiencia en los negocios','data-account-page="my-reviews"','<path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.3-.9z"/>'):'')+
      '</div></section><section class="settings-group"><h3 class="settings-group-label">Ajustes</h3><div class="account-group">'+
      accountRow('Acceso y seguridad','Correo y contraseña','data-account-page="security"','<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>')+
      accountRow('Acerca de ConectaCuba','Información de la app y autor','data-action="about-app"','<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>')+
      '</div></section>'+(state.isAdmin?'<section class="settings-group"><h3 class="settings-group-label">Gestión</h3><div class="account-group">'+accountRow('Administración','Revisar negocios y reseñas','data-account-page="admin"','<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>')+(workflow?.capable()?accountRow('Reportes de ofertas','Revisar problemas comunicados','data-account-page="reports"','<path d="M5 3v18M5 4h13l-3 5 3 5H5"/>'):'')+'</div></section>':'')+(workflow?.settingsLinks()||'')+'<button type="button" class="logout-button" data-action="signout">Cerrar sesión</button>';
  }
  function renderSecurity(){
    return accountBack()+'<section class="soft-card account-form-card"><h2>Acceso y seguridad</h2><span class="small-note">Correo de tu cuenta</span><p class="security-email">'+esc(readSession()?.user?.email||'')+'</p><p>Usas este correo para entrar y recuperar el acceso.</p><button type="button" class="btn btn-primary" data-open="forgot">Cambiar contraseña</button></section>';
  }
  function aboutApp(){
    modalContent('Acerca de ConectaCuba','<div class="about-app"><img src="/icon.svg" width="72" height="72" alt=""><h3>ConectaCuba</h3><span class="app-version">Versión de prueba 0.19</span><p>Una conexión entre personas que buscan trabajo y negocios que necesitan talento en Cuba.</p><div class="about-author"><span>Creado por</span><strong>Mauricio Benitez Mora</strong></div><p class="small-note">Etapa piloto · Sin costo por ahora. Los negocios se revisan antes de publicar. Tú decides cuándo compartir tu currículum y contacto al postularte.</p><a class="btn btn-outline" href="/?view=web" target="_blank" rel="noopener">Conocer el proyecto</a>'+(!(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)?'<button type="button" class="btn btn-primary" data-action="install-app">Instalar en mi teléfono</button>':'')+'</div>');
  }

  function renderProfile(){
    const p=state.profile;
    return '<form class="form-grid account-form" data-form="profile">'+field('Nombre y apellidos *','display_name',p.display_name,'required minlength="2" maxlength="100" autocomplete="name"','',true)+locationFields(p)+field('Dirección o zona (privada)','address',p.address,'maxlength="300"','Nunca se comparte en postulaciones.',true)+field('Contacto alternativo (privado)','contact_recovery',p.contact_recovery,'maxlength="200"','No sustituye el correo de recuperación.',true)+(p.account_type==='person'?otherSelect('Canal de contacto preferido','public_contact','public_contact_other',['WhatsApp','Teléfono','Telegram','Otro'],['WhatsApp','Teléfono','Telegram','Otro'].includes(p.public_contact)?p.public_contact:'WhatsApp',p.public_contact_other,'Otro'):'')+'<div class="notice span2" role="status"></div><div class="form-actions span2"><button type="submit" class="btn btn-primary">Guardar datos</button></div></form>';
  }

  async function saveProfile(form,d){
    const p=state.profile;
    const value={display_name:d.display_name.trim(),province:d.province,municipality:d.municipality.trim(),address:d.address.trim(),contact_recovery:d.contact_recovery.trim(),updated_at:new Date().toISOString()};
    if(p.account_type==='person')Object.assign(value,{desired_job:d.desired_job===undefined?(p.desired_job||''):d.desired_job.trim(),profile_summary:d.profile_summary===undefined?(p.profile_summary||''):d.profile_summary.trim(),public_contact:d.public_contact||p.public_contact||'WhatsApp',public_contact_other:d.public_contact==='Otro'?(d.public_contact_other||'').trim():''});
    await patchOne('profiles?id=eq.'+p.id,value);form.dataset.dirty='false';await showAccount('profile',false);toast('Perfil guardado.');
  }
  const CV_FIELDS={intro:['Presentación profesional',4000],experience:['Experiencia laboral',10000],education:['Estudios y cursos',10000],skills:['Habilidades',4000],languages:['Idiomas',500],cv_contact:['WhatsApp para el PDF',200]};
  async function renderResume(){
    const r=await loadResume(),p=state.profile,completed=Object.keys(CV_FIELDS).filter(k=>k!=='cv_contact'&&r?.[k]?.trim()).length;
    return accountBack()+'<section class="resume-profile"><h2>Mi currículum</h2><p>'+esc(p.display_name)+' · '+esc(p.municipality)+'</p><div class="resume-progress"><span>'+completed+' de 5 secciones completadas</span><span class="progress-track"><span style="width:'+completed*20+'%"></span></span></div>'+(r?'<button type="button" class="btn btn-primary" data-account-page="resume-preview">Vista previa y PDF</button>':'<p class="small-note">Crea tu currículum completando las secciones de abajo.</p>')+'</section><div class="resume-sections account-group">'+Object.entries(CV_FIELDS).map(([key,[label]])=>'<button type="button" class="resume-row" data-cv-section="'+key+'"><span><strong>'+label+'</strong><small>'+esc(r?.[key]?.trim()?r[key].trim().replace(/\s+/g,' ').slice(0,100):'Añadir información')+'</small></span><span class="resume-row-state">'+(r?.[key]?.trim()?'Editar':'Añadir')+' <span aria-hidden="true">›</span></span></button>').join('')+'</div><p class="small-note resume-privacy">Tu dirección y contacto alternativo privados no aparecen en el PDF. Se incluye la marca ConectaCuba.</p>';
  }
  async function renderCvEditor(section='all'){
    const r=await loadResume()||{},keys=section==='all'?Object.keys(CV_FIELDS):Object.hasOwn(CV_FIELDS,section)?[section]:['intro'];
    return '<button type="button" class="app-back" data-back-page="resume"><span aria-hidden="true">‹</span> Currículum</button><section class="soft-card account-form-card"><h2>'+(keys.length===1?CV_FIELDS[keys[0]][0]:'Completar currículum')+'</h2><form class="form-grid account-form" data-form="resume" data-section="'+esc(section)+'">'+keys.map(key=>{
      const [label,max]=CV_FIELDS[key];return ['languages','cv_contact'].includes(key)?field(label,key,r[key],'maxlength="'+max+'"','',true):area(label,key,r[key],max);
    }).join('')+'<div class="notice span2" role="status"></div><div class="form-actions span2">'+pageButton('resume','Cancelar','outline')+'<button type="submit" class="btn btn-primary">Guardar cambios</button></div></form></section>';
  }
  function resumeSections(r){return [['Perfil profesional',r.intro],['Experiencia laboral',r.experience],['Estudios y cursos',r.education],['Habilidades',r.skills],['Idiomas',r.languages]].filter(x=>x[1]).map(([label,value])=>'<section class="cv-section"><h3>'+label+'</h3><p>'+esc(value)+'</p></section>').join('');}
  function renderCvPreview(){
    const p=state.profile,r=state.resume||{};
    if(!state.resume)return accountBack()+'<section class="soft-card"><h2>Primero completa tu currículum.</h2><p>Añade una sección para preparar tu PDF.</p>'+pageButton('resume','Completar currículum')+'</section>';
    return '<button type="button" class="app-back" data-back-page="resume"><span aria-hidden="true">‹</span> Volver a mi currículum</button><div class="pdf-tools"><button class="btn btn-primary" data-action="cv-print">Guardar como PDF</button><span>Elige “Guardar como PDF” en el menú de impresión.</span></div><article class="cv-paper"><span class="cv-watermark" aria-hidden="true">ConectaCuba</span><header class="cv-header"><div class="cv-monogram">'+esc(p.display_name.slice(0,1))+'</div><div><h1>'+esc(p.display_name)+'</h1><p>'+esc([p.municipality,p.province].join(' · '))+'</p><p>'+esc(r.cv_contact)+'</p></div></header>'+resumeSections(r)+'<footer class="cv-footer">Creado con ConectaCuba</footer></article>';
  }
  async function saveResume(form,d){
    const value={};for(const key of Object.keys(CV_FIELDS))if(d[key]!==undefined)value[key]=String(d[key]).trim();
    if(value.cv_contact&&window.CC_WORKFLOW){const normalized=window.CC_WORKFLOW.phone(value.cv_contact);if(!normalized)throw new Error('Indica un WhatsApp válido para el PDF, con prefijo internacional.');value.cv_contact=normalized;}
    const merged={...(state.resume||{}),...value};
    if(!Object.keys(CV_FIELDS).some(k=>k!=='cv_contact'&&String(merged[k]||'').trim()))throw new Error('Completa al menos una sección de tu currículum.');
    value.updated_at=new Date().toISOString();let row;
    if(state.resume)row=await patchOne('resumes?user_id=eq.'+state.profile.id,value);
    else{
      try{row=(await db('resumes',json('POST',{user_id:state.profile.id,...value})))?.[0];}
      catch(e){if(e.code!=='23505')throw e;row=await patchOne('resumes?user_id=eq.'+state.profile.id,value);}
    }
    if(!row)throw new Error('No se pudo confirmar el guardado del currículum.');
    state.resume=row;form.dataset.dirty='false';
    if(form.dataset.section!=='all'&&history.state?.fromHash==='#cuenta/resume'&&typeof history.back==='function')history.back();
    else await showAccount(form.dataset.section==='all'?'resume-preview':'resume',false);
    toast('Currículum guardado.');
  }

  function logo(b){
    return b.logo_path?'<img class="business-logo" src="'+esc(cfg.url+'/storage/v1/object/public/business-logos/'+b.logo_path+'?v='+encodeURIComponent(b.updated_at||''))+'" alt="Imagen de '+esc(b.business_name)+'" width="68" height="68" loading="lazy">':'<span class="business-logo business-initial" aria-hidden="true">'+esc((b.business_name||'CC').slice(0,2).toUpperCase())+'</span>';
  }
  function safeLink(value,label=value){
    try{let raw=String(value||'').trim();if(!raw)return '';if(!/^https?:\/\//i.test(raw))raw='https://'+raw;const url=new URL(raw);if(!['https:','http:'].includes(url.protocol))return esc(label);return '<a class="contact-link" href="'+esc(url.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';}catch{return esc(label);}
  }
  function contactLink(value){
    const text=String(value||'').trim();if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text))return '<a class="contact-link" href="mailto:'+esc(text)+'">'+esc(text)+'</a>';
    const digits=text.replace(/[^0-9]/g,'');
    if(/^\+?[0-9 ()-]{7,24}$/.test(text)&&digits.length>=7&&digits.length<=15){
      const wa=digits.length===8?'53'+digits:digits,tel=(digits.length===8?'+53':text.startsWith('+')?'+':'')+digits;
      return '<a class="contact-link" href="tel:'+tel+'">'+esc(text)+'</a> · <a class="contact-link" href="https://wa.me/'+wa+'" target="_blank" rel="noopener noreferrer">WhatsApp</a>';
    }
    return esc(text);
  }
  async function renderBusiness(){
    const b=state.business;if(!b)return '<div class="notice show info">No encontramos la solicitud de tu negocio.</div>';
    return '<div class="review-card"><div class="review-card-head"><h3>'+esc(b.business_name)+'</h3>'+chip(b.review_status)+'</div><p>Correo '+(b.email_confirmed?'confirmado':'pendiente de confirmar')+' · '+esc(b.contact_email)+'</p>'+
      (b.review_note?'<p class="review-note"><strong>Mensaje de administración:</strong><br>'+esc(b.review_note)+'</p>':'')+
      '<p>'+esc(b.description)+'</p></div><div class="photo-editor">'+logo(b)+'<form data-form="logo" class="account-form"><label for="business-image">Imagen del negocio</label><input id="business-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required><p class="hint">JPG, PNG o WebP de hasta 5 MB. La imagen se reduce antes de subir para ahorrar datos. Cambiarla envía el perfil a revisión.</p><div class="notice" role="status"></div><button class="btn btn-outline" type="submit">Guardar imagen</button></form></div>'+
      '<div class="account-note">Al cambiar los datos del negocio o la evidencia, el negocio vuelve a revisión y sus vacantes abiertas se cierran. Tras aprobarse puedes reabrirlas desde “Mis vacantes”.</div>'+
      '<form class="form-grid account-form" data-form="business-edit">'+businessFields(b)+'<div class="notice span2" role="status"></div><div class="form-actions span2">'+pageButton('overview','Volver','outline')+'<button type="submit" class="btn btn-primary">Guardar datos y enviar a revisión</button></div></form>';
  }
  async function saveBusiness(form,d){
    const value={};
    for(const key of ['business_name','contact_person','business_activity','province','municipality','description','whatsapp','other_contact','proof_url','business_address'])value[key]=String(d[key]??state.business?.[key]??'').trim();
    value.business_activity_other=d.business_activity==='Otra'?(d.business_activity_other||'').trim():'';
    value.show_address=state.business?.show_address===true;
    await patchOne('business_applications?user_id=eq.'+state.profile.id,value);
    form.dataset.dirty='false';await showAccount('business',false);await loadPublicData();toast('Información del negocio guardada.');
  }
  async function uploadLogo(form){
    const epoch=sessionEpoch,userId=state.profile?.id;
    const file=form.querySelector('[type="file"]').files[0];if(!file)throw new Error('Selecciona una imagen.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Usa una imagen JPG, PNG o WebP de hasta 5 MB.');
    const image=await createImageBitmap(file).catch(()=>null);if(!image)throw new Error('No pudimos leer esta imagen. Prueba otra foto JPG o PNG.');
    let canvas;
    try{
      guardSession(epoch,userId);const scale=Math.min(1,640/Math.max(image.width,image.height));canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    }finally{image.close();}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));if(!blob||blob.type!=='image/webp')throw new Error('Este navegador no pudo comprimir la foto. Prueba con una versión actualizada de Chrome o Safari.');
    const s=await session();guardSession(epoch,userId);const path=userId+'/'+crypto.randomUUID()+'.webp';
    await request('/storage/v1/object/business-logos/'+path,{method:'POST',headers:{'Content-Type':'image/webp','cache-control':'3600'},body:blob},s.access_token);
    guardSession(epoch,userId);
    await patchOne('business_applications?user_id=eq.'+s.user.id,{logo_path:path});
    form.dataset.dirty='false';await showAccount('business',false);toast('Imagen guardada. El negocio se revisará antes de publicar.');
  }
  const salaryLabel=j=>{
    const fmt=x=>new Intl.NumberFormat('es',{maximumFractionDigits:2}).format(Number(x)),currency=j.salary_currency||'CUP',period=({monthly:'/ mes',weekly:'/ semana',daily:'/ día',hourly:'/ hora',negotiable:'· a convenir'})[j.salary_period]||'';
    if(j.salary_min!=null&&j.salary_max!=null)return fmt(j.salary_min)+'–'+fmt(j.salary_max)+' '+currency+' '+period;
    if(j.salary_min!=null)return 'Desde '+fmt(j.salary_min)+' '+currency+' '+period;if(j.salary_max!=null)return 'Hasta '+fmt(j.salary_max)+' '+currency+' '+period;return 'Salario a convenir';
  };
  function renderJobsPage(){return hiring.renderJobs();}

  function renderJobEditor(id){
    const j=(state.ownJobs||[]).find(x=>x.id===id)||{province:state.business.province,municipality:state.business.municipality};
    state.page='editor';setAppView('editor');$('account-app').dataset.page='editor';$('account-welcome').textContent=id?'Editar vacante':'Nueva vacante';document.title=(id?'Editar vacante':'Nueva vacante')+' · ConectaCuba';markNavigation('editor');
    const schedule=['A convenir','Tiempo completo','Medio tiempo','Por días','Por contrato','Otro'],customSchedule=j.work_schedule&&!schedule.includes(j.work_schedule);
    $('account-content').innerHTML='<button type="button" class="app-back" '+(id?'data-hiring-job="'+id+'"':'data-account-page="jobs"')+'>‹ Vacantes</button><h2>'+(id?'Editar vacante':'Nueva vacante')+'</h2><p class="small-note">El salario es opcional. Indica su moneda y período para que se entienda la oferta.</p><form class="form-grid account-form" data-form="job"'+(id?' data-id="'+id+'"':'')+'>'+
      field('Puesto *','title',j.title,'required minlength="3" maxlength="100"','',true)+
      otherSelect('Actividad *','category','category_other',activities,j.category,j.category_other)+
      otherSelect('Jornada *','work_schedule','work_schedule_other',schedule,customSchedule?'Otro':j.work_schedule,customSchedule?j.work_schedule:'','Otro')+
      locationFields(j)+select('Modalidad *','work_modality',['Presencial','Remoto','Híbrido'],j.work_modality||'Presencial',null)+
      select('Moneda del salario','salary_currency',['CUP','USD','EUR','MLC'],j.salary_currency||'CUP',null)+
      field('Salario mínimo (opcional)','salary_min',j.salary_min,'type="number" min="0" max="9999999999" step="0.01" inputmode="decimal"')+
      field('Salario máximo (opcional)','salary_max',j.salary_max,'type="number" min="0" max="9999999999" step="0.01" inputmode="decimal"')+
      '<div class="field"><label for="f-salary_period">Período del salario</label><select name="salary_period" id="f-salary_period">'+Object.entries({negotiable:'A convenir',monthly:'Mensual',weekly:'Semanal',daily:'Diario',hourly:'Por hora'}).map(([key,label])=>'<option value="'+key+'"'+((j.salary_period||'negotiable')===key?' selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
      area('Descripción, funciones y requisitos *','description',j.description,5000,true)+'<div class="notice span2" role="status"></div><div class="form-actions span2">'+(id?'<button type="button" class="btn btn-outline" data-hiring-job="'+id+'">Cancelar</button>':pageButton('jobs','Cancelar','outline'))+(workflow?'<button type="button" class="btn btn-outline" data-workflow-preview-job>Vista previa</button>':'')+'<button type="submit" class="btn btn-primary">'+(id?'Guardar vacante':'Publicar vacante')+'</button></div></form>';
  }
  async function saveJob(form,d){
    const min=d.salary_min===''?null:Number(d.salary_min),max=d.salary_max===''?null:Number(d.salary_max);
    if([min,max].some(value=>value!==null&&(!Number.isFinite(value)||value<0)))throw new Error('El salario debe ser un número válido y no negativo.');
    if(min!==null&&max!==null&&min>max)throw new Error('El salario máximo no puede ser menor que el mínimo.');
    const value={title:d.title.trim(),category:d.category,category_other:d.category==='Otra'?(d.category_other||'').trim():'',province:d.province,municipality:d.municipality.trim(),work_modality:d.work_modality,work_schedule:d.work_schedule==='Otro'?d.work_schedule_other.trim():d.work_schedule,description:d.description.trim(),salary_min:min,salary_max:max,salary_currency:d.salary_currency,salary_period:d.salary_period};
    let jobId=form.dataset.id;if(jobId)await patchOne('job_posts?id=eq.'+jobId,value);
    else{const rows=await db('job_posts',json('POST',{business_user_id:state.profile.id,...value}));jobId=rows?.[0]?.id;if(!jobId)throw new Error('No pudimos confirmar el guardado de la vacante. Actualiza tus vacantes antes de publicar otra.');}
    form.dataset.dirty='false';await showAccount('job',false,null,{jobId,history:'replace'});await loadPublicData();toast('Vacante guardada.');
  }
  function readPublicCache(){
    try{const cache=JSON.parse(localStorage.getItem('cc_public_cache')||'null');if(cache&&Array.isArray(cache.jobs)){state.jobs=cache.jobs;state.publicFailed=true;renderPublicJobs(true);if(cache.businesses) localStorage.setItem('cc_public_cache',JSON.stringify({jobs:cache.jobs,saved_at:cache.saved_at}));}}catch{}
  }
  async function loadPublicData(){
    try{
      state.jobs=await request('/rest/v1/job_posts?select=*&status=eq.published&order=created_at.desc&limit=100')||[];state.publicFailed=false;renderPublicJobs();
      try{localStorage.setItem('cc_public_cache',JSON.stringify({jobs:state.jobs,saved_at:Date.now()}));}catch{}
    }catch(e){
      state.publicFailed=true;
      if(state.jobs.length)renderPublicJobs(true);
      else{$('job-list').innerHTML='';$('result-count').textContent='No pudimos actualizar los empleos';$('job-source').textContent='Revisa tu conexión y vuelve a intentar';$('empty').hidden=false;$('empty-message').textContent=humanError(e);$('jobs-board').classList.add('is-empty');$('empty').querySelector('h2').textContent='Retoma tu búsqueda cuando tengas conexión.';const retry=document.createElement('button');retry.className='text-btn';retry.dataset.action='refresh-public';retry.textContent='Volver a intentar';if(!$('empty').querySelector('[data-action="refresh-public"]'))$('empty').append(retry);}
    }
  }
  function renderPublicJobs(cached=false){opportunities.renderFeed(cached);}
  async function openSaved(leave=true,routeOptions={}){
    if(leave&&!allowLeave())return;
    opportunities.cancelOffer();const version=++state.render;closeModal();state.page='saved';setAppView('saved');
    $('inicio').hidden=true;$('account-app').hidden=false;$('account-app').dataset.page='saved';$('account-welcome').hidden=true;
    $('account-content').innerHTML='<p class="loading" role="status">Cargando ofertas guardadas…</p>';
    writeRoute('#guardadas',routeOptions.history||(leave?'push':'replace'),{page:'saved'});updateHeader();markNavigation('saved');
    try{
      if(readSession()?.access_token&&!state.profile)await loadAccountContext();
      const html=await opportunities.renderSaved();if(version!==state.render)return;
      $('account-content').innerHTML=html;document.title='Ofertas guardadas · ConectaCuba';window.scrollTo({top:0});
    }catch(e){if(version!==state.render||e.code==='STALE_REQUEST')return;$('account-content').innerHTML='<button type="button" class="app-back" data-back-home>‹ Empleos</button><p>'+esc(humanError(e))+'</p><button class="btn btn-primary" data-account-page="saved">Volver a intentar</button>';}
  }
  async function openPublicJob(id,tab='offer',routeOptions={}){
    if(routeOptions.leave!==false&&!allowLeave())return;
    if(!['offer','company','reviews'].includes(tab))tab='offer';
    if(state.page==='search')state.feedScroll=window.scrollY||0;
    if(state.page!=='offer')state.offerOrigin=state.page==='saved'?'saved':'search';
    const sameOffer=state.page==='offer'&&state.ownerJobId===id&&$('account-app').dataset.page==='offer';
    const version=++state.render;closeModal();state.page='offer';setAppView('offer');state.ownerJobId=id;
    $('inicio').hidden=true;$('account-app').hidden=false;$('account-app').dataset.page='offer';$('account-welcome').hidden=true;$('account-welcome').textContent='Oferta de empleo';$('account-subtitle').textContent='';
    if(!sameOffer)$('account-content').innerHTML='<p class="loading" role="status">Cargando oferta…</p>';
    else $('account-content').setAttribute('aria-busy','true');
    updateHeader();markNavigation();
    writeRoute('#oferta/'+id+(tab!=='offer'?'/'+tab:''),routeOptions.history||'push',{page:'offer',jobId:id,tab});
    try{
      const html=await opportunities.renderOffer(id,tab);if(version!==state.render)return;
      $('account-content').innerHTML=html;$('account-content').removeAttribute('aria-busy');document.title='Oferta de empleo · ConectaCuba';if(!sameOffer)window.scrollTo({top:0});
    }catch(e){
      if(version!==state.render||e.code==='STALE_REQUEST')return;
      $('account-content').removeAttribute('aria-busy');$('account-content').innerHTML='<button type="button" class="app-back" data-home="#vacantes">‹ Ofertas</button><section class="soft-card"><h2>No pudimos cargar esta oferta.</h2><p>'+esc(humanError(e))+'</p><button type="button" class="btn btn-primary" data-offer-tab="'+esc(tab)+'" data-offer-id="'+esc(id)+'">Volver a intentar</button></section>';
    }
  }
  function showJob(id){return openPublicJob(id);}

  async function applyJob(id){
    const s=await session();state.pendingJob=id;
    if(!s){openModal('login');toast('Inicia sesión o crea tu perfil para postularte.','info');return;}
    const {p}=await loadProfile();if(p.account_type!=='person'){toast('Las postulaciones están disponibles para cuentas de persona.','info');return;}
    const result=await db('job_posts?id=eq.'+encodeURIComponent(id)+'&status=eq.published&select=*&limit=1'),j=result[0];
    if(!j){toast('Esta vacante ya no está disponible.','info');await loadPublicData();return;}
    const duplicate=await db('job_applications?job_id=eq.'+id+'&applicant_id=eq.'+p.id+'&select=id&limit=1');
    if(duplicate.length){toast('Ya te postulaste a esta vacante.');await showAccount('applications');return;}
    const r=await loadResume();
    if(!r||!['intro','experience','education','skills','languages'].some(k=>String(r[k]||'').trim())){closeModal();await showAccount('resume');toast('Completa al menos una sección de tu currículum antes de postularte.','info');return;}
    modalContent('Postularme a '+j.title,'<p>Enviarás tu currículum a <strong>'+esc(j.business_name)+'</strong>.</p><form class="form-grid" data-form="apply" data-id="'+id+'">'+
      field('WhatsApp para este negocio *','contact',window.CC_WORKFLOW?.phone(r.cv_contact)||'','type="tel" inputmode="tel" required minlength="8" maxlength="24"','Incluye el código del país. Para un número cubano de 8 cifras añadiremos +53.',true)+area('Mensaje de presentación (opcional)','message','',2000)+
      '<label class="check-field span2"><input type="checkbox" name="consent" required><span>Autorizo compartir mi nombre, municipio y provincia, este currículum y el contacto indicado con '+esc(j.business_name)+'. Mi dirección y contacto alternativo privados no se envían.</span></label>'+formEnd('Enviar postulación'));
  }
  async function saveApplication(form,d){
    if(d.consent!=='on')throw new Error('Confirma que deseas compartir tu currículum con este negocio.');
    if(window.CC_WORKFLOW&&!window.CC_WORKFLOW.phone(d.contact))throw new Error('Revisa tu WhatsApp e incluye el prefijo internacional.');
    const r=state.resume||{},snapshot={};
    for(const k of ['intro','experience','education','skills','languages'])snapshot[k]=r[k]||'';
    const submittedRows=await db('job_applications',json('POST',{job_id:form.dataset.id,applicant_id:state.profile.id,cv_snapshot:snapshot,contact:window.CC_WORKFLOW?.phone(d.contact)||d.contact.trim(),message:d.message.trim(),consent:true}));
    if(submittedRows?.[0])workflow?.markSeen(submittedRows[0]);
    state.pendingJob=null;form.dataset.dirty='false';closeModal();await showAccount('applications',false);toast('Postulación enviada. Puedes seguir su estado aquí.');
  }
  function renderApplications(){return opportunities.renderApplications();}

  async function renderAdmin(){
    const rows=await db('business_applications?select=*&order=created_at.desc&limit=100');state.reviews=rows;
    return accountBack()+opportunities.adminTabs('business')+'<h2>Revisión de negocios</h2><p>'+rows.filter(x=>x.review_status==='pending').length+' pendientes. Revisa la evidencia y el correo antes de aprobar.</p><div class="toolbar"><label for="review-filter">Mostrar</label><select id="review-filter"><option value="pending">Pendientes</option><option value="">Todos</option><option value="approved">Aprobados</option><option value="rejected">Requieren correcciones</option></select></div><div id="review-list" class="review-list">'+reviewCards(rows.filter(x=>x.review_status==='pending'))+'</div>';
  }
  function reviewCards(rows){
    return rows.length?rows.map(b=>'<article class="review-card">'+logo(b)+'<div class="review-card-head"><h3>'+esc(b.business_name)+'</h3>'+chip(b.review_status)+'</div><p><strong>Responsable:</strong> '+esc(b.contact_person)+'<br><strong>Correo:</strong> '+esc(b.contact_email)+(b.email_confirmed?' · confirmado':' · sin confirmar')+'<br><strong>Actividad:</strong> '+esc(b.business_activity)+(b.business_activity_other?': '+esc(b.business_activity_other):'')+'<br><strong>Ubicación:</strong> '+esc([b.municipality,b.province].join(', '))+'<br><strong>Dirección:</strong> '+esc(b.business_address)+' · dato privado de la solicitud'+'<br><strong>Contacto:</strong> '+esc([b.whatsapp,b.other_contact].filter(Boolean).join(' · '))+'</p><p>'+esc(b.description)+'</p><p><strong>Evidencia:</strong> '+safeLink(b.proof_url)+'</p>'+(b.review_note?'<p class="review-note">'+esc(b.review_note)+'</p>':'')+'<div class="review-actions"><button class="btn btn-primary" data-approve="'+b.user_id+'" '+(b.email_confirmed?'':'disabled title="Debe confirmar su correo"')+'>Aprobar</button><button class="btn btn-outline" data-reject="'+b.user_id+'">Pedir correcciones</button></div></article>').join(''):'<p class="account-note">No hay solicitudes en este estado.</p>';
  }


  async function signup(form,d,type){
    if(d.password!==d.confirm_password)throw new Error('Las contraseñas no coinciden. Revisa ambos campos.');
    const metadata={account_type:type,display_name:(d.display_name||d.contact_person||'').trim(),contact_recovery:(d.contact_recovery||'').trim(),province:d.province,municipality:d.municipality.trim(),address:(d.address||'').trim(),desired_job:(d.desired_job||'').trim(),profile_summary:(d.profile_summary||'').trim(),public_contact:d.public_contact||'Correo',public_contact_other:d.public_contact==='Otro'?(d.public_contact_other||'').trim():'',discoverable:false};
    if(type==='business')for(const k of ['business_name','contact_person','business_activity','business_activity_other','description','whatsapp','other_contact','proof_url','business_address'])metadata[k]=(d[k]||'').trim();
    if(type==='business')metadata.show_address=false;
    const result=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+'/'),{method:'POST',body:JSON.stringify({email:d.email.trim().toLowerCase(),password:d.password,data:metadata})});
    if(result.access_token||result.session?.access_token){rememberSession(result.session||result);await enterWorkspace();return;}
    modalContent('Confirma tu correo','<div class="notice show ok">Revisa <strong>'+esc(d.email)+'</strong> y abre el enlace de confirmación. Si ya tienes una cuenta con ese correo, inicia sesión. '+(type==='business'?'El negocio quedará pendiente de revisión.':'')+'</div><p class="hint">Revisa también la carpeta de correo no deseado. Si no llega, solicita otra confirmación desde el inicio de sesión.</p><div class="account-actions"><button class="btn btn-primary" data-open="login">Ya estoy registrado · Iniciar sesión</button></div>');
  }
  async function login(d){
    const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:d.email.trim().toLowerCase(),password:d.password})});
    rememberSession(s);const pending=state.pendingJob;state.pendingJob=null;
    if(pending)await applyJob(pending);else await enterWorkspace();
  }
  async function authRedirect(){
    const params=new URLSearchParams(location.hash.slice(1));
    if(params.has('error_description')){
      history.replaceState(null,'',location.pathname);openModal('login');notice($('modal-content').querySelector('form'),'El enlace caducó o ya fue usado. Solicita uno nuevo.');return true;
    }
    const access=params.get('access_token');if(!access)return false;
    history.replaceState(null,'',location.pathname+location.search);
    const s={access_token:access,refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in')||3600),expires_at:Number(params.get('expires_at')||Math.floor(Date.now()/1000)+3600)};
    try{s.user=await request('/auth/v1/user',{},access);rememberSession(s);}
    catch(e){toast('Este enlace no pudo confirmar tu sesión. Solicita otro correo.','info');return false;}
    if(params.get('type')==='recovery'){
      modalContent('Elegir nueva contraseña','<form class="form-grid" data-form="reset">'+passwordField()+passwordField('confirm_password','Repite la contraseña *')+formEnd('Guardar contraseña',false));return true;
    }
    await enterWorkspace();toast('Correo confirmado. Ya puedes usar tu cuenta.');return true;
  }
  async function submit(form){
    const d=Object.fromEntries(new FormData(form).entries()),type=form.dataset.form;
    for(const input of form.querySelectorAll('input[required],textarea[required]')){if(input.disabled||['password','confirm_password'].includes(input.name)||['password','checkbox','file'].includes(input.type))continue;const min=Math.max(1,input.minLength||0);if(input.value.trim().length<min)throw new Error('Completa el campo «'+(input.labels?.[0]?.textContent||input.name)+'» con al menos '+min+' caracteres.');}
    if(await workflow?.handleSubmit(form,d))return;
    if(await opportunities.handleSubmit(form,d))return;
    if(['person','business'].includes(type))return signup(form,d,type);
    if(type==='login')return login(d);
    if(type==='profile')return saveProfile(form,d);
    if(type==='resume')return saveResume(form,d);
    if(type==='business-edit')return saveBusiness(form,d);
    if(type==='logo')return uploadLogo(form);
    if(type==='job')return saveJob(form,d);
    if(type==='apply')return saveApplication(form,d);
    if(type==='reject'){
      await patchOne('business_applications?user_id=eq.'+form.dataset.id,{review_status:'rejected',review_note:d.review_note.trim()});closeModal();await showAccount('admin',false);await loadPublicData();toast('Correcciones enviadas al panel del negocio.');return;
    }
    if(type==='forgot'){
      await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+'/'),{method:'POST',body:JSON.stringify({email:d.email.trim().toLowerCase()})});
      notice(form,'Si este correo tiene una cuenta, recibirás un enlace para recuperar el acceso.','ok');return;
    }
    if(type==='reset'){
      if(d.password!==d.confirm_password)throw new Error('Las contraseñas no coinciden.');
      const s=await session();await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({password:d.password})},s.access_token);
      closeModal();await showAccount('overview',false);toast('Contraseña actualizada.');return;
    }
  }
  document.addEventListener('submit',async e=>{
    const form=e.target;if(!form.matches('form[data-form]'))return;e.preventDefault();
    if(form.dataset.busy==='true'||!form.reportValidity())return;
    form.dataset.busy='true';const button=form.querySelector('[type="submit"]'),label=button?.textContent;
    if(button){button.disabled=true;button.textContent='Guardando…';}
    try{await submit(form);if(form.dataset.dirty==='false'||!form.isConnected)window.CC_DRAFTS?.clear(form);}catch(error){notice(form,humanError(error));}
    finally{if(form.isConnected){form.dataset.busy='false';if(button){button.disabled=false;button.textContent=label;}}}
  });
  document.addEventListener('input',e=>{
    const form=e.target.closest('form[data-form]');if(form&&['profile','resume','job','business-edit','logo'].includes(form.dataset.form))form.dataset.dirty='true';
    if(['q','mun'].includes(e.target.id))renderPublicJobs();
  });
  document.addEventListener('change',async e=>{
    try{if(await hiring.handleChange(e))return;}catch(error){if(error.code!=='STALE_REQUEST')toast(humanError(error),'info');return;}
    const x=e.target;
    if(x.dataset.other){
      const other=x.form.elements.namedItem(x.dataset.other),label=x.form.querySelector('[data-other-label="'+x.dataset.other+'"]'),on=x.value===x.dataset.otherValue;
      other.hidden=!on;other.disabled=!on;other.required=on;if(label)label.hidden=!on;
    }
    if(['cat','province-filter'].includes(x.id))renderPublicJobs();
    if(x.id==='review-filter')$('review-list').innerHTML=reviewCards(state.reviews.filter(b=>!x.value||b.review_status===x.value));
  });
  document.addEventListener('click',async e=>{
    const target=e.target.closest('button,a');if(!target)return;
    if(target.classList.contains('password-toggle')){
      e.preventDefault();const input=target.parentElement.querySelector('input'),show=input.type==='password';input.type=show?'text':'password';
      target.textContent=show?'Ocultar':'Mostrar';target.setAttribute('aria-pressed',String(show));target.setAttribute('aria-label',(show?'Ocultar':'Mostrar')+' contraseña');return;
    }
    try{
      if(await workflow?.handleClick(e))return;
      if(await opportunities.handleClick(e))return;
      if(await hiring.handleClick(e))return;
      if(target.dataset.open){e.preventDefault();openModal(target.dataset.open);return;}
      if(target.hasAttribute('data-close-modal')){e.preventDefault();closeModal();return;}
      if(target.dataset.backPage){await goBackTo(target.dataset.backPage);return;}
      if(target.hasAttribute('data-back-home')){await goBackTo('search');return;}
      if(target.dataset.accountPage){e.preventDefault();await showAccount(target.dataset.accountPage);return;}
      if(target.dataset.home){e.preventDefault();showHome(target.dataset.home);return;}
      if(target.id==='account-home'){showHome();return;}
      if(target.id==='account-signout'||target.dataset.action==='signout'){
        if(!allowLeave())return;const s=readSession();saveSession(null);clearPrivateAccount();
        showHome('#inicio',false);if(s)request('/auth/v1/logout',{method:'POST'},s.access_token).catch(()=>{});return;
      }
      if(target.matches('a[href^="#"]')){const href=target.getAttribute('href');if(href!=='#'){e.preventDefault();if(state.profile?.account_type==='business'&&href==='#empleos')await showAccount('jobs');else showHome(href);}return;}
      if(target.id==='search'){renderPublicJobs();return;}
      if(target.dataset.viewJob){await showJob(target.dataset.viewJob);return;}
      if(target.dataset.cvSection){await showAccount('resume-edit',true,null,{section:target.dataset.cvSection});return;}
      if(target.dataset.applyJob){await applyJob(target.dataset.applyJob);return;}
      if(target.dataset.editJob){if(allowLeave())renderJobEditor(target.dataset.editJob);return;}
      if(target.dataset.jobStatus){
        if(!confirm(target.dataset.status==='closed'?'¿Cerrar esta vacante? Dejará de aparecer en la búsqueda.':'¿Reabrir esta vacante y mostrarla en la búsqueda?'))return;
        target.disabled=true;await patchOne('job_posts?id=eq.'+target.dataset.jobStatus,{status:target.dataset.status});await showAccount('job',false,null,{jobId:target.dataset.jobStatus,history:'replace'});await loadPublicData();return;
      }
      if(target.dataset.withdraw){
        if(!confirm('¿Retirar esta postulación? No podrás enviarla de nuevo a la misma vacante.'))return;
        await patchOne('job_applications?id=eq.'+target.dataset.withdraw,{status:'withdrawn'});
        if(state.page==='application'&&state.ownerApplicationId===target.dataset.withdraw)await showAccount('application',false,null,{applicationId:target.dataset.withdraw});
        else if(state.page==='applications')await showAccount('applications',false);
        toast('Postulación retirada.');return;
      }
      if(target.dataset.approve){
        if(!confirm('¿Confirmas que revisaste la evidencia y quieres aprobar este negocio?'))return;
        target.disabled=true;await patchOne('business_applications?user_id=eq.'+target.dataset.approve,{review_status:'approved',review_note:''});
        await showAccount('admin',false);await loadPublicData();toast('Negocio aprobado.');return;
      }
      if(target.dataset.reject){
        modalContent('Pedir correcciones','<p>El negocio verá este mensaje en su cuenta y podrá corregir sus datos.</p><form class="form-grid" data-form="reject" data-id="'+target.dataset.reject+'">'+area('Explica qué debe corregir *','review_note','',2000,true)+formEnd('Enviar correcciones'));return;
      }
      if(target.id==='install-app'||target.dataset.action==='install-app'){
        if(window.ccInstallPrompt){window.ccInstallPrompt.prompt();await window.ccInstallPrompt.userChoice;window.ccInstallPrompt=null;}
        else toast('En Android: menú del navegador → Instalar app o Añadir a pantalla de inicio. En iPhone: Safari → Compartir → Añadir a pantalla de inicio.','info');return;
      }
      if(target.dataset.action){
        e.preventDefault();
        switch(target.dataset.action){
          case 'home':showHome();break;
          case 'about-app':aboutApp();break;
          case 'retry-account':{const route=state.failedRoute||{page:state.page};await showAccount(route.page,false,null,{...route,history:'replace'});break;}
          case 'relogin':saveSession(null);clearPrivateAccount();showHome('#inicio',false);openModal('login');break;
          case 'cv-edit':await showAccount('resume-edit',true,null,{section:'all'});break;
          case 'cv-preview':await showAccount('resume-preview');break;
          case 'cv-print':window.print();break;
          case 'new-job':if(allowLeave())renderJobEditor();break;
          case 'refresh-public':await loadPublicData();break;
          case 'resend':{
            const form=target.closest('form'),email=form.elements.email;if(!email.reportValidity())return;
            target.disabled=true;
            try{await request('/auth/v1/resend?redirect_to='+encodeURIComponent(location.origin+'/'),{method:'POST',body:JSON.stringify({type:'signup',email:email.value.trim().toLowerCase()})});notice(form,'Si tu cuenta necesita confirmación, recibirás otro enlace. Revisa también el correo no deseado.','ok');}
            finally{target.disabled=false;}break;
          }
        }
      }
    }catch(error){target.disabled=false;if(error.code!=='STALE_REQUEST')toast(humanError(error),'info');}
  });
  $('close-modal').addEventListener('click',closeModal);
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
  document.addEventListener('keydown',e=>{
    if($('modal').classList.contains('open')){
      if(e.key==='Escape'){e.preventDefault();closeModal();}
      if(e.key==='Tab'){
        const nodes=Array.from($('modal').querySelectorAll('button,a,input,select,textarea,[tabindex="0"]')).filter(n=>!n.disabled&&!n.hidden&&n.getClientRects().length),first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }
    if(e.key==='Enter'&&['q','mun'].includes(e.target.id)){e.preventDefault();renderPublicJobs();}
  });
  document.addEventListener('error',e=>{const img=e.target;if(img.tagName==='IMG'&&img.classList.contains('business-logo')){const span=document.createElement('span');span.className='business-logo business-initial';span.textContent='CC';img.replaceWith(span);}},true);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.ccInstallPrompt=e;});
  window.addEventListener('appinstalled',()=>toast('ConectaCuba se añadió a tu teléfono.'));
  window.addEventListener('storage',async e=>{
    if(e.key!==sessionKey&&e.key!==null)return;
    const current=readSession();let previous=null;try{previous=JSON.parse(e.oldValue||'null');}catch{}
    if(!current?.access_token||current.user?.id!==previous?.user?.id){
      clearPrivateAccount();showHome('#inicio',false);
      if(current?.access_token)await enterWorkspace().catch(error=>{if(error.code!=='STALE_REQUEST')toast(humanError(error),'info');});
    }else updateHeader();
  });
  window.addEventListener('online',()=>loadPublicData());
  window.addEventListener('beforeunload',e=>{if(document.querySelector('form[data-dirty="true"]')){e.preventDefault();e.returnValue='';}});
  workflow=window.CC_WORKFLOW?.create({
    db,patchOne,request,esc,date,salaryLabel,modal:modalContent,closeModal,toast,confirm:message=>confirm(message),
    getProfile:()=>state.profile,goAccount:showAccount,goPerson:openEmployerPerson
  })||null;
  hiring=window.CC_HIRING.create({
    workflow,
    db,patchOne,esc,chip,date,salaryLabel,resumeSections,contactLink,toast,
    document,confirm:message=>confirm(message),getProfile:()=>state.profile,getBusiness:()=>state.business,
    getRoute:()=>({page:state.page,jobId:state.ownerJobId,applicationId:state.ownerApplicationId}),
    onJobsLoaded:rows=>{state.ownJobs=rows;},
    onJobLoaded:job=>{const rows=state.ownJobs||[];state.ownJobs=[job,...rows.filter(x=>x.id!==job.id)];},
    goJob:openEmployerJob,goPerson:openEmployerPerson,goBack:hiringBack
  });
  opportunities=window.CC_OPPORTUNITIES.create({
    workflow,
    request,db,json,patchOne,esc,date,salaryLabel,resumeSections,contactLink,logo,field,select,area,provinces,activities,
    document,search:location.search,getJobs:()=>state.jobs,getProfile:()=>state.profile,getOfferOrigin:()=>state.offerOrigin||'search',
    setApplications:rows=>{state.applications=rows;},getRoute:()=>({page:state.page,jobId:state.ownerJobId,applicationId:state.ownerApplicationId}),
    modal:modalContent,closeModal,toast,confirm:message=>confirm(message),showHome:()=>showHome('#vacantes'),
    goOffer:openPublicJob,goAccount:showAccount,requireLogin:route=>{state.afterLoginPage=route;openModal('login');},
    setSearchURL:filters=>{const params=new URLSearchParams(location.search);for(const key of ['q','province','category','municipality'])filters[key]?params.set(key,filters[key]):params.delete(key);const url=location.pathname+(params.toString()?'?'+params.toString():'')+location.hash;history.replaceState(history.state,'',url);state.lastURL=url;state.lastHistory=history.state;},
    clearSearchURL:()=>{const params=new URLSearchParams(location.search);for(const key of ['q','province','category','municipality'])params.delete(key);const url=location.pathname+(params.toString()?'?'+params.toString():'')+location.hash;history.replaceState(history.state,'',url);state.lastURL=url;state.lastHistory=history.state;}
  });
  if(window.CC_PREVIEW_STORE)window.CC_PREVIEW_OPEN_WA=url=>{
    let parsed;try{parsed=new URL(url);}catch{return;}
    if(parsed.protocol!=='https:'||parsed.hostname!=='wa.me')return;
    const message=parsed.searchParams.get('text')||'Hola, quisiera información sobre esta vacante.';
    modalContent('WhatsApp · Mensaje de prueba','<p class="account-note">Así se preparará la conversación. Los números de esta beta son ficticios y no se abrirá ni enviará un mensaje real.</p><label class="field">Número de ejemplo<input readonly value="'+esc(parsed.pathname.slice(1))+'"></label><label class="field">Mensaje preparado<textarea id="workflow-preview-message" readonly rows="5">'+esc(message)+'</textarea></label><button type="button" class="btn btn-primary" data-workflow-copy-message>Copiar solo el mensaje</button>');
  };
  window.addEventListener('popstate',async()=>{
    if(!allowLeave()){history.pushState(state.lastHistory,'',state.lastURL);return;}
    const route=accountRoute();if(route.page==='search')showHome('#vacantes',false,{history:'none',restore:true});
    else if(route.page==='offer')await openPublicJob(route.jobId,route.tab,{history:'none',leave:false});
    else await showAccount(route.page,false,null,{...route,history:'none'});
  });
  async function init(){
    $('modal').hidden=true;const searchParams=new URLSearchParams(location.search);
    updateHeader();readPublicCache();
    // Public offers can load while account details are still arriving on a slow connection.
    loadPublicData();
    const hash=location.hash;
    const redirected=await authRedirect().catch(e=>{toast(humanError(e),'info');return false;});
    if(!redirected){
      if(hash==='#guardadas'||hash==='#cuenta/saved'){
        await openSaved(false,{history:'replace'});
      }else if(hash.startsWith('#oferta/')){
        if(readSession()?.access_token)await loadAccountContext().catch(e=>{if(e.code!=='STALE_REQUEST')toast(humanError(e),'info');});
        const route=accountRoute(hash);await openPublicJob(route.jobId,route.tab,{history:'replace',leave:false});
      }else if(readSession()?.access_token){
        if(hash.startsWith('#cuenta')){const route=accountRoute(hash);await showAccount(route.page,false,null,{...route,history:'replace'});}
        else if(hash==='#empleos'||hash==='#vacantes'||searchParams.has('q')){showHome('#vacantes',false);await loadAccountContext().catch(e=>{if(e.code!=='STALE_REQUEST')toast(humanError(e),'info');});}
        else await enterWorkspace().catch(e=>{if(e.code!=='STALE_REQUEST'){showHome('#vacantes',false);toast(humanError(e),'info');}});
      }else{
        showHome('#vacantes',false);
        if(hash.startsWith('#cuenta')){state.afterLoginPage=accountRoute(hash);openModal('login');}
        else if(['#login','#registro','#registro-persona','#registro-negocio'].includes(hash))openModal(({'#login':'login','#registro':'join','#registro-persona':'person','#registro-negocio':'business'})[hash]);
      }
    }
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').then(reg=>reg.update()).catch(()=>{});
  }

  init();
})();
