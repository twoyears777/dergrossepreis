/* Manna – Username und Daumen hoch (ab Version 1.30.0)
   Teil von app.js, wird NACH den Konto-Dateien geladen (braucht konto, kRest, kErr aus js/konto.js).
   Username: steht in der Tabelle „profile“ (einer pro Konto, eindeutig). Wird bei der Registrierung gewählt
   (ab Version 1.31.0) und beim ersten Login angelegt; ändern auf der Konto-Seite. Ab Version 1.34.0 Pflicht:
   Konten ohne Username bekommen ein Fenster, das erst nach dem Festlegen (oder Abmelden) verschwindet.
   Daumen hoch: nur mit Konto und Username, ein Daumen pro Spiel, kein Daumen runter.
   Die Anzahl pro Spiel sieht jeder (auch ohne Konto), wer welches Spiel mag, sieht nur der Nutzer selbst.
   Sicherheit: Was erlaubt ist, regeln die Zugriffsregeln in supabase/username-und-daumen.sql. */
/* ================= USERNAME & DAUMEN ================= */

/* Alle Texte, die Nutzer sehen, an einer Stelle */
const DT={
  daumen:'Gefällt mir',
  daumenAn:'Gefällt dir',
  anzahl:n=>n===1?'1 Person mag dieses Spiel':n+' Personen mögen dieses Spiel',
  brauchtKonto:'Melde dich an, um Spiele mit Daumen hoch zu bewerten.',
  brauchtName:'Leg zuerst in deinem Konto einen Username fest, dann kannst du Spiele bewerten.',
  zumKonto:'Zum Konto',
  nameUngueltig:'Der Username muss 3 bis 20 Zeichen lang sein: Buchstaben, Zahlen, Punkt, Bindestrich oder Unterstrich. Am Anfang und Ende steht ein Buchstabe oder eine Zahl.',
  nameVergeben:'Diesen Username gibt es schon. Such dir bitte einen anderen aus.',
  nameGespeichert:'Dein Username ist gespeichert.',
  nameGleich:'Das ist schon dein Username.',
  nameGesperrt:'Dieser Username ist leider nicht möglich. Such dir bitte einen anderen aus.',
  zwangText:'Bitte leg einen Username fest, damit du Manna mit deinem Konto nutzen kannst. Du kannst ihn später im Konto ändern.',
  zwangLeer:'Bitte gib einen Username ein.',
  nameDochVergeben:'Dein gewünschter Username „{name}“ ist inzwischen leider vergeben. Such dir im Konto bitte einen anderen aus.'
};
const NAME_MUSTER=/^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_.-]{1,18}[A-Za-z0-9ÄÖÜäöüß]$/;
const D_ZAHLEN_KEY='manna_daumen_zahlen';   // letzte bekannte Anzahl pro Spiel, damit offline etwas angezeigt wird

let username=null;          // null = noch nicht geladen oder keiner festgelegt
let nameVorschlag='';       // gewünschter Username aus der Registrierung, der inzwischen vergeben war (steht im Feld zum Anpassen)
let meineDaumen=new Set();  // Spiele, denen ich einen Daumen gegeben habe
let daumenZahlen=(()=>{const z=jget(D_ZAHLEN_KEY,{});return z&&typeof z==='object'&&!Array.isArray(z)?z:{};})();
const daumenZahl=id=>Math.max(0,Number(daumenZahlen[id])||0);
const hatDaumen=id=>meineDaumen.has(id);

/* Daumen-Symbol (Strich wie die übrigen Symbole, gefüllt, wenn man selbst einen gegeben hat) */
const DAUMEN_SVG='<svg class="daumen-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z"/><path d="M7 10l4-7c1.7 0 3 1.3 3 3v3h5.2a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 17.8 21H7"/></svg>';

/* ---------- Anzahl pro Spiel (für alle) ---------- */
let dZahlenLaden=null;
function daumenZahlenLaden(){
  if(VIEW||dZahlenLaden)return dZahlenLaden;
  return dZahlenLaden=kFetch(K_DB.url+'/rest/v1/rpc/daumen_zahlen',{method:'POST',cache:'no-store',
    headers:{apikey:K_DB.key,'Content-Type':'application/json'},body:'{}'})
    .then(r=>r.ok?r.json():null).then(rows=>{
      if(!Array.isArray(rows))return;
      const z={};rows.forEach(x=>{if(x&&typeof x.spiel_id==='string')z[x.spiel_id]=Number(x.anzahl)||0;});
      daumenZahlen=z;lsSet(D_ZAHLEN_KEY,JSON.stringify(z));daumenNeuZeichnen();
    }).catch(()=>{}).then(()=>{dZahlenLaden=null;});
}

