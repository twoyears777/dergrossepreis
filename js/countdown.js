/* Manna – Countdown
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* ================= COUNTDOWN ================= */
const TM_KEY='grosserPreis_timer';
const TM_PRESETS=[30,60,120,180,300,600];
const TM={phase:'idle',total:Math.max(5,Number(lsGet(TM_KEY))||60)*1000,endAt:0,left:0,doneAt:0};
let tmTick=null,tmLastBeep=-1,tmDoneT=null;
const tmFmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const tmLabel=s=>s<60?s+' Sek':(s%60?Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+' Min':(s/60)+' Min');
function tmRemaining(){return TM.phase==='running'?TM.endAt-Date.now():TM.phase==='paused'?TM.left:TM.total;}
function tmFace(stage,forViewer){
  // Zuschauer sehen im Ruhezustand nur den Hintergrund
  if(forViewer&&TM.phase==='idle'){stage.innerHTML='';stage.dataset.phase='idle';return;}
  if(TM.phase==='done'){
    if(stage.dataset.phase!=='done'){stage.innerHTML='<div class="tm-over"></div>';ransom(stage.querySelector('.tm-over'),'Zeit vorbei!');stage.dataset.phase='done';}
    return;
  }
  if(stage.dataset.phase==='done'||!stage.querySelector('.tm-face')){stage.innerHTML='<div class="tm-face"><span class="tm-digits"></span></div>';}
  stage.dataset.phase=TM.phase;
  const ms=tmRemaining(),face=stage.querySelector('.tm-face');
  face.querySelector('.tm-digits').textContent=tmFmt(ms);
  face.classList.toggle('warn',TM.phase!=='idle'&&ms<=10000);
  face.classList.toggle('paused',TM.phase==='paused');
}
function tmRender(){
  if(VIEW){tmFace($('#vtmStage'),true);}
  else{
    tmFace($('#tmStage'),false);
    const s=Math.round(TM.total/1000);$('#tmMin').textContent=Math.floor(s/60);$('#tmSec').textContent=String(s%60).padStart(2,'0');
    const busy=TM.phase==='running'||TM.phase==='paused';
    document.querySelectorAll('#tmPresets .fchip').forEach(b=>{b.classList.toggle('on',+b.dataset.s===s);b.disabled=busy;});
    document.querySelectorAll('.tm-step .btn').forEach(b=>b.disabled=busy);
    $('#tmStart').disabled=busy;
    $('#tmPause').disabled=!busy;$('#tmPause').textContent=TM.phase==='paused'?'Weiter':'Pause';
    $('#tmReset').disabled=TM.phase==='idle';
  }
  clearInterval(tmTick);
  if(TM.phase==='running')tmTick=setInterval(tmLoop,200);
}
function tmLoop(){
  const ms=TM.endAt-Date.now();
  if(VIEW){tmFace($('#vtmStage'),true);if(ms<=0)clearInterval(tmTick);return;}
  if(ms<=0){tmFinish();return;}
  tmFace($('#tmStage'),false);
  const s=Math.ceil(ms/1000);
  if(s<=5&&s!==tmLastBeep){tmLastBeep=s;sfx('tick');}
}
function tmSetTotal(sec){if(TM.phase!=='idle'&&TM.phase!=='done')return;TM.phase='idle';TM.total=Math.min(5999,Math.max(5,sec))*1000;lsSet(TM_KEY,String(TM.total/1000));tmRender();pushState();}
function tmStart(){clearTimeout(tmDoneT);ac();TM.phase='running';TM.endAt=Date.now()+TM.total;tmLastBeep=-1;tmRender();pushState();}
function tmPauseToggle(){
  if(TM.phase==='running'){TM.left=TM.endAt-Date.now();TM.phase='paused';}
  else if(TM.phase==='paused'){TM.endAt=Date.now()+TM.left;TM.phase='running';}
  tmRender();pushState();
}
function tmReset(){clearTimeout(tmDoneT);TM.phase='idle';tmRender();pushState();}
function tmFinish(){
  TM.phase='done';TM.doneAt=Date.now();tmRender();pushState();sfx('gong');
  clearTimeout(tmDoneT);tmDoneT=setTimeout(()=>{if(TM.phase==='done'){TM.phase='idle';tmRender();pushState();}},4000);
}
function renderTimerScreen(){
  ransom($('#timerTitle'),'Countdown');
  const box=$('#tmPresets');
  if(!box.children.length)TM_PRESETS.forEach(s=>{const b=document.createElement('button');b.className='fchip';b.dataset.s=s;b.textContent=tmLabel(s);b.onclick=()=>tmSetTotal(s);box.appendChild(b);});
  updViewerStatus();tmRender();
}
document.querySelectorAll('.tm-step .btn').forEach(b=>b.onclick=()=>tmSetTotal(Math.round(TM.total/1000)+Number(b.dataset.d)));
$('#tmStart').onclick=tmStart;
$('#tmPause').onclick=tmPauseToggle;
$('#tmReset').onclick=tmReset;
$('#tmViewer').onclick=openViewer;
$('#gcTimer').onclick=nurAmPC(()=>showScreen('timer'));
$('#btnTimerBack').onclick=()=>{if(TM.phase==='running'||TM.phase==='paused'){ask('Der Countdown läuft noch. Trotzdem zurück? Der Countdown wird dabei beendet.','Zurück',()=>{tmReset();showScreen('shows');});}else{tmReset();showScreen('shows');}};
if(!VIEW)tmRender();
