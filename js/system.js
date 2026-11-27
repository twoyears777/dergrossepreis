/* Manna – Changelog, Offline-Betrieb und Updates, Abgleich mit der Zuschaueransicht
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* ---------- Changelog ---------- */
function showChangelog(){
  $('#clBody').innerHTML=CHANGELOG.map(e=>`<h3>Version ${esc(e.v)}</h3><ul>${e.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`).join('');
  $('#clDialog').classList.add('show');
}
$('#clClose').onclick=$('#clX').onclick=()=>$('#clDialog').classList.remove('show');
$('#clDialog').onclick=e=>{if(e.target.id==='clDialog')$('#clDialog').classList.remove('show');};
$('#btnChangelog').onclick=()=>showChangelog();
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
// Früher ging nach einem Update der Changelog von selbst auf. Das gibt es nicht mehr (ab 1.32.1); den alten Merker räumen wir weg.
try{localStorage.removeItem('grosserPreis_seenVersion');}catch(e){}

/* ---------- Offline & automatische Updates ---------- */
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(standalone)$('#btnFull').style.display='none';
let swReg=null,reloading=false;
function verText(extra){$('#verInfo').textContent=`Version ${APP_VERSION}`+(extra?' · '+extra:'');}
verText(navigator.onLine===false?'offline':'');
function showUpdateBar(){if(!VIEW)$('#updBar').classList.add('show');}
$('#updX').onclick=()=>$('#updBar').classList.remove('show');
$('#updNow').onclick=()=>{
  if(cur||$('#endScreen').classList.contains('show')){toast('Erst die aktuelle Frage abschließen.');return;}
  if(typeof TM!=='undefined'&&(TM.phase==='running'||TM.phase==='paused')){toast('Erst den Countdown beenden.');return;}
  reloading=true;location.reload();
};
try{
  if('serviceWorker' in navigator&&location.protocol==='https:'&&!/claude|anthropic/.test(location.hostname)){
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
      swReg=reg;
      const watch=w=>{if(!w)return;w.addEventListener('statechange',()=>{
        if(w.state==='activated'&&navigator.serviceWorker.controller)showUpdateBar();});};
      if(reg.installing&&navigator.serviceWorker.controller)watch(reg.installing);
      reg.addEventListener('updatefound',()=>{if(navigator.serviceWorker.controller)watch(reg.installing);});
      setInterval(()=>reg.update().catch(()=>{}),30*60*1000);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});});
    }).catch(()=>{});
  }
}catch(e){}
$('#btnCheckUpd').onclick=()=>{
  if(!swReg){toast('Updates gibt es nur in der installierten Version (GitHub Pages).');return;}
  if(navigator.onLine===false){toast('Kein Internet – Update-Suche nicht möglich.');return;}
  verText('suche …');
  swReg.update().then(()=>{setTimeout(()=>{
    if(swReg.installing||swReg.waiting){verText('Update wird geladen …');}
    else{verText('aktuell');toast('Du hast die neueste Version.');}
  },1500);}).catch(()=>{verText('Update-Suche fehlgeschlagen');});
};

/* ================= SYNC ZWISCHEN MODERATOR & ZUSCHAUER ================= */
let bc=null;try{bc=new BroadcastChannel('grosserPreis_sync');}catch(e){}
function send(m){
  try{if(bc){bc.postMessage(m);return;}}catch(e){}
  try{localStorage.setItem('grosserPreis_msg',JSON.stringify(Object.assign({_n:Date.now()+Math.random()},m)));}catch(e){}
}
function onMsg(fn){
  if(bc)bc.onmessage=e=>fn(e.data);
  else addEventListener('storage',e=>{if(e.key==='grosserPreis_msg'&&e.newValue){try{fn(JSON.parse(e.newValue));}catch(x){}}});
}
var screenName='home',endShown=false,pushT=null,viewerSeen=0;
function qState(){
  if(!cur)return null;
  const q={ci:cur.ci,ri:cur.ri,type:cur.type,stage:cur.stage||'',answerShown:!!cur.answerShown,sel:[...(cur.sel||[])],picked:cur.picked==null?null:cur.picked,wrong:cur.wrong==null?null:cur.wrong,second:cur.second||null,guesses:{}};
  if(cur.type==='schaetz')document.querySelectorAll('#qExtra .estrow').forEach(r=>{q.guesses[r.dataset.id]=r.querySelector('input').value;});
  return q;
}
function pushState(){
  if(VIEW)return;
  clearTimeout(pushT);
  pushT=setTimeout(()=>send({t:'state',S:S,screen:screenName,q:qState(),end:endShown,endSub:$('#endSub').textContent,tm:typeof TM!=='undefined'?TM:null,own:screenName==='ownplay'&&typeof OR!=='undefined'?OR:null}),30);
}
function isDual(){return !VIEW&&viewerConnected();}
function applyMode(){
  const dual=isDual();
  const was=document.body.classList.contains('mod');
  document.body.classList.toggle('mod',dual);
  ['#btnViewer','#btnOpViewer'].forEach(id=>{const b=$(id);b.classList.toggle('on',dual);b.title=dual?'Zuschaueransicht verbunden':'Zuschaueransicht zeigen';});
  if(cur&&!(cur.type==='mc'&&cur.stage==='locked'))$('#btnShowAnswer').textContent=dual?'Lösung auf dem Beamer zeigen':'Lösung zeigen';
  if(was!==dual&&!VIEW)toast(dual?(screenName==='ownplay'?'Zuschaueransicht verbunden – die Knöpfe siehst jetzt nur du.':'Zuschaueransicht verbunden – Lösungen siehst jetzt nur du.'):'Zuschaueransicht getrennt.');
}
function viewerConnected(){return Date.now()-viewerSeen<7000;}
function updViewerStatus(){
  applyMode();
  const lbl=viewerConnected()?'Zuschaueransicht verbunden':'Zuschaueransicht zeigen';
  const st=$('#viewerLabel');if(st)st.textContent=lbl;
  const st2=$('#tmViewerLabel');if(st2)st2.textContent=lbl;
}
function openViewer(){
  if(viewerConnected()){send({t:'focus'});toast('Die Zuschaueransicht ist schon offen.');return;}
  try{
    const w=window.open(location.href.split('#')[0]+'#zuschauer','gp_zuschauer','popup=yes,width=1280,height=720');
    if(!w)toast('Das Fenster wurde blockiert – bitte Pop-ups für diese Seite erlauben.');
    else toast('Zuschaueransicht geöffnet – Fenster auf den Beamer ziehen.');
  }catch(e){toast('Fenster konnte nicht geöffnet werden.');}
}
$('#btnViewer').onclick=openViewer;
$('#btnOpenViewer').onclick=openViewer;