/* ---------- Mein Username und meine Daumen ---------- */
async function profilLaden(){
  if(!konto){username=null;meineDaumen=new Set();daumenNeuZeichnen();return;}
  const id=konto.id;
  try{
    const [p,d]=await Promise.all([
      kRest('/rest/v1/profile?select=username'),
      kRest('/rest/v1/daumen?select=spiel_id')
    ]);
    if(!konto||konto.id!==id)return;
    username=Array.isArray(p)&&p[0]?p[0].username:null;
    meineDaumen=new Set((Array.isArray(d)?d:[]).map(x=>x.spiel_id));
    // Erster Login nach der Registrierung: den dort gewählten Username jetzt als Profil anlegen
    const w=konto.wunsch;
    let offline=false,grund='';
    if(!username&&w&&NAME_MUSTER.test(w)){
      let ok=true;
      try{await usernameSpeichern(w);}
      catch(e){
        if(e.status===0){ok=false;offline=true;}   // offline: beim nächsten Mal nochmal versuchen
        else if(konto&&konto.id===id){grund=DT.nameDochVergeben.replace('{name}',w);nameVorschlag=w;}
      }
      // Nur einmal versuchen, damit die Meldung nicht bei jedem Login kommt
      if(ok&&konto&&konto.id===id)kontoSave(Object.assign({},konto,{wunsch:''}));
    }
    // Username ist Pflicht (ab Version 1.34.0): Wer noch keinen hat, muss erst einen festlegen
    if(!offline&&konto&&konto.id===id&&!username)nameZwang(grund);
  }catch(e){/* offline: alter Stand bleibt */}
  usernameUI();daumenNeuZeichnen();
}

/* ---------- Username ist Pflicht (ab Version 1.34.0) ----------
   Fenster, das sich nicht wegklicken lässt: Username festlegen oder abmelden.
   Betrifft nur Konten ohne Username (z. B. alte Testkonten oder wenn der Wunschname inzwischen vergeben war). */
