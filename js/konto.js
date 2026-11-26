/* Manna – Konto 1/3: Anmeldung und Sitzung (ab Version 1.29.0)
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern: js/konto.js (diese Datei: Texte,
   Anmeldung, Sitzung), dann js/sync.js (Abgleich), dann js/konto-seite.js (Oberfläche) – alle drei als LETZTE,
   nach den Bereichen, deren Daten abgeglichen werden.

   Konten sind freiwillig. Ohne Login bleibt alles wie bisher im Browser gespeichert.
   Sicherheit: Hier steht nur der ÖFFENTLICHE Schlüssel (js/supabase.js). Wer was lesen darf, regeln die
   Zugriffsregeln in der Datenbank: Jeder sieht ausschließlich seine eigenen Zeilen. */
/* ================= KONTO: ANMELDUNG & SITZUNG ================= */

/* Alle Texte, die Nutzer sehen (außer denen in index.html), an einer Stelle */
const KT={
  offline:'Keine Verbindung. Bist du online?',
  fehler:'Da ist etwas schiefgelaufen. Versuch es bitte später noch einmal.',
  abgemeldet:'Du bist nicht angemeldet.',
  sitzungWeg:'Du wurdest abgemeldet. Bitte melde dich neu an.',
  falsch:'E-Mail oder Passwort stimmt nicht.',
  nichtBestaetigt:'Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach.',
  zuVieleMails:'Gerade wurden zu viele E-Mails verschickt. Versuch es bitte in einer Stunde noch einmal.',
  zuViele:'Zu viele Versuche. Warte bitte kurz und versuch es dann noch einmal.',
  pwSchwach:'Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.',
  pwGleich:'Das neue Passwort muss sich vom alten unterscheiden.',
  registrierungAus:'Neue Konten können gerade nicht erstellt werden.',
  felder:'Bitte E-Mail und Passwort eingeben.',
  mail:'Bitte gib deine E-Mail-Adresse ein.',
  mailUngueltig:'Diese E-Mail-Adresse sieht nicht richtig aus.',
  pwKurz:'Das Passwort muss mindestens 8 Zeichen haben.',
  registriert:'Fast geschafft! Wir haben dir eine E-Mail geschickt. Klick auf den Link darin, dann ist dein Konto fertig.',
  angemeldet:'Du bist angemeldet. Deine Daten werden abgeglichen.',
  bestaetigt:'Deine E-Mail-Adresse ist bestätigt. Du bist jetzt angemeldet.',
  linkKaputt:'Der Link ist abgelaufen oder wurde schon benutzt. Fordere bitte einen neuen an.',
  vergessenGesendet:'Falls es ein Konto mit dieser E-Mail-Adresse gibt, haben wir dir einen Link zum Zurücksetzen geschickt.',
  neuesPw:'Wähle jetzt ein neues Passwort.',
  pwGeaendert:'Dein neues Passwort ist gespeichert.',
  abmeldenFrage:'Abmelden? Deine Spiele und Vorlagen bleiben auf diesem Gerät.',
  abmeldenJa:'Abmelden',
  entfernenFrage:'Abmelden und alle Spiele, Vorlagen, Favoriten und das Spielbrett von diesem Gerät entfernen? In deinem Konto bleibt alles erhalten.',
  entfernenJa:'Abmelden und entfernen',
  abgemeldetOk:'Du bist abgemeldet.',
  entferntOk:'Du bist abgemeldet. Die Daten wurden von diesem Gerät entfernt.',
  loeschenFrage:'Konto wirklich löschen? Alle Daten in deinem Konto werden endgültig gelöscht. Das kann man nicht rückgängig machen. Auf diesem Gerät bleibt alles erhalten.',
  loeschenJa:'Konto endgültig löschen',
  geloescht:'Dein Konto wurde gelöscht.',
  fremdeDaten:'Auf diesem Gerät liegen Spiele oder Vorlagen, die zuletzt mit einem anderen Konto abgeglichen wurden. Sollen sie in dein Konto übernommen werden?',
  fremdeJa:'Übernehmen',
  fremdeNein:'Du wurdest wieder abgemeldet. Nutze im anderen Konto „Abmelden und Daten von diesem Gerät entfernen“, dann kannst du dich hier anmelden.',
  standLaeuft:'Wird abgeglichen …',
  standOk:'Alles abgeglichen',
  standOffline:'Offline. Der Abgleich wird nachgeholt, sobald du wieder Internet hast.',
  standFehler:'Abgleich fehlgeschlagen',
  standNie:'Noch nicht abgeglichen',
  bilderVoll:'Der Bilderspeicher deines Kontos ist voll. Neue Bilder bleiben nur auf diesem Gerät.',
  zuGross:'Ein Eintrag ist zu groß für den Abgleich und bleibt nur auf diesem Gerät: ',
  kopie:' (Kopie)',
  brettKopie:'Spielbrett von diesem Gerät',
  brettWartet:'Auf einem anderen Gerät wurde das Spielbrett geändert.',
  brettUebernehmen:'Neues Spielbrett übernehmen',
  brettFrage:'Neues Spielbrett übernehmen? Der aktuelle Spielstand wird dabei zurückgesetzt. Dein bisheriges Spielbrett wird als Vorlage gesichert.',
  homeAus:'Anmelden',
  homeAn:'Konto'
};

