(() => {
  'use strict';
  const SUMMARY='id,job_id,applicant_name,applicant_location,desired_job,status,created_at,updated_at';
  const STAGES={submitted:'Por revisar',reviewing:'En revisión',contacted:'Contacto iniciado',accepted:'Aceptada',not_selected:'No seleccionada',withdrawn:'Retirada'};
  const COUNT_KEYS={submitted:'new_count',reviewing:'reviewing_count',contacted:'contacted_count',accepted:'accepted_count',not_selected:'closed_count',withdrawn:'withdrawn_count'};
  const PAGE_SIZE=50;
  window.CC_HIRING={
    create(ctx){
      const box={epoch:0,listEpoch:0,job:null,person:null,jobs:[],counts:{},records:[],offset:0,more:false,jobFilter:'',filters:{}};
      const esc=ctx.esc;
      const isId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||''));
      const owner=()=>{const p=ctx.getProfile();if(!p||p.account_type!=='business')throw new Error('Esta herramienta es para cuentas de negocio.');return p.id;};
      const approved=()=>ctx.getBusiness()?.review_status==='approved'&&ctx.getBusiness()?.email_confirmed===true;
      const number=n=>Number(n||0);
      const emptyCounts=()=>({total:0,new_count:0,reviewing_count:0,contacted_count:0,accepted_count:0,closed_count:0,withdrawn_count:0});
      const counts=id=>box.counts[id]||emptyCounts();
      const stage=s=>STAGES[s]||'Enviada';
      const badge=s=>'<span class="stage-chip stage-'+esc(s)+'">'+esc(stage(s))+'</span>';
      const initials=name=>String(name||'Persona').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
      function stale(){const e=new Error('La vista cambió.');e.code='STALE_REQUEST';return e;}
      function guard(epoch,user){if(epoch!==box.epoch||ctx.getProfile()?.id!==user)throw stale();}
      async function fetchCounts(){
        const rows=await ctx.db('rpc/cc_job_application_counts',{method:'POST',body:'{}'});
        const map={};for(const row of rows||[])map[row.job_id]=row;return map;
      }
      async function fetchJob(id,user){
        if(!isId(id))throw new Error('Esta vacante no está disponible en tu negocio.');
        const rows=await ctx.db('job_posts?id=eq.'+id+'&business_user_id=eq.'+user+'&select=*&limit=1');
        if(!rows?.[0])throw new Error('No encontramos esta vacante en tu negocio.');
        return rows[0];
      }
      async function fetchApplicants(jobId,user,status='',offset=0){
        const filter=Object.hasOwn(STAGES,status)?'&status=eq.'+status:'';
        return ctx.db('job_applications?job_id=eq.'+jobId+'&business_user_id=eq.'+user+'&select='+SUMMARY+filter+'&order=created_at.desc,id.desc&limit='+(PAGE_SIZE+1)+'&offset='+offset);
      }
      function rememberJob(j){
        ctx.onJobLoaded?.(j);
      }
      function permissionNotice(){
        if(approved())return '';
        const status=ctx.getBusiness()?.review_status;
        return '<div class="hiring-permission"><div><strong>'+(status==='rejected'?'Tu negocio necesita correcciones':'Tu negocio está pendiente de revisión')+'</strong><p>Puedes consultar tus vacantes y postulaciones guardadas. La publicación se habilita cuando el negocio esté aprobado.</p></div><button type="button" class="btn btn-outline" data-account-page="business">Revisar mi negocio</button></div>';
      }
      function jobCards(rows){
        if(!rows.length)return '<div class="hiring-empty"><span class="empty-symbol" aria-hidden="true">↗</span><h2>'+(box.jobs.length?'No hay vacantes con este estado.':'Crea tu primera vacante.')+'</h2><p>'+(box.jobs.length?'Prueba el filtro “Todas” para consultar el resto.':'Describe el puesto y sus condiciones. Las personas que se postulen aparecerán dentro de esa oferta.')+'</p>'+(approved()&&!box.jobs.length?'<button type="button" class="btn btn-primary" data-action="new-job">Publicar una vacante</button>':'')+'</div>';
        return rows.map(j=>{
          const c=counts(j.id),total=number(c.total),pending=number(c.new_count);
          return '<article class="hiring-job-card"><div class="hiring-job-top">'+ctx.chip(j.status)+'</div><h2>'+esc(j.title)+'</h2><p class="hiring-job-location">'+esc([j.municipality,j.province].join(', '))+' · '+esc(j.work_modality)+'</p><div class="hiring-job-numbers"><span><strong>'+total+'</strong> '+(total===1?'postulación':'postulaciones')+'</span><span class="'+(pending?'has-pending':'')+'">'+pending+' por revisar</span></div><button type="button" class="hiring-open-job" data-hiring-job="'+j.id+'">Ver más <span aria-hidden="true">›</span></button></article>';
        }).join('');
      }
      function filteredJobs(){return box.jobs.filter(j=>!box.jobFilter||j.status===box.jobFilter);}
      async function renderJobs(){
        const user=owner(),epoch=++box.epoch;
        const [rows,map]=await Promise.all([ctx.db('job_posts?business_user_id=eq.'+user+'&select=*&order=created_at.desc,id.desc&limit=100'),fetchCounts()]);
        guard(epoch,user);box.jobs=rows||[];box.counts=map;ctx.onJobsLoaded?.(box.jobs);
        const pending=Object.values(map).reduce((n,c)=>n+number(c.new_count),0);const open=box.jobs.filter(j=>j.status==='published').length;
        return '<div class="hiring-toolbar"><div><span class="hiring-summary">'+open+' '+(open===1?'vacante abierta':'vacantes abiertas')+' · '+pending+' '+(pending===1?'postulación por revisar':'postulaciones por revisar')+(box.jobs.length===100?' · últimas 100 vacantes':'')+'</span></div>'+(approved()?'<button type="button" class="btn btn-primary" data-action="new-job">Publicar vacante <span aria-hidden="true">＋</span></button>':'')+'</div>'+permissionNotice()+'<div class="hiring-filters" role="group" aria-label="Estado de las vacantes">'+[['','Todas'],['published','Abiertas'],['closed','Cerradas']].map(([value,label])=>'<button type="button" data-hiring-job-filter="'+value+'" class="'+(box.jobFilter===value?'active':'')+'" aria-pressed="'+(box.jobFilter===value)+'">'+label+'</button>').join('')+'</div><div id="hiring-jobs-grid" class="hiring-jobs-grid">'+jobCards(filteredJobs())+'</div>';
      }
      function totalForFilter(){
        const c=counts(box.job?.id),status=box.filters[box.job?.id]||'';
        return number(status?c[COUNT_KEYS[status]]:c.total);
      }
      function applicantRows(){
        if(!box.records.length)return '<div class="hiring-list-empty"><h3>'+(box.filters[box.job?.id]?'No hay postulaciones en este estado.':'Todavía no hay personas postuladas.')+'</h3><p>'+(box.filters[box.job?.id]?'Cambia el filtro para ver las demás.':box.job?.status==='published'?'Cuando alguien se postule, su nombre y currículum aparecerán aquí.':'La vacante está cerrada. Conservas aquí las postulaciones recibidas.')+'</p></div>';
        const rows=box.records.map(a=>'<button type="button" class="applicant-row" data-hiring-person="'+a.id+'" data-job-id="'+a.job_id+'"><span class="applicant-avatar" aria-hidden="true">'+esc(initials(a.applicant_name))+'</span><span class="applicant-main"><strong>'+esc(a.applicant_name)+'</strong><span>'+esc(a.applicant_location)+'</span><small>Se postuló el '+ctx.date(a.created_at)+'</small></span>'+badge(a.status)+'<span class="applicant-arrow" aria-hidden="true">›</span></button>').join('');
        return rows+'<div class="applicant-pagination"><span>Mostrando '+box.records.length+' de '+totalForFilter()+'</span>'+(box.more?'<button class="btn btn-outline" type="button" data-hiring-more>Cargar más</button>':'')+'</div>';
      }
      async function renderJob(id){
        const user=owner(),epoch=++box.epoch,status=box.filters[id]||'';
        const [job,map,records]=await Promise.all([fetchJob(id,user),fetchCounts(),fetchApplicants(id,user,status)]);
        guard(epoch,user);box.job=job;box.counts=map;box.records=(records||[]).slice(0,PAGE_SIZE);box.offset=box.records.length;box.more=(records||[]).length>PAGE_SIZE;rememberJob(job);
        const c=counts(id),filters=[['','Todas ('+number(c.total)+')'],...Object.keys(STAGES).map(s=>[s,stage(s)+' ('+number(c[COUNT_KEYS[s]])+')'])];
        return '<div class="hiring-breadcrumb"><button type="button" data-hiring-back="jobs">‹ Vacantes</button></div><section class="hiring-vacancy-head"><div><div class="hiring-title-line">'+ctx.chip(job.status)+'</div><h1>'+esc(job.title)+'</h1><p>'+esc([job.municipality,job.province].join(', '))+' · '+esc(job.work_modality)+'</p></div><details class="hiring-job-description"><summary>Detalles y gestión de la vacante</summary><div><p><strong>Salario:</strong> '+esc(ctx.salaryLabel(job))+'</p><p><strong>Jornada:</strong> '+esc(job.work_schedule)+'</p><p>'+esc(job.description)+'</p>'+(approved()?'<div class="hiring-vacancy-actions"><button type="button" class="btn btn-outline" data-edit-job="'+id+'">Editar vacante</button><button type="button" class="btn btn-outline" data-job-status="'+id+'" data-status="'+(job.status==='published'?'closed':'published')+'">'+(job.status==='published'?'Cerrar vacante':'Reabrir vacante')+'</button></div>':'')+'</div></details></section>'+permissionNotice()+'<section class="hiring-applicants"><div class="hiring-applicants-head"><h2>Postulantes <span>'+number(c.total)+'</span></h2><div class="field"><label for="hiring-stage-filter">Filtrar por estado</label><select id="hiring-stage-filter">'+filters.map(([value,label])=>'<option value="'+value+'"'+(value===status?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></div></div><div id="hiring-applicant-region" aria-live="polite">'+applicantRows()+'</div></section>';
      }
      async function renderPerson(jobId,id){
        const user=owner(),epoch=++box.epoch;
        if(!isId(id)||!isId(jobId))throw new Error('No encontramos esta postulación.');
        const [job,rows]=await Promise.all([fetchJob(jobId,user),ctx.db('job_applications?id=eq.'+id+'&job_id=eq.'+jobId+'&business_user_id=eq.'+user+'&select=*&limit=1')]);
        guard(epoch,user);const a=rows?.[0];if(!a)throw new Error('Esta persona no tiene una postulación disponible en la vacante.');
        box.job=job;box.person=a;rememberJob(job);
        const withdrawn=a.status==='withdrawn';
        let html='<div class="hiring-breadcrumb"><button type="button" data-hiring-back="jobs">Vacantes</button><span aria-hidden="true">/</span><button type="button" data-hiring-back="job" data-job-id="'+jobId+'">'+esc(job.title)+'</button><span aria-hidden="true">/</span><span>Postulación</span></div><button type="button" class="hiring-return" data-hiring-back="job" data-job-id="'+jobId+'">‹ Volver a los postulantes de esta vacante</button><section class="candidate-heading"><span class="applicant-avatar large" aria-hidden="true">'+esc(initials(a.applicant_name))+'</span><div><span class="workspace-eyebrow">POSTULACIÓN A '+esc(job.title.toUpperCase())+'</span><h1>'+esc(a.applicant_name)+'</h1><p>'+esc(a.applicant_location)+' · '+ctx.date(a.created_at)+'</p></div>'+badge(a.status)+'</section>';
        if(withdrawn)return html+'<div class="hiring-permission"><div><strong>Esta persona retiró su postulación.</strong><p>El currículum, el mensaje y el contacto ya no se comparten con el negocio.</p></div></div>';
        html+='<div class="candidate-layout"><div class="candidate-main">'+(a.message?'<section class="candidate-section"><h2>Mensaje de presentación</h2><p>'+esc(a.message)+'</p></section>':'')+'<section class="candidate-section"><div class="candidate-section-heading"><h2>Currículum enviado</h2><span>Versión del '+ctx.date(a.created_at)+'</span></div><div class="candidate-resume">'+(ctx.resumeSections(a.cv_snapshot||{})||'<p>No se incluyeron secciones adicionales.</p>')+'</div></section></div><aside class="candidate-aside"><section class="candidate-section candidate-contact"><h2>Contacto compartido</h2><p>'+ctx.contactLink(a.contact)+'</p><span>La persona eligió este canal al postularse.</span></section><section class="candidate-section candidate-status"><h2>Seguimiento de la postulación</h2><p>Actualiza el estado después de revisar o contactar a la persona.</p>'+[['reviewing','Marcar en revisión'],['contacted','Marcar contacto iniciado'],['accepted','Aceptar postulación'],['not_selected','Marcar no seleccionada']].map(([value,label])=>'<button type="button" class="btn btn-outline'+(value===a.status?' current':'')+'" data-hiring-status="'+value+'" data-job-id="'+jobId+'" data-person-id="'+id+'" '+(a.status===value?'disabled':'')+'>'+label+'</button>').join('')+'<span class="candidate-status-note">Estos cambios se muestran en la cuenta de la persona. La app no envía mensajes en tu nombre.</span></section></aside></div>';
        return html;
      }
      async function refreshApplicants(loadMore=false,button=null){
        const job=box.job,user=owner();if(!job)return;
        const seq=++box.listEpoch,epoch=box.epoch,status=box.filters[job.id]||'',offset=loadMore?box.offset:0;
        const region=ctx.document.getElementById('hiring-applicant-region');if(region)region.setAttribute('aria-busy','true');
        if(button)button.disabled=true;
        try{
          const records=await fetchApplicants(job.id,user,status,offset);guard(epoch,user);if(seq!==box.listEpoch)throw stale();
          const page=(records||[]).slice(0,PAGE_SIZE);box.records=loadMore?[...box.records,...page.filter(a=>!box.records.some(old=>old.id===a.id))]:page;box.offset=offset+page.length;box.more=(records||[]).length>PAGE_SIZE;
          if(ctx.getRoute().page==='job'&&ctx.getRoute().jobId===job.id&&region)region.innerHTML=applicantRows();
        }catch(error){
          if(seq===box.listEpoch&&epoch===box.epoch&&region){
            const retry='<div class="notice show info">No pudimos cargar estas postulaciones. Revisa la conexión. <button type="button" class="text-btn" data-hiring-retry="'+(loadMore?'more':'reset')+'">Volver a intentar</button></div>';
            region.innerHTML=(loadMore?applicantRows():'')+retry;
          }
          throw error;
        }finally{if(seq===box.listEpoch&&region)region.removeAttribute('aria-busy');if(button)button.disabled=false;}
      }
      async function changeStatus(button){
        const jobId=button.dataset.jobId,id=button.dataset.personId,status=button.dataset.hiringStatus;
        if(!isId(jobId)||!isId(id)||!['reviewing','contacted','accepted','not_selected'].includes(status))return;
        if(status==='accepted'&&!ctx.confirm('¿Aceptar esta postulación? La persona verá la actualización. Coordina las condiciones y próximos pasos directamente.'))return;
        if(status==='not_selected'&&!ctx.confirm('¿Marcar esta postulación como no seleccionada? La persona verá esta decisión.'))return;
        const user=owner(),epoch=box.epoch;
        button.disabled=true;
        try{
          await ctx.patchOne('job_applications?id=eq.'+id+'&job_id=eq.'+jobId+'&business_user_id=eq.'+user,{status});
          guard(epoch,user);const route=ctx.getRoute();
          if(route.page==='candidate'&&route.jobId===jobId&&route.applicationId===id)await ctx.goPerson(jobId,id,{history:'replace'});
          ctx.toast('Estado actualizado.');
        }finally{button.disabled=false;}
      }
      async function handleClick(event){
        const b=event.target.closest('button');if(!b)return false;
        if(b.dataset.hiringJob){event.preventDefault();await ctx.goJob(b.dataset.hiringJob);return true;}
        if(b.dataset.hiringPerson){event.preventDefault();await ctx.goPerson(b.dataset.jobId,b.dataset.hiringPerson);return true;}
        if(b.dataset.hiringBack){event.preventDefault();await ctx.goBack(b.dataset.hiringBack,b.dataset.jobId);return true;}
        if(b.hasAttribute('data-hiring-job-filter')){
          box.jobFilter=b.dataset.hiringJobFilter;ctx.document.querySelectorAll('[data-hiring-job-filter]').forEach(n=>{const on=n.dataset.hiringJobFilter===box.jobFilter;n.classList.toggle('active',on);n.setAttribute('aria-pressed',String(on));});
          const region=ctx.document.getElementById('hiring-jobs-grid');if(region)region.innerHTML=jobCards(filteredJobs());return true;
        }
        if(b.hasAttribute('data-hiring-retry')){await refreshApplicants(b.dataset.hiringRetry==='more',b);return true;}
        if(b.hasAttribute('data-hiring-more')){await refreshApplicants(true,b);return true;}
        if(b.dataset.hiringStatus){await changeStatus(b);return true;}
        return false;
      }
      async function handleChange(event){
        if(event.target.id!=='hiring-stage-filter'||!box.job)return false;
        box.filters[box.job.id]=event.target.value;await refreshApplicants();return true;
      }
      function reset(){box.epoch++;box.listEpoch++;box.job=null;box.person=null;box.jobs=[];box.counts={};box.records=[];box.offset=0;box.more=false;box.filters={};box.jobFilter='';}
      return {renderJobs,renderJob,renderPerson,handleClick,handleChange,reset};
    }
  };
})();

