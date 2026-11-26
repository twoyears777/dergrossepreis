/* Manna – Konto & Sync (ab Version 1.29.0)
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern: Diese Datei muss als LETZTE kommen,
   weil sie save(), storeOwnGames(), lsSet(), showScreen() und renderGMenu() umhüllt.

   Konten sind freiwillig. Ohne Login bleibt alles wie bisher im Browser gespeichert.
   Mit Login werden Spielbrett, eigene Vorlagen, eigene Spiele (mit Bildern), Favoriten und ausgeblendete
   Standard-Vorlagen mit Supabase abgeglichen (Tabellen sync_eintraege und sync_bilder, siehe supabase/).

   So funktioniert der Abgleich: Für jeden Eintrag (z. B. „spiel:og-abc“) merkt sich das Gerät, welchen Stand es
   zuletzt mit dem Konto abgeglichen hat (Prüfsumme + Zeitstempel vom Server). Hat sich nur das Gerät geändert,
   wird hochgeladen. Hat sich nur das Konto geändert, wird übernommen. Haben sich beide geändert, geht nichts
   verloren: Eigene Spiele und Vorlagen werden als Kopie behalten, Favoriten zusammengelegt, das Spielbrett
   als Vorlage gesichert. Gelöschtes wird als „gelöscht“ markiert, damit es auf allen Geräten verschwindet.

   Sicherheit: Hier steht nur der ÖFFENTLICHE Schlüssel (js/supabase.js). Wer was lesen darf, regeln die
   Zugriffsregeln in der Datenbank: Jeder sieht ausschließlich seine eigenen Zeilen. */
/* ================= KONTO & SYNC ================= */

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

