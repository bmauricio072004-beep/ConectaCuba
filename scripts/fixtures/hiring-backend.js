(() => {
  'use strict';
  // Local preview fixture only. The publishing check rejects every generated _qa file.
  const OWNER='11111111-1111-4111-8111-111111111111',PERSON='11111111-1111-4111-8111-111111111114';
  const JOB_A='22222222-2222-4222-8222-222222222221',JOB_B='22222222-2222-4222-8222-222222222222';
  const params=new URLSearchParams(location.search),person=params.get('role')==='person',pending=params.has('pending');
  const stamp='2026-10-25T06:00:00Z';
  let fixtureSequence=1;const fixtureUUID=()=>globalThis.crypto?.randomUUID?.()||'99999999-9999-4999-8999-'+String(Date.now()+fixtureSequence++).slice(-12).padStart(12,'0');
  const profile={id:person?PERSON:OWNER,account_type:person?'person':'business',display_name:person?'Persona A de prueba':'Responsable de prueba',province:'La Habana',municipality:'Cerro',address:'',contact_recovery:'',public_contact:'Correo',public_contact_other:'',desired_job:'Técnico eléctrico',profile_summary:'Experiencia en instalaciones y mantenimiento.'};
  const business={user_id:OWNER,business_name:'Taller de prueba',contact_person:profile.display_name,business_activity:'Electricidad y electrónica',business_activity_other:'',province:'La Habana',municipality:'Cerro',description:'Instalaciones y mantenimiento de equipos.',whatsapp:'',other_contact:'',proof_url:'https://example.invalid',business_address:'',show_address:false,review_status:pending?'pending':'approved',email_confirmed:true,contact_email:'negocio@example.invalid',review_note:'',logo_path:'',created_at:stamp};
  const jobs=[
    {id:JOB_A,business_user_id:OWNER,business_name:business.business_name,title:'Técnico de mantenimiento eléctrico',category:'Electricidad y electrónica',category_other:'',description:'Diagnóstico y reparación de equipos eléctricos.\nBuscamos experiencia práctica, responsabilidad y disposición para trabajar en equipo.',province:'La Habana',municipality:'Cerro',work_schedule:'Tiempo completo',work_modality:'Presencial',salary_min:18000,salary_max:25000,salary_currency:'CUP',salary_period:'monthly',status:pending?'closed':'published',created_at:stamp,updated_at:stamp},
    {id:JOB_B,business_user_id:OWNER,business_name:business.business_name,title:'Auxiliar de almacén',category:'Comercio',category_other:'',description:'Organización de materiales y apoyo al equipo de almacén.',province:'La Habana',municipality:'Cerro',work_schedule:'Tiempo completo',work_modality:'Presencial',salary_min:16000,salary_max:null,salary_currency:'CUP',salary_period:'monthly',status:'closed',created_at:stamp,updated_at:stamp}
  ];
  const applications=[
    {id:'33333333-3333-4333-8333-333333333331',job_id:JOB_A,applicant_id:PERSON,business_user_id:OWNER,job_title:jobs[0].title,business_name:business.business_name,applicant_name:'Persona A de prueba',applicant_location:'Cerro, La Habana',desired_job:'Técnico eléctrico',status:'submitted',contact:'ana@example.invalid',message:'Me interesa el puesto. Tengo experiencia en diagnóstico e instalaciones.',cv_snapshot:{intro:'Técnica en electricidad con experiencia en mantenimiento.',experience:'Técnica de mantenimiento · 2022–2026\nDiagnóstico de averías e instalaciones en viviendas y negocios.',education:'Técnico medio en electricidad.',skills:'Diagnóstico, instalación, mantenimiento y trabajo en equipo.',languages:'Español'},consent:true,created_at:stamp,updated_at:stamp},
    {id:'33333333-3333-4333-8333-333333333332',job_id:JOB_A,applicant_id:'11111111-1111-4111-8111-111111111112',business_user_id:OWNER,job_title:jobs[0].title,business_name:business.business_name,applicant_name:'Persona B de prueba',applicant_location:'Playa, La Habana',desired_job:'Mantenimiento',status:'reviewing',contact:'persona-b@example.invalid',message:'Disponibilidad para trabajar a tiempo completo.',cv_snapshot:{intro:'Experiencia en mantenimiento de equipos.',experience:'Mantenimiento preventivo y reparaciones.',education:'Cursos técnicos.',skills:'Reparación y herramientas.',languages:'Español'},consent:true,created_at:'2026-10-24T06:00:00Z',updated_at:stamp},
    {id:'33333333-3333-4333-8333-333333333333',job_id:JOB_B,applicant_id:'11111111-1111-4111-8111-111111111113',business_user_id:OWNER,job_title:jobs[1].title,business_name:business.business_name,applicant_name:'Persona C de prueba',applicant_location:'Cerro, La Habana',desired_job:'Almacén',status:'contacted',contact:'marta@example.invalid',message:'Experiencia organizando materiales.',cv_snapshot:{intro:'Auxiliar de almacén.',experience:'Recepción de mercancías y organización.'},consent:true,created_at:'2026-10-23T06:00:00Z',updated_at:stamp}
  ];
  applications.forEach(a=>a.job_snapshot={...jobs.find(j=>j.id===a.job_id)});
  if(params.has('catalog')){
    jobs[1].status='published';
    jobs.push({...jobs[0],id:'22222222-2222-4222-8222-222222222223',title:'Dependiente de tienda y atención al cliente',municipality:'Centro Habana',work_schedule:'Medio tiempo',salary_min:null,salary_max:null});
  }
  if(params.has('long')){profile.display_name='María Alejandra Rodríguez Fernández de la Cruz';jobs[0].title='Especialista en mantenimiento, diagnóstico y reparación de instalaciones eléctricas';business.business_name='Servicios Integrales de Electricidad y Mantenimiento del Caribe';jobs.forEach(j=>j.business_name=business.business_name);}
  if(params.has('empty')){jobs.length=0;applications.length=0;}
  if(params.has('accepted'))applications[0].status='accepted';
  const reviewSubmissions=params.has('reviews')?[{id:'55555555-5555-4555-8555-555555555551',business_user_id:OWNER,business_name:business.business_name,author_id:'11111111-1111-4111-8111-111111111115',rating:4,job_role:'Técnico de mantenimiento',employment_status:'former',body:'Experiencia ficticia para probar el diseño: buena organización del trabajo y un equipo con disposición para ayudar.',evidence:'EVIDENCIA PRIVADA DE PRUEBA. No es una reseña real.',confirms_work:true,review_status:'approved',review_note:'',created_at:stamp,updated_at:stamp}]:[];
  if(params.has('admin'))reviewSubmissions.push({id:'55555555-5555-4555-8555-555555555552',business_user_id:OWNER,business_name:business.business_name,author_id:PERSON,rating:5,job_role:'Puesto de prueba',employment_status:'former',body:'Reseña ficticia pendiente para verificar la moderación desde administración.',evidence:'EVIDENCIA PRIVADA FICTICIA. Solo para esta prueba.',confirms_work:true,review_status:'pending',review_note:'',created_at:stamp,updated_at:stamp});
  const publicBusiness={user_id:OWNER,business_name:business.business_name,business_activity:business.business_activity,business_activity_other:'',description:business.description,province:business.province,municipality:business.municipality,public_address:'',whatsapp:'',other_contact:'',logo_path:'',updated_at:stamp};
  let resume={user_id:profile.id,intro:'Técnica en electricidad con experiencia en mantenimiento.',experience:'Diagnóstico de equipos y reparaciones.',education:'Técnico medio en electricidad.',skills:'Instalación y mantenimiento.',languages:'Español',cv_contact:'ana@example.invalid'};
  // Optional storage bridge supplied only by the standalone preview builder.
  const store=window.CC_PREVIEW_STORE;
  if(store){
    const saved=store.read();
    if(saved){
      if(Array.isArray(saved.jobs))jobs.splice(0,jobs.length,...saved.jobs);
      if(Array.isArray(saved.applications))applications.splice(0,applications.length,...saved.applications);
      if(saved.business)Object.assign(business,saved.business);
      if(Array.isArray(saved.reviews))reviewSubmissions.splice(0,reviewSubmissions.length,...saved.reviews);
      if(saved.profiles?.[profile.id])Object.assign(profile,saved.profiles[profile.id]);
      if(saved.resumes?.[profile.id])resume=saved.resumes[profile.id];
      Object.assign(publicBusiness,{business_name:business.business_name,description:business.description,province:business.province,municipality:business.municipality});
    }
  }
  function savePreview(){
    if(!store)return;
    const before=store.read()||{};
    store.write({jobs,applications,business,reviews:reviewSubmissions,savedJobs:before.savedJobs||{},profiles:{...before.profiles,[profile.id]:profile},resumes:{...before.resumes,[profile.id]:resume}});
  }
  const values=new Map(params.has('guest')?[]:[['cc_auth_session_v1',JSON.stringify({access_token:'local-fixture-not-a-real-token',expires_at:Date.now()/1000+3600,user:{id:profile.id,email:person?'ana@example.invalid':'negocio@example.invalid',email_confirmed_at:stamp}})]]);
  // Only bookmark keys cross preview reloads; never persist the synthetic session.
  if(store){for(const [key,value] of Object.entries(store.read()?.savedJobs||{}))if(key.startsWith('cc_saved_jobs_'))values.set(key,String(value));}
  function saveBookmarkKey(key,value){
    if(!store||!key.startsWith('cc_saved_jobs_'))return;
    const before=store.read()||{},savedJobs={...before.savedJobs};
    if(value===null)delete savedJobs[key];else savedJobs[key]=String(value);
    store.write({...before,savedJobs});
  }
  Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)||null,setItem:(key,value)=>{values.set(key,String(value));saveBookmarkKey(key,value);},removeItem:key=>{values.delete(key);saveBookmarkKey(key,null);}}});
  const api=store?'https://conectacuba-preview.invalid/__qa_api':location.origin+'/__qa_api';window.CC_SUPABASE={url:api,key:'local-fixture'};
  const realFetch=window.fetch.bind(window),json=(data,status=200)=>{savePreview();return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});};
  const counters=()=>person?[]:jobs.map(j=>{const list=applications.filter(a=>a.job_id===j.id),count=s=>list.filter(a=>a.status===s).length;return{job_id:j.id,total:list.length,new_count:count('submitted'),reviewing_count:count('reviewing'),contacted_count:count('contacted'),closed_count:count('not_selected'),withdrawn_count:count('withdrawn'),accepted_count:count('accepted')};});
  function filter(rows,p){
    let found=rows;for(const key of ['id','job_id','user_id','applicant_id','business_user_id','author_id','review_status','status']){const value=p.get(key);if(value?.startsWith('eq.'))found=found.filter(row=>row[key]===value.slice(3));if(value?.startsWith('in.('))found=found.filter(row=>value.slice(4,-1).split(',').includes(row[key]));}
    return found;
  }
  window.fetch=async(input,options={})=>{
    const target=String(input);if(!target.startsWith(api))return store?json({message:'La vista previa no permite conexiones externas.'},403):realFetch(input,options);
    const u=new URL(target),path=u.pathname.slice('/__qa_api'.length),p=u.searchParams,method=options.method||'GET',body=typeof options.body==='string'?JSON.parse(options.body):{};
    if(path==='/rest/v1/rpc/cc_is_admin')return json(params.has('admin'));
    if(path==='/rest/v1/rpc/cc_job_application_counts')return json(counters());
    if(path==='/rest/v1/business_directory')return json(business.review_status==='approved'?[publicBusiness]:[]);
    if(path==='/rest/v1/business_rating_stats'){
      const approved=reviewSubmissions.filter(r=>r.review_status==='approved');
      return json(approved.length?[{business_user_id:OWNER,average_rating:Math.round(approved.reduce((n,r)=>n+r.rating,0)/approved.length*10)/10,review_count:approved.length}]:[]);
    }
    if(path==='/rest/v1/business_review_public'){
      const approved=filter(reviewSubmissions.filter(r=>r.review_status==='approved'),p),offset=Number(p.get('offset')||0),limit=Number(p.get('limit')||100);
      return json(approved.slice(offset,offset+limit).map(({id,business_user_id,rating,job_role,employment_status,body,created_at,updated_at})=>({id,business_user_id,rating,job_role,employment_status,body,created_at,updated_at})));
    }
    if(path==='/rest/v1/business_reviews'){
      if(method==='POST'){const r={id:fixtureUUID(),...body,business_name:business.business_name,review_status:'pending',review_note:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};reviewSubmissions.push(r);return json([r],201);}
      const selected=filter(reviewSubmissions,p).filter(r=>params.has('admin')||r.author_id===profile.id);
      if(method==='PATCH'){if(['approved','rejected'].includes(body.review_status)&&!params.has('admin'))return json({message:'Solo administración puede publicar'},403);selected.forEach(r=>Object.assign(r,body));}
      return json(selected);
    }
    if(path==='/rest/v1/profiles'){if(method==='PATCH')Object.assign(profile,body);return json([profile]);}
    if(path==='/rest/v1/business_applications'){
      if(method==='PATCH'){Object.assign(business,body);business.review_status='pending';jobs.forEach(j=>j.status='closed');}
      return json(person?[]:[business]);
    }
    if(path==='/rest/v1/job_posts'){
      if(method==='POST'){if(person||business.review_status!=='approved')return json({message:'Tu negocio debe estar aprobado'},403);const j={id:fixtureUUID(),business_name:business.business_name,status:'published',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...body};jobs.unshift(j);return json([j],201);}
      const selected=filter(jobs,p);
      if(method==='PATCH'){selected.forEach(j=>Object.assign(j,body));return json(selected);}
      return json(selected.slice(Number(p.get('offset')||0),Number(p.get('offset')||0)+Number(p.get('limit')||100)));
    }
    if(path==='/rest/v1/job_applications'){
      if(method==='POST'){
        if(!person||params.has('guest'))return json({message:'Usa el perfil Persona de prueba.'},403);
        const job=jobs.find(j=>j.id===body.job_id&&j.status==='published');
        if(!job||!body.consent)return json({message:'Oferta no disponible o falta el consentimiento.'},400);
        if(applications.some(a=>a.job_id===job.id&&a.applicant_id===profile.id))return json({message:'Ya existe una postulación de esta persona.'},409);
        const created={id:fixtureUUID(),job_id:job.id,applicant_id:profile.id,business_user_id:job.business_user_id,job_title:job.title,business_name:job.business_name,applicant_name:profile.display_name,applicant_location:[profile.municipality,profile.province].join(', '),desired_job:profile.desired_job,status:'submitted',contact:body.contact,message:body.message||'',cv_snapshot:body.cv_snapshot,job_snapshot:{...job},consent:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
        applications.push(created);return json([created],201);
      }
      const selected=filter(applications,p);
      if(method==='PATCH'){
        if(selected.some(a=>a.status==='withdrawn'))return json({message:'No puedes cambiar una postulación retirada'},400);
        selected.forEach(a=>Object.assign(a,body,{updated_at:new Date().toISOString()}));return json(selected);
      }
      const select=p.get('select')||'*',offset=Number(p.get('offset')||0),limit=Number(p.get('limit')||100);
      return json(selected.slice(offset,offset+limit).map(row=>select==='*'?row:Object.fromEntries(select.split(',').map(k=>[k,row[k]]))));
    }
    if(path==='/rest/v1/resumes'){if(['POST','PATCH'].includes(method))resume={...resume,...body};return json(person?[resume]:[]);}
    if(path==='/auth/v1/logout')return new Response(null,{status:204});
    if(['/auth/v1/recover','/auth/v1/signup','/auth/v1/resend','/auth/v1/user','/auth/v1/token'].includes(path))return json({message:'Esta prueba no crea cuentas ni cambia contraseñas y no envía correos. Usa el selector Persona / Negocio de la barra superior.'},400);
    if(path.startsWith('/storage/v1/'))return json({message:'La subida de archivos está desactivada en esta prueba.'},400);
    return json({message:'Unsupported local fixture route: '+path},400);
  };
})();

