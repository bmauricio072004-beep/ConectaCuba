(() => {
  'use strict';
  const STATUS={submitted:'Enviada',reviewing:'En revisión',contacted:'En coordinación',accepted:'Seleccionada',not_selected:'No seleccionada',withdrawn:'Retirada'};
  const EXPLAIN={submitted:'El negocio recibió tu postulación. Todavía no ha indicado una decisión.',reviewing:'El negocio está revisando tu postulación.',contacted:'El negocio indicó que inició el contacto. Revisa el canal que compartiste.',accepted:'El negocio aceptó tu postulación. Coordina directamente las condiciones y los siguientes pasos.',not_selected:'El negocio indicó que no continuará con esta postulación.',withdrawn:'Retiraste esta postulación. Tu currículum y contacto ya no se comparten con el negocio.'};
  const REVIEW_STATUS={pending:'Pendiente de revisión',approved:'Publicada',rejected:'Requiere correcciones',withdrawn:'Retirada'};
  window.CC_OPPORTUNITIES={create(ctx){
    const $=id=>ctx.document.getElementById(id),esc=ctx.esc;
    const params=new URLSearchParams(ctx.search||'');
    const state={filters:{q:(params.get('q')||'').slice(0,120),province:ctx.provinces.includes(params.get('province'))?params.get('province'):'',category:ctx.activities.includes(params.get('category'))?params.get('category'):'',municipality:(params.get('municipality')||'').slice(0,100)},offer:null,company:null,tab:'offer',offerEpoch:0,offerCache:{},ratings:{},ratingsKey:'',ratingsAt:0,ratingEpoch:0,reviews:[],moreReviews:false,reviewOffset:0,reviewEpoch:0,application:null,applicationFilter:'',adminFilter:'pending'};
    const savedKey=()=>{const p=ctx.getProfile?.();return 'cc_saved_jobs_'+(p?.id||'guest');};
    const savedIds=()=>{try{return new Set(JSON.parse(localStorage.getItem(savedKey())||'[]').filter(id=>idOK(id)));}catch{return new Set();}};
    const saveIds=set=>{try{localStorage.setItem(savedKey(),JSON.stringify([...set]));}catch{throw new Error('Permite el almacenamiento del navegador para guardar ofertas en este dispositivo.');}};
    const isSaved=id=>savedIds().has(id);
    let savedMissing=[],savedScope='',contactEpoch=0;
    function toggleSaved(id){if(!idOK(id))throw new Error('Esta oferta no está disponible.');const s=savedIds();if(!s.has(id)&&s.size>=100)throw new Error('Puedes guardar hasta 100 ofertas. Quita alguna para añadir otra.');s.has(id)?s.delete(id):s.add(id);saveIds(s);return s.has(id);}
    const idOK=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(id||''));
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const initials=name=>esc(String(name||'CC').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase());
    const status=s=>'<span class="outcome outcome-'+esc(s)+'">'+esc(STATUS[s]||'Enviada')+'</span>';
    const back=(label='Volver',attrs='data-back-home')=>'<button type="button" class="app-back" '+attrs+'><span aria-hidden="true">‹</span> '+label+'</button>';
    const publicGet=path=>ctx.request('/rest/v1/'+path);
    const bookmarkIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg>';
    function saveButton(id){return '<button type="button" class="save-job-button" data-save-job="'+id+'" aria-pressed="'+isSaved(id)+'" aria-label="'+(isSaved(id)?'Quitar oferta guardada':'Guardar oferta')+'">'+bookmarkIcon+'</button>';}
    const feedRating=id=>Number(state.ratings[id]?.review_count)>0?ratingHTML(id):'';
    function jobRows(rows){return rows.map(j=>'<article class="feed-card-wrap"><button type="button" class="feed-card" data-view-job="'+j.id+'" aria-label="'+esc(j.title+' en '+j.business_name)+'"><strong class="feed-job-title">'+esc(j.title)+'</strong><span class="feed-company-name">'+esc(j.business_name)+' <span class="verified-mark" role="img" aria-label="Negocio revisado">✓</span> <span data-rating-for="'+j.business_user_id+'">'+feedRating(j.business_user_id)+'</span></span><span class="feed-location">'+esc([j.municipality,j.province].filter(Boolean).join(', '))+'</span><span class="feed-pay">'+esc(ctx.salaryLabel(j))+'</span><span class="feed-card-bottom"><span class="feed-conditions">'+esc([j.work_modality,j.work_schedule].filter(Boolean).join(' · '))+'</span><span>'+ctx.date(j.created_at)+'</span></span></button>'+saveButton(j.id)+(ctx.workflow?'<div class="feed-contact-actions">'+ctx.workflow.shareButton(j)+'<span data-public-contact-for="'+j.id+'"></span></div>':'')+'</article>').join('');}
    const ratingHTML=(businessId,large=false)=>{
      const r=state.ratings[businessId];
      if(r===undefined)return '<span class="no-rating">Experiencias de trabajo</span>';
      if(r===null)return '<span class="no-rating">Valoración no disponible</span>';
      if(!r.review_count)return '<span class="no-rating">Sin valoraciones todavía</span>';
      return '<span class="rating-value'+(large?' large':'')+'"><span aria-hidden="true">★</span> '+esc(r.average_rating)+' <small>('+Number(r.review_count)+' '+(Number(r.review_count)===1?'reseña':'reseñas')+')</small></span>';
    };
    function renderFeed(cached=false){
      const f=state.filters,all=ctx.getJobs(),rows=all.filter(j=>(!f.q||norm([j.title,j.business_name,j.category,j.category_other,j.description].join(' ')).includes(norm(f.q)))&&(!f.category||j.category===f.category)&&(!f.province||j.province===f.province)&&(!f.municipality||norm(j.municipality).includes(norm(f.municipality))));
      $('feed-search-title').textContent=f.q||'Buscar empleo';
      $('feed-search-location').textContent=[f.municipality,f.province].filter(Boolean).join(', ')||'Toda Cuba';
      const chips=[f.q,f.category,f.province,f.municipality].filter(Boolean);
      $('active-filters').innerHTML=chips.length?chips.map(v=>'<span class="filter-pill">'+esc(v)+'</span>').join('')+'<button type="button" data-action="clear-filters">Limpiar</button>':'';
      $('result-count').textContent=rows.length+' '+(rows.length===1?'oferta de empleo':'ofertas de empleo')+(all.length===100?' · últimas 100':'');
      $('job-source').textContent=cached?'Guardadas en este teléfono · revisa su disponibilidad':'Más recientes';
      $('job-list').innerHTML=jobRows(rows);
      $('empty').hidden=!!rows.length;$('jobs-board').classList.toggle('is-empty',!rows.length);
      $('empty').querySelector('h2').textContent=all.length?'Prueba otra búsqueda':'Las oportunidades empiezan aquí';
      $('empty-message').textContent=all.length?'No encontramos ofertas con estos filtros. Puedes cambiar la búsqueda o ver todas.':'Todavía no hay ofertas publicadas. Puedes preparar tu currículum mientras llegan.';
      $('empty').querySelector('[data-action="refresh-public"]')?.remove();
      if(ctx.workflow&&rows.length){
        const epoch=++contactEpoch,ids=[...new Set(rows.map(j=>j.business_user_id))];
        publicGet('business_directory?user_id=in.('+ids.join(',')+')&select=user_id,whatsapp').then(companies=>{
          if(epoch!==contactEpoch)return;const map=new Map((companies||[]).map(b=>[b.user_id,b]));
          ctx.document.querySelectorAll('[data-public-contact-for]').forEach(el=>{const job=rows.find(j=>j.id===el.dataset.publicContactFor);if(job)el.innerHTML=ctx.workflow.publicContactButton(map.get(job.business_user_id),job);});
        }).catch(()=>{});
      }else contactEpoch++;
      const key=[...new Set(all.map(j=>j.business_user_id))].sort().join(',');
      if(key&&(key!==state.ratingsKey||Date.now()-state.ratingsAt>60000)){
        state.ratingsKey=key;state.ratingsAt=Date.now();const epoch=++state.ratingEpoch;
        publicGet('business_rating_stats?business_user_id=in.('+key+')&select=business_user_id,average_rating,review_count').then(stats=>{
          if(epoch!==state.ratingEpoch)return;state.ratings=Object.fromEntries(key.split(',').map(id=>[id,{review_count:0}]));for(const r of stats||[])state.ratings[r.business_user_id]=r;
          ctx.document.querySelectorAll('[data-rating-for]').forEach(el=>el.innerHTML=feedRating(el.dataset.ratingFor));
        }).catch(()=>{if(epoch===state.ratingEpoch)state.ratingsKey='';});
      }
    }
    function openSearch(){
      const f=state.filters;
      ctx.modal('Buscar empleo','<form class="form-grid search-sheet" data-form="job-search">'+ctx.field('Puesto, habilidad o palabra clave','search_q',f.q,'type="search" maxlength="120" placeholder="Ej.: electricista"','',true)+ctx.select('Provincia','search_province',ctx.provinces,f.province,'Toda Cuba')+ctx.field('Municipio','search_municipality',f.municipality,'maxlength="100" placeholder="Todos los municipios"')+ctx.select('Actividad','search_category',ctx.activities,f.category,'Todas las actividades')+'<div class="notice span2" role="status"></div><div class="form-actions span2"><button type="button" class="btn btn-outline" data-search-reset>Limpiar</button><button type="submit" class="btn btn-primary">Ver ofertas</button></div></form>');
      for(const el of $('modal-content').querySelectorAll('select'))el.required=false;
    }
    function clearFilters(){state.filters={q:'',province:'',category:'',municipality:''};ctx.clearSearchURL();renderFeed();}
    function offerTabs(id,tab){return '<div class="app-segments offer-tabs" role="tablist" aria-label="Información de la oferta">'+[['offer','Oferta'],['company','Negocio'],['reviews','Reseñas']].map(([value,label])=>'<button type="button" role="tab" aria-selected="'+(tab===value)+'" class="'+(tab===value?'active':'')+'" data-offer-tab="'+value+'" data-offer-id="'+id+'">'+label+'</button>').join('')+'</div>';}
    function jobFacts(j,compact=false){
      const facts=[...(!compact?[['Salario',ctx.salaryLabel(j)]]:[]),['Modalidad',j.work_modality],['Jornada',j.work_schedule],...(!compact?[['Ubicación',[j.municipality,j.province].filter(Boolean).join(', ')]]:[])];
      return '<div class="offer-facts">'+facts.map(([label,value])=>'<div><span>'+label+'</span><strong>'+esc(value)+'</strong></div>').join('')+'</div>';
    }
    function companyHTML(b,id){
      if(!b)return '<div class="soft-card"><p>La información pública de este negocio no está disponible ahora.</p></div>';
      return '<section class="soft-card company-profile"><div class="company-identity">'+ctx.logo(b)+'<div><h2>'+esc(b.business_name)+'</h2><span class="reviewed-business">Negocio revisado</span></div></div><div class="company-rating">'+ratingHTML(b.user_id,true)+'</div><h3>A qué se dedica</h3><p>'+esc(b.business_activity==='Otra'?b.business_activity_other:b.business_activity)+'</p><p class="preserve-lines">'+esc(b.description||'El negocio aún no añadió una descripción.')+'</p><h3>Dónde trabaja</h3><p>'+esc([b.municipality,b.province].join(', '))+'</p>'+(b.public_address?'<p>'+esc(b.public_address)+'</p>':'')+(!ctx.workflow?.capable()&&(b.whatsapp||b.other_contact)?'<h3>Contacto del negocio</h3><p>'+ctx.contactLink(b.whatsapp||b.other_contact)+'</p>':'')+'<button type="button" class="btn btn-outline" data-offer-tab="reviews" data-offer-id="'+id+'">Ver opiniones sobre el negocio</button></section>';
    }
    function reviewRows(rows){return rows.map(r=>'<article class="soft-card public-review"><div class="public-review-top"><strong aria-label="'+r.rating+' de 5 estrellas">'+esc('★'.repeat(Number(r.rating)))+'<span class="empty-stars" aria-hidden="true">'+esc('☆'.repeat(5-Number(r.rating)))+'</span></strong><time>'+ctx.date(r.created_at)+'</time></div><h3>'+esc(r.job_role)+'</h3><span class="review-employment">'+(r.employment_status==='current'?'Trabaja actualmente allí':'Trabajó anteriormente allí')+'</span><p class="preserve-lines">'+esc(r.body)+'</p><span class="review-anonymous">Publicada sin nombre · Revisión manual</span></article>').join('');}
    async function reviewsHTML(companyId,epoch){
      const [reviewResult,stats]=await Promise.allSettled([publicGet('business_review_public?business_user_id=eq.'+companyId+'&select=id,rating,job_role,employment_status,body,created_at&order=created_at.desc,id.desc&limit=21'),publicGet('business_rating_stats?business_user_id=eq.'+companyId+'&select=*&limit=1')]);
      if(epoch!==state.offerEpoch)throw Object.assign(new Error('La vista cambió.'),{code:'STALE_REQUEST'});
      if(reviewResult.status!=='fulfilled')throw reviewResult.reason;
      const rows=reviewResult.value;
      state.ratings[companyId]=stats.status==='fulfilled'?(stats.value?.[0]||{review_count:0}):null;
      for(const cached of Object.values(state.offerCache))if(cached.job.business_user_id===companyId)cached.rating=state.ratings[companyId];
      ctx.document.querySelectorAll('[data-rating-for]').forEach(el=>{if(el.dataset.ratingFor===companyId)el.innerHTML=feedRating(companyId);});
      state.reviewEpoch++;
      state.reviews=(rows||[]).slice(0,20);state.moreReviews=(rows||[]).length>20;state.reviewOffset=state.reviews.length;
      return '<section class="review-overview soft-card"><div><h2>Experiencias de trabajo</h2>'+ratingHTML(companyId,true)+'</div><button type="button" class="btn btn-primary" data-write-review="'+companyId+'">Escribir una reseña</button><p>Opiniones de personas que declaran haber trabajado aquí. Se revisan antes de publicarse y no muestran su nombre.</p></section><div id="public-review-list">'+(state.reviews.length?reviewRows(state.reviews):'<div class="soft-card empty-reviews"><span aria-hidden="true">☆</span><h3>Todavía no hay reseñas publicadas.</h3><p>Las valoraciones aparecerán cuando existan experiencias aprobadas.</p></div>')+'</div>'+(state.moreReviews?'<button type="button" class="btn btn-outline" data-more-reviews="'+companyId+'">Cargar más reseñas</button>':'');
    }
    async function renderOffer(id,tab='offer'){
      if(!idOK(id))throw new Error('No encontramos esta oferta.');
      const epoch=++state.offerEpoch,guard=()=>{if(epoch!==state.offerEpoch)throw Object.assign(new Error('La vista cambió.'),{code:'STALE_REQUEST'});};
      const cached=state.offerCache[id],fresh=cached&&Date.now()-cached.at<60000;
      const rows=fresh?[cached.job]:await publicGet('job_posts?id=eq.'+id+'&status=eq.published&select=*&limit=1'),j=rows?.[0];guard();
      const backHTML=ctx.getOfferOrigin?.()==='saved'?back('Guardadas','data-back-page="saved"'):back('Ofertas');
      if(!j)return backHTML+'<section class="soft-card"><h2>Esta oferta ya no está disponible.</h2><p>Explora otras oportunidades. Tus postulaciones guardadas se conservan en tu cuenta.</p></section>';
      const [company,ratings]=fresh?[{status:'fulfilled',value:cached.company?[cached.company]:[]},{status:'fulfilled',value:[cached.rating]}]:await Promise.allSettled([publicGet('business_directory?user_id=eq.'+j.business_user_id+'&select=*&limit=1'),publicGet('business_rating_stats?business_user_id=eq.'+j.business_user_id+'&select=*&limit=1')]);guard();
      state.offer=j;state.tab=tab;state.company=company.status==='fulfilled'?company.value?.[0]:null;
      state.ratings[j.business_user_id]=fresh?cached.rating:ratings.status==='fulfilled'?(ratings.value?.[0]||{review_count:0}):null;
      if(!fresh&&company.status==='fulfilled'&&ratings.status==='fulfilled')state.offerCache[id]={at:Date.now(),job:j,company:state.company,rating:state.ratings[j.business_user_id]};
      let existingApplication=null;
      const viewer=ctx.getProfile?.();
      if(viewer?.account_type==='person'){
        try{existingApplication=(await ctx.db('job_applications?job_id=eq.'+id+'&applicant_id=eq.'+viewer.id+'&select=id,status&limit=1'))?.[0]||null;guard();}catch(error){if(error.code==='STALE_REQUEST')throw error;}
      }
      const applyAction=viewer?.account_type==='business'?'<button class="btn btn-primary" type="button" data-account-page="jobs">Volver a mis vacantes</button>':existingApplication?'<button class="btn btn-primary" type="button" data-view-application="'+existingApplication.id+'">Ver mi postulación</button>':'<button class="btn btn-primary" type="button" data-apply-job="'+id+'">'+(viewer?'Postularme':'Entrar para postularme')+'</button>';
      let content;
      if(tab==='company')content=companyHTML(state.company,id)+(await ctx.workflow?.publicContact(j.business_user_id,j.title)||'');
      else if(tab==='reviews'){try{content=await reviewsHTML(j.business_user_id,epoch);}catch(e){if(e.code==='STALE_REQUEST')throw e;content='<section class="soft-card"><h2>No pudimos cargar las reseñas.</h2><button type="button" class="btn btn-outline" data-offer-tab="reviews" data-offer-id="'+id+'">Volver a intentar</button></section>';}}
      else content='<section class="soft-card offer-description">'+jobFacts(j,true)+'<h2>Descripción del puesto</h2><p class="preserve-lines">'+esc(j.description)+'</p><p class="small-note">Confirma las condiciones directamente con el negocio antes de aceptar un empleo.</p></section>';
      return backHTML+'<section class="offer-identity"><h1>'+esc(j.title)+'</h1><button type="button" class="company-text-link" data-offer-tab="company" data-offer-id="'+id+'">'+esc(j.business_name)+' <span aria-hidden="true">›</span></button><p>'+esc([j.municipality,j.province].join(', '))+'</p><strong class="offer-salary">'+esc(ctx.salaryLabel(j))+'</strong><span class="offer-rating">'+ratingHTML(j.business_user_id)+'</span><button type="button" class="text-btn workflow-share" data-workflow-share="'+id+'">Compartir oferta</button>'+(ctx.workflow?.capable()?'<button type="button" class="text-btn workflow-share" data-workflow-report="'+id+'">Reportar oferta</button>':'')+'<span class="offer-published">Publicada el '+ctx.date(j.created_at)+'</span></section>'+offerTabs(id,tab)+'<div role="tabpanel" class="offer-tab-content">'+content+'</div><div class="offer-apply">'+applyAction+saveButton(id)+'</div>';
    }
    async function renderApplications(){
      const p=ctx.getProfile(),rows=await ctx.db('job_applications?applicant_id=eq.'+p.id+'&select=id,job_id,business_user_id,job_title,business_name,status,created_at,updated_at&order=created_at.desc&limit=100');
      const all=rows||[];ctx.setApplications(all);
      const filtered=state.applicationFilter?all.filter(a=>a.status===state.applicationFilter):all;
      const filters=all.length?'<div class="workflow-filters" role="group" aria-label="Filtrar mis postulaciones">'+[['','Todas'],...Object.entries(STATUS)].map(([value,title])=>'<button type="button" data-application-filter="'+value+'" aria-pressed="'+(state.applicationFilter===value)+'">'+esc(title)+' ('+(value?all.filter(a=>a.status===value).length:all.length)+')</button>').join('')+'</div>':'';
      return filters+(all.length===100?'<p class="small-note">Se muestran las últimas 100 postulaciones.</p>':'')+'<div class="application-list">'+(!filtered.length?'<section class="soft-card empty-reviews"><span aria-hidden="true">↗</span><h2>'+(all.length?'No hay postulaciones en este estado.':'Tu próximo paso empieza con una oferta.')+'</h2><p>'+(all.length?'Prueba otro filtro para ver el resto.':'Aquí podrás seguir las postulaciones que envíes.')+'</p>'+(all.length?'<button type="button" class="btn btn-outline" data-application-filter="">Ver todas</button>':'<button type="button" class="btn btn-primary" data-home="#vacantes">Explorar empleos</button>')+'</section>':filtered.map(a=>'<button type="button" class="application-card" data-view-application="'+a.id+'" aria-label="'+esc(a.job_title+', '+STATUS[a.status])+'"><strong>'+esc(a.job_title)+'</strong>'+(ctx.workflow?.novelty(a)||'')+'<span class="application-company">'+esc(a.business_name)+'</span>'+status(a.status)+'<span class="application-card-foot">Actualizada el '+ctx.date(a.updated_at||a.created_at)+' <span aria-hidden="true">›</span></span></button>').join(''))+'</div>';
    }
    async function renderApplication(id){
      const p=ctx.getProfile();if(!idOK(id))throw new Error('No encontramos esta postulación.');
      const rows=await ctx.db('job_applications?id=eq.'+id+'&applicant_id=eq.'+p.id+'&select=*&limit=1'),a=rows?.[0];if(!a)throw new Error('Esta postulación no está disponible en tu cuenta.');state.application=a;
      let job=a.job_snapshot||{};
      if(!job.title){try{job=(await publicGet('job_posts?id=eq.'+a.job_id+'&select=*&limit=1'))?.[0]||{};}catch{}}
      const extras=await ctx.workflow?.applicationExtras(a)||'';
      return back('Postulaciones','data-back-page="applications"')+'<section class="application-detail-head soft-card"><h1>'+esc(a.job_title)+'</h1><p>'+esc(a.business_name)+'</p>'+status(a.status)+'<div class="application-explanation"><p>'+esc(a.status==='contacted'&&a.employer_message?'El negocio te invitó a continuar. Revisa las indicaciones y confirma la coordinación.':EXPLAIN[a.status]||EXPLAIN.submitted)+'</p></div><dl class="application-dates"><div><dt>Enviada</dt><dd>'+ctx.date(a.created_at)+'</dd></div><div><dt>Última actualización</dt><dd>'+ctx.date(a.updated_at)+'</dd></div></dl></section>'+extras+(job.title?'<details class="soft-card application-extra"><summary>Información de la oferta</summary>'+jobFacts(job)+'<p class="preserve-lines">'+esc(job.description)+'</p></details>':'<p class="small-note">La oferta ya no está disponible públicamente. Conservas aquí el estado de tu postulación.</p>')+(a.status!=='withdrawn'?'<details class="soft-card application-extra"><summary>Lo que compartiste con el negocio</summary><h3>Contacto</h3><p>'+ctx.contactLink(a.contact)+'</p>'+(a.message?'<h3>Tu mensaje</h3><p class="preserve-lines">'+esc(a.message)+'</p>':'')+'<h3>Currículum enviado</h3>'+ctx.resumeSections(a.cv_snapshot||{})+'</details><button type="button" class="text-destructive" data-withdraw="'+a.id+'">Retirar esta postulación</button>':'');
    }
    async function editReview(businessId){
      const p=ctx.getProfile();if(!p){ctx.requireLogin({page:'offer',jobId:state.offer?.id,tab:'reviews'});return;}
      if(p.account_type!=='person'){ctx.toast('Las reseñas laborales se escriben desde una cuenta personal.','info');return;}
      if(!idOK(businessId))return;
      const rows=await ctx.db('business_reviews?author_id=eq.'+p.id+'&business_user_id=eq.'+businessId+'&select=*&limit=1'),r=rows?.[0]||{};
      ctx.modal('Tu experiencia de trabajo','<form class="form-grid" data-form="business-review" data-business-id="'+businessId+'"'+(r.id?' data-id="'+r.id+'"':'')+'><p class="span2 small-note">Solo sobre tu experiencia laboral. Se publicará sin tu nombre después de una revisión manual. Evita datos personales de otras personas.</p>'+ctx.select('Valoración *','rating',['1','2','3','4','5'],r.rating?String(r.rating):'','Elige de 1 a 5')+ctx.field('Puesto que ocupaste *','job_role',r.job_role,'required minlength="2" maxlength="100"')+'<div class="field span2"><label for="review-employment">Relación con el negocio *</label><select id="review-employment" name="employment_status" required><option value="former"'+(r.employment_status!=='current'?' selected':'')+'>Trabajé anteriormente aquí</option><option value="current"'+(r.employment_status==='current'?' selected':'')+'>Trabajo actualmente aquí</option></select></div>'+ctx.area('Tu experiencia *','body',r.body,2000,true)+ctx.area('¿Cómo puedes demostrar que trabajaste allí? Solo administración. *','evidence',r.evidence,1000,true)+'<p class="span2 small-note">Describe cómo comprobar la relación laboral. No incluyas números de identidad, contraseñas ni información de otras personas.</p><label class="check-field span2"><input type="checkbox" name="confirms_work" required><span>Confirmo que trabajé en este negocio y autorizo publicar mi valoración, puesto y comentario sin mi nombre.</span></label><div class="notice span2" role="status"></div><div class="form-actions span2"><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit">Enviar a revisión</button></div></form>');
    }
    async function renderMyReviews(){
      const rows=await ctx.db('business_reviews?author_id=eq.'+ctx.getProfile().id+'&select=id,business_user_id,business_name,rating,job_role,body,review_status,review_note,created_at&order=created_at.desc&limit=100');
      return back('Cuenta','data-back-page="menu"')+'<div class="own-reviews">'+(!rows?.length?'<section class="soft-card"><h2>Aún no compartiste reseñas.</h2><p>Desde una oferta puedes abrir el negocio y contar tu experiencia laboral.</p></section>':rows.map(r=>'<article class="soft-card"><div class="public-review-top"><strong>'+esc('★'.repeat(r.rating))+'</strong><span class="outcome">'+REVIEW_STATUS[r.review_status]+'</span></div><h2>'+esc(r.business_name||'Negocio')+'</h2><span class="review-employment">'+esc(r.job_role)+'</span><p class="preserve-lines">'+esc(r.body)+'</p>'+(r.review_note?'<p class="review-note">'+esc(r.review_note)+'</p>':'')+'<div class="inline-actions"><button type="button" class="btn btn-outline" data-write-review="'+r.business_user_id+'">Editar reseña</button>'+(r.review_status!=='withdrawn'?'<button type="button" class="text-destructive" data-review-withdraw="'+r.id+'">Retirar</button>':'')+'</div></article>').join(''))+'</div>';
    }
    function adminTabs(active){return '<div class="app-segments admin-segments"><button type="button" data-account-page="admin" class="'+(active==='business'?'active':'')+'">Negocios</button><button type="button" data-account-page="review-admin" class="'+(active==='reviews'?'active':'')+'">Reseñas</button></div>';}
    async function renderReviewAdmin(){
      const filter=state.adminFilter,rows=await ctx.db('business_reviews?select=*'+(filter?'&review_status=eq.'+filter:'')+'&order=created_at.asc&limit=100');
      return back('Cuenta','data-back-page="menu"')+adminTabs('reviews')+'<div class="moderation-filters" role="group" aria-label="Filtrar reseñas">'+[['pending','Pendientes'],['approved','Publicadas'],['rejected','Correcciones'],['','Todas']].map(([value,label])=>'<button type="button" data-review-admin-filter="'+value+'" aria-pressed="'+(filter===value)+'">'+label+'</button>').join('')+'</div><p class="small-note">'+rows.length+' '+(rows.length===1?'reseña':'reseñas')+' en esta vista (hasta 100). Revisa la evidencia de la relación laboral y el comentario antes de publicar.</p>'+(rows.length?rows.map(r=>{
        const self=r.author_id===ctx.getProfile().id;
        return '<article class="soft-card moderation-review"><div class="public-review-top"><strong>'+esc('★'.repeat(r.rating))+'</strong><span class="outcome">'+REVIEW_STATUS[r.review_status]+'</span></div><h2>'+esc(r.business_name||'Negocio')+'</h2><span class="review-employment">'+esc(r.job_role)+' · '+(r.employment_status==='current'?'Trabaja allí':'Trabajó allí')+'</span><p class="preserve-lines">'+esc(r.body)+'</p><details><summary>Evidencia privada para revisión</summary><p class="preserve-lines">'+esc(r.evidence)+'</p></details>'+(self?'<p class="small-note">Excepción del piloto: puedes moderar esta reseña porque eres la única persona administradora.</p>':'')+'<div class="inline-actions">'+(r.review_status==='pending'?'<button type="button" class="btn btn-primary" data-review-approve="'+r.id+'">Aprobar y publicar</button>':'')+(r.review_status!=='withdrawn'?'<button type="button" class="btn btn-outline" data-review-reject="'+r.id+'">'+(r.review_status==='approved'?'Retirar y pedir correcciones':'Pedir correcciones')+'</button>':'')+'</div></article>';
      }).join(''):'<section class="soft-card"><p>No hay reseñas en este estado.</p></section>');
    }
    async function handleSubmit(form,d){
      if(form.dataset.form==='job-search'){
        state.filters={q:d.search_q.trim(),province:d.search_province,category:d.search_category,municipality:d.search_municipality.trim()};ctx.setSearchURL(state.filters);ctx.closeModal();ctx.showHome();renderFeed();return true;
      }
      if(form.dataset.form==='business-review'){
        if(d.confirms_work!=='on')throw new Error('Confirma que esta reseña describe tu experiencia de trabajo.');
        if(d.body.trim().length<30)throw new Error('Describe tu experiencia con al menos 30 caracteres.');
        const p=ctx.getProfile(),value={rating:Number(d.rating),job_role:d.job_role.trim(),employment_status:d.employment_status,body:d.body.trim(),evidence:d.evidence.trim(),confirms_work:true};
        if(form.dataset.id)await ctx.patchOne('business_reviews?id=eq.'+form.dataset.id+'&author_id=eq.'+p.id,{...value,review_status:'pending'});
        else await ctx.db('business_reviews',ctx.json('POST',{author_id:p.id,business_user_id:form.dataset.businessId,...value}));
        ctx.closeModal();ctx.toast('Reseña enviada. Se publicará después de revisarse.');state.ratingsKey='';state.offerCache={};
        const route=ctx.getRoute();if(route.page==='offer'&&state.offer)await ctx.goOffer(state.offer.id,'reviews',{history:'replace'});else if(route.page==='my-reviews')await ctx.goAccount('my-reviews',false);
        return true;
      }
      if(form.dataset.form==='review-reject'){
        await ctx.patchOne('business_reviews?id=eq.'+form.dataset.id,{review_status:'rejected',review_note:d.review_note.trim()});ctx.closeModal();if(ctx.getRoute().page==='review-admin')await ctx.goAccount('review-admin',false);return true;
      }
      return false;
    }
    async function handleClick(event){
      const b=event.target.closest('button,a');if(!b)return false;
      if(b.hasAttribute('data-application-filter')){const value=b.dataset.applicationFilter;if(value!==''&&!Object.hasOwn(STATUS,value))return true;state.applicationFilter=value;await ctx.goAccount('applications',false);return true;}
      if(b.dataset.action==='open-search'){openSearch();return true;}
      if(b.dataset.action==='clear-filters'){clearFilters();return true;}
      if(b.dataset.saveJob){
        const id=b.dataset.saveJob,saved=toggleSaved(id);
        ctx.document.querySelectorAll('[data-save-job]').forEach(el=>{if(el.dataset.saveJob===id){el.setAttribute('aria-pressed',String(saved));el.setAttribute('aria-label',saved?'Quitar oferta guardada':'Guardar oferta');}});
        if(ctx.getRoute().page==='saved')await ctx.goAccount('saved',false);
        ctx.toast(saved?'Oferta guardada en este dispositivo.':'Oferta quitada de guardadas.');return true;
      }
      if(b.hasAttribute('data-clear-unavailable')){
        if(savedScope!==savedKey()||ctx.getRoute().page!=='saved')return true;
        if(!ctx.confirm('¿Quitar de guardadas las ofertas que ya no están publicadas?'))return true;
        const ids=savedIds();for(const id of savedMissing)ids.delete(id);saveIds(ids);await ctx.goAccount('saved',false);return true;
      }
      if(b.hasAttribute('data-search-reset')){clearFilters();openSearch();return true;}
      if(b.dataset.offerTab){await ctx.goOffer(b.dataset.offerId,b.dataset.offerTab,{history:'replace'});return true;}
      if(b.dataset.viewApplication){await ctx.goAccount('application',true,null,{applicationId:b.dataset.viewApplication});return true;}
      if(b.dataset.writeReview){await editReview(b.dataset.writeReview);return true;}
      if(b.dataset.reviewWithdraw){
        if(!ctx.confirm('¿Retirar tu reseña? Dejará de mostrarse y podrás volver a enviarla a revisión.'))return true;
        await ctx.patchOne('business_reviews?id=eq.'+b.dataset.reviewWithdraw+'&author_id=eq.'+ctx.getProfile().id,{review_status:'withdrawn'});state.ratingsKey='';state.offerCache={};if(ctx.getRoute().page==='my-reviews')await ctx.goAccount('my-reviews',false);return true;
      }
      if(b.hasAttribute('data-review-admin-filter')){state.adminFilter=b.dataset.reviewAdminFilter;await ctx.goAccount('review-admin',false);return true;}
      if(b.dataset.reviewApprove){
        if(!ctx.confirm('¿Revisaste la evidencia y el comentario? La reseña se publicará sin el nombre de la persona.'))return true;
        b.disabled=true;try{await ctx.patchOne('business_reviews?id=eq.'+b.dataset.reviewApprove,{review_status:'approved',review_note:''});state.ratingsKey='';state.offerCache={};if(ctx.getRoute().page==='review-admin')await ctx.goAccount('review-admin',false);}finally{b.disabled=false;}return true;
      }
      if(b.dataset.reviewReject){ctx.modal('Pedir correcciones','<form class="form-grid" data-form="review-reject" data-id="'+b.dataset.reviewReject+'">'+ctx.area('Qué debe corregir la persona *','review_note','',1000,true)+'<div class="notice span2" role="status"></div><div class="form-actions span2"><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button><button type="submit" class="btn btn-primary">Enviar correcciones</button></div></form>');return true;}
      if(b.dataset.moreReviews){
        const epoch=state.offerEpoch,listEpoch=state.reviewEpoch,businessId=b.dataset.moreReviews,offset=state.reviewOffset;
        b.disabled=true;
        try{
          const rows=await publicGet('business_review_public?business_user_id=eq.'+businessId+'&select=id,rating,job_role,employment_status,body,created_at&order=created_at.desc,id.desc&offset='+offset+'&limit=21');
          if(epoch!==state.offerEpoch||listEpoch!==state.reviewEpoch||ctx.getRoute().page!=='offer'||state.tab!=='reviews'||state.offer?.business_user_id!==businessId)throw Object.assign(new Error('La vista cambió.'),{code:'STALE_REQUEST'});
          state.reviewOffset+=Math.min(rows.length,20);$('public-review-list')?.insertAdjacentHTML('beforeend',reviewRows(rows.slice(0,20)));if(rows.length<=20)b.remove();
        }finally{b.disabled=false;}return true;
      }
      return false;
    }
    function cancelOffer(){state.offerEpoch++;state.reviewEpoch++;}
    function reset(){contactEpoch++;cancelOffer();state.application=null;state.applicationFilter='';state.ratingEpoch++;state.ratingsKey='';state.adminFilter='pending';savedMissing=[];savedScope='';}
    async function renderSaved(){
      const scope=savedKey(),ids=[...savedIds()].slice(-100).reverse();let jobs=[],cached=false;
      if(ids.length){try{jobs=await publicGet('job_posts?id=in.('+ids.join(',')+')&status=eq.published&select=*&limit=100');}catch{cached=true;jobs=ctx.getJobs().filter(j=>ids.includes(j.id));}}
      if(scope!==savedKey())throw Object.assign(new Error('La sesión cambió.'),{code:'STALE_REQUEST'});
      jobs=(jobs||[]).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));
      savedScope=scope;savedMissing=cached?[]:ids.filter(id=>!jobs.some(j=>j.id===id));
      const unavailable=cached?0:ids.length-jobs.length;
      return back('Empleos')+'<div class="saved-heading"><h1>Ofertas guardadas</h1><p class="small-note">'+(cached?'No pudimos actualizar. Mostramos las ofertas disponibles en este dispositivo.':'Guardadas en este dispositivo. Su disponibilidad puede cambiar.')+'</p></div><div class="job-list saved-job-list">'+(jobs.length?jobRows(jobs):'<section class="soft-card empty-reviews"><h2>'+(ids.length?'No hay ofertas disponibles en esta lista.':'Guarda las ofertas que te interesen.')+'</h2><p>'+(ids.length?'Puedes explorar las oportunidades actuales o volver a intentar más tarde.':'Toca el marcador junto a un puesto para encontrarlo aquí.')+'</p><button class="btn btn-primary" data-home="#vacantes">Explorar empleos</button></section>')+'</div>'+(unavailable?'<p class="small-note">'+unavailable+' '+(unavailable===1?'oferta guardada ya no está publicada.':'ofertas guardadas ya no están publicadas.')+'</p><button type="button" class="text-btn" data-clear-unavailable>Quitar no disponibles</button>':'');
    }
    return {renderFeed,openSearch,renderOffer,renderApplications,renderApplication,renderMyReviews,renderReviewAdmin,renderSaved,adminTabs,handleClick,handleSubmit,reset,cancelOffer,clearFilters};
  }};
})();
