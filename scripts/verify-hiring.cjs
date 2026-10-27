'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const OWNER='11111111-1111-4111-8111-111111111111';
const JOB_A='22222222-2222-4222-8222-222222222221',JOB_B='22222222-2222-4222-8222-222222222222';
const APP_A='33333333-3333-4333-8333-333333333331',APP_B='33333333-3333-4333-8333-333333333332';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(extra=[]){
  const jobs=[{id:JOB_A,business_user_id:OWNER,title:'Técnico eléctrico',business_name:'Negocio de prueba',province:'La Habana',municipality:'Cerro',description:'Funciones y requisitos de prueba',work_modality:'Presencial',work_schedule:'Tiempo completo',status:'published'},{id:JOB_B,business_user_id:OWNER,title:'Auxiliar de almacén',business_name:'Negocio de prueba',province:'La Habana',municipality:'Playa',description:'Otra vacante de prueba',work_modality:'Presencial',work_schedule:'Medio tiempo',status:'closed'}];
  const applications=[{id:APP_A,job_id:JOB_A,business_user_id:OWNER,applicant_name:'Ana <script>prueba</script>',applicant_location:'Cerro, La Habana',status:'submitted',contact:'ana@example.invalid',message:'Mensaje de prueba',cv_snapshot:{experience:'Experiencia privada'},home_address:'NO SE DEBE MOSTRAR',created_at:'2026-10-25T01:00:00Z'},{id:APP_B,job_id:JOB_B,business_user_id:OWNER,applicant_name:'Persona de otra vacante',applicant_location:'Playa',status:'contacted',contact:'otra@example.invalid',cv_snapshot:{intro:'Otro currículum'},created_at:'2026-10-25T02:00:00Z'},...extra];
  const faults={applicants:false,patchResponse:null},route={page:'job',jobId:JOB_A,applicationId:null},requests=[],navigation=[],nodes=new Map(),business={review_status:'approved',email_confirmed:true};
  const element=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',setAttribute(){},removeAttribute(){}});return nodes.get(id);};
  const aggregate=()=>jobs.map(j=>{const rows=applications.filter(a=>a.job_id===j.id);const n=s=>rows.filter(a=>a.status===s).length;return{job_id:j.id,total:rows.length,new_count:n('submitted'),reviewing_count:n('reviewing'),contacted_count:n('contacted'),closed_count:n('not_selected'),withdrawn_count:n('withdrawn'),accepted_count:n('accepted')};});
  const db=async(path,options={})=>{
    requests.push({path,options});const u=new URL('https://test.invalid/'+path),p=u.searchParams;
    if(path.startsWith('rpc/'))return aggregate();
    if(path.startsWith('job_applications?')&&faults.applicants)throw new Error('failed fetch');
    let rows=path.startsWith('job_posts')?jobs:applications;
    for(const key of ['id','job_id','business_user_id','status']){const v=p.get(key);if(v?.startsWith('eq.'))rows=rows.filter(x=>x[key]===v.slice(3));}
    if(path.startsWith('job_posts'))return rows.map(x=>({...x}));
    const offset=Number(p.get('offset')||0),limit=Number(p.get('limit')||1000),select=p.get('select')||'*';
    return rows.slice(offset,offset+limit).map(row=>select==='*'?{...row}:Object.fromEntries(select.split(',').map(k=>[k,row[k]])));
  };
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('hiring.js','utf8'),sandbox);
  const api=sandbox.window.CC_HIRING.create({db,esc,getProfile:()=>({id:OWNER,account_type:'business'}),getBusiness:()=>business,chip:s=>'<span>'+s+'</span>',date:d=>String(d),salaryLabel:()=> '18.000 CUP / mes',resumeSections:r=>'<p>'+esc(r.experience||r.intro||'')+'</p>',contactLink:esc,toast(){},confirm:()=>true,document:{getElementById:element,querySelectorAll:()=>[]},getRoute:()=>({...route}),goJob:async id=>navigation.push({page:'job',id}),goPerson:async(job,id,opts)=>navigation.push({page:'candidate',job,id,opts}),goBack:async()=>{},patchOne:async(path,value)=>{
    requests.push({path,value});const p=new URL('https://test.invalid/'+path).searchParams;assert.equal(p.get('job_id'),'eq.'+JOB_A);assert.equal(p.get('business_user_id'),'eq.'+OWNER);
    const a=applications.find(x=>'eq.'+x.id===p.get('id'));Object.assign(a,value);if(faults.patchResponse)await faults.patchResponse;return a;
  }});
  const button=dataset=>({dataset,disabled:false,hasAttribute:n=>n==='data-hiring-more'&&Object.hasOwn(dataset,'more'),setAttribute(){},classList:{toggle(){}}});
  const click=b=>({target:{closest:()=>b},preventDefault(){}});
  return {api,jobs,applications,requests,navigation,nodes,element,business,button,click,faults,route};
}
(async()=>{
  const t=setup();const list=await t.api.renderJobs();assert(list.includes('Ver más'));assert(!list.includes('data-account-page="candidates"'));
  const job=await t.api.renderJob(JOB_A);assert(job.includes('Ana &lt;script&gt;prueba&lt;/script&gt;'));assert(!job.includes('Persona de otra vacante'));assert(!job.includes('ana@example.invalid'));assert(!job.includes('Experiencia privada'));
  const summary=t.requests.find(x=>x.path.startsWith('job_applications?'));assert(summary.path.includes('job_id=eq.'+JOB_A));const selected=new URL('https://test.invalid/'+summary.path).searchParams.get('select').split(',');assert(!selected.includes('contact'));assert(!selected.includes('cv_snapshot'));
  const person=await t.api.renderPerson(JOB_A,APP_A);assert(person.includes('ana@example.invalid'));assert(person.includes('Experiencia privada'));assert(!person.includes('NO SE DEBE MOSTRAR'));assert(!person.includes('<script>'));
  await assert.rejects(()=>t.api.renderPerson(JOB_A,APP_B),/no tiene una postulación/);
  Object.assign(t.route,{page:'candidate',jobId:JOB_A,applicationId:APP_A});
  await t.api.handleClick(t.click(t.button({hiringStatus:'reviewing',jobId:JOB_A,personId:APP_A})));assert.equal(t.applications[0].status,'reviewing');assert.equal(t.navigation.at(-1).opts.history,'replace');
  await t.api.handleClick(t.click(t.button({hiringStatus:'accepted',jobId:JOB_A,personId:APP_A})));assert.equal(t.applications[0].status,'accepted');assert((await t.api.renderJob(JOB_A)).includes('Aceptada (1)'));
  t.applications[0].status='withdrawn';const withdrawn=await t.api.renderPerson(JOB_A,APP_A);assert(!withdrawn.includes('ana@example.invalid'));assert(!withdrawn.includes('Experiencia privada'));assert(withdrawn.includes('retiró su postulación'));
  t.business.review_status='pending';const pending=await t.api.renderJobs();assert(!pending.includes('data-action="new-job"'));assert(pending.includes('pendiente de revisión'));

  const extra=Array.from({length:51},(_,i)=>({id:'44444444-4444-4444-8444-'+String(i).padStart(12,'0'),job_id:JOB_A,business_user_id:OWNER,applicant_name:'Persona '+i,applicant_location:'Cerro',status:i%2?'contacted':'submitted',created_at:'2026-10-25T01:00:00Z'}));
  const paging=setup(extra);await paging.api.renderJob(JOB_A);
  await paging.api.handleClick(paging.click(paging.button({more:''})));assert(paging.element('hiring-applicant-region').innerHTML.includes('Persona 50'));
  await paging.api.handleChange({target:{id:'hiring-stage-filter',value:'contacted'}});const filtered=paging.element('hiring-applicant-region').innerHTML;assert(filtered.includes('Persona 1'));assert(!filtered.includes('Ana &lt;script&gt;'));assert(!filtered.includes('Persona de otra vacante'));
  paging.faults.applicants=true;await assert.rejects(()=>paging.api.handleChange({target:{id:'hiring-stage-filter',value:'submitted'}}),/failed fetch/);assert(paging.element('hiring-applicant-region').innerHTML.includes('Volver a intentar'));
  paging.faults.applicants=false;const retry=paging.button({hiringRetry:'reset'});retry.hasAttribute=n=>n==='data-hiring-retry';await paging.api.handleClick(paging.click(retry));assert(paging.element('hiring-applicant-region').innerHTML.includes('Ana &lt;script&gt;'));

  const delayed=setup();await delayed.api.renderPerson(JOB_A,APP_A);Object.assign(delayed.route,{page:'candidate',applicationId:APP_A});
  let complete;delayed.faults.patchResponse=new Promise(resolve=>complete=resolve);
  const saving=delayed.api.handleClick(delayed.click(delayed.button({hiringStatus:'reviewing',jobId:JOB_A,personId:APP_A})));
  delayed.route.page='business';complete();await saving;
  assert.equal(delayed.applications[0].status,'reviewing');assert.equal(delayed.navigation.length,0,'A delayed status update must not reopen a screen the employer already left');
  console.log('PASS: vacancy/applicant nesting, scoped requests, withdrawn privacy, status changes without unexpected navigation, pagination/filtering and retries.');
})().catch(e=>{console.error(e);process.exitCode=1;});

