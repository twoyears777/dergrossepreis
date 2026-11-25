/* Manna – Spiel einreichen
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern.
   Besucher schicken ein Spiel an Supabase (Tabelle „einreichungen“). Lesen dürfen sie dort nichts,
   nur einreichen. Lukas holt die Einreichungen im Editor ab und übernimmt sie als Rohfassung. */
/* ================= SPIEL EINREICHEN ================= */
const SUB_FORMAT='manna-einreichung-1';
let subOpened=0,subBusy=false;
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
  if(miss.length){msg.textContent='Bitte noch ausfüllen: '+miss.map(m=>m[1]).join(', ')+'.';subMark(miss.map(m=>m[0]));return;}
  // Bot-Schutz: verstecktes Feld ausgefüllt oder in Sekunden abgeschickt -> tun, als hätte es geklappt
  if($('#sWebsite').value||Date.now()-subOpened<4000){subDone();return;}
  const body={titel:w.name,spiel:{format:SUB_FORMAT,werte:w},name:$('#sVon').value.trim()||null,email:$('#sMail').value.trim()||null,rechte_bestaetigt:true};
  subBusy=true;const btn=$('#btnSubmitSend');btn.disabled=true;
  try{
    const r=await fetch(MannaDB.url+'/rest/v1/einreichungen',{method:'POST',cache:'no-store',
      headers:{apikey:MannaDB.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error(r.status);
    subDone();
  }catch(err){
    msg.textContent='Crazy. Aktuell bekommen wir wohl zu viele Einsendungen. Versuche es bitte später erneut!';
  }finally{subBusy=false;btn.disabled=false;}
}
function subDone(){
  $('#subForm').reset();
  document.querySelectorAll('#subForm .fchip.on').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false');});
  document.querySelectorAll('#subForm .bad').forEach(el=>el.classList.remove('bad'));
  $('#subForm').hidden=true;$('#subDone').hidden=false;
  document.querySelectorAll('.screen.show').forEach(x=>x.scrollTop=0);
}
$('#btnSubmitOpen').onclick=()=>{$('#subForm').hidden=false;$('#subDone').hidden=true;$('#subMsg').textContent='';showScreen('submit');};
$('#btnSubmitBack').onclick=()=>showScreen('coll');
$('#subForm').addEventListener('submit',sendSubmit);
$('#subForm').addEventListener('input',e=>{const b=e.target.closest('.bad');if(b)b.classList.remove('bad');});
$('#sRechte').addEventListener('change',()=>{const b=document.querySelector('#subForm [data-s="rechte"]');if(b)b.classList.remove('bad');});
