'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('scripts/fixtures/hiring-backend.js','utf8');
const PERSON='11111111-1111-4111-8111-111111111114',JOB='22222222-2222-4222-8222-222222222222';
let saved=null;const store={read:()=>saved?JSON.parse(JSON.stringify(saved)):null,write:value=>saved=JSON.parse(JSON.stringify(value))};
function client(role,{script=fixture,search='?role='+role+'&catalog=1'}={}){
 const context={URL,URLSearchParams,Response,Map,Date,JSON,crypto:require('node:crypto').webcrypto,location:{origin:'null',search},CC_PREVIEW_STORE:store,fetch:()=>{throw Error('Network must not be used')}};
 context.window=context;vm.createContext(context);vm.runInContext(script,context);
 const call=async(path,method='GET',body)=>{const response=await context.fetch(context.CC_SUPABASE.url+path,{method,...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};};
 call.storage=context.localStorage;return call;
}
(async()=>{
 let person=client('person');
 const savedKey='cc_saved_jobs_'+PERSON;
 person.storage.setItem(savedKey,JSON.stringify([JOB]));
 // Other API writes and both role changes must preserve each profile's bookmarks.
 await person('/rest/v1/profiles');
 let other=client('business');other.storage.setItem('cc_saved_jobs_11111111-1111-4111-8111-111111111111','[]');
 person=client('person');assert.equal(person.storage.getItem(savedKey),JSON.stringify([JOB]));
 assert(!Object.hasOwn(saved.savedJobs,'cc_auth_session_v1'));
 for(const route of ['/auth/v1/recover','/auth/v1/signup','/auth/v1/resend','/auth/v1/user','/auth/v1/token','/storage/v1/object/business-logos/test']){
   const blocked=await person(route,'POST',{});assert.equal(blocked.status,400);assert.match(blocked.body.message,/prueba/);
 }
 assert.match((await person('/auth/v1/recover','POST',{})).body.message,/no envía correos/);
 let result=await person('/rest/v1/job_applications','POST',{job_id:JOB,consent:false});assert.equal(result.status,400);
 result=await person('/rest/v1/job_applications','POST',{job_id:JOB,consent:true,contact:'persona@example.invalid',cv_snapshot:{intro:'CV de prueba'}});assert.equal(result.status,201);const id=result.body[0].id;assert.equal(result.body[0].job_snapshot.id,JOB);assert.equal(result.body[0].applicant_id,PERSON);
 result=await person('/rest/v1/job_applications','POST',{job_id:JOB,consent:true});assert.equal(result.status,409);
 let business=client('business');result=await business('/rest/v1/job_applications?id=eq.'+id);assert.equal(result.body[0].cv_snapshot.intro,'CV de prueba');
 result=await business('/rest/v1/job_applications?id=eq.'+id,'PATCH',{status:'reviewing'});assert.equal(result.body[0].status,'reviewing');
 person=client('person');result=await person('/rest/v1/job_applications?id=eq.'+id);assert.equal(result.body[0].status,'reviewing');
 await person('/rest/v1/job_applications?id=eq.'+id,'PATCH',{status:'withdrawn'});
 business=client('business');result=await business('/rest/v1/job_applications?id=eq.'+id,'PATCH',{status:'accepted'});assert.equal(result.status,400);
 const html=fs.readFileSync('preview/ConectaCuba-v17-prueba.html','utf8');
 assert(!/<script[^>]+src=/.test(html));assert(!/<link[^>]+href="\//.test(html));assert(html.includes("connect-src 'none'"));assert(!html.includes("navigator.serviceWorker.register("));
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
 for(const script of scripts)new vm.Script(script);
 // Standalone role defaults are identical in the toolbar and fixture, even with unrelated query parameters.
 for(const search of ['','?view=web','?role=unknown']){
   const normalized=client('person',{script:scripts[1],search});
   assert.equal((await normalized('/rest/v1/profiles')).body[0].account_type,'person');
 }
 assert.equal((await client('business',{script:scripts[1],search:'?role=business'})('/rest/v1/profiles')).body[0].account_type,'business');
 // Exercise the preview's capturing handlers: blocked actions never reach auth.js.
 const handlers={},alerts=[],nodes=new Map(),sessionValues=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:''});return nodes.get(id);};
 const context={URL,URLSearchParams,JSON,location:{search:'',href:'https://test.invalid/'},alert:message=>alerts.push(message),confirm:()=>false,sessionStorage:{getItem:key=>sessionValues.get(key)||null,setItem:(key,value)=>sessionValues.set(key,value),removeItem:key=>sessionValues.delete(key)},document:{getElementById:node,querySelector:node,addEventListener:(type,handler)=>handlers[type]=handler}};
 context.window=context;vm.createContext(context);vm.runInContext(scripts[0],context);
 function click({id='',dataset={},logo=false}){
   let stopped=false,prevented=false;
   const target={id,dataset,closest:selector=>logo&&selector==='form[data-form="logo"]'?{}:null};
   handlers.click({target:{closest:selector=>selector==='button,a,input'?target:null},preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
   assert(stopped&&prevented);
 }
 click({id:'account-signout'});assert.match(alerts.at(-1),/selector Persona \/ Negocio/);
 click({dataset:{action:'signout'}});
 for(const open of ['forgot','join','person','business','login']){click({dataset:{open}});assert.match(alerts.at(-1),/No se envían correos/);}
 click({dataset:{action:'resend'}});click({id:'business-image'});click({logo:true});
 for(const form of ['login','person','business','forgot','reset','logo']){
   let stopped=false,prevented=false;
   handlers.submit({target:{dataset:{form}},preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
   assert(stopped&&prevented);
 }
 let previewLink=null;context.CC_PREVIEW_OPEN_WA=url=>{previewLink=url;};
 const fakeLink={id:'',dataset:{},href:'https://wa.me/5300000000?text=Hola',getAttribute:()=> 'https://wa.me/5300000000?text=Hola',closest:()=>null};
 let stoppedWA=false,preventedWA=false;
 handlers.click({target:{closest:selector=>selector==='button,a,input'||selector==='a'?fakeLink:null},preventDefault(){preventedWA=true;},stopImmediatePropagation(){stoppedWA=true;}});
 assert(stoppedWA&&preventedWA);assert.equal(previewLink,fakeLink.href);
 const svg=Buffer.from(fs.readFileSync('icon.svg')).toString('base64');assert(html.includes(svg));
 console.log('PASS: consentimiento, postulación, duplicados, persistencia entre roles, guardadas, estados, retirada, controles bloqueados, roles normalizados, scripts autónomos y logo original. Prueba de simulador; no sustituye QA visual ni permisos del backend real.');
})().catch(e=>{console.error(e);process.exitCode=1;});
