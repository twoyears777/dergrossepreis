/* Manna – Zuschaueransicht (Beamer) und Start der App
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* ---------- Zuschaueransicht ---------- */
let vLast=null,vKey=null,vFxUntil=0,vEnd=false,vT=null;
function vApply(m){
  vLast=m;
  const wait=vFxUntil-Date.now();
  if(wait>0){clearTimeout(vT);vT=setTimeout(()=>vApply(vLast),wait+20);return;}
  S=m.S;screenName=m.screen;
  ransom($('#vsTitle'),S.title||'Der große Preis');
  $('#vSplash').classList.toggle('show',!['board','timer','ownplay'].includes(m.screen));
  $('#vSplash').classList.toggle('brand-mode',!PREIS_SCREENS.includes(m.screen));
  $('#ownPlay').classList.toggle('show',m.screen==='ownplay');
  if(m.screen==='ownplay'&&m.own){OR=m.own;opRender();}
  $('#vTimer').classList.toggle('show',m.screen==='timer');
  if(m.tm&&typeof TM!=='undefined'){Object.assign(TM,m.tm);tmRender();}
  renderBoard();
  if(m.q&&m.screen==='board')vShowQ(m.q);else{$('#qOverlay').classList.remove('show');vKey=null;}
  if(m.end&&!vEnd)showEnd(m.screen==='ownplay'&&m.own?{teams:m.own.teams,ctx:'own',sub:m.endSub}:undefined);
  else if(!m.end&&vEnd){clearEndTimers();$('#endScreen').classList.remove('show');}
  vEnd=!!m.end;
}
function vFx(m){
  if(m.k==='intro'||m.k==='action'){vFxUntil=Date.now()+1750;playIntro(m.kind||'action');}
  else if(m.k==='done')playDone(m.o);
  else if(m.k==='float')floatScore(m.id,m.delta);
}
function vShowQ(q){
  const c=S.categories[q.ci];if(!c)return;
  const it=c.items[q.ri]||blank(),p=S.points[q.ri],key=q.ci+'-'+q.ri;
  const qa=$('#qAnswer'),ex=$('#qExtra');
  if(key!==vKey){
    vKey=key;
    $('#qCat').textContent=c.name;$('#qPts').textContent=p;
    $('#qOverlay .qcard').classList.toggle('action',it.type==='action');
    const bd=$('#qBadge');bd.className='qbadge '+it.type;bd.textContent=TYPE_LABEL[it.type]||'Frage';
    const qt=$('#qText');qt.textContent=it.text||'';qt.classList.toggle('long',(it.text||'').length>120);
    qa.classList.remove('show','secret');
    qa.textContent=it.type==='frage'?it.answer:it.type==='schaetz'?(fmtNum(parseNum(it.answer))||it.answer)+(it.unit?' '+it.unit:''):'';
    ex.innerHTML='';ex.className='';
    if(it.type==='mc'){ex.className='mc';
      it.options.forEach((o,i)=>{if(!o.trim())return;const b=document.createElement('div');b.className='mcopt';b.dataset.i=i;
        b.innerHTML=`<span class="ml">${'ABCD'[i]}</span><span>${esc(o)}</span>`;ex.appendChild(b);});}
    if(it.type==='schaetz'){ex.className='est';
      S.teams.forEach(t=>{const r=document.createElement('div');r.className='estrow';r.style.setProperty('--c',t.color);r.dataset.id=t.id;
        r.innerHTML=`<span class="en">${esc(t.name)}</span><span class="ev">…</span><span class="ed"></span>`;ex.appendChild(r);});}
    $('#qOverlay').classList.add('show');
  }
  const showA=(it.type==='frage'&&q.answerShown)||(it.type==='schaetz'&&q.stage==='solved');
  ex.classList.toggle('suspense',it.type==='mc'&&q.stage==='revealing');
  qa.classList.toggle('show',showA&&!!qa.textContent);
  if(it.type==='mc')[...ex.children].forEach(b=>{const i=+b.dataset.i;
    b.classList.toggle('picked',q.picked===i);
    b.classList.toggle('locked',q.picked===i&&(q.stage==='locked'||q.stage==='revealing'));
    const rev=q.stage==='revealed';
    b.classList.toggle('right',rev&&i===it.correct);
    b.classList.toggle('wrong',(rev&&i!==it.correct&&q.picked===i)||(q.wrong!=null&&i===q.wrong));
    b.classList.toggle('dim',rev&&i!==it.correct&&q.picked!==i&&i!==q.wrong);});
  const names=q.sel.map(id=>(S.teams.find(t=>t.id===id)||{}).name).filter(Boolean).join(', ');
  if(it.type==='schaetz'){
    const solved=q.stage==='solved',target=parseNum(it.answer);
    [...ex.children].forEach(r=>{const g=q.guesses[r.dataset.id]||'',v=parseNum(g);
      r.querySelector('.ev').textContent=solved?(g.trim()?g:'–'):(g.trim()?'abgegeben':'…');
      r.querySelector('.ed').textContent=solved&&!isNaN(v)&&!isNaN(target)?(Math.abs(v-target)===0?'Volltreffer!':'daneben um '+fmtNum(Math.abs(v-target))):'';
      r.classList.toggle('sel',q.sel.includes(r.dataset.id));});
    $('#qTurn').innerHTML=solved?(names?'Am nächsten dran: '+esc(names):''):`Jede Gruppe schätzt – wer am nächsten dran ist, bekommt <b style="color:var(--gold)">${p}</b> Punkte`;
  }else if(it.type==='action'){
    $('#qTurn').innerHTML=names?'Gewinner: '+esc(names):`Alle Gruppen spielen mit – es geht um <b style="color:var(--gold)">${p}</b> Punkte`;
  }else if(q.second&&S.teams.find(t=>t.id===q.second)){
    $('#qTurn').innerHTML=TXT.second(S.teams.find(t=>t.id===q.second),Math.round(p/2));
  }else if(q.stage==='wrong1'){
    $('#qTurn').innerHTML=TXT.wrong;
  }else{
    const team=S.teams[S.turn];
    $('#qTurn').innerHTML=team?`Am Zug: <b style="color:${team.color}">${esc(team.name)}</b>`:'';
  }
}

