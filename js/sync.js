/* Manna – Konto 2/3: Abgleich zwischen Geräten (ab Version 1.29.0)
   Teil von app.js, aufgeteilt nach Bereichen; Lade-Reihenfolge siehe js/konto.js.

   Mit Login werden Spielbrett, eigene Vorlagen, eigene Spiele (mit Bildern), Favoriten und ausgeblendete
   Standard-Vorlagen mit Supabase abgeglichen (Tabellen sync_eintraege und sync_bilder, siehe supabase/).

   So funktioniert der Abgleich: Für jeden Eintrag (z. B. „spiel:og-abc“) merkt sich das Gerät, welchen Stand es
   zuletzt mit dem Konto abgeglichen hat (Prüfsumme + Zeitstempel vom Server). Hat sich nur das Gerät geändert,
   wird hochgeladen. Hat sich nur das Konto geändert, wird übernommen. Haben sich beide geändert, geht nichts
   verloren: Eigene Spiele und Vorlagen werden als Kopie behalten, Favoriten zusammengelegt, das Spielbrett
   als Vorlage gesichert. Gelöschtes wird als „gelöscht“ markiert, damit es auf allen Geräten verschwindet.

   Angestoßen wird der Abgleich über die Änderungs-Meldungen aus js/kern.js: Die Speicherfunktionen rufen
   sichtbar datenGeaendert() auf, showScreen meldet seiteGewechselt(); unten trägt sich dieser Bereich dort ein. */
/* ================= KONTO: ABGLEICH ================= */
const SYNC_KEY='manna_sync';
const K_KEY_RE=/^(brett|favoriten|ausgeblendet|(vorlage|spiel):[A-Za-z0-9_-]{1,60})$/;
const K_BILD_RE=/^img-[a-z0-9]{1,40}$/;
const K_IMG_RE=/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
const K_MAX_EINTRAG=1e6,K_MAX_BILD=3e6;

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
  // Bei den Änderungs-Meldungen aus js/kern.js eintragen (sichtbare Aufrufe in den Speicherfunktionen)
  APP_HOOKS.aenderung.push(()=>syncBald());
  APP_HOOKS.seite.push(n=>{if(n!=='konto')syncWennAlt(n==='gmenu'||n==='own'||n==='tpl'?15e3:60e3);});
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
