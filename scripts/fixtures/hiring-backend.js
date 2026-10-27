(() => {
  'use strict';
  // Local preview fixture only. The publishing check rejects every generated _qa file.
  const OWNER='11111111-1111-4111-8111-111111111111',PERSON='11111111-1111-4111-8111-111111111114';
  const JOB_A='22222222-2222-4222-8222-222222222221',JOB_B='22222222-2222-4222-8222-222222222222';
  const params=new URLSearchParams(location.search),person=params.get('role')==='person',pending=params.has('pending');
  const stamp='2026-10-25T06:00:00Z';
  let fixtureSequence=1;const fixtureUUID=()=>globalThis.crypto?.randomUUID?.()||'99999999-9999-4999-8999-'+String(Date.now()+fixtureSequence++).slice(-12).padStart(12,'0');
  const profile={id:params.has('outsider')?'11111111-1111-4111-8111-111111111199':person?PERSON:OWNER,account_type:person?'person':'business',display_name:person?'Persona A de prueba':'Responsable de prueba',province:'La Habana',municipality:'Cerro',address:'',contact_recovery:'',public_contact:'Correo',public_contact_other:'',desired_job:'Técnico eléctrico',profile_summary:'Experiencia en instalaciones y mantenimiento.'};
  const business={user_id:OWNER,business_name:'Taller de prueba',contact_person:'Responsable de prueba',business_activity:'Electricidad y electrónica',business_activity_other:'',province:'La Habana',municipality:'Cerro',description:'Instalaciones y mantenimiento de equipos.',whatsapp:'+53 00000000',other_contact:'',proof_url:'https://example.invalid',business_address:'',show_address:false,review_status:pending?'pending':'approved',email_confirmed:true,contact_email:'negocio@example.invalid',review_note:'',logo_path:'',created_at:stamp};
  const jobs=[
    {id:JOB_A,business_user_id:OWNER,business_name:business.business_name,title:'Técnico de mantenimiento eléctrico',category:'Electricidad y electrónica',category_other:'',description:'Diagnóstico y reparación de equipos eléctricos.\nBuscamos experiencia práctica, responsabilidad y disposición para trabajar en equipo.',province:'La Habana',municipality:'Cerro',work_schedule:'Tiempo completo',work_modality:'Presencial',salary_min:18000,salary_max:25000,salary_currency:'CUP',salary_period:'monthly',status:pending?'closed':'published',created_at:stamp,updated_at:stamp},
    {id:JOB_B,business_user_id:OWNER,business_name:business.business_name,title:'Auxiliar de almacén',category:'Comercio',category_other:'',description:'Organización de materiales y apoyo al equipo de almacén.',province:'La Habana',municipality:'Cerro',work_schedule:'Tiempo completo',work_modality:'Presencial',salary_min:16000,salary_max:null,salary_currency:'CUP',salary_period:'monthly',status:'closed',created_at:stamp,updated_at:stamp}
  ];
  const applications=[
    {id:'33333333-3333-4333-8333-333333333331',job_id:JOB_A,applicant_id:PERSON,business_user_id:OWNER,job_title:jobs[0].title,business_name:business.business_name,applicant_name:'Persona A de prueba',applicant_location:'Cerro, La Habana',desired_job:'Técnico eléctrico',status:'submitted',contact:'+53 00000000',message:'Me interesa el puesto. Tengo experiencia en diagnóstico e instalaciones.',cv_snapshot:{intro:'Técnica en electricidad con experiencia en mantenimiento.',experience:'Técnica de mantenimiento · 2022–2026\nDiagnóstico de averías e instalaciones en viviendas y negocios.',education:'Técnico medio en electricidad.',skills:'Diagnóstico, instalación, mantenimiento y trabajo en equipo.',languages:'Español'},consent:true,created_at:stamp,updated_at:stamp},
    {id:'33333333-3333-4333-8333-333333333332',job_id:JOB_A,applicant_id:'11111111-1111-4111-8111-111111111112',business_user_id:OWNER,job_title:jobs[0].title,business_name:business.business_name,applicant_name:'Persona B de prueba',applicant_location:'Playa, La Habana',desired_job:'Mantenimiento',status:'reviewing',contact:'+53 00000001',message:'Disponibilidad para trabajar a tiempo completo.',cv_snapshot:{intro:'Experiencia en mantenimiento de equipos.',experience:'Mantenimiento preventivo y reparaciones.',education:'Cursos técnicos.',skills:'Reparación y herramientas.',languages:'Español'},consent:true,created_at:'2026-10-24T06:00:00Z',updated_at:stamp},
    {id:'33333333-3333-4333-8333-333333333333',job_id:JOB_B,applicant_id:'11111111-1111-4111-8111-111111111113',business_user_id:OWNER,job_title:jobs[1].title,business_name:business.business_name,applicant_name:'Persona C de prueba',applicant_location:'Cerro, La Habana',desired_job:'Almacén',status:'contacted',contact:'+53 00000002',message:'Experiencia organizando materiales.',cv_snapshot:{intro:'Auxiliar de almacén.',experience:'Recepción de mercancías y organización.'},consent:true,created_at:'2026-10-23T06:00:00Z',updated_at:stamp}
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
  let resume={user_id:profile.id,intro:'Técnica en electricidad con experiencia en mantenimiento.',experience:'Diagnóstico de equipos y reparaciones.',education:'Técnico medio en electricidad.',skills:'Instalación y mantenimiento.',languages:'Español',cv_contact:'+53 00000000'};
  // Optional storage bridge supplied only by the standalone preview builder.
  const store=window.CC_PREVIEW_STORE;
  window.CC_CAPABILITIES={employmentWorkflow:!!store,connectionDirectory:!!store};
  let reports=[],messages=[],connectionRequests=[];
  const directory=[{id:'taller',owner_id:OWNER,type:'business',name:business.business_name,category:'Servicios técnicos',province:'La Habana',municipality:'Cerro',description:'Un negocio de muestra para conectar con servicios de mantenimiento y oportunidades de empleo.',services:['Mantenimiento eléctrico','Reparación de equipos'],public_whatsapp:''},{id:'profesional-creativo',owner_id:PERSON,type:'professional',name:'Profesional creativo · ejemplo',category:'Diseño y comunicación',province:'La Habana',municipality:'Playa',description:'Perfil profesional ficticio para probar cómo ofrecer habilidades y recibir solicitudes.',services:['Diseño para negocios','Contenido digital'],public_whatsapp:''},{id:'servicio-hogar',owner_id:OWNER,type:'service',name:'Soluciones para tu hogar · ejemplo',category:'Hogar y reparaciones',province:'Matanzas',municipality:'Cárdenas',description:'Un servicio de muestra para solicitar información antes de coordinar un trabajo.',services:['Instalaciones','Revisión y mantenimiento'],public_whatsapp:''},{id:'tienda-local',owner_id:OWNER,type:'shop',name:'Tienda local · ejemplo',category:'Productos y suministros',province:'Villa Clara',municipality:'Santa Clara',description:'Concepto de tienda para consultar productos y disponibilidad. Esta beta no procesa compras ni pagos.',services:['Consultar productos','Pedir disponibilidad'],public_whatsapp:''}];
  let contactSettings={whatsapp:business.whatsapp||'',phone:'',contact_person:business.contact_person||'',contact_hours:'Lunes a viernes, de 9:00 a 17:00',visibility:'invited'};
  const normalizedPhone=value=>{let s=String(value||'').trim();if(!s||!/^(\+|00)?[\d\s().-]+$/.test(s))return '';let d=s.replace(/\D/g,'');if(s.startsWith('00'))d=d.slice(2);if(d.length===8&&!s.startsWith('+')&&!s.startsWith('00'))d='53'+d;return /^[1-9]\d{7,14}$/.test(d)?'+'+d:'';};
  const touch=a=>new Date(Math.max(Date.now(),new Date(a.updated_at||a.created_at).getTime()+1)).toISOString();
  function recordStage(a,status,extra={}){const now=touch(a);const previous=a.status_history||[{status:'submitted',at:a.created_at}];a.status_history=[...previous,{status,at:now}].slice(-30);Object.assign(a,extra,{status,updated_at:now});}

  if(store){
    const saved=store.read();
    if(saved){
      if(Array.isArray(saved.jobs))jobs.splice(0,jobs.length,...saved.jobs);
      if(Array.isArray(saved.applications))applications.splice(0,applications.length,...saved.applications);
      if(saved.business)Object.assign(business,saved.business);
      if(saved.contactSettings)Object.assign(contactSettings,saved.contactSettings);
      else Object.assign(contactSettings,{whatsapp:business.whatsapp||contactSettings.whatsapp,contact_person:business.contact_person||contactSettings.contact_person});
      if(Array.isArray(saved.reports))reports=saved.reports;
      if(Array.isArray(saved.messages))messages=saved.messages;
      if(Array.isArray(saved.connectionRequests))connectionRequests=saved.connectionRequests;
      if(Array.isArray(saved.reviews))reviewSubmissions.splice(0,reviewSubmissions.length,...saved.reviews);
      if(saved.profiles?.[profile.id])Object.assign(profile,saved.profiles[profile.id]);
      if(saved.resumes?.[profile.id])resume=saved.resumes[profile.id];
      Object.assign(publicBusiness,{business_name:business.business_name,description:business.description,province:business.province,municipality:business.municipality});
    }
  }
  function savePreview(){
    if(!store)return;
    const before=store.read()||{};
    store.write({jobs,applications,business,contactSettings,reports,messages,connectionRequests,reviews:reviewSubmissions,savedJobs:before.savedJobs||{},profiles:{...before.profiles,[profile.id]:profile},resumes:{...before.resumes,[profile.id]:resume}});
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
    if(path==='/rest/v1/rpc/cc_explore_directory'){
      const rows=directory.filter(e=>e.owner_id!==OWNER||business.review_status==='approved').map(e=>({...e,name:e.id==='taller'?business.business_name:e.name,description:e.id==='taller'?business.description:e.description,province:e.id==='taller'?business.province:e.province,municipality:e.id==='taller'?business.municipality:e.municipality,public_whatsapp:e.owner_id===OWNER&&contactSettings.visibility==='public'?contactSettings.whatsapp:''}));
      return json(body.entry_id?rows.filter(e=>e.id===body.entry_id):rows);
    }
    if(path==='/rest/v1/rpc/cc_create_connection'){
      if(params.has('guest'))return json({message:'Inicia sesión para enviar una solicitud'},403);
      const entry=directory.find(e=>e.id===body.entry_id);if(!entry||entry.owner_id===profile.id||(entry.owner_id===OWNER&&business.review_status!=='approved'))return json({message:'Este perfil no está disponible para la solicitud'},400);
      const text=String(body.body||'').trim(),number=normalizedPhone(body.contact);
      if(!body.consent||!number||text.length<15||text.length>2000)return json({message:'Revisa la solicitud y autoriza compartir el contacto'},400);
      const existing=connectionRequests.find(r=>r.entry_id===entry.id&&r.requester_id===profile.id&&['pending','contacted'].includes(r.status));if(existing)return json({id:existing.id,status:existing.status,updated_at:existing.updated_at,alreadyExists:true});
      if(connectionRequests.filter(r=>r.requester_id===profile.id&&r.created_at.slice(0,10)===new Date().toISOString().slice(0,10)).length>=5)return json({message:'Límite de cinco solicitudes de prueba al día'},429);
      const now=new Date().toISOString(),r={id:fixtureUUID(),entry_id:entry.id,entry_name:entry.id==='taller'?business.business_name:entry.name,requester_id:profile.id,requester_name:profile.display_name,provider_id:entry.owner_id,body:text,contact:number,consent:true,status:'pending',response:'',thread:[],created_at:now,updated_at:now};connectionRequests.push(r);return json({id:r.id,status:r.status,updated_at:r.updated_at},201);
    }
    if(path==='/rest/v1/rpc/cc_connection_requests'){
      if(params.has('guest'))return json({message:'Acceso privado'},403);
      const rows=connectionRequests.filter(r=>r.requester_id===profile.id||r.provider_id===profile.id);
      if(body.request_id){const r=rows.find(r=>r.id===body.request_id);if(!r)return json({message:'Solicitud no disponible para esta cuenta'},403);return json(r.status==='withdrawn'&&r.provider_id===profile.id?{...r,body:null,contact:null,thread:[]}:r);}
      return json(rows.slice(-100).reverse().map(({id,entry_name,provider_id,requester_id,requester_name,status,created_at,updated_at})=>({id,entry_name,provider_id,requester_id,requester_name,status,created_at,updated_at})));
    }
    if(path==='/rest/v1/rpc/cc_connection_message'){
      if(params.has('guest'))return json({message:'Acceso privado'},403);
      const r=connectionRequests.find(r=>r.id===body.request_id);
      if(!r||![r.requester_id,r.provider_id].includes(profile.id))return json({message:'Conversación no disponible'},403);
      if(['withdrawn','declined'].includes(r.status))return json({message:'La solicitud está cerrada'},409);
      const text=String(body.body||'').trim();if(!text||text.length>2000)return json({message:'Escribe de 1 a 2000 caracteres'},400);
      const key=String(body.client_key||'');if(key&&!/^[a-zA-Z0-9_-]{12,80}$/.test(key))return json({message:'Identificador de envío no válido'},400);
      const duplicate=key&&(r.thread||[]).find(m=>m.client_key===key&&m.sender_id===profile.id);
      if(duplicate){if(duplicate.body!==text)return json({message:'Este intento ya contiene otro mensaje'},409);return json({id:r.id,status:r.status,updated_at:r.updated_at,deduplicated:true});}
      if(connectionRequests.flatMap(item=>item.thread||[]).filter(m=>m.sender_id===profile.id&&Date.now()-Date.parse(m.created_at)<60000).length>=10)return json({message:'Espera un momento antes de enviar más mensajes'},429);
      const now=new Date(Math.max(Date.now(),Date.parse(r.updated_at)+1)).toISOString();
      r.thread=[...(r.thread||[]),{id:fixtureUUID(),sender_id:profile.id,body:text,created_at:now,client_key:key}].slice(-100);r.updated_at=now;
      return json({id:r.id,status:r.status,updated_at:r.updated_at},201);
    }
    if(path==='/rest/v1/rpc/cc_update_connection'){
      if(params.has('guest'))return json({message:'Acceso privado'},403);
      const r=connectionRequests.find(r=>r.id===body.request_id);if(!r||!['pending','contacted','accepted'].includes(r.status))return json({message:'La solicitud no está disponible para cambios'},400);
      if(body.status==='withdrawn'&&r.requester_id===profile.id)r.status='withdrawn';
      else if(r.provider_id===profile.id&&['contacted','accepted','declined'].includes(body.status)){const response=String(body.response||'').trim();if(response.length<5||response.length>1000)return json({message:'Escribe una respuesta de 5 a 1000 caracteres'},400);r.status=body.status;r.response=response;r.thread=[...(r.thread||[]),{id:fixtureUUID(),sender_id:profile.id,body:response,created_at:new Date().toISOString()}];}
      else return json({message:'No tienes permiso para este cambio'},403);
      r.updated_at=new Date(Math.max(Date.now(),Date.parse(r.updated_at)+1)).toISOString();return json({id:r.id,status:r.status,updated_at:r.updated_at});
    }
    if(path==='/rest/v1/rpc/cc_demo_registration'){
      if(!store)return json({message:'Solo disponible en esta prueba'},403);
      const type=body.account_type;if(!['person','business'].includes(type)||!normalizedPhone(body.whatsapp))return json({message:'Datos de registro incompletos'},400);
      const id=type==='business'?OWNER:PERSON,display=String(body.display_name||body.contact_person||'').trim();
      if(display.length<2||!body.province||!String(body.municipality||'').trim())return json({message:'Completa nombre y ubicación'},400);
      const before=store.read()||{},target={...(before.profiles?.[id]||{}),id,account_type:type,display_name:display,province:body.province,municipality:String(body.municipality).trim(),address:String(body.address||'').trim(),public_contact:'WhatsApp',contact_recovery:String(body.contact_recovery||'').trim()};
      if(type==='business'){
        if(!String(body.business_name||'').trim())return json({message:'Indica el nombre del negocio'},400);
        for(const k of ['business_name','contact_person','business_activity','business_activity_other','province','municipality','description','proof_url','business_address'])business[k]=String(body[k]||'').trim();
        business.whatsapp=normalizedPhone(body.whatsapp);business.review_status='pending';jobs.forEach(j=>{j.status='closed';j.business_name=business.business_name;});
        contactSettings={...contactSettings,whatsapp:business.whatsapp,contact_person:business.contact_person,contact_hours:String(body.contact_hours||'').trim().slice(0,150),visibility:body.contact_visibility==='public'?'public':'invited'};
      }
      const resumes={...before.resumes};if(type==='person'){resumes[id]={...(before.resumes?.[id]||{}),user_id:id,cv_contact:normalizedPhone(body.whatsapp)};if(profile.id===id)resume={...resume,...resumes[id]};}
      if(profile.id===id)Object.assign(profile,target);
      store.write({...before,profiles:{...before.profiles,[id]:target},resumes});
      return json({role:type,profile_id:id,simulated:true});
    }
    if(path==='/rest/v1/rpc/cc_application_messages'||path==='/rest/v1/rpc/cc_send_application_message'){
      const a=applications.find(a=>a.id===body.application_id&&a.job_id===body.job_id);
      const permitted=a&&!params.has('guest')&&(person?a.applicant_id===profile.id:a.business_user_id===profile.id);
      if(!permitted||(a.status==='withdrawn'&&!person))return json({message:'Conversación no disponible para esta cuenta'},403);
      if(path.endsWith('cc_application_messages'))return json(messages.filter(m=>m.application_id===a.id).slice(-50).map(({client_key,...visible})=>visible));
      if(['withdrawn','not_selected'].includes(a.status))return json({message:'El proceso finalizó y la conversación es de solo lectura'},409);
      const text=String(body.body||'').trim();if(!text||text.length>2000)return json({message:'Escribe un mensaje de 1 a 2000 caracteres'},400);
      const clientKey=String(body.client_key||'');
      if(clientKey&&!/^[a-zA-Z0-9_-]{12,80}$/.test(clientKey))return json({message:'Identificador de envío no válido'},400);
      const duplicate=clientKey&&messages.find(m=>m.application_id===a.id&&m.sender_id===profile.id&&m.client_key===clientKey);
      if(duplicate){if(duplicate.body!==text)return json({message:'Este intento de envío ya contiene otro texto'},409);return json({id:duplicate.id,status:a.status,updated_at:a.updated_at,deduplicated:true});}
      if(messages.filter(m=>m.sender_id===profile.id&&Date.now()-new Date(m.created_at).getTime()<60000).length>=10)return json({message:'Espera un momento antes de enviar más mensajes'},429);
      const now=touch(a),m={id:fixtureUUID(),application_id:a.id,job_id:a.job_id,sender_id:profile.id,sender_role:profile.account_type,body:text,client_key:clientKey,created_at:now};
      messages.push(m);a.updated_at=now;a.last_message_at=now;a.last_message_sender_role=profile.account_type;
      return json({id:m.id,status:a.status,updated_at:a.updated_at},201);
    }
    if(path==='/rest/v1/rpc/cc_report_job'){
      if(params.has('guest'))return json({message:'Inicia sesión para reportar'},403);
      const job=jobs.find(j=>j.id===body.job_id);if(!job)return json({message:'Oferta no disponible'},404);
      const reason=String(body.reason||''),detail=String(body.detail||'').trim();
      if(!['Posible fraude','Datos engañosos','Contenido inapropiado','Otro'].includes(reason)||detail.length<15||detail.length>2000)return json({message:'Revisa el motivo y la descripción'},400);
      if(reports.some(r=>r.job_id===job.id&&r.author_id===profile.id&&r.status==='pending'))return json({message:'Ya tienes un reporte pendiente para esta oferta'},409);
      if(reports.filter(r=>r.author_id===profile.id&&new Date(r.created_at).toISOString().slice(0,10)===new Date().toISOString().slice(0,10)).length>=5)return json({message:'Límite de cinco reportes de prueba al día'},429);
      const r={id:fixtureUUID(),job_id:job.id,job_title:job.title,author_id:profile.id,reason,detail,status:'pending',created_at:new Date().toISOString()};reports.push(r);return json({id:r.id,status:r.status},201);
    }
    if(path==='/rest/v1/rpc/cc_reports_moderation'){
      if(!params.has('admin'))return json({message:'Solo administración puede revisar reportes'},403);
      if(body.report_id){const r=reports.find(r=>r.id===body.report_id);if(!r)return json({message:'Reporte no disponible'},404);if(body.status!=='reviewed')return json({message:'Estado no permitido'},400);r.status='reviewed';}
      return json(reports.slice(-100).reverse());
    }
    if(path==='/rest/v1/rpc/cc_business_contact'){
      if(body.business_id!==OWNER)return json({message:'Negocio no disponible'},404);
      const owned=!person&&!params.has('guest');
      const a=applications.find(a=>a.id===body.application_id&&a.applicant_id===profile.id&&a.business_user_id===OWNER);
      const invited=person&&!params.has('guest')&&a&&['contacted','accepted'].includes(a.status);
      const shared=owned||(business.review_status==='approved'&&(contactSettings.visibility==='public'||invited));
      return json(shared?{...contactSettings,shared:true,business_name:business.business_name}:{shared:false,business_name:business.business_name,visibility:contactSettings.visibility});
    }
    if(path==='/rest/v1/rpc/cc_save_business_contact'){
      if(person||params.has('guest'))return json({message:'Solo el negocio puede modificar su contacto'},403);
      const phone=normalizedPhone(body.whatsapp),alternative=body.phone?normalizedPhone(body.phone):'';
      if(!phone||(body.phone&&!alternative)||!['public','invited'].includes(body.visibility)||String(body.contact_person||'').trim().length<2)return json({message:'Revisa los datos del contacto'},400);
      contactSettings={whatsapp:phone,phone:alternative,contact_person:String(body.contact_person).trim().slice(0,100),contact_hours:String(body.contact_hours||'').trim().slice(0,150),visibility:body.visibility};
      business.whatsapp=contactSettings.whatsapp;business.contact_person=contactSettings.contact_person;
      return json({...contactSettings,shared:true});
    }
    if(path==='/rest/v1/rpc/cc_application_next_step'){
      if(person||params.has('guest'))return json({message:'Solo el negocio puede invitar'},403);
      const a=applications.find(a=>a.id===body.application_id&&a.job_id===body.job_id&&a.business_user_id===profile.id);
      if(!a||a.status==='withdrawn')return json({message:'Postulación no disponible'},404);
      const message=String(body.employer_message||'').trim();
      if(!['contacted','accepted'].includes(body.status)||message.length<10||message.length>2000||!normalizedPhone(contactSettings.whatsapp))return json({message:'Revisa el mensaje, el estado y el contacto del negocio'},400);
      if(body.meeting_at&&(!Number.isFinite(new Date(body.meeting_at).getTime())||new Date(body.meeting_at).getTime()<=Date.now()))return json({message:'La fecha debe ser futura'},400);
      recordStage(a,body.status,{employer_message:message,meeting_at:body.meeting_at||null,meeting_place:String(body.meeting_place||'').trim().slice(0,300)});
      messages.push({id:fixtureUUID(),application_id:a.id,job_id:a.job_id,sender_id:profile.id,sender_role:'business',body:message,kind:body.status==='accepted'?'selection':'invitation',meeting_at:a.meeting_at,meeting_place:a.meeting_place,created_at:a.updated_at});
      a.last_message_at=a.updated_at;a.last_message_sender_role='business';
      return json({id:a.id,status:a.status,updated_at:a.updated_at});
    }
    if(path==='/rest/v1/rpc/cc_is_admin')return json(params.has('admin'));
    if(path==='/rest/v1/rpc/cc_job_application_counts')return json(counters());
    if(path==='/rest/v1/business_directory')return json(business.review_status==='approved'?[{...publicBusiness,whatsapp:contactSettings.visibility==='public'?contactSettings.whatsapp:'',other_contact:''}]:[]);
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
    if(path==='/rest/v1/profiles'){
      if(params.has('guest'))return json({message:'Acceso privado'},403);
      if(method==='PATCH'){if(Object.keys(body).some(k=>!['display_name','province','municipality','address','contact_recovery','public_contact','public_contact_other','desired_job','profile_summary','updated_at'].includes(k)))return json({message:'No puedes cambiar la identidad ni el tipo de cuenta'},403);Object.assign(profile,body);}
      return json(filter([profile],p));
    }
    if(path==='/rest/v1/business_applications'){
      if(method==='PATCH'){
        if(params.has('admin')&&['approved','rejected'].includes(body.review_status)){business.review_status=body.review_status;business.review_note=String(body.review_note||'');}
        else{if(person||Object.keys(body).some(k=>['user_id','review_status','email_confirmed','contact_email'].includes(k)))return json({message:'Solo el negocio puede editar sus datos permitidos'},403);Object.assign(business,body);business.review_status='pending';jobs.forEach(j=>{j.status='closed';j.business_name=business.business_name;});}
      }
      return json(person&&!params.has('admin')?[]:[business]);
    }
    if(path==='/rest/v1/job_posts'){
      if(method==='POST'){if(person||business.review_status!=='approved')return json({message:'Tu negocio debe estar aprobado'},403);const j={id:fixtureUUID(),business_name:business.business_name,status:'published',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...body};jobs.unshift(j);return json([j],201);}
      const selected=filter(jobs,p);
      if(method==='PATCH'){
        if(person||params.has('guest')||Object.keys(body).some(k=>['id','business_user_id','business_name','created_at'].includes(k)))return json({message:'Solo el propietario puede editar la vacante'},403);
        if(body.status==='published'&&business.review_status!=='approved')return json({message:'Tu negocio debe estar aprobado'},403);
        selected.filter(j=>j.business_user_id===profile.id).forEach(j=>Object.assign(j,body));return json(selected);
      }
      return json(selected.slice(Number(p.get('offset')||0),Number(p.get('offset')||0)+Number(p.get('limit')||100)));
    }
    if(path==='/rest/v1/job_applications'){
      if(method==='POST'){
        if(!person||params.has('guest'))return json({message:'Usa el perfil Persona de prueba.'},403);
        const job=jobs.find(j=>j.id===body.job_id&&j.status==='published');
        if(!job||!body.consent)return json({message:'Oferta no disponible o falta el consentimiento.'},400);
        if(applications.some(a=>a.job_id===job.id&&a.applicant_id===profile.id))return json({message:'Ya existe una postulación de esta persona.'},409);
        const created={id:fixtureUUID(),job_id:job.id,applicant_id:profile.id,business_user_id:job.business_user_id,job_title:job.title,business_name:job.business_name,applicant_name:profile.display_name,applicant_location:[profile.municipality,profile.province].join(', '),desired_job:profile.desired_job,status:'submitted',contact:body.contact,message:body.message||'',cv_snapshot:body.cv_snapshot,job_snapshot:{...job},consent:true,status_history:[{status:'submitted',at:new Date().toISOString()}],created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
        applications.push(created);return json([created],201);
      }
      const selected=filter(applications,p).filter(a=>!params.has('guest')&&(person?a.applicant_id===profile.id:a.business_user_id===profile.id));
      if(method==='PATCH'){
        if(selected.some(a=>a.status==='withdrawn'))return json({message:'No puedes cambiar una postulación retirada'},400);
        if(person&&(body.status!=='withdrawn'||Object.keys(body).some(k=>k!=='status')))return json({message:'Solo puedes retirar tu postulación'},403);
        if(!person&&(!['reviewing','contacted','accepted','not_selected'].includes(body.status)||Object.keys(body).some(k=>k!=='status')))return json({message:'Cambio de estado no permitido'},400);
        selected.forEach(a=>recordStage(a,body.status));return json(selected);
      }
      const select=p.get('select')||'*',offset=Number(p.get('offset')||0),limit=Number(p.get('limit')||100);
      return json(selected.slice(offset,offset+limit).map(row=>{const visible=!person&&row.status==='withdrawn'?{...row,contact:null,message:null,cv_snapshot:null}:row;return select==='*'?visible:Object.fromEntries(select.split(',').map(k=>[k,visible[k]]));}));
    }
    if(path==='/rest/v1/resumes'){
      if(['POST','PATCH'].includes(method)){if(!person||params.has('guest')||(body.user_id&&body.user_id!==profile.id))return json({message:'Solo puedes editar tu propio CV'},403);resume={...resume,...body,user_id:profile.id};}
      return json(person?filter([resume],p):[]);
    }
    if(path==='/auth/v1/logout')return new Response(null,{status:204});
    if(['/auth/v1/recover','/auth/v1/signup','/auth/v1/resend','/auth/v1/user','/auth/v1/token'].includes(path))return json({message:'Esta prueba no crea cuentas ni cambia contraseñas y no envía correos. Usa el selector Persona / Negocio de la barra superior.'},400);
    if(path.startsWith('/storage/v1/'))return json({message:'La subida de archivos está desactivada en esta prueba.'},400);
    return json({message:'Unsupported local fixture route: '+path},400);
  };
})();