const KONTO_KEY='manna_konto';
const K_FUER_ALLE=!!(window.MannaDB&&window.MannaDB.kontenFuerAlle);   // siehe js/supabase.js
const K_DB=window.MannaDB;
const kErr=(m,status,code)=>Object.assign(new Error(m),{status,code});
// Wie fetch, aber mit Zeitlimit: Nach 45 Sekunden wird abgebrochen, damit Anmeldung und Abgleich nie hängen bleiben
function kFetch(url,opt){
  let c=null;try{c=new AbortController();}catch(e){}
  const t=c?setTimeout(()=>c.abort(),45e3):null;
  return fetch(url,c?Object.assign({},opt,{signal:c.signal}):opt).finally(()=>{if(t)clearTimeout(t);});
}

/* ---------- Sitzung (im Browser gespeichert) ---------- */
function kLese(){const k=jget(KONTO_KEY,null);return k&&typeof k==='object'&&k.access&&k.refresh&&k.id?k:null;}
let konto=VIEW?null:kLese();
function kontoSave(k){konto=k;if(k)lsSet(KONTO_KEY,JSON.stringify(k));else{try{localStorage.removeItem(KONTO_KEY);}catch(e){}}}
// Eine andere Registerkarte kann die Sitzung erneuert oder beendet haben: immer den neuesten Stand nehmen
function kontoFrisch(){const k=kLese();if(!k){if(konto){konto=null;kontoUI();}return;}if(!konto||k.refresh!==konto.refresh||k.id!==konto.id)konto=k;}
function kSession(d,alt){
  const u=d.user||{};
  return {access:d.access_token,refresh:d.refresh_token,
    exp:Number(d.expires_at)||Math.floor(Date.now()/1000)+(Number(d.expires_in)||3600),
    id:u.id||(alt&&alt.id)||'',email:u.email||(alt&&alt.email)||''};
}
function kAuthMsg(status,d){
  const c=String(d.error_code||d.code||d.error||'');
  if(c==='invalid_credentials'||c==='invalid_grant'&&/credentials/i.test(d.error_description||''))return KT.falsch;
  if(c==='email_not_confirmed')return KT.nichtBestaetigt;
  if(c==='over_email_send_rate_limit')return KT.zuVieleMails;
  if(c==='weak_password')return KT.pwSchwach;
  if(c==='same_password')return KT.pwGleich;
  if(c==='signup_disabled'||c==='email_provider_disabled')return KT.registrierungAus;
  if(c==='validation_failed'||c==='email_address_invalid')return KT.mailUngueltig;
  if(status===429||c==='over_request_rate_limit')return KT.zuViele;
  if(status===400)return KT.falsch;
  return KT.fehler;
}
async function kAuth(path,body,opt){
  opt=opt||{};let r;
  try{r=await kFetch(K_DB.url+'/auth/v1/'+path,{method:opt.method||'POST',cache:'no-store',
    headers:Object.assign({apikey:K_DB.key,'Content-Type':'application/json'},opt.token?{Authorization:'Bearer '+opt.token}:{}),
    body:body?JSON.stringify(body):undefined});}
  catch(e){throw kErr(KT.offline,0);}
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw kErr(kAuthMsg(r.status,d),r.status,String(d.error_code||d.code||''));
  return d;
}
let kRefreshP=null;
function kRefresh(erzwingen){
  if(kRefreshP)return kRefreshP;
  const alt=konto&&konto.access;
  const run=async()=>{
    kontoFrisch();
    if(!konto)throw kErr(KT.abgemeldet,401);
    // schon von einer anderen Registerkarte erneuert?
    if(konto.exp*1000>Date.now()+60e3&&(!erzwingen||konto.access!==alt))return;
    try{kontoSave(kSession(await kAuth('token?grant_type=refresh_token',{refresh_token:konto.refresh}),konto));}
    catch(e){if(e.status>=400&&e.status<500){kontoSave(null);kontoUI();toast(KT.sitzungWeg);e.status=401;e.message=KT.sitzungWeg;}throw e;}
  };
  const p=(navigator.locks&&navigator.locks.request)?navigator.locks.request('manna-konto-refresh',run):run();
  kRefreshP=p.finally(()=>{kRefreshP=null;});
  return kRefreshP;
}
// Anfrage an die Datenbank mit dem Login des Nutzers
async function kRest(path,opt,nochmal){
  opt=opt||{};
  kontoFrisch();
  if(!konto)throw kErr(KT.abgemeldet,401);
  if(konto.exp*1000<Date.now()+60e3)await kRefresh();
  const h={apikey:K_DB.key,Authorization:'Bearer '+konto.access};
  if(opt.body!==undefined)h['Content-Type']='application/json';
  if(opt.prefer)h.Prefer=opt.prefer;
  let r;
  try{r=await kFetch(K_DB.url+path,{method:opt.method||'GET',cache:'no-store',headers:h,body:opt.body!==undefined?JSON.stringify(opt.body):undefined});}
  catch(e){throw kErr(KT.offline,0);}
  if(r.status===401&&!nochmal){await kRefresh(true);return kRest(path,opt,true);}
  if(!r.ok){
    const d=await r.json().catch(()=>({}));
    // eigene Fehlermeldungen aus der Datenbank (z. B. „Bilderspeicher voll“) sind schon auf Deutsch
    throw kErr(d.code==='P0001'&&d.message?d.message:KT.fehler,r.status,String(d.code||''));
  }
  const t=await r.text();
  return t?JSON.parse(t):null;
}
const kRedirect=()=>location.origin+location.pathname;

