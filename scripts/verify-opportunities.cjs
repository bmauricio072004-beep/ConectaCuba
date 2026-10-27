'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const PERSON='11111111-1111-4111-8111-111111111114',BUSINESS='11111111-1111-4111-8111-111111111111';
const JOB_A='22222222-2222-4222-8222-222222222221',JOB_B='22222222-2222-4222-8222-222222222222',APP='33333333-3333-4333-8333-333333333331';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(search=''){
  const profile={id:PERSON,account_type:'person'},jobs=[{id:JOB_A,business_user_id:BUSINESS,business_name:'Negocio de prueba',title:'Técnico eléctrico',category:'Electricidad y electrónica',category_other:'',description:'Funciones y requisitos detallados de la oferta de trabajo.',municipality:'Cerro',province:'La Habana',work_modality:'Presencial',work_schedule:'Tiempo completo',salary_min:18000,salary_currency:'CUP',salary_period:'monthly',created_at:'2026-10-25T06:00:00Z'},{id:JOB_B,business_user_id:BUSINESS,business_name:'Negocio de prueba',title:'Auxiliar de almacén',category:'Comercio',description:'Otra oferta de trabajo con funciones distintas.',municipality:'Playa',province:'La Habana',work_modality:'Presencial',work_schedule:'Medio tiempo',created_at:'2026-10-24T06:00:00Z'}];
  const company={user_id:BUSINESS,business_name:'Negocio de prueba',business_activity:'Electricidad y electrónica',description:'Servicios de mantenimiento y reparación.',municipality:'Cerro',province:'La Habana',public_address:'',whatsapp:'',other_contact:''};
  const applications=[{id:APP,applicant_id:PERSON,job_id:JOB_A,business_user_id:BUSINESS,job_title:jobs[0].title,business_name:company.business_name,status:'accepted',contact:'PRIVATE_CONTACT',cv_snapshot:{intro:'PRIVATE_CV'},message:'PRIVATE_MESSAGE',job_snapshot:{...jobs[0]},created_at:'2026-10-25T06:00:00Z',updated_at:'2026-10-25T07:00:00Z'}];
  const reviews=[{id:'55555555-5555-4555-8555-555555555551',business_user_id:BUSINESS,business_name:company.business_name,author_id:'11111111-1111-4111-8111-111111111115',rating:4,job_role:'Técnico de prueba',employment_status:'former',body:'Texto de prueba <script>malicious()</script> que debe quedar escapado.',evidence:'SECRET_EVIDENCE',review_status:'approved',created_at:'2026-10-25T06:00:00Z'}];
  const nodes=new Map(),requests=[],navigation=[],delays=new Map(),route={page:'offer'},modal={html:'',title:''},stored=new Map(),serverJobs=jobs.slice();
  const el=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,dataset:{},classList:{toggle(){}},remove(){},querySelector:s=>el(id+' '+s),querySelectorAll:()=>[],insertAdjacentHTML(_where,html){this.innerHTML+=html;}});return nodes.get(id);};
  const select=(rows,p)=>{
    let result=rows;for(const k of ['id','user_id','job_id','applicant_id','author_id','business_user_id','review_status']){const value=p.get(k);if(value?.startsWith('eq.'))result=result.filter(row=>row[k]===value.slice(3));if(value?.startsWith('in.('))result=result.filter(row=>value.slice(4,-1).split(',').includes(row[k]));}
    const offset=Number(p.get('offset')||0),limit=Number(p.get('limit')||100);result=result.slice(offset,offset+limit);
    const fields=p.get('select')||'*';return result.map(r=>fields==='*'?{...r}:Object.fromEntries(fields.split(',').map(k=>[k,r[k]])));
  };
  async function query(path,options={},kind='private'){
    requests.push({path,options,kind});const u=new URL(path.startsWith('/')?path:'/'+path,'https://test.invalid'),p=u.searchParams,table=u.pathname.split('/').at(-1);
    if(delays.has(p.get('id')))return delays.get(p.get('id'));
    if(table==='job_posts')return select(serverJobs,p);
    if(table==='business_directory')return select([company],p);
    if(table==='business_rating_stats'){const rows=reviews.filter(r=>r.review_status==='approved');return rows.length?[{business_user_id:BUSINESS,review_count:rows.length,average_rating:4}]:[];}
    if(table==='business_review_public')return select(reviews.filter(r=>r.review_status==='approved'),p);
    if(table==='job_applications')return select(applications,p);
    if(table==='business_reviews'){
      if(options.method==='POST'){const r={id:'55555555-5555-4555-8555-555555555552',...JSON.parse(options.body),review_status:'pending'};reviews.push(r);return [r];}
      return select(reviews,p);
    }
    throw new Error('Unexpected test request: '+path);
  }
  const sandbox={window:{},URLSearchParams,localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)}};vm.runInNewContext(fs.readFileSync('opportunities.js','utf8'),sandbox);
  const api=sandbox.window.CC_OPPORTUNITIES.create({search,esc,document:{getElementById:el,querySelectorAll:()=>[]},provinces:['La Habana','Artemisa'],activities:['Comercio','Electricidad y electrónica'],getProfile:()=>profile,getJobs:()=>jobs,request:(p,o)=>query(p,o,'public'),db:(p,o)=>query(p,o,'private'),json:(method,v)=>({method,body:JSON.stringify(v)}),patchOne:async(p,v)=>{requests.push({path:p,value:v,kind:'patch'});return v;},date:v=>String(v),salaryLabel:j=>j.salary_min?'18.000 CUP / mes':'A convenir',logo:()=>'<span>Logo del negocio</span>',contactLink:esc,resumeSections:r=>'<p>'+esc(r.intro)+'</p>',field:(label,name,value)=>'<label>'+label+'<input name="'+name+'" value="'+esc(value)+'"></label>',select:(label,name,_values,value)=>'<label>'+label+'<select name="'+name+'">'+esc(value)+'</select></label>',area:(label,name,value)=>'<label>'+label+'<textarea name="'+name+'">'+esc(value)+'</textarea></label>',modal:(title,html)=>Object.assign(modal,{title,html}),closeModal(){},toast(){},confirm:()=>true,showHome:()=>navigation.push({page:'search'}),goOffer:async(id,tab,options)=>navigation.push({page:'offer',id,tab,options}),goAccount:async(page,_leave,_context,options)=>navigation.push({page,options}),requireLogin:()=>navigation.push({page:'login'}),clearSearchURL(){},setSearchURL(){},setApplications(){},getRoute:()=>route});
  const click=dataset=>({target:{closest:()=>({dataset,disabled:false,hasAttribute:name=>(name==='data-search-reset'&&Object.hasOwn(dataset,'searchReset'))||(name==='data-application-filter'&&Object.hasOwn(dataset,'applicationFilter')),remove(){}})}});
  return {api,nodes,el,requests,navigation,profile,jobs,serverJobs,stored,applications,reviews,delays,route,modal,click};
}
(async()=>{
  let t=setup();t.api.renderFeed();assert(t.el('job-list').innerHTML.includes('data-view-job="'+JOB_A+'"'));assert(t.el('job-list').innerHTML.includes('Técnico eléctrico'));assert(!t.el('job-list').innerHTML.includes('<input'));
  t.api.openSearch();assert.equal(t.modal.title,'Buscar empleo');assert(t.modal.html.includes('data-form="job-search"'));
  await t.api.handleSubmit({dataset:{form:'job-search'}},{search_q:'electrico',search_province:'La Habana',search_category:'',search_municipality:'Cerro'});assert(t.el('job-list').innerHTML.includes('Técnico eléctrico'));assert(!t.el('job-list').innerHTML.includes('Auxiliar de almacén'));
  t=setup('?province=not-a-province');t.api.renderFeed();assert(t.el('job-list').innerHTML.includes('Técnico eléctrico'),'Invalid URL province should not hide every job');
  t=setup();await t.api.handleClick(t.click({saveJob:JOB_B}));t.jobs.pop();
  let saved=await t.api.renderSaved();assert(saved.includes('Auxiliar de almacén'),'Saved jobs must resolve beyond the currently loaded feed');assert(saved.includes('data-back-home'));assert(t.requests.some(r=>r.kind==='public'&&r.path.includes('id=in.('+JOB_B+')')));
  t.profile.id='another-user';saved=await t.api.renderSaved();assert(!saved.includes('Auxiliar de almacén'),'Another account must not inherit this device bookmark list');

  t=setup();let html=await t.api.renderOffer(JOB_A);assert(html.includes('Funciones y requisitos detallados'));assert(html.includes('role="tablist"'));assert(html.includes('Negocio de prueba'));
  const jobReads=t.requests.filter(r=>r.path.includes('job_posts?')).length;
  html=await t.api.renderOffer(JOB_A,'company');assert(html.includes('Servicios de mantenimiento'));assert(html.includes('A qué se dedica'));assert.equal(t.requests.filter(r=>r.path.includes('job_posts?')).length,jobReads,'Changing tabs should reuse the recently loaded public job');
  html=await t.api.renderOffer(JOB_A,'reviews');assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(!html.includes('SECRET_EVIDENCE'));assert(!html.includes('11111111-1111-4111-8111-111111111115'));
  const reviewRequest=t.requests.find(r=>r.path.includes('business_review_public?'));assert(!reviewRequest.path.includes('evidence'));assert(!reviewRequest.path.includes('author_id'));assert(reviewRequest.path.includes('business_user_id=eq.'+BUSINESS));
  const updated=setup(),newReview={...updated.reviews[0]};updated.reviews.length=0;
  await updated.api.renderOffer(JOB_A);updated.reviews.push(newReview);
  const freshReviews=await updated.api.renderOffer(JOB_A,'reviews');
  assert(!freshReviews.includes('Sin valoraciones todavía'),'A newly approved review must update the rating even when the offer is cached');

  html=await t.api.renderApplications();assert(html.includes('Seleccionada'));assert(!html.includes('PRIVATE_CV'));assert(!html.includes('PRIVATE_CONTACT'));
  await t.api.handleClick(t.click({applicationFilter:'reviewing'}));html=await t.api.renderApplications();assert(!html.includes('data-view-application="'+APP+'"'));assert(html.includes('No hay postulaciones en este estado'));
  await t.api.handleClick(t.click({applicationFilter:'accepted'}));html=await t.api.renderApplications();assert(html.includes('data-view-application="'+APP+'"'));
  await t.api.handleClick(t.click({applicationFilter:''}));
  const list=t.requests.find(r=>r.path.includes('job_applications?')&&!r.path.includes('id=eq.'+APP));assert(list.path.includes('applicant_id=eq.'+PERSON));assert(!list.path.includes('cv_snapshot'));assert(!list.path.includes('contact'));
  html=await t.api.renderApplication(APP);assert(html.includes('El negocio aceptó tu postulación'));assert(html.includes('PRIVATE_CV'));assert(html.includes('PRIVATE_CONTACT'));assert(html.includes('Información de la oferta'));
  t.applications[0].status='not_selected';html=await t.api.renderApplication(APP);assert(html.includes('No seleccionada'));assert(html.includes('no continuará'));
  t.applications[0].status='withdrawn';html=await t.api.renderApplication(APP);assert(!html.includes('PRIVATE_CV'));assert(!html.includes('PRIVATE_CONTACT'));assert(!html.includes('PRIVATE_MESSAGE'));
  await assert.rejects(t.api.renderApplication('33333333-3333-4333-8333-333333333332'),/no está disponible/);
  const applicationQueries=t.requests.filter(r=>r.path.includes('job_applications?id='));assert(applicationQueries.every(r=>r.path.includes('applicant_id=eq.'+PERSON)));

  await t.api.handleClick(t.click({writeReview:BUSINESS}));assert(t.modal.html.includes('Solo administración'));assert(t.requests.at(-1).path.includes('author_id=eq.'+PERSON));
  const form={dataset:{form:'business-review',businessId:BUSINESS}},body={rating:'4',job_role:'Técnico',employment_status:'former',body:'Experiencia laboral de prueba con suficiente información.',evidence:'Evidencia privada de esta prueba.',confirms_work:'on'};
  await assert.rejects(t.api.handleSubmit(form,{...body,confirms_work:''}),/Confirma/);
  await t.api.handleSubmit(form,body);const submission=t.requests.find(r=>r.options?.method==='POST'&&r.path==='business_reviews');assert.equal(JSON.parse(submission.options.body).author_id,PERSON);assert(!Object.hasOwn(JSON.parse(submission.options.body),'review_status'));
  t.profile.account_type='business';await t.api.handleClick(t.click({writeReview:BUSINESS}));assert(!t.navigation.some(n=>n.page==='login'));

  // A response for an offer that has been left must not replace the current offer context.
  t=setup();let release;const gate=new Promise(r=>release=r);t.delays.set('eq.'+JOB_A,gate);
  const slow=t.api.renderOffer(JOB_A),discarded=assert.rejects(slow,e=>e.code==='STALE_REQUEST');await t.api.renderOffer(JOB_B);
  release([{...t.jobs[0]}]);await discarded;
  await t.api.handleSubmit({dataset:{form:'business-review',businessId:BUSINESS}},body);assert.equal(t.navigation.at(-1).id,JOB_B);
  console.log('PASS: collapsed search/filtering, public job/company/reviews, cache reuse, private application detail/outcomes, review consent and stale-view protection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
