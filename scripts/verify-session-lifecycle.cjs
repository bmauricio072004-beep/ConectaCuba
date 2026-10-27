'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const KEY='cc_auth_session_v1',OWNER='11111111-1111-4111-8111-111111111111';
const authSession=(token='old',id=OWNER,expired=false)=>({access_token:token,refresh_token:'refresh-'+token,expires_at:Date.now()/1000+(expired?-10:3600),user:{id,email:'test@example.invalid'}});
const response=(body,status=200)=>({status,ok:status>=200&&status<300,json:async()=>body});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function workspace(initial=authSession()){
  const stored=new Map(initial?[[KEY,JSON.stringify(initial)]]:[]),nodes=new Map(),events={},winEvents={},requests=[];
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{id,hidden:false,innerHTML:'',textContent:'',value:'',dataset:{},style:{},isConnected:true,classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},removeAttribute(){},remove(){},focus(){},scrollIntoView(){},addEventListener(){},querySelector(selector){return el(id+' '+selector);},querySelectorAll(){return [];}});
    return nodes.get(id);
  };
  const profile={id:OWNER,account_type:'person',display_name:'Persona de prueba',province:'La Habana',municipality:'Cerro'};
  const backend={fetch:async url=>response(url.includes('/profiles?')?[profile]:url.includes('cc_is_admin')?false:[]),bitmap:async()=>{throw new Error('No bitmap fixture supplied');}};
  const location={pathname:'/app/',search:'',hash:'',origin:'https://test.invalid'};
  const context={window:{CC_SUPABASE:{url:'https://test.invalid',key:'fixture'},addEventListener:(name,fn)=>winEvents[name]=fn,scrollTo(){}},document:{getElementById:el,querySelector:s=>s.includes('[data-dirty=')?null:el(s),querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn,createElement:()=>el('toast-'+nodes.size),activeElement:null,body:Object.assign(el('body'),{append(){}})},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},navigator:{standalone:false},matchMedia:()=>({matches:false}),history:{state:null,replaceState(data,_b,url){this.state=data;location.hash=new URL(url,location.origin).hash;},pushState(data,_b,url){this.replaceState(data,_b,url);}},location,URL,URLSearchParams,Intl,AbortController,confirm:()=>true,setTimeout:()=>0,clearTimeout(){},fetch:async(url,opts)=>{requests.push({url,opts});return backend.fetch(url,opts);}};
  context.createImageBitmap=(...args)=>backend.bitmap(...args);
  const source=fs.readFileSync('auth.js','utf8').replace('  init();','  window.testLifecycle={state,session,db,saveSession,rememberSession,contactLink,renderCvPreview,uploadLogo,enterWorkspace};');
  vm.runInNewContext(fs.readFileSync('hiring.js','utf8'),context);vm.runInNewContext(fs.readFileSync('opportunities.js','utf8'),context);vm.runInNewContext(source,context);
  const api=context.window.testLifecycle;
  const signOut=()=>events.click({target:{closest:()=>({dataset:{action:'signout'},classList:{contains:()=>false},hasAttribute:()=>false,matches:()=>false})},preventDefault(){}});
  async function storageChange(next){const oldValue=stored.get(KEY)||null;next?stored.set(KEY,JSON.stringify(next)):stored.delete(KEY);await winEvents.storage({key:KEY,oldValue,newValue:next?JSON.stringify(next):null});}
  return {api,stored,el,events,winEvents,backend,requests,profile,location,signOut,storageChange};
}
(async()=>{
  // Cuba's local and international numbers must lead to usable contact actions.
  let w=workspace();
  for(const text of ['+53 5555 0123','5555 0123','(5555) 0123']){
    assert.match(w.api.contactLink(text),/href="https:\/\/wa.me\/5355550123"/,'The shared phone must open WhatsApp');
    assert.match(w.api.contactLink(text),/href="tel:\+5355550123"/);
  }
  assert(!w.api.contactLink('-------').includes('href='));
  assert(!w.api.contactLink('<script>malicious()</script>').includes('<script>'));
  w.api.state.profile=w.profile;w.api.state.resume={intro:'Experiencia de prueba'};const preview=w.api.renderCvPreview();
  assert.match(preview,/data-back-page="resume"[\s\S]*Volver a mi currículum/);

  w.api.state.profile.profile_summary='OLD_PROFILE_SUMMARY';w.api.state.resume={intro:'',experience:'Experiencia actual'};assert(!w.api.renderCvPreview().includes('OLD_PROFILE_SUMMARY'));

  // Concurrent requests share one refresh while the account remains active.
  w=workspace(authSession('old',OWNER,true));let gate=deferred();w.backend.fetch=()=>gate.promise;
  const first=w.api.session(),second=w.api.session();assert.equal(w.requests.length,1);
  gate.resolve(response(authSession('renewed')));assert.equal((await first).access_token,'renewed');assert.equal((await second).access_token,'renewed');

  // A delayed successful refresh must never resurrect a locally signed-out session.
  w=workspace(authSession('old',OWNER,true));gate=deferred();w.backend.fetch=url=>url.includes('grant_type=refresh_token')?gate.promise:Promise.resolve(response(null,204));
  const refreshing=w.api.session();await w.signOut();assert.equal(w.stored.has(KEY),false);
  const cancelled=assert.rejects(refreshing,e=>e.code==='STALE_REQUEST');gate.resolve(response(authSession('late')));await cancelled;
  assert.equal(w.stored.has(KEY),false,'A closed session was restored by a late response');

  // A late refresh failure cannot remove a newer token renewed in another tab.
  w=workspace(authSession('old',OWNER,true));gate=deferred();w.backend.fetch=()=>gate.promise;
  const oldRefresh=w.api.session();await w.storageChange(authSession('other-tab'));
  gate.resolve(response({message:'Refresh token already used'},400));assert.equal((await oldRefresh).access_token,'other-tab');assert.equal(JSON.parse(w.stored.get(KEY)).access_token,'other-tab');

  // A transient network/server error preserves the session for a retry.
  w=workspace(authSession('old',OWNER,true));w.backend.fetch=async()=>response({message:'Temporarily unavailable'},503);
  await assert.rejects(w.api.session(),/Temporarily unavailable/);assert.equal(JSON.parse(w.stored.get(KEY)).access_token,'old');

  // An actually expired session clears the private view rather than looping on retry.
  w=workspace(authSession('old',OWNER,true));w.api.state.profile=w.profile;w.api.state.isAdmin=true;w.el('account-content').innerHTML='OLD_PRIVATE_CV';
  w.backend.fetch=async()=>response({message:'Refresh token expired'},400);
  await assert.rejects(w.api.session(),e=>e.code==='STALE_REQUEST');assert.equal(w.stored.has(KEY),false);assert.equal(w.api.state.profile,null);assert.equal(w.api.state.isAdmin,false);assert.equal(w.el('account-content').innerHTML,'');assert.equal(w.el('account-app').hidden,true);

  // An old account's pending private read must not populate a later session.
  w=workspace();gate=deferred();w.backend.fetch=()=>gate.promise;
  const privateRead=w.api.db('resumes?user_id=eq.'+OWNER);await Promise.resolve();await w.signOut();
  w.api.rememberSession(authSession('new-login'));
  const discarded=assert.rejects(privateRead,e=>e.code==='STALE_REQUEST');gate.resolve(response([{intro:'OLD_PRIVATE_CV'}]));await discarded;

  // Cross-tab account switches clear private forms and admin state before loading.
  w=workspace();w.api.state.profile=w.profile;w.api.state.isAdmin=true;w.api.state.resume={intro:'OLD_PRIVATE_CV'};w.el('account-content').innerHTML='OLD_PRIVATE_CV';w.el('modal-content').innerHTML='OLD_PRIVATE_CONTACT';
  gate=deferred();w.backend.fetch=()=>gate.promise;
  const switching=w.storageChange(authSession('new-user','11111111-1111-4111-8111-111111111112'));
  assert(!w.el('account-content').innerHTML.includes('OLD_PRIVATE_CV'));assert.equal(w.el('modal-content').innerHTML,'');assert.equal(w.api.state.isAdmin,false);assert.equal(w.api.state.resume,null);
  gate.resolve(response([]));await switching;

  // Image decoding can finish after logout; it must not upload into a new account.
  w=workspace();w.api.state.profile=w.profile;gate=deferred();w.backend.bitmap=()=>gate.promise;
  const uploading=w.api.uploadLogo({querySelector:()=>({files:[{type:'image/png',size:8}]})});
  await w.signOut();w.api.rememberSession(authSession('other-user','11111111-1111-4111-8111-111111111112'));
  let closed=false;const stopped=assert.rejects(uploading,e=>e.code==='STALE_REQUEST');gate.resolve({width:1,height:1,close:()=>closed=true});await stopped;
  assert(closed);assert(!w.requests.some(r=>r.url.includes('/storage/')));
  console.log('PASS: contact links, CV return, shared refresh, logout races, cross-tab changes and stale private reads/uploads.');
})().catch(e=>{console.error(e);process.exitCode=1;});