function nameZwang(grund){
  const box=$('#nameZwang');if(!box||VIEW)return;
  if(!konto||username){box.hidden=true;return;}
  $('#nzText').textContent=grund||DT.zwangText;
  const f=$('#nzName');if(!box.hidden&&document.activeElement===f)return;
  f.value=nameVorschlag||'';$('#nzMsg').textContent='';
  box.hidden=false;setTimeout(()=>{f.focus();f.select();},60);
}
(()=>{const form=$('#nzForm');if(!form||VIEW)return;
  form.addEventListener('submit',e=>{e.preventDefault();kBusy($('#nzOk'),async()=>{
    const m=$('#nzMsg');m.textContent='';
    const name=$('#nzName').value.trim();
    if(!name){m.textContent=DT.zwangLeer;return;}
    if(!NAME_MUSTER.test(name)){m.textContent=DT.nameUngueltig;return;}
    try{await usernameSpeichern(name);}catch(x){m.textContent=x.message||KT.fehler;return;}
    $('#nameZwang').hidden=true;toast(DT.nameGespeichert);
  })();});
  $('#nzAbmelden').onclick=()=>{$('#nameZwang').hidden=true;kontoAbmelden(false);};
})();
async function usernameSpeichern(name){
  name=String(name||'').trim();
  if(!NAME_MUSTER.test(name))throw kErr(DT.nameUngueltig,400);
  if(username&&name===username)throw kErr(DT.nameGleich,400);
  try{
    const r=await kRest('/rest/v1/profile?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{user_id:konto.id,username:name}});
    username=Array.isArray(r)&&r[0]?r[0].username:name;
    nameVorschlag='';
  }catch(e){
    if(e.code==='23505')throw kErr(DT.nameVergeben,409,e.code);   // eindeutiger Index: Name schon vergeben
    throw e;
  }
  usernameUI();daumenNeuZeichnen();
}

/* ---------- Daumen setzen / zurücknehmen ---------- */
const dLaeuft=new Set();
async function daumenUmschalten(id){
  if(!konto){ask(DT.brauchtKonto,KT.homeAus,()=>{kontoVon=screenName;showScreen('konto');});return;}
  if(!username){ask(DT.brauchtName,DT.zumKonto,()=>{kontoVon=screenName;showScreen('konto');setTimeout(()=>{const f=$('#kName');if(f)f.focus();},150);});return;}
  if(dLaeuft.has(id))return;
  dLaeuft.add(id);
  const an=!hatDaumen(id);
  // sofort anzeigen, bei Fehler zurückdrehen
  const setze=v=>{if(v)meineDaumen.add(id);else meineDaumen.delete(id);daumenZahlen[id]=Math.max(0,daumenZahl(id)+(v?1:-1));daumenNeuZeichnen();};
  setze(an);
  try{
    if(an)await kRest('/rest/v1/daumen',{method:'POST',prefer:'return=minimal',body:{spiel_id:id}});
    else await kRest('/rest/v1/daumen?spiel_id=eq.'+encodeURIComponent(id),{method:'DELETE'});
    lsSet(D_ZAHLEN_KEY,JSON.stringify(daumenZahlen));
  }catch(e){
    if(an&&e.code==='23505'){/* war schon gesetzt (z. B. auf anderem Gerät): passt */}
    else{setze(!an);toast(e.message||KT.fehler);}
  }finally{dLaeuft.delete(id);}
}

/* ---------- Anzeige ---------- */
// Kleines Symbol mit Zahl in der Liste der Spielesammlung (nur, wenn es Daumen gibt)
function daumenTag(g){
  const n=daumenZahl(g.id);if(!n)return '';
  return `<span class="gdaumen${hatDaumen(g.id)?' an':''}" role="img" title="${esc(DT.anzahl(n))}" aria-label="${esc(DT.anzahl(n))}">${DAUMEN_SVG}<b aria-hidden="true">${n}</b></span>`;
}
// Knopf auf der Detailseite eines Spiels
function daumenKnopf(btn,id){
  if(!btn)return;
  const an=hatDaumen(id),n=daumenZahl(id);
  btn.classList.toggle('on',an);btn.setAttribute('aria-pressed',an);
  btn.title=n?DT.anzahl(n):DT.daumen;
  btn.innerHTML=`${DAUMEN_SVG}<span>${esc(an?DT.daumenAn:DT.daumen)}</span>${n?`<b class="daumen-n">${n}</b>`:''}`;
  btn.onclick=()=>daumenUmschalten(id);
}
function daumenNeuZeichnen(){
  if(VIEW)return;
  if(screenName==='coll'&&typeof renderColl==='function')renderColl();
  const b=$('#btnDaumen');if(b&&b.dataset.id)daumenKnopf(b,b.dataset.id);
}
function usernameUI(){
  const f=$('#kName'),s=$('#kNameStand');if(!f)return;
  if(document.activeElement!==f)f.value=username||nameVorschlag||'';
  if(s)s.hidden=!!username;
  const z=$('#nameZwang');if(z&&(username||!konto))z.hidden=true;   // Pflicht-Fenster zu, sobald es einen Username gibt
  if(typeof subKontoUI==='function')subKontoUI();   // js/einreichen.js: „Eingereicht als …“
}

/* ---------- Konto-Seite: Username festlegen ---------- */
(()=>{const form=$('#kNameForm');if(!form||VIEW)return;
  form.addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKName'),async()=>{
    const m=$('#kNameMsg');m.textContent='';
    try{await usernameSpeichern($('#kName').value);}catch(x){m.textContent=x.message||KT.fehler;return;}
    toast(DT.nameGespeichert);
  })();});
})();

/* Bei Login und Logout (kontoUI in js/konto-seite.js meldet sich hier) Username und eigene Daumen neu laden,
   beim Öffnen der Spielesammlung die Anzahl pro Spiel */
let dKontoId=null;
function daumenKontoGewechselt(){
  if(VIEW)return;
  const id=konto?konto.id:null;
  if(id!==dKontoId){dKontoId=id;nameVorschlag='';if(!id)username=null;const z=$('#nameZwang');if(z)z.hidden=true;profilLaden();}
  usernameUI();
}
APP_HOOKS.seite.push(()=>{if(screenName==='coll')daumenZahlenLaden();});
// Die Anzahl wird erst beim Öffnen der Spielesammlung geholt: Wer nur die Startseite besucht, fragt nichts bei Supabase an
if(!VIEW)daumenKontoGewechselt();