const KONTO_KEY='manna_konto',SYNC_KEY='manna_sync';
const K_DB=window.MannaDB;
const K_KEY_RE=/^(brett|favoriten|ausgeblendet|(vorlage|spiel):[A-Za-z0-9_-]{1,60})$/;
const K_BILD_RE=/^img-[a-z0-9]{1,40}$/;
const K_IMG_RE=/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
const K_MAX_EINTRAG=1e6,K_MAX_BILD=3e6;
const kErr=(m,status,code)=>Object.assign(new Error(m),{status,code});

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
  try{r=await fetch(K_DB.url+'/auth/v1/'+path,{method:opt.method||'POST',cache:'no-store',
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
  try{r=await fetch(K_DB.url+path,{method:opt.method||'GET',cache:'no-store',headers:h,body:opt.body!==undefined?JSON.stringify(opt.body):undefined});}
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
function kontoNachLogin(k,msg){
  const st=syncState();
  const fremd=st.user&&st.user!==k.id&&hatLokaleDaten();
  kontoSave(k);kMsg('');kontoUI();
  if(!fremd){toast(msg);kontoSync('login');return;}
  kFrage=true;
  ask(KT.fremdeDaten,KT.fremdeJa,()=>{kFrage=false;toast(msg);kontoSync('login');});
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
(function kontoAusLink(){
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
    if(typ==='recovery'){kontoSave(k);kontoUI();showScreen('konto');kontoZeigeNeuesPw(true);kMsg(KT.neuesPw);kontoSync('login');}
    else{kontoNachLogin(k,KT.bestaetigt);showScreen('konto');}
  }).catch(e=>{setTimeout(()=>{showScreen('konto');kMsg(e.status===0?KT.offline:KT.linkKaputt);},50);});
})();

/* ---------- Was wird abgeglichen? ---------- */
// Prüfsumme über einen „sortierten“ Text: Die Datenbank (jsonb) ändert die Reihenfolge der Felder
function kStabil(v){
  if(Array.isArray(v))return '['+v.map(kStabil).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+kStabil(v[k])).join(',')+'}';
  return JSON.stringify(v===undefined?null:v);
}
const kBytes=v=>new TextEncoder().encode(kStabil(v)).length;   // so misst auch die Datenbank (UTF-8)
function kHash(v){
  const s=kStabil(v);let h1=0xdeadbeef,h2=0x41c6ce57;
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (h2>>>0).toString(36)+(h1>>>0).toString(36)+':'+s.length;
}
// Vom Spielbrett wird nur die Vorbereitung abgeglichen, nicht der Spielstand (Punkte, geöffnete Felder) oder Ton
function brettDaten(s){return {title:s.title,points:s.points.slice(),categories:s.categories,teams:s.teams.map(t=>({name:t.name,color:t.color}))};}
let kStdHash=null;
function istStandardBrett(d){if(!kStdHash)kStdHash=kHash(brettDaten(sample()));return kHash(d)===kStdHash;}
function lokaleEintraege(){
  const m={};
  // aus dem Browser-Speicher lesen, nicht aus dem Arbeitsspeicher: Eine andere Registerkarte kann ihn geändert haben
  m.brett=brettDaten(load());
  const f=jget(FAV_KEY,[]);const fv=Array.isArray(f)?f.filter(x=>typeof x==='string'):[];
  if(fv.length)m.favoriten=[...new Set(fv)].sort();
  const h=hiddenTpl().filter(x=>typeof x==='string');if(h.length)m.ausgeblendet=[...new Set(h)].sort();
  ownTpl().forEach(t=>{m['vorlage:'+t.id]=t;});
  ownGames().forEach(g=>{m['spiel:'+g.id]=g;});
  Object.keys(m).forEach(k=>{if(!K_KEY_RE.test(k))delete m[k];});
  return m;
}
function hatLokaleDaten(){const m=lokaleEintraege();return Object.keys(m).some(k=>k!=='brett')||!istStandardBrett(m.brett);}
function syncState(){
  const s=jget(SYNC_KEY,null);
  return s&&typeof s==='object'&&s.base&&typeof s.base==='object'?s:{user:'',base:{},zuletzt:0};
}
function syncStateSave(s){lsSet(SYNC_KEY,JSON.stringify(s));}

/* Eigene Schreibvorgänge dürfen keinen neuen Abgleich auslösen */
let kStillN=0;
function kStill(fn){kStillN++;try{return fn();}finally{kStillN--;}}

/* Spielbrett nicht unter den Händen austauschen: nicht während gespielt oder bearbeitet wird */
let brettWartet=null,brettErlaubt=false;
function brettGesperrt(){
  if(brettErlaubt)return false;
  return screenName==='board'||screenName==='settings'||!!cur||Object.keys(S.used).length>0||S.teams.some(t=>t.score);
}
function spielGesperrt(id){return (OE&&OE.g&&OE.g.id===id)||(OR&&OR.game&&OR.game.id===id);}

/* ---------- Der Abgleich ---------- */
let syncLaeuft=false,syncNochmal=false,kStand={art:'',text:'',zeit:0},kWarnung='';
function kSetStand(art,text){kStand={art,text:text||'',zeit:Date.now()};kontoStandUI();}
async function kontoSync(grund){
  if(!konto||VIEW||kFrage)return;
  if(syncLaeuft){syncNochmal=true;return;}
  syncLaeuft=true;kSetStand('laeuft');
  try{
    const lauf=()=>syncLauf();
    if(navigator.locks&&navigator.locks.request)await navigator.locks.request('manna-sync',lauf);else await lauf();
    kSetStand('ok');
  }catch(e){
    kSetStand(e.status===0?'offline':'fehler',e.status===0?'':e.message);
  }finally{
    syncLaeuft=false;letzterPull=Date.now();
    if(syncNochmal){syncNochmal=false;setTimeout(()=>kontoSync('nochmal'),300);}
  }
}
async function syncLauf(){
  kontoFrisch();if(!konto)return;
  const ich=konto.id;
  const noch=()=>!!konto&&konto.id===ich;   // nach jedem Warten prüfen: inzwischen abgemeldet?
  let st=syncState();
  if(st.user!==ich)st={user:ich,base:{},zuletzt:0};
  const B=st.base;
  kWarnung='';

  // 1. Stand im Konto holen: erst nur Namen und Zeitstempel (klein), dann die Inhalte nur von dem, was sich geändert hat.
  //    So bleibt der Datenverbrauch klein, auch wenn oft abgeglichen wird.
  const meta=await kRest('/rest/v1/sync_eintraege?select=schluessel,geloescht,geaendert_am')||[];
  if(!noch())return;
  const R={};meta.forEach(r=>{if(r&&K_KEY_RE.test(r.schluessel))R[r.schluessel]=r;});
  const brauche=Object.keys(R).filter(k=>!R[k].geloescht&&(!B[k]||B[k].t!==R[k].geaendert_am));
  for(let i=0;i<brauche.length;i+=40){
    const teil=brauche.slice(i,i+40).map(k=>encodeURIComponent('"'+k+'"')).join(',');
    const rows=await kRest('/rest/v1/sync_eintraege?select=schluessel,daten,geloescht,geaendert_am&schluessel=in.('+teil+')')||[];
    if(!noch())return;
    rows.forEach(r=>{if(r&&R[r.schluessel])R[r.schluessel]=r;});
  }

  // 2. Vergleichen
  const L=lokaleEintraege();
  const games=ownGames(),tpls=ownTpl();
  let fav=null,hid=null,brettNeu=null,brettKonflikt=false;
  const an={games:false,tpls:false},uebernommen={},push=[],nachher=[];
  let neuerAbgleich=false;
  brettWartet=null;
  const setzeLokal=(key,r)=>{   // Stand aus dem Konto auf dieses Gerät holen (r.geloescht = löschen)
    const [art,id]=key.split(/:(.*)/s);
    if(key==='brett'){brettNeu=r;return true;}
    if(key==='favoriten'){fav=r.geloescht?[]:(Array.isArray(r.daten)?r.daten.filter(x=>typeof x==='string').slice(0,5000):[]);return true;}
    if(key==='ausgeblendet'){hid=r.geloescht?[]:(Array.isArray(r.daten)?r.daten.filter(x=>typeof x==='string').slice(0,500):[]);return true;}
    if(art==='spiel'){
      if(spielGesperrt(id))return false;
      const i=games.findIndex(g=>g.id===id);
      if(r.geloescht){if(i>=0)games.splice(i,1);}
      else{const g=normOwn(Object.assign({},r.daten,{id}));if(i>=0)games[i]=g;else games.push(g);}
      an.games=true;return true;
    }
    if(art==='vorlage'){
      const i=tpls.findIndex(t=>t.id===id);
      if(r.geloescht){if(i>=0)tpls.splice(i,1);}
      else{
        const d=r.daten||{};const n=normalize({title:d.title||d.name,points:d.points,categories:d.cats,teams:[]});
        const t={id,name:String(d.name||n.title||'Vorlage').slice(0,60),title:n.title,points:n.points,desc:String(d.desc||'').slice(0,300),cats:n.categories};
        if(i>=0)tpls[i]=t;else tpls.push(t);
      }
      an.tpls=true;return true;
    }
    return false;
  };
  const keys=new Set([...Object.keys(L),...Object.keys(R),...Object.keys(B)]);
  keys.forEach(key=>{
    let l=L[key],b=B[key];const r=R[key];
    // Im Konto ganz verschwunden (nicht nur als gelöscht markiert)? Dann wie beim ersten Abgleich behandeln:
    // Was hier liegt, wird wieder hochgeladen, statt es auf diesem Gerät zu löschen
    if(!r&&b){delete B[key];b=undefined;}
    // Ein unverändertes Standard-Spielbrett zählt beim ersten Abgleich als „nichts da“,
    // sonst würde es ein vorbereitetes Brett aus dem Konto überschreiben
    if(key==='brett'&&!b&&l!==undefined&&istStandardBrett(l))l=undefined;
    const lh=l===undefined?null:kHash(l);
    const rLebt=!!r&&!r.geloescht,rt=r?r.geaendert_am:null;
    const lNeu=b?lh!==b.h:lh!==null;
    const rNeu=b?rt!==b.t:rLebt;
    if(!lNeu&&!rNeu)return;
    if(lNeu&&!rNeu){
      if(l!==undefined)push.push({key,daten:l,h:lh});
      else if(rLebt)push.push({key,daten:null,h:null});
      else delete B[key];
      return;
    }
    if(!lNeu&&rNeu){
      if(key==='brett'&&(!rLebt||brettGesperrt())){if(rLebt)brettWartet=r;return;}
      if(!rLebt&&l===undefined){delete B[key];return;}
      if(setzeLokal(key,r))uebernommen[key]=r;
      return;
    }
    // Beide Seiten geändert
    if(rLebt&&lh!==null&&kHash(r.daten)===lh){B[key]={h:lh,t:rt};return;}   // zufällig gleich
    if(!rLebt){if(l!==undefined)push.push({key,daten:l,h:lh});else delete B[key];return;}  // dort gelöscht, hier geändert: behalten
    if(l===undefined){if(key==='brett'){if(brettGesperrt()){brettWartet=r;return;}}if(setzeLokal(key,r))uebernommen[key]=r;return;}  // hier gelöscht, dort geändert: zurückholen
    if(key==='favoriten'||key==='ausgeblendet'){
      const u=[...new Set([...(Array.isArray(r.daten)?r.daten:[]),...l])].filter(x=>typeof x==='string').sort();
      if(key==='favoriten')fav=u;else hid=u;
      nachher.push(key);neuerAbgleich=true;return;    // zusammengelegt: wird gleich hochgeladen
    }
    if(key==='brett'){
      if(brettGesperrt()){brettWartet=r;brettKonflikt=true;return;}
      brettKonflikt=true;brettNeu=r;uebernommen[key]=r;return;
    }
    const [art,id]=key.split(/:(.*)/s);
    if(art==='spiel'&&spielGesperrt(id))return;
    // Eigene Fassung als Kopie behalten, die aus dem Konto übernehmen
    if(art==='spiel'){const k=normOwn(Object.assign({},l,{id:'og-'+uid()+uid()}));k.name=(l.name+KT.kopie).slice(0,60);games.push(k);}
    else{tpls.push(Object.assign({},l,{id:'own-'+uid()+uid(),name:String(l.name||'Vorlage').slice(0,60-KT.kopie.length)+KT.kopie}));}
    neuerAbgleich=true;
    if(setzeLokal(key,r))uebernommen[key]=r;
  });

  // 3. Übernommenes auf diesem Gerät speichern
  kStill(()=>{
    if(brettNeu){
      if(brettNeu.geloescht){/* ein Spielbrett wird nie gelöscht */}
      else{
        const altB=brettDaten(S);
        if(brettKonflikt&&!istStandardBrett(altB)){
          tpls.push({id:'own-'+uid()+uid(),name:KT.brettKopie,title:altB.title,points:altB.points,desc:altB.categories.map(c=>c.name).filter(Boolean).join(', ').slice(0,300),cats:JSON.parse(JSON.stringify(altB.categories))});
          an.tpls=true;neuerAbgleich=true;
        }
        const d=brettNeu.daten||{},settings=S.settings;
        S=normalize({title:d.title,points:d.points,categories:d.categories,teams:Array.isArray(d.teams)?d.teams:S.teams,used:{},history:[],turn:0});
        S.settings=settings;save();
      }
    }
    if(an.games||neuerAbgleich)storeOwnGames(games);
    if(an.tpls||neuerAbgleich)lsSet(TPL_KEY,JSON.stringify(tpls));
    if(fav){favs=fav.slice();lsSet(FAV_KEY,JSON.stringify(favs));}
    if(hid)lsSet(HID_KEY,JSON.stringify(hid));
  });
  brettErlaubt=false;
  const L2=lokaleEintraege();
  Object.keys(uebernommen).forEach(key=>{
    const r=uebernommen[key];
    if(r.geloescht)delete B[key];
    else B[key]={h:L2[key]===undefined?null:kHash(L2[key]),t:r.geaendert_am};
  });
  nachher.forEach(key=>{if(L2[key]!==undefined)push.push({key,daten:L2[key],h:kHash(L2[key])});});
  st.base=B;syncStateSave(st);
  if(Object.keys(uebernommen).length||neuerAbgleich)kontoNeuZeichnen();

  // 4. Bilder hochladen, BEVOR die Spiele hochgeladen werden: Dann findet ein anderes Gerät die Bilder schon vor
  const gamesJetzt=ownGames();
  const rem=await kRest('/rest/v1/sync_bilder?select=bild_id,erstellt_am')||[];
  if(!noch())return;
  const remIds=new Set(rem.map(x=>x.bild_id));
  const meine=new Set(gamesJetzt.flatMap(ownImgRefs).filter(i=>K_BILD_RE.test(i)));
  for(const id of meine){
    if(remIds.has(id))continue;
    const d=await imgGet(id);
    if(!d||d.length>K_MAX_BILD||!K_IMG_RE.test(d))continue;
    try{await kRest('/rest/v1/sync_bilder?on_conflict=user_id,bild_id',{method:'POST',body:{user_id:ich,bild_id:id,daten:d},prefer:'resolution=ignore-duplicates,return=minimal'});remIds.add(id);}
    catch(e){if(e.code==='P0001'){kWarnung=KT.bilderVoll;break;}throw e;}
  }

  // 5. Geänderte Einträge hochladen (in Paketen, damit keine Anfrage zu groß wird)
  const zuGross=[];
  const lieferung=push.filter(p=>{
    if(p.daten===null)return true;
    if(kBytes(p.daten)>K_MAX_EINTRAG*0.95){zuGross.push(p.daten.name||p.daten.title||p.key);return false;}
    return true;
  });
  let paket=[],groesse=0;
  const senden=async()=>{
    if(!paket.length)return;
    const body=paket.map(p=>({user_id:ich,schluessel:p.key,daten:p.daten,geloescht:p.daten===null}));
    const antw=await kRest('/rest/v1/sync_eintraege?on_conflict=user_id,schluessel&select=schluessel,geaendert_am',{method:'POST',body,prefer:'resolution=merge-duplicates,return=representation'})||[];
    const zeit={};antw.forEach(a=>{zeit[a.schluessel]=a.geaendert_am;});
    paket.forEach(p=>{
      if(!zeit[p.key])return;
      if(p.daten===null)delete B[p.key];else B[p.key]={h:p.h,t:zeit[p.key]};
    });
    if(!noch())throw kErr(KT.abgemeldet,401);
    st.base=B;syncStateSave(st);
    paket=[];groesse=0;
  };
  for(const p of lieferung){
    const n=p.daten===null?50:kBytes(p.daten);
    if(paket.length&&(groesse+n>2e6||paket.length>=50))await senden();
    paket.push(p);groesse+=n;
  }
  await senden();
  if(zuGross.length)kWarnung=KT.zuGross+zuGross.slice(0,3).join(', ');

  // 6. Fehlende Bilder herunterladen
  const fehlt=[];
  for(const id of meine){if(remIds.has(id)&&!(await imgGet(id)))fehlt.push(id);}
  for(let i=0;i<fehlt.length;i+=4){
    const teil=fehlt.slice(i,i+4);
    const b=await kRest('/rest/v1/sync_bilder?select=bild_id,daten&bild_id=in.('+teil.join(',')+')')||[];
    if(!noch())return;
    for(const x of b){if(x&&K_BILD_RE.test(x.bild_id)&&typeof x.daten==='string'&&x.daten.length<=K_MAX_BILD&&K_IMG_RE.test(x.daten))await imgPut(x.bild_id,x.daten);}
  }
  if(fehlt.length&&screenName==='ownedit'&&OE)fillImgs($('#ownEdit'));

  // 7. Bilder im Konto aufräumen, die kein Spiel mehr braucht (erst nach einem Tag, falls ein anderes Gerät gerade hochlädt).
  //    Unveränderte Spiele im Konto sind hier gleich den Spielen auf dem Gerät, geänderte wurden oben mitgeladen.
  const gebraucht=new Set(meine);
  Object.values(R).forEach(r=>{if(r.schluessel.startsWith('spiel:')&&!r.geloescht&&r.daten)ownImgRefs(r.daten).forEach(i=>gebraucht.add(i));});
  const weg=rem.filter(x=>!gebraucht.has(x.bild_id)&&Date.now()-Date.parse(x.erstellt_am)>864e5).map(x=>x.bild_id).filter(i=>K_BILD_RE.test(i));
  for(let i=0;i<weg.length;i+=20){
    await kRest('/rest/v1/sync_bilder?bild_id=in.('+weg.slice(i,i+20).join(',')+')',{method:'DELETE',prefer:'return=minimal'});
  }

  if(!noch())return;
  st.zuletzt=Date.now();syncStateSave(st);
  if(brettWartet&&screenName==='gmenu')renderGMenu();
  if(neuerAbgleich)syncNochmal=true;   // Kopien und Zusammengelegtes gleich noch hochladen
}

/* Nach Übernahmen die gerade offene Seite neu zeichnen (nur Übersichten, nie mitten im Bearbeiten) */
function kontoNeuZeichnen(){
  if(screenName==='own')renderOwnList();
  else if(screenName==='tpl')renderTpl();
  else if(screenName==='gmenu')renderGMenu();
}

/* ---------- Wann wird abgeglichen? ---------- */
// Nach lokalen Änderungen (kurz gesammelt), beim Start, beim Zurückkommen in die App, wenn das Internet wieder da ist
let kBaldT=null,letzterPull=0;
function syncBald(){
  if(!konto||VIEW||kStillN)return;
  clearTimeout(kBaldT);
  kBaldT=setTimeout(()=>{
    const st=syncState();if(st.user!==konto.id){kontoSync('aenderung');return;}
    const L=lokaleEintraege(),B=st.base;
    const anders=[...new Set([...Object.keys(L),...Object.keys(B)])].some(k=>{
      if(k==='brett'&&!B[k]&&istStandardBrett(L[k]))return false;
      return (L[k]===undefined?null:kHash(L[k]))!==(B[k]?B[k].h:null);
    });
    if(anders)kontoSync('aenderung');
  },2500);
}
function syncWennAlt(ms){if(konto&&!VIEW&&Date.now()-letzterPull>ms)kontoSync('pull');}

if(!VIEW){
  // Bestehende Speicherfunktionen umhüllen, damit jede Änderung den Abgleich anstößt
  const _save=save;save=function(){_save.apply(this,arguments);syncBald();};
  const _store=storeOwnGames;storeOwnGames=function(a){const ok=_store.apply(this,arguments);if(ok)syncBald();return ok;};
  const _lsSet=lsSet;lsSet=function(k,v){const ok=_lsSet(k,v);if(k===TPL_KEY||k===HID_KEY||k===FAV_KEY)syncBald();return ok;};
  const _show=showScreen;showScreen=function(n){_show.apply(this,arguments);if(n!=='konto')syncWennAlt(n==='gmenu'||n==='own'||n==='tpl'?15e3:60e3);};
  const _gm=renderGMenu;renderGMenu=function(){_gm.apply(this,arguments);brettHinweis();};
  addEventListener('online',()=>syncWennAlt(0));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncWennAlt(60e3);});
  setInterval(()=>{if(document.visibilityState==='visible')syncWennAlt(5*60e3);},60e3);
  // Anmelden oder Abmelden in einer anderen Registerkarte
  addEventListener('storage',e=>{if(e.key===KONTO_KEY||e.key===null){const vorher=konto&&konto.id;kontoFrisch();if((konto&&konto.id)!==vorher)kontoUI();}});
  if(konto)setTimeout(()=>kontoSync('start'),800);
}