/* ---------- Start ---------- */
onMsg(m=>{
  if(!m||!m.t)return;
  if(VIEW){if(m.t==='state')vApply(m);else if(m.t==='fx')vFx(m);else if(m.t==='focus'){try{window.focus();}catch(e){}}}
  else if(m.t==='hello'||m.t==='ping'){viewerSeen=m.vis===false?0:Date.now();updViewerStatus();if(m.t==='hello')pushState();}
  else if(m.t==='bye'){viewerSeen=0;updViewerStatus();}
});
['#homeVer','#gmVer'].forEach(id=>{$(id).textContent='Version '+APP_VERSION+' – was ist neu?';$(id).onclick=()=>showChangelog(false);});
if(VIEW){
  document.title='Manna – Zuschaueransicht';
  $('#home').classList.remove('show'); // Startseite ist im HTML sichtbar, die Zuschaueransicht braucht sie nicht
  ransom($('#vsTitle'),S.title||'Der große Preis');
  $('#vSplash').classList.add('show','brand-mode');
  renderBoard();
  const vis=()=>document.visibilityState!=='hidden';
  send({t:'hello',vis:vis()});setInterval(()=>send({t:'ping',vis:vis()}),3000);
  document.addEventListener('visibilitychange',()=>send({t:vis()?'hello':'ping',vis:vis()}));
  addEventListener('pagehide',()=>send({t:'bye'}));
  let idleT;const wake=()=>{document.body.classList.remove('idle');clearTimeout(idleT);idleT=setTimeout(()=>document.body.classList.add('idle'),2500);};
  ['mousemove','touchstart','keydown'].forEach(ev=>addEventListener(ev,wake));wake();
  $('#vFull').onclick=()=>{const el=document.documentElement;try{const f=el.requestFullscreen||el.webkitRequestFullscreen;if(f){const r=f.call(el);if(r&&r.catch)r.catch(()=>{});}}catch(e){}};
}else{
  applyMode();renderBoard();showScreen('home');
  setInterval(updViewerStatus,2000);
}
