let installPrompt;
const installButton = document.getElementById('install');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installButton.textContent = 'Instalar SVPAULCAR Apps'; });
installButton.addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.textContent = 'Cómo instalar'; } else { document.getElementById('instructions').showModal(); } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

// The access token exists only in memory and is never put in localStorage or caches.
import { API_BASE } from './config.js?v=9';
let accessToken = '', expiryTimer, personalApps = [];
const apiBase=API_BASE.replace(/\/$/,'');
const $=id=>document.getElementById(id);
async function api(path,{method='GET',data,auth=false}={}) {
 if(!apiBase)throw new Error('Este servicio estará disponible próximamente.');
 const response=await fetch(apiBase+path,{method,mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+accessToken}:{})},body:data?JSON.stringify(data):undefined});
 const result=await response.json();
 if(response.status===401&&auth){clearSession();throw new Error('Tu sesión ha caducado. Vuelve a entrar en Mis apps.');}
 if(!response.ok)throw new Error(result.error||'No se ha podido completar la solicitud.');return result;
}
function showMessage(id,message){$(id).textContent=message;}
function clearSession(){
 accessToken='';clearTimeout(expiryTimer);personalApps=[];$('private-list').replaceChildren();$('personal-section').hidden=true;$('login-form').reset();
}
$('open-personal').addEventListener('click',()=>{
 $('settings-menu').open=false;
 if(accessToken){$('personal-section').scrollIntoView({behavior:'smooth'});return;}
 showMessage('login-message','');$('login-dialog').showModal();$('personal-password').focus();
});
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('login-submit');button.disabled=true;showMessage('login-message','Comprobando…');
 try{
  const result=await api('/auth/login',{method:'POST',data:{password:$('personal-password').value}});
  $('personal-password').value='';accessToken=result.token;
  expiryTimer=setTimeout(clearSession,Math.max(0,result.expires*1000-Date.now()));
  await loadApps();$('login-dialog').close();$('personal-section').hidden=false;$('personal-section').scrollIntoView({behavior:'smooth'});
 }catch(err){showMessage('login-message',err.message);$('personal-password').value='';if(accessToken)clearSession();}finally{button.disabled=false;}
});
$('logout').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST',auth:true});}catch{}finally{clearSession();}});
// Reloading deliberately signs out; BFCache must not resurrect private links.
window.addEventListener('pagehide',()=>{if(accessToken)clearSession();});
async function loadApps(){const result=await api('/apps',{auth:true});personalApps=result.apps;renderApps();}
function renderApps(){
 const list=$('private-list');list.replaceChildren();showMessage('private-message',personalApps.length?'':'No hay aplicaciones personales disponibles.');
 personalApps.forEach(app=>{
  const article=document.createElement('article');article.className='card private-card';
  const link=document.createElement('a');link.className='private-link';link.href=app.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
  const img=document.createElement('img');img.className='app-icon';img.src=app.icon;img.alt='';
  const name=document.createElement('strong');name.className='app-name';name.textContent=app.name;link.append(img,name);
  article.append(link);list.append(article);
 });
}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('login-dialog').addEventListener('close',()=>{$('login-form').reset();});

let pushConfig;
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
async function refreshNotifications(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){
  $('push-toggle').disabled=true;showMessage('push-message',isIOS()?'En iPhone, añade esta app a la pantalla de inicio desde Safari y ábrela desde su icono (iOS 16.4 o posterior).':'Este navegador no permite notificaciones push.');return;
 }
 try{
  pushConfig=await api('/config');
  if(!pushConfig.pushEnabled){$('push-toggle').disabled=true;showMessage('push-message','Los avisos de Sustituciones estarán disponibles próximamente.');return;}
  const registration=await navigator.serviceWorker.ready;const sub=await registration.pushManager.getSubscription();
  $('push-toggle').textContent=sub?'Desactivar avisos':'Activar avisos';$('push-toggle').dataset.enabled=sub?'true':'false';$('push-toggle').setAttribute('aria-label',(sub?'Desactivar':'Activar')+' notificaciones push de Sustituciones');
  showMessage('push-message',sub?(pushConfig.deliveryEnabled?'🔔 Avisos activados en este dispositivo.':'⏳ Dispositivo suscrito. Los envíos todavía están pendientes de activación.'):'🔕 Avisos desactivados en este dispositivo.');
 }catch{showMessage('push-message','Los avisos de Sustituciones estarán disponibles próximamente.');$('push-toggle').disabled=true;}
}
function fromBase64(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}
$('push-toggle').addEventListener('click',async()=>{
 const button=$('push-toggle');button.disabled=true;
 try{
  const registration=await navigator.serviceWorker.ready;let sub=await registration.pushManager.getSubscription();
  if(sub){
   // Delete server registration first; a failed delete can be retried without losing its proof.
   await api('/subscriptions',{method:'DELETE',data:sub.toJSON()});await sub.unsubscribe();
  }else{
   if(isIOS()&&!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)throw new Error('Abre SVPAULCAR Apps desde su icono de la pantalla de inicio.');
   if(await Notification.requestPermission()!=='granted')throw new Error('No se ha concedido permiso. Puedes cambiarlo en los ajustes del navegador.');
   sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromBase64(pushConfig.publicKey)});
   try{await api('/subscriptions',{method:'POST',data:sub.toJSON()});}catch(err){await sub.unsubscribe();throw err;}
  }
  await refreshNotifications();
 }catch(err){showMessage('push-message',err.message);}finally{button.disabled=false;}
});
function showSubstitutions(){if(location.hash==='#sustituciones'){$('sustituciones').scrollIntoView({behavior:'smooth',block:'center'});$('sustituciones').focus();}}
window.addEventListener('hashchange',showSubstitutions);showSubstitutions();refreshNotifications();