/* Hinweis im Gameshow-Menü, wenn ein neues Spielbrett aus dem Konto wartet */
function brettHinweis(){
  if(!brettWartet||!konto)return;
  const list=$('#gmList');if(!list||list.querySelector('.konto-brett'))return;
  const n=document.createElement('div');n.className='backup-note konto-brett';n.setAttribute('role','status');
  const p=document.createElement('p');p.textContent=KT.brettWartet;n.appendChild(p);
  const row=document.createElement('div');row.className='backup-actions';
  const go=document.createElement('button');go.className='primary';go.textContent=KT.brettUebernehmen;
  go.onclick=()=>ask(KT.brettFrage,KT.brettUebernehmen,()=>{brettErlaubt=true;kontoSync('brett');});
  row.appendChild(go);n.appendChild(row);list.prepend(n);
}

/* ---------- Oberfläche ---------- */
let kontoVon='home';
const kMsg=t=>{const m=$('#kMsg');if(m)m.textContent=t||'';const m2=$('#kMsg2');if(m2)m2.textContent='';};
function kontoZeigeNeuesPw(an){$('#kNeuForm').hidden=!an;if(an)setTimeout(()=>$('#kNeuPass').focus(),100);}
function kontoUI(){
  const an=!!konto;
  const hb=$('#btnKonto');if(hb){hb.textContent=an?KT.homeAn:KT.homeAus;hb.classList.toggle('an',an);}
  $('#kontoAus').hidden=an;$('#kontoAn').hidden=!an;
  if(!an)$('#kNeuForm').hidden=true;
  if(an)$('#kWer').textContent=konto.email||'';
  kontoStandUI();
}
function kontoStandUI(){
  const el=$('#kStand');if(!el)return;
  const st=syncState();
  let t;
  if(kStand.art==='laeuft')t=KT.standLaeuft;
  else if(kStand.art==='offline')t=KT.standOffline;
  else if(kStand.art==='fehler')t=KT.standFehler+(kStand.text?': '+kStand.text:'');
  else if(konto&&st.user===konto.id&&st.zuletzt)t=KT.standOk+' · '+new Date(st.zuletzt).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  else t=KT.standNie;
  el.textContent=t;
  const w=$('#kWarnung');if(w){w.textContent=kWarnung;w.hidden=!kWarnung;}
}
SCREENS.konto={el:'#kontoScreen',title:'Konto',show:()=>{kontoUI();}};
function kBusy(btn,fn){
  return async()=>{
    if(btn.disabled)return;
    btn.disabled=true;
    try{await fn();}catch(e){kMsg(e.message||KT.fehler);}
    finally{btn.disabled=false;}
  };
}
function kFelder(mitPw){
  const mail=$('#kMail').value.trim(),pass=$('#kPass').value;
  if(!mail||(mitPw&&!pass)){kMsg(mitPw?KT.felder:KT.mail);return null;}
  if(!kMailOk(mail)){kMsg(KT.mailUngueltig);return null;}
  return {mail,pass};
}
$('#btnKonto').onclick=()=>{kontoVon=screenName==='konto'?'home':screenName;kMsg('');showScreen('konto');};
$('#btnKontoBack').onclick=()=>showScreen(SCREENS[kontoVon]?kontoVon:'home');
$('#kForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKLogin'),async()=>{
  const f=kFelder(true);if(!f)return;kMsg('');
  await kontoAnmelden(f.mail,f.pass);$('#kPass').value='';
})();});
$('#btnKReg').onclick=kBusy($('#btnKReg'),async()=>{
  const f=kFelder(true);if(!f)return;
  if(f.pass.length<8){kMsg(KT.pwKurz);return;}
  kMsg('');
  const r=await kontoRegistrieren(f.mail,f.pass);$('#kPass').value='';
  if(r==='mail')kMsg(KT.registriert);
});
$('#btnKVergessen').onclick=kBusy($('#btnKVergessen'),async()=>{
  const f=kFelder(false);if(!f)return;kMsg('');
  await kontoVergessen(f.mail);kMsg(KT.vergessenGesendet);
});
$('#kNeuForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKNeu'),async()=>{
  const p=$('#kNeuPass').value,m=$('#kMsg2');
  m.textContent='';
  if(p.length<8){m.textContent=KT.pwKurz;return;}
  try{await kontoNeuesPasswort(p);}catch(x){m.textContent=x.message;return;}
  $('#kNeuPass').value='';kontoZeigeNeuesPw(false);toast(KT.pwGeaendert);
})();});
$('#btnKSync').onclick=()=>kontoSync('knopf');
$('#btnKPw').onclick=()=>kontoZeigeNeuesPw($('#kNeuForm').hidden);
$('#btnKAbmelden').onclick=()=>ask(KT.abmeldenFrage,KT.abmeldenJa,()=>kontoAbmelden(false));
$('#btnKEntfernen').onclick=()=>ask(KT.entfernenFrage,KT.entfernenJa,()=>kontoAbmelden(true));
$('#btnKLoeschen').onclick=()=>ask(KT.loeschenFrage,KT.loeschenJa,()=>{
  kontoLoeschen().catch(e=>notice(e.message||KT.fehler));
});
if(!VIEW)kontoUI();