/* ---------- Anmelden, Registrieren, Passwort ---------- */
const kMailOk=m=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m);
async function kontoAnmelden(mail,pass){
  const d=await kAuth('token?grant_type=password',{email:mail,password:pass});
  const k=kSession(d);
  kontoNachLogin(k,KT.angemeldet);
}
async function kontoRegistrieren(mail,pass){
  const d=await kAuth('signup?redirect_to='+encodeURIComponent(kRedirect()),{email:mail,password:pass});
  // Ohne E-Mail-Bestätigung kommt sofort eine Sitzung zurück, sonst nur der (noch unbestätigte) Nutzer
  if(d.access_token){kontoNachLogin(kSession(d),KT.angemeldet);return 'an';}
  return 'mail';
}
async function kontoVergessen(mail){
  await kAuth('recover?redirect_to='+encodeURIComponent(kRedirect()),{email:mail});
}
async function kontoNeuesPasswort(pass){
  kontoFrisch();if(!konto)throw kErr(KT.abgemeldet,401);
  if(konto.exp*1000<Date.now()+60e3)await kRefresh();
  await kAuth('user',{password:pass},{method:'PUT',token:konto.access});
}
// Nach jedem Login: Gehört dieses Gerät gerade zu einem anderen Konto? Dann erst fragen.
let kFrage=false;   // solange die Frage offen ist, wird nichts abgeglichen
/* Nach JEDEM Login (Formular, Bestätigungslink, Passwort-Link): Gehört dieses Gerät gerade zu einem anderen
   Konto? Dann erst fragen, sonst würden fremde Daten ungefragt in das neue Konto hochgeladen. */
