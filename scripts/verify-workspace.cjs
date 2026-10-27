'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const landing=fs.readFileSync('landing.js','utf8');
function landingDestination({signedIn=false,installed=false,hash='',search=''}={}){
  let destination=null;
  vm.runInNewContext(landing,{localStorage:{getItem:()=>signedIn?'{"access_token":"test-session"}':null},location:{hash,search,replace:v=>destination=v},matchMedia:()=>({matches:installed}),navigator:{standalone:false},URLSearchParams,document:{addEventListener(){}}});
  return destination;
}
assert.equal(landingDestination(),null);
assert.equal(landingDestination({signedIn:true}),'/app/');
assert.equal(landingDestination({installed:true}),'/app/');
assert.equal(landingDestination({signedIn:true,search:'?view=web'}),null);
assert.equal(landingDestination({hash:'#cuenta/resume'}),'/app/#cuenta/resume');
assert.equal(landingDestination({hash:'#guardadas'}),'/app/#guardadas');
assert.equal(landingDestination({hash:'#access_token=test-callback&type=signup'}),'/app/#access_token=test-callback&type=signup');

function workspace(type='person',signedIn=true){
  const nodes=new Map(),stored=new Map(),route={value:'/app/'};
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{id,hidden:false,innerHTML:'',textContent:'',value:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},removeAttribute(){},remove(){},focus(){},addEventListener(){},querySelector(selector){return el(id+' '+selector);},querySelectorAll(){return [];}});
    return nodes.get(id);
  };
  const profile={id:'test-user',account_type:type,display_name:'Nombre de prueba',province:'La Habana',municipality:'Cerro'};
  if(signedIn)stored.set('cc_auth_session_v1',JSON.stringify({access_token:'test-session',user:{id:profile.id,email:'test@example.invalid'},expires_at:Date.now()/1000+3600}));
  const location={pathname:'/app/',search:'',hash:''};
  const context={window:{CC_CAPABILITIES:{employmentWorkflow:true},CC_SUPABASE:{url:'https://test.invalid',key:'test'},addEventListener(){},scrollTo(){}},document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){},activeElement:null,body:el('body')},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},navigator:{standalone:false},matchMedia:()=>({matches:false}),history:{state:null,replaceState(data,_b,url){this.state=data;route.value=url;location.hash=new URL(url,'https://test.invalid').hash;},pushState(data,_b,url){this.replaceState(data,_b,url);}},location,URL,URLSearchParams,Intl,AbortController,setTimeout,clearTimeout,
  fetch:async url=>({status:200,ok:true,json:async()=>{
    if(url.includes('/profiles?'))return [profile];
    if(url.includes('/business_applications?'))return [{review_status:'approved',email_confirmed:true,business_name:'Negocio de prueba'}];
    if(url.includes('/rpc/cc_is_admin'))return false;
    return [];
  }})};
  const source=fs.readFileSync('auth.js','utf8').replace('  init();','  window.testWorkspace={state,enterWorkspace,showAccount,renderAccountSettings,accountRoute,openEmployerJob,openEmployerPerson};');
  vm.runInNewContext(fs.readFileSync('workflow.js','utf8'),context);
  vm.runInNewContext(fs.readFileSync('hiring.js','utf8'),context);vm.runInNewContext(fs.readFileSync('opportunities.js','utf8'),context);vm.runInNewContext(source,context);
  return {api:context.window.testWorkspace,el,route};
}
(async()=>{
  let w=workspace();await w.api.enterWorkspace();assert.equal(w.route.value,'/app/#empleos');assert.equal(w.el('account-app').hidden,true);assert.equal(w.el('account-resume-link').hidden,true);
  w=workspace('business');await w.api.enterWorkspace();assert.equal(w.route.value,'/app/#cuenta/jobs');assert.equal(w.el('account-app').hidden,false);assert.equal(w.el('account-resume-link').hidden,true);assert.equal(w.el('account-jobs-link').hidden,false);
  w=workspace();w.api.state.afterLoginPage='resume';await w.api.enterWorkspace();assert.equal(w.route.value,'/app/#cuenta/resume');assert.match(w.el('account-content').innerHTML,/Crea tu currículum/);
  w.api.state.isAdmin=true;assert.match(w.api.renderAccountSettings(),/data-account-page="admin"/);assert(w.api.renderAccountSettings().includes('data-account-page="resume"'));assert(!w.api.renderAccountSettings().includes('data-account-page="applications"'));
  w=workspace('person',false);await w.api.showAccount('resume');assert.equal(w.api.state.afterLoginPage.page,'resume');assert.equal(w.el('modal').hidden,false);assert.match(w.el('modal-content').innerHTML,/data-form="login"/);assert.equal(w.route.value,'/app/');
  w=workspace('person',false);await w.api.showAccount('saved',false);assert.equal(w.route.value,'/app/#guardadas');assert.equal(w.el('body').dataset.appView,'saved');assert.equal(w.api.state.afterLoginPage,null);assert.match(w.el('account-content').innerHTML,/Guarda las ofertas/);
  w=workspace();await w.api.showAccount('menu',false);assert.equal(w.el('body').dataset.appView,'menu');assert(!w.api.renderAccountSettings().includes('data-account-page="saved"'),'Saved jobs belong beside discovery, not in account settings');assert(w.api.renderAccountSettings().includes('Mi perfil'));assert(w.api.renderAccountSettings().includes('Ajustes'));

  await w.api.showAccount('contacts',false);assert.match(w.el('account-content').innerHTML,/data-form="workflow-person-contact"/);assert.equal(w.route.value,'/app/#cuenta/contacts');
  await w.api.showAccount('notifications',false);assert.match(w.el('account-content').innerHTML,/Estás al día/);
  await w.api.showAccount('help',false);assert.match(w.el('account-content').innerHTML,/Qué comparto al postularme/);
  w=workspace('business');await w.api.showAccount('contacts',false);assert.match(w.el('account-content').innerHTML,/data-form="workflow-business-contact"/);
  w.api.state.isAdmin=true;assert.match(w.api.renderAccountSettings(),/data-account-page="reports"/);
  const events={};
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self:{location:{origin:'https://test.invalid'},addEventListener:(name,fn)=>events[name]=fn},caches:{match:async key=>({cachedPage:key})},fetch:async()=>{throw new Error('offline');},setTimeout:()=>0,URL,Response:{error:()=>null}});
  for(const [path,expected] of [['/app/?source=pwa','/app/'],['/app/','/app/'],['/','/']]){
    let result;events.fetch({request:{method:'GET',mode:'navigate',url:'https://test.invalid'+path},respondWith:p=>result=p,waitUntil(){}});assert.equal((await result).cachedPage,expected);
  }
  const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert(manifest.start_url.startsWith('/app/'));assert.equal(manifest.id,'/');
  assert(!fs.readFileSync('auth.js','utf8').includes('/rest/v1/business_directory'));
  assert(!fs.readFileSync('app/index.html','utf8').includes('id="negocios"'));
  assert(!fs.readFileSync('app/index.html','utf8').includes('web-hero'));
  console.log('PASS: landing redirects, installed-app entry, legacy auth callbacks, person/business destinations, requested account tool, guest login and separate offline pages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
