(() => {
  let signedIn=false;
  try{signedIn=!!JSON.parse(localStorage.getItem('cc_auth_session_v1')||'null')?.access_token;}catch{}
  const hash=location.hash;
  const authReturn=/access_token=|error_description=/.test(hash);
  const appHash=/^#(cuenta|login|registro|empleos|vacantes|oferta|guardadas)/.test(hash);
  const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const explicitWeb=new URLSearchParams(location.search).get('view')==='web';
  if(authReturn||appHash||(!explicitWeb&&(signedIn||installed))){
    const params=new URLSearchParams(location.search);params.delete('view');
    location.replace('/app/'+(params.toString()?'?'+params.toString():'')+hash);return;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('web-search')?.addEventListener('submit',e=>{
      e.preventDefault();const values=new URLSearchParams(new FormData(e.currentTarget));
      location.assign('/app/?'+values.toString()+'#empleos');
    });
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
})();
