/* Manna – Klicks pro Spiel und „Empfehlung für dich“ (ab Version 1.32.0)
   Teil von app.js, wird NACH den Konto-Dateien geladen (braucht konto, kRest aus js/konto.js).
   Wer angemeldet ist und ein Spiel der Spielesammlung öffnet, zählt in der Tabelle „klicks“ seine Zahl für dieses
   Spiel um 1 hoch. In der Spielesammlung steht dann (ohne Suche) das Spiel ganz oben, das man selbst am häufigsten
   geöffnet hat, mit dem kleinen Hinweis „Empfehlung für dich“.
   Ohne Konto wird nichts gezählt und nichts an Supabase geschickt.
   Sicherheit: Gezählt wird nur über die Funktion klick_zaehlen(), lesen darf jeder nur seine eigenen Zahlen
   (siehe supabase/klicks.sql). */
/* ================= KLICKS ================= */

const KL_TXT={empfehlung:'Empfehlung für dich'};   // Text von Lukas
const KL_KEY='manna_klicks';   // {user, zahlen:{spiel_id:anzahl}} – damit die Empfehlung auch offline und sofort da ist

let meineKlicks={};
let klUser=null;

function klSpeichern(){if(klUser)lsSet(KL_KEY,JSON.stringify({user:klUser,zahlen:meineKlicks}));}
function klZahl(id){return Math.max(0,Number(meineKlicks[id])||0);}

/* Bei Login/Logout: lokalen Stand des Kontos nehmen, dann frisch von Supabase holen */
async function klicksLaden(){
  const id=konto?konto.id:null;klUser=id;
  if(!id){meineKlicks={};return;}
  const l=jget(KL_KEY,null);
  meineKlicks=l&&l.user===id&&l.zahlen&&typeof l.zahlen==='object'&&!Array.isArray(l.zahlen)?l.zahlen:{};
  try{
    const rows=await kRest('/rest/v1/klicks?select=spiel_id,anzahl');
    if(!konto||konto.id!==id||!Array.isArray(rows))return;
    const z={};rows.forEach(x=>{if(x&&typeof x.spiel_id==='string')z[x.spiel_id]=Number(x.anzahl)||0;});
    meineKlicks=z;klSpeichern();
    if(screenName==='coll'&&typeof renderColl==='function')renderColl();
  }catch(e){/* offline oder Tabelle noch nicht da: alter Stand bleibt */}
}

/* Beim Öffnen eines Spiels (openGame in js/sammlung.js) */
function klickZaehlen(id){
  if(VIEW||!konto||typeof id!=='string')return;
  meineKlicks[id]=klZahl(id)+1;klSpeichern();
  kRest('/rest/v1/rpc/klick_zaehlen',{method:'POST',body:{spiel:id}})
    .then(n=>{if(konto&&konto.id===klUser&&typeof n==='number'&&n>klZahl(id)){meineKlicks[id]=n;klSpeichern();}})
    .catch(()=>{/* Zählen ist unwichtig, Manna läuft immer weiter */});
}

/* Das am häufigsten geöffnete Spiel aus der Liste (bei Gleichstand das alphabetisch erste), sonst null */
function empfehlungAus(hits){
  if(VIEW||!konto)return null;
  let best=null,n=0;
  hits.forEach(g=>{const z=klZahl(g.id);if(z>n){n=z;best=g;}});
  return best;
}
function empfehlungTag(){return `<span class="gempf">${esc(KL_TXT.empfehlung)}</span>`;}

let klKontoId;
function klicksKontoGewechselt(){
  if(VIEW)return;
  const id=konto?konto.id:null;
  if(id!==klKontoId){klKontoId=id;klicksLaden();}
}
if(!VIEW)klicksKontoGewechselt();