function kontoNachLogin(k,msg,dann){
  const st=syncState();
  const fremd=st.user&&st.user!==k.id&&hatLokaleDaten();
  kontoSave(k);kMsg('');kontoUI();
  const weiter=()=>{toast(msg);if(dann)dann();kontoSync('login');};
  if(!fremd){weiter();return;}
  kFrage=true;
  ask(KT.fremdeDaten,KT.fremdeJa,()=>{kFrage=false;weiter();});
  $('#dNo').onclick=()=>{$('#dialog').classList.remove('show');kFrage=false;kontoAbmelden(false,true);notice(KT.fremdeNein);};
}
function kontoAbmelden(entfernen,leise){
  const k=konto;
  kontoSave(null);brettWartet=null;
  if(k)fetch(K_DB.url+'/auth/v1/logout',{method:'POST',headers:{apikey:K_DB.key,Authorization:'Bearer '+k.access}}).catch(()=>{});
  if(entfernen){geraetLeeren();try{localStorage.removeItem(SYNC_KEY);}catch(e){}}
  kontoUI();
  if(!leise)toast(entfernen?KT.entferntOk:KT.abgemeldetOk);
}
async function kontoLoeschen(){
  await kRest('/rest/v1/rpc/konto_loeschen',{method:'POST',body:{}});
  kontoSave(null);brettWartet=null;try{localStorage.removeItem(SYNC_KEY);}catch(e){}
  kontoUI();toast(KT.geloescht);
}
// Alles, was abgeglichen wird, von diesem Gerät entfernen (das Konto selbst bleibt unberührt)
function geraetLeeren(){
  kStill(()=>{
    storeOwnGames([]);
    lsSet(TPL_KEY,'[]');lsSet(HID_KEY,'[]');lsSet(FAV_KEY,'[]');favs=[];
    try{localStorage.removeItem(OWN_RUN_KEY);}catch(e){}
    OR=null;
    const settings=S.settings;S=sample();S.settings=settings;save();
  });
  idbDo('readwrite',st=>st.clear()).catch(()=>{});
  Object.keys(IMG).forEach(k=>delete IMG[k]);
}

/* Rückkehr aus einer E-Mail (Bestätigung oder Passwort zurücksetzen): Supabase hängt die Sitzung an die Adresse.
   Sofort aus der Adresszeile entfernen, damit die Zugangsdaten nicht im Verlauf oder in Lesezeichen landen. */
/* Rückkehr aus einer E-Mail erst behandeln, wenn ALLE Konto-Dateien geladen sind (diese liegt zuerst, die
   Oberfläche in js/konto-seite.js zuletzt). Sonst könnte die schnelle Server-Antwort kommen, bevor z. B. kMsg da ist. */
function kontoAusLink(){
  if(VIEW)return;
  const h=location.hash||'';
  if(!/(^#|&)(access_token|error_code|error)=/.test(h))return;
  const p=new URLSearchParams(h.slice(1));
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){location.hash='';}
  if(p.get('error')||p.get('error_code')){setTimeout(()=>{showScreen('konto');kMsg(KT.linkKaputt);},50);return;}
  const typ=p.get('type');
  const k={access:p.get('access_token'),refresh:p.get('refresh_token'),exp:Number(p.get('expires_at'))||Math.floor(Date.now()/1000)+(Number(p.get('expires_in'))||3600),id:'',email:''};
  if(!k.access||!k.refresh)return;
  // Wer angemeldet ist, steht im Zugangsschlüssel selbst; die E-Mail holen wir beim Server ab
  kAuth('user',null,{method:'GET',token:k.access}).then(u=>{
    k.id=u.id;k.email=u.email||'';
    if(typ==='recovery'){showScreen('konto');kontoNachLogin(k,KT.neuesPw,()=>{kontoZeigeNeuesPw(true);kMsg(KT.neuesPw);});}
    else{kontoNachLogin(k,KT.bestaetigt);showScreen('konto');}
  }).catch(e=>{setTimeout(()=>{showScreen('konto');kMsg(e.status===0?KT.offline:KT.linkKaputt);},50);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kontoAusLink);else kontoAusLink();
