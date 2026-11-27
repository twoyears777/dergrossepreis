/* Manna – „zuletzt aktiv“ und Statistik für den Admin (ab Version 1.33.0)
   Teil von app.js, wird NACH den Konto-Dateien geladen (braucht konto, kRest aus js/konto.js).
   1. Zuletzt aktiv: Wer angemeldet ist, meldet höchstens einmal pro Stunde „bin aktiv“ (Funktion bin_aktiv()).
      Gespeichert wird pro Konto nur ein Zeitpunkt. Ohne Konto wird nichts geschickt.
   2. Statistik: Auf der Konto-Seite sieht nur der Admin (Tabelle admins) einen Bereich mit Zahlen.
      Sicherheit: Ob jemand Admin ist, entscheidet allein die Datenbank (admin_statistik() prüft privat.ist_admin()).
      Für alle anderen bleibt der Bereich unsichtbar, sie bekommen keine Zahlen (siehe supabase/statistik.sql). */
/* ================= STATISTIK ================= */

/* Alle Texte an einer Stelle (sieht nur der Admin) */
const ST_TXT={
  titel:'Statistik',
  laedt:'Zahlen werden geladen …',
  fehler:'Die Zahlen konnten nicht geladen werden.',
  neu:'Neu laden',
  stand:z=>'Stand: '+z,
  zeilen:[
    ['nutzer','Registrierte Nutzer'],
    ['bestaetigt','davon mit bestätigter E-Mail'],
    ['mit_username','davon mit Username'],
    ['neu_7_tage','Neu in den letzten 7 Tagen'],
    ['aktiv_24h','Aktiv in den letzten 24 Stunden'],
    ['aktiv_7_tage','Aktiv in den letzten 7 Tagen'],
    ['daumen','Daumen hoch insgesamt'],
    ['aufrufe','Spiele geöffnet (nur mit Konto)'],
    ['einreichungen_offen','Offene Einreichungen']
  ],
  topDaumen:'Meiste Likes',
  topAufrufe:'Am häufigsten geöffnet',
  keine:'Noch keine'
};
const ST_AKTIV_KEY='manna_aktiv';   // {user, zeit}: wann zuletzt „bin aktiv“ gemeldet wurde
const ST_ABSTAND=60*60e3;

/* ---------- Zuletzt aktiv ---------- */
function aktivMelden(){
  if(VIEW||!konto)return;
  const id=konto.id,l=jget(ST_AKTIV_KEY,null);
  if(l&&l.user===id&&Date.now()-Number(l.zeit)<ST_ABSTAND&&Number(l.zeit)<=Date.now())return;
  lsSet(ST_AKTIV_KEY,JSON.stringify({user:id,zeit:Date.now()}));
  kRest('/rest/v1/rpc/bin_aktiv',{method:'POST',body:{}}).catch(()=>{/* unwichtig, Manna läuft immer weiter */});
}

/* ---------- Statistik (nur Admin) ---------- */
let stKeinAdmin=null;   // Konto-ID, für die die Datenbank schon „kein Admin“ gesagt hat (dann nicht nochmal fragen)
let stLaeuft=false;
function stBox(){return $('#kStat');}
function stSpielName(id){const g=typeof GAMES!=='undefined'&&GAMES.find(x=>x.id===id);return g?g.name:id;}
function stZahl(n){return (Number(n)||0).toLocaleString('de-DE');}
function stListe(titel,arr){
  const z=Array.isArray(arr)?arr:[];
  return `<h3 class="stat-h">${esc(titel)}</h3>`+(z.length?`<ol class="stat-top">${z.map(x=>`<li><span>${esc(stSpielName(x.spiel_id))}</span><b>${stZahl(x.anzahl)}</b></li>`).join('')}</ol>`:`<p class="hint">${esc(ST_TXT.keine)}</p>`);
}
function stZeigen(d){
  const box=stBox();if(!box)return;
  const zeit=d&&d.stand?new Date(d.stand).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):'';
  box.innerHTML=`<h2 class="konto-h">${esc(ST_TXT.titel)}</h2>
    <dl class="stat-zahlen">${ST_TXT.zeilen.map(([k,t])=>`<div><dt>${esc(t)}</dt><dd>${stZahl(d[k])}</dd></div>`).join('')}</dl>
    ${stListe(ST_TXT.topDaumen,d.top_daumen)}${stListe(ST_TXT.topAufrufe,d.top_aufrufe)}
    <p class="hint">${esc(ST_TXT.stand(zeit))}</p>
    <div class="row"><button class="btn" type="button" id="btnStatNeu">${esc(ST_TXT.neu)}</button></div>`;
  $('#btnStatNeu').onclick=()=>statistikLaden(true);
}
async function statistikLaden(sichtbarLassen){
  const box=stBox();if(!box)return;
  if(VIEW||!konto){box.hidden=true;box.innerHTML='';return;}
  const id=konto.id;
  if(stKeinAdmin===id){box.hidden=true;return;}
  if(stLaeuft)return;stLaeuft=true;
  if(sichtbarLassen)box.innerHTML=`<h2 class="konto-h">${esc(ST_TXT.titel)}</h2><p class="hint">${esc(ST_TXT.laedt)}</p>`;
  try{
    const d=await kRest('/rest/v1/rpc/admin_statistik',{method:'POST',body:{}});
    if(!konto||konto.id!==id)return;
    if(!d||typeof d!=='object'||Array.isArray(d))throw kErr(ST_TXT.fehler,500);
    stZeigen(d);box.hidden=false;
  }catch(e){
    if(!konto||konto.id!==id)return;
    // 42501 = kein Admin (Antwort der Datenbank): Bereich bleibt für immer unsichtbar
    if(e.code==='42501'||e.status===403){stKeinAdmin=id;box.hidden=true;box.innerHTML='';return;}
    if(!box.hidden){box.innerHTML=`<h2 class="konto-h">${esc(ST_TXT.titel)}</h2><p class="hint">${esc(ST_TXT.fehler)}</p><div class="row"><button class="btn" type="button" id="btnStatNeu">${esc(ST_TXT.neu)}</button></div>`;$('#btnStatNeu').onclick=()=>statistikLaden(true);}
  }finally{stLaeuft=false;}
}

let stKontoId;
function statistikKontoGewechselt(){
  if(VIEW)return;
  const id=konto?konto.id:null;
  if(id!==stKontoId){stKontoId=id;stKeinAdmin=null;const box=stBox();if(box){box.hidden=true;box.innerHTML='';}}
  aktivMelden();
  if(screenName==='konto')statistikLaden();
}
if(!VIEW){
  APP_HOOKS.seite.push(n=>{aktivMelden();if(n==='konto')statistikLaden();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')aktivMelden();});
  statistikKontoGewechselt();
}
