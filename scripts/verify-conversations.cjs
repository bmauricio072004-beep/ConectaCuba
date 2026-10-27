'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const OWNER='11111111-1111-4111-8111-111111111111',PERSON='11111111-1111-4111-8111-111111111114',JOB='22222222-2222-4222-8222-222222222221',APP='33333333-3333-4333-8333-333333333331',OTHER='33333333-3333-4333-8333-333333333332';
let state=null;const store={read:()=>state?JSON.parse(JSON.stringify(state)):null,write:value=>state=JSON.parse(JSON.stringify(value))};
function client(role,admin=false){
 const values=new Map(),ctx={URL,URLSearchParams,Response,Date,Intl,crypto:require('node:crypto').webcrypto,location:{origin:'https://preview.invalid',search:'?role='+role+'&catalog=1'+(admin?'&admin=1':'')},CC_PREVIEW_STORE:store,sessionStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))},fetch:()=>{throw Error('Unexpected network')}};ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('scripts/fixtures/hiring-backend.js','utf8'),ctx);vm.runInContext(fs.readFileSync('workflow.js','utf8'),ctx);
 const call=async(path,body,method='POST')=>{const r=await ctx.fetch(ctx.CC_SUPABASE.url+path,{method,...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
 const profile={id:role==='person'?PERSON:OWNER,account_type:role};
 const api=ctx.CC_WORKFLOW.create({getProfile:()=>profile,date:String,db:async(path,options={})=>{const r=await call('/rest/v1/'+path,options.body?JSON.parse(options.body):null,options.method||'GET');if(r.status>=400)throw Error(r.body.message);return r.body;},toast(){},confirm:()=>true});
 return {call,api};
}
(async()=>{
 let person=client('person'),business=client('business');
 let r=await person.call('/rest/v1/rpc/cc_application_messages',{application_id:OTHER,job_id:JOB});assert.equal(r.status,403);
 r=await person.call('/rest/v1/profiles',{id:OWNER,account_type:'business'},'PATCH');assert.equal(r.status,403);
 r=await person.call('/rest/v1/job_posts?id=eq.'+JOB,{status:'closed'},'PATCH');assert.equal(r.status,403);
 r=await person.call('/rest/v1/resumes',{user_id:OWNER,intro:'Forbidden'},'POST');assert.equal(r.status,403);
 r=await business.call('/rest/v1/rpc/cc_send_application_message',{application_id:APP,job_id:JOB,body:'Hola, queremos coordinar una entrevista.',client_key:'message-attempt-0001'});assert.equal(r.status,201);
 r=await business.call('/rest/v1/rpc/cc_send_application_message',{application_id:APP,job_id:JOB,body:'Hola, queremos coordinar una entrevista.',client_key:'message-attempt-0001'});assert.equal(r.status,200);assert.equal(r.body.deduplicated,true);
 person=client('person');let messages=await person.call('/rest/v1/rpc/cc_application_messages',{application_id:APP,job_id:JOB});assert.equal(messages.body.length,1);assert.equal(messages.body[0].sender_role,'business');
 r=await person.call('/rest/v1/rpc/cc_send_application_message',{application_id:APP,job_id:JOB,body:'Gracias. Confirmo disponibilidad <script>example</script>.'});assert.equal(r.status,201);
 business=client('business');messages=await business.call('/rest/v1/rpc/cc_application_messages',{application_id:APP,job_id:JOB});assert.equal(messages.body.length,2);assert.equal(messages.body[1].sender_role,'person');
 const a=(await business.call('/rest/v1/job_applications?id=eq.'+APP,null,'GET')).body[0];assert.equal(a.last_message_sender_role,'person');assert.equal(a.last_message_at,a.updated_at);
 const html=await business.api.conversation(a,{id:JOB});assert(html.includes('Gracias. Confirmo disponibilidad &lt;script&gt;'));assert(!html.includes('<script>'));assert(html.includes('Enviar mensaje en la app'));
 r=await person.call('/rest/v1/rpc/cc_send_application_message',{application_id:APP,job_id:JOB,body:' '});assert.equal(r.status,400);
 r=await business.call('/rest/v1/rpc/cc_send_application_message',{application_id:APP,job_id:'wrong',body:'No debe pasar'});assert.equal(r.status,403);
 await person.call('/rest/v1/job_applications?id=eq.'+APP,{status:'withdrawn'},'PATCH');
 person=client('person');business=client('business');
 r=await person.call('/rest/v1/rpc/cc_application_messages',{application_id:APP,job_id:JOB});assert.equal(r.status,200);assert.equal(r.body.length,2);
 r=await business.call('/rest/v1/rpc/cc_application_messages',{application_id:APP,job_id:JOB});assert.equal(r.status,403);
 r=await person.call('/rest/v1/rpc/cc_send_application_message',{application_id:APP,job_id:JOB,body:'No se debe enviar tras retirar'});assert.equal(r.status,409);
 const withdrawn=(await person.call('/rest/v1/job_applications?id=eq.'+APP,null,'GET')).body[0],readOnly=await person.api.conversation(withdrawn,{id:JOB});assert(readOnly.includes('Proceso finalizado'));assert(!readOnly.includes('data-form="workflow-message"'));
 // Initial registration data must become the existing contact rather than a second required input.
 business=client('business');
 r=await business.call('/rest/v1/rpc/cc_demo_registration',{account_type:'business',business_name:'Nuevo taller de prueba',contact_person:'Responsable nuevo',province:'La Habana',municipality:'Playa',whatsapp:'55550199',description:'Servicios técnicos de prueba',business_activity:'Servicios técnicos',proof_url:'https://example.invalid'});assert.equal(r.status,200);
 business=client('business');r=await business.call('/rest/v1/rpc/cc_business_contact',{business_id:OWNER});assert.equal(r.body.whatsapp,'+5355550199');assert.equal(r.body.contact_person,'Responsable nuevo');
 const contactHTML=await business.api.renderContacts();assert(contactHTML.includes('WhatsApp guardado'));assert(contactHTML.includes('+5355550199'));assert(contactHTML.includes('Editar contacto y privacidad'));
 const admin=client('person',true);r=await admin.call('/rest/v1/business_applications',null,'GET');assert.equal(r.body[0].review_status,'pending');
 r=await admin.call('/rest/v1/business_applications?user_id=eq.'+OWNER,{review_status:'approved'},'PATCH');assert.equal(r.body[0].review_status,'approved');
 person=client('person');r=await person.call('/rest/v1/rpc/cc_demo_registration',{account_type:'person',display_name:'Persona registrada',province:'Matanzas',municipality:'Cárdenas',whatsapp:'+5355550188'});assert.equal(r.status,200);
 person=client('person');r=await person.call('/rest/v1/resumes?user_id=eq.'+PERSON,null,'GET');assert.equal(r.body[0].cv_contact,'+5355550188');
 console.log('PASS: conversación privada de dos vías, nuevas respuestas, XSS, retiro de acceso, historial de solo lectura, protección de rol y reutilización de WhatsApp del registro.');
})().catch(error=>{console.error(error);process.exitCode=1;});