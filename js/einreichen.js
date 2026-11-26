/* Manna – Spiel einreichen
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern.
   Angemeldete Nutzer mit Username schicken ein Spiel an Supabase (Tabelle „einreichungen“, ab Version 1.32.0 nur mit Konto).
   Lesen dürfen sie dort nichts, nur einreichen. Konto und Username („eingereicht von …“) setzt die Datenbank selbst
   (supabase/einreichen-mit-konto.sql). Lukas holt die Einreichungen im Editor ab und übernimmt sie als Rohfassung.
   Braucht konto, kRest, username aus js/konto.js und js/daumen.js (werden später geladen, aufgerufen wird erst beim Klicken). */
/* ================= SPIEL EINREICHEN ================= */
const SUB_FORMAT='manna-einreichung-1';
/* Texte, die Nutzer sehen (neu in 1.32.0) */
const ST={
  brauchtKonto:'Zum Einreichen brauchst du ein Konto. Dann steht bei deinem Spiel, dass es von dir kommt.',
  anmelden:'Anmelden',
  als:name=>'Du reichst ein als @'+name+'.',
  brauchtName:'Leg zuerst in deinem Konto einen Username fest, dann kannst du Spiele einreichen.',
  zumKonto:'Zum Konto'
};
let subOpened=0,subBusy=false,subFertig=false;
/* Ohne Konto: Hinweis statt Formular. Mit Konto: Formular mit „Du reichst ein als @…“ */
function subKontoUI(){
  if(typeof konto==='undefined')return;
  const an=!!konto;
  $('#subGate').hidden=an||subFertig;
  $('#subForm').hidden=!an||subFertig;
  $('#subGateText').textContent=ST.brauchtKonto;$('#btnSubGate').textContent=ST.anmelden;
  $('#subVon').textContent=an&&username?ST.als(username):'';
}
function subZumKonto(nameFehlt){
  kontoVon='submit';showScreen('konto');
  if(nameFehlt)setTimeout(()=>{const f=$('#kName');if(f)f.focus();},150);
}
const subChips=id=>[...document.querySelectorAll('#'+id+' .fchip.on')].map(b=>b.dataset.v);
function buildSubChips(id,opts){
  const box=$('#'+id);if(box.childElementCount)return;
  opts.forEach(o=>{
    const b=document.createElement('button');b.type='button';b.className='fchip';b.dataset.v=o.id;b.textContent=o.label;b.setAttribute('aria-pressed','false');
    b.onclick=()=>{const on=!b.classList.contains('on');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);};
    box.appendChild(b);
  });
}
function renderSubmit(){
  buildSubChips('sAlter',MannaSpiel.ALTER.map(a=>({id:a.id,label:a.label})));
  buildSubChips('sOrt',[{id:'drinnen',label:'Drinnen'},{id:'draussen',label:'Draußen'}]);
  subOpened=Date.now();
  subKontoUI();
}
function subValues(){
  const v=id=>$('#'+id).value;
  return{name:v('sName').trim(),kurz:v('sKurz').replace(/\s+/g,' ').trim(),alter:subChips('sAlter'),min:v('sMin').trim(),max:v('sMax').trim(),
    ort:subChips('sOrt'),dauer:v('sDauer').trim(),ablauf:v('sAblauf').trim(),material:v('sMaterial').trim(),varianten:v('sVarianten').trim(),
    paedagogik:v('sPaed').trim(),nachgespraech:v('sNach').trim(),risiken:v('sRisiken').trim(),tipp:v('sTipp').trim()};
}
function subMark(keys){
  document.querySelectorAll('#subForm .bad').forEach(el=>el.classList.remove('bad'));
  keys.forEach(k=>{const el=document.querySelector('#subForm [data-s="'+k+'"]');if(el)el.classList.add('bad');});
  const first=document.querySelector('#subForm [data-s="'+keys[0]+'"]');
  if(first){first.scrollIntoView({block:'center',behavior:'smooth'});const i=first.querySelector('input,textarea');if(i)setTimeout(()=>i.focus({preventScroll:true}),300);}
}
async function sendSubmit(e){
  if(e)e.preventDefault();
  if(subBusy)return;
  const msg=$('#subMsg');msg.textContent='';
  const w=subValues();
  const miss=[];
  if(!w.name)miss.push(['name','Name']);
  if(!w.kurz)miss.push(['kurz','Kurzbeschreibung']);
  if(!w.ablauf)miss.push(['ablauf','So geht’s']);
  if(!$('#sRechte').checked)miss.push(['rechte','das Häkchen']);
  if(!konto){subKontoUI();return;}
  if(!username){ask(ST.brauchtName,ST.zumKonto,()=>subZumKonto(true));return;}
  if(miss.length){msg.textContent='Bitte noch ausfüllen: '+miss.map(m=>m[1]).join(', ')+'.';subMark(miss.map(m=>m[0]));return;}
  // Bot-Schutz: verstecktes Feld ausgefüllt oder in Sekunden abgeschickt -> tun, als hätte es geklappt
  if($('#sWebsite').value||Date.now()-subOpened<4000){subDone();return;}
  // Konto und Username schickt die App nicht mit: Die setzt die Datenbank aus dem Login (nicht fälschbar)
  const body={titel:w.name,spiel:{format:SUB_FORMAT,werte:w},rechte_bestaetigt:true};
  subBusy=true;const btn=$('#btnSubmitSend');btn.disabled=true;
  try{
    await kRest('/rest/v1/einreichungen',{method:'POST',prefer:'return=minimal',body});
    subDone();
  }catch(err){
    // ohne Internet kommt die Anfrage gar nicht erst an – dann nicht „zu viele Einsendungen“ behaupten
    if(navigator.onLine===false||err.status===0)msg.textContent='Du bist gerade offline. Dein Spiel ist noch hier – schick es ab, sobald du wieder Internet hast.';
    else if(err.message==='kein_username')ask(ST.brauchtName,ST.zumKonto,()=>subZumKonto(true));
    else if(err.status===401||!konto){msg.textContent=err.message||KT.sitzungWeg;subKontoUI();}
    else msg.textContent='Crazy. Aktuell bekommen wir wohl zu viele Einsendungen. Versuche es bitte später erneut!';
  }finally{subBusy=false;btn.disabled=false;}
}
function subDone(){
  $('#subForm').reset();
  document.querySelectorAll('#subForm .fchip.on').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false');});
  document.querySelectorAll('#subForm .bad').forEach(el=>el.classList.remove('bad'));
  subFertig=true;$('#subForm').hidden=true;$('#subGate').hidden=true;$('#subDone').hidden=false;
  document.querySelectorAll('.screen.show').forEach(x=>x.scrollTop=0);
}
$('#btnSubmitOpen').onclick=()=>{subFertig=false;$('#subDone').hidden=true;$('#subMsg').textContent='';showScreen('submit');};
$('#btnSubGate').onclick=()=>subZumKonto(false);
$('#btnSubmitBack').onclick=()=>showScreen('coll');
$('#subForm').addEventListener('submit',sendSubmit);
$('#subForm').addEventListener('input',e=>{const b=e.target.closest('.bad');if(b)b.classList.remove('bad');});
$('#sRechte').addEventListener('change',()=>{const b=document.querySelector('#subForm [data-s="rechte"]');if(b)b.classList.remove('bad');});
