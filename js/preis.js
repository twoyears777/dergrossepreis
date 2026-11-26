/* Manna – „Der große Preis“: Spielbrett, Fragen, Wertung, Rückgängig, Spielende, Einstellungen, Tastatur
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* ---------- Spielbrett ---------- */
function renderScores(){
  const box=$('#scores');box.innerHTML='';
  if(!S.teams.length){box.innerHTML='<div class="noteams">Noch keine Gruppen – lege sie unter „Spielbrett bearbeiten“ an.</div>';return;}
  const max=Math.max(...S.teams.map(t=>t.score));
  S.teams.forEach((t,i)=>{
    const d=document.createElement('button');
    d.className='team'+(i===S.turn?' active':'')+(max>0&&t.score===max?' leader':'');
    d.style.setProperty('--c',t.color);d.dataset.id=t.id;
    d.title='Tippen: diese Gruppe ist dran';
    d.innerHTML=`<span class="turn">am Zug</span><span class="name">${esc(t.name)}</span><span class="pts bungee">${t.score}</span>`;
    d.onclick=()=>{S.turn=i;save();renderScores();};
    box.appendChild(d);
  });
}
function renderBoard(){
  ransom($('#title'),S.title||'Der große Preis');
  document.title=S.title||'Der große Preis';
  const b=$('#board');b.innerHTML='';
  const nc=S.categories.length,nr=S.points.length;
  if(!nc){b.style.gridTemplateColumns='1fr';b.style.gridTemplateRows='1fr';b.innerHTML='<div class="empty-board">Noch keine Kategorien.<br>Tippe oben rechts auf das Zahnrad</div>';renderScores();return;}
  b.style.gridTemplateColumns=`repeat(${nc},minmax(0,1fr))`;
  b.style.gridTemplateRows=`auto repeat(${nr},minmax(0,1fr))`;
  S.categories.forEach((c,ci)=>{const h=document.createElement('div');h.className='cat';h.textContent=c.name||'—';h.style.transform=`rotate(${((ci*5)%5-2)*.7}deg)`;b.appendChild(h);});
  S.points.forEach((p,ri)=>S.categories.forEach((c,ci)=>{
    const k=ci+'-'+ri,u=S.used[k],t=document.createElement('button');
    t.className='tile'+(u?' used':'');t.style.setProperty('--tp',PAPERS[ci%PAPERS.length]);t.style.transform=`rotate(${(((ci*7+ri*13)%7)-3)*.35}deg)`;
    if(u){
      const ws=(u.teams||(u.team?[u.team]:[])).map(id=>S.teams.find(x=>x.id===id)).filter(Boolean);
      const team=ws[0];
      if(ws.length>1)t.innerHTML=`<span class="won" style="--c:#f2df6b">${ws.map(w=>esc(w.name)).join(', ')}</span>`;
      else t.innerHTML=team?`<span class="won" style="--c:${team.color}">${u.half?'½ ':''}${esc(team.name)}</span>`:'<span class="won none">—</span>';
      t.onclick=()=>toast('Feld schon gespielt. Mit dem Pfeil oben links machst du die letzte Wertung rückgängig.');
    }else{t.textContent=p;t.onclick=()=>openQ(ci,ri);}
    b.appendChild(t);
  }));
  $('#btnUndo').disabled=!S.history.length;
  renderScores();
  pushState();
}
function floatScore(teamId,delta){
  const card=document.querySelector(`.team[data-id="${teamId}"]`);if(!card)return;
  const f=document.createElement('div');f.className='float';f.textContent=(delta>0?'+':'')+delta;
  f.style.color=delta>0?'#fff':'#ff8fa3';card.appendChild(f);setTimeout(()=>f.remove(),1500);
}

/* ---------- Frage öffnen ---------- */
let cur=null,fxBusy=false;
const TYPE_LABEL={frage:'Frage',mc:'Multiple Choice',schaetz:'Schätzfrage',aufgabe:'Aufgabe',action:'Action'};
// Zahl aus deutscher oder englischer Schreibweise lesen: "1.440", "42,195", "384 400"
function parseNum(v){
  let x=String(v||'').replace(/\s|\u00a0/g,'').replace(/[^0-9,.\-]/g,'');
  if(!x)return NaN;
  if(x.includes(','))x=x.replace(/\./g,'').replace(',','.');
  else if(/^-?\d{1,3}(\.\d{3})+$/.test(x))x=x.replace(/\./g,'');
  return parseFloat(x);
}
const fmtNum=n=>isNaN(n)?'':n.toLocaleString('de-DE',{maximumFractionDigits:3});
const INTRO={action:{word:'ACTION!',sub:'SONDERFELD'},aufgabe:{word:'AUFGABE!',sub:'JETZT SEID IHR DRAN'}};
function playIntro(kind){
  const fx=$('#actionFx'),d=INTRO[kind]||INTRO.action;
  ransom(fx.querySelector('.word'),d.word);fx.querySelector('.sub').textContent=d.sub;
  fx.classList.toggle('k-aufgabe',kind==='aufgabe');
  fx.classList.remove('show');void fx.offsetWidth;fx.classList.add('show');
  setTimeout(()=>fx.classList.remove('show'),1950);
}
function openQ(ci,ri){
  if(fxBusy)return;
  const it=S.categories[ci].items[ri]||blank();
  if(it.type==='action'||it.type==='aufgabe'){
    send({t:'fx',k:'intro',kind:it.type});
    fxBusy=true;ac();
    playIntro(it.type);sfx(it.type);
    setTimeout(()=>{showQ(ci,ri);},1750);
    setTimeout(()=>{fxBusy=false;},1950);
  }else{showQ(ci,ri);sfx('reveal');}
}
function showQ(ci,ri){
  cur={ci,ri};
  const c=S.categories[ci],it=c.items[ri]||blank(),p=S.points[ri];
  $('#qCat').textContent=c.name;$('#qPts').textContent=p;
  $('#qOverlay .qcard').classList.toggle('action',it.type==='action');
  const bd=$('#qBadge');bd.className='qbadge '+it.type;bd.textContent=TYPE_LABEL[it.type]||'Frage';
  const qt=$('#qText');qt.textContent=it.text||'(Für dieses Feld ist noch nichts hinterlegt.)';
  qt.classList.toggle('long',(it.text||'').length>120);
  const isQ=it.type==='frage',isMC=it.type==='mc',isEst=it.type==='schaetz',isAct=it.type==='action';
  const allPlay=isAct||isEst;
  cur.type=it.type;cur.sel=new Set();cur.stage='';cur.second=null;cur.wrong=null;
  const qa=$('#qAnswer');qa.classList.remove('show');
  qa.textContent=isQ?it.answer:isEst?(fmtNum(parseNum(it.answer))||it.answer)+(it.unit?' '+it.unit:''):'';
  qa.classList.toggle('secret',!!qa.textContent);
  $('#btnShowAnswer').style.display=(isQ&&it.answer)||isMC?'':'none';
  $('#btnShowAnswer').textContent=isDual()?'Lösung auf dem Beamer zeigen':'Lösung zeigen';$('#btnShowAnswer').disabled=false;

  const team=S.teams[S.turn];
  const hasTeams=S.teams.length>0;
  const half=Math.round(p/2);
  const foot=$('#qOverlay .qfoot');foot.classList.toggle('act',allPlay);
  const other=$('#qOther');other.innerHTML='';
  const pick=$('#halfPick');pick.innerHTML='';pick.classList.remove('show');
  const ex=$('#qExtra');ex.innerHTML='';ex.className='';

  const setWinBtn=()=>{const n=cur.sel.size;$('#btnOk').disabled=!n;$('#btnOk').style.opacity=n?1:.4;
    const dt=cur.type==='action'?S.teams[S.turn]:null,one=n===1?S.teams.find(t=>cur.sel.has(t.id)):null;
    $('#btnOk').textContent=n?(one?`+${dt&&one.id===dt.id?2*p:p} für ${one.name}`:`Punkte für ${n} Gruppen`):'Gewinner antippen';pushState();};
  cur.setWinBtn=setWinBtn;

  // Multiple Choice: Antwortkacheln
  if(isMC){
    ex.className='mc';
    it.options.forEach((o,i)=>{if(!o.trim())return;
      const b=document.createElement('button');b.className='mcopt';b.dataset.i=i;
      b.innerHTML=`<span class="ml">${'ABCD'[i]}</span><span>${esc(o)}</span>`;
      if(i===it.correct)b.classList.add('hint-right');
      b.onclick=()=>{if(cur.stage==='revealed'||cur.stage==='revealing'||cur.stage==='wrong1'||i===cur.wrong)return;lockMC(i);};
      ex.appendChild(b);});
  }
  // Schätzfrage: Eingabefeld pro Gruppe
  if(isEst){
    ex.className='est';
    S.teams.forEach(t=>{const r=document.createElement('div');r.className='estrow';r.style.setProperty('--c',t.color);r.dataset.id=t.id;
      r.innerHTML=`<span class="en">${esc(t.name)}</span><input inputmode="decimal" autocomplete="off" placeholder="?"><span class="ed"></span>`;
      r.onclick=e=>{if(cur.stage!=='solved'||e.target.tagName==='INPUT')return;
        if(cur.sel.has(t.id))cur.sel.delete(t.id);else cur.sel.add(t.id);r.classList.toggle('sel',cur.sel.has(t.id));setWinBtn();};
      r.querySelector('input').addEventListener('input',()=>pushState());
      r.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter'){const ins=[...ex.querySelectorAll('input')];const n=ins[ins.indexOf(e.target)+1];if(n)n.focus();else e.target.blur();}});
      ex.appendChild(r);});
  }

  if(isAct){
    // ACTION: alle Gruppen spielen mit, Gewinner-Gruppe(n) auswählen
    $('#qTurn').innerHTML=TXT.action(p,team);
    pick.classList.add('show');
    S.teams.forEach(t=>{const b=document.createElement('button');b.className='chip big';b.style.setProperty('--c',t.color);b.textContent=t.name;
      b.onclick=()=>{if(cur.sel.has(t.id))cur.sel.delete(t.id);else cur.sel.add(t.id);b.classList.toggle('sel',cur.sel.has(t.id));setWinBtn();};
      pick.appendChild(b);});
    setWinBtn();
    $('#btnBad').textContent='Niemand hat gewonnen';
  }else if(isEst){
    $('#qTurn').innerHTML=`Jede Gruppe schätzt – wer am nächsten dran ist, bekommt <b style="color:var(--gold)">${p}</b> Punkte`;
    $('#btnOk').disabled=!hasTeams;$('#btnOk').style.opacity=hasTeams?1:.4;
    $('#btnOk').textContent='Auflösen';
    $('#btnBad').textContent='Niemand bekommt Punkte';
  }else{
    $('#qTurn').innerHTML=(team?`Am Zug: <b style="color:${team.color}">${esc(team.name)}</b>`:'Keine Gruppen angelegt')+(isMC?' · Antwort antippen zum Einloggen':'');
    $('#btnOk').textContent=team?`Geschafft (+${p} für ${team.name})`:'Geschafft';
    $('#btnBad').textContent='Nicht geschafft';
    $('#btnOk').disabled=!hasTeams;$('#btnOk').style.opacity=hasTeams?1:.4;
    // Halbe Punktzahl bei klassischen Fragen und Multiple Choice
    if((isQ||isMC)&&S.teams.length>1){
      const hb=document.createElement('button');hb.className='chip';hb.id='btnSecond';hb.style.setProperty('--c','#ffd23f');
      hb.textContent=TXT.draw(half);hb.onclick=drawSecond;
      if(isMC)hb.style.display='none'; // bei Multiple Choice erst nach einer falschen Antwort
      other.appendChild(hb);
    }
  }
  const back=document.createElement('button');back.className='chip ghost';back.textContent='Zurück, Feld bleibt offen';back.onclick=closeQ;other.appendChild(back);

  $('#qOverlay').classList.add('show');
  pushState();
}
/* Texte für zweite Chance und ACTION */
const TXT={
  draw:half=>`Andere Gruppe auslosen (halbe Punktzahl: ${half})`,
  second:(t,half)=>`Zweite Chance: <b style="color:${t.color}">${esc(t.name)}</b> – für die halbe Punktzahl (${half})`,
  wrong:'Eure Antwort ist leider falsch!',
  action:(p,t)=>`Wer hat gewonnen? Jede Gewinner-Gruppe bekommt <b style="color:var(--gold)">${p}</b> Punkte`+(t?`, <b style="color:${t.color}">${esc(t.name)}</b> als ziehende Gruppe das Doppelte (${2*p})`:'')
};
/* Halbe Punktzahl / zweite Chance: Manna lost eine andere Gruppe aus (auf Knopfdruck der Spielleitung) */
function drawSecond(){
  if(!cur||cur.second)return;
  const others=S.teams.filter((t,i)=>i!==S.turn);if(!others.length)return;
  const t=others[Math.floor(Math.random()*others.length)],half=Math.round(S.points[cur.ri]/2);
  cur.second=t.id;
  const sb=$('#btnSecond');if(sb)sb.style.display='none';
  $('#qTurn').innerHTML=TXT.second(t,half);
  $('#btnOk').textContent=`Geschafft (+${half} für ${t.name})`;
  const okOn=cur.type!=='mc';$('#btnOk').disabled=!okOn;$('#btnOk').style.opacity=okOn?1:.4;
  if(cur.type==='mc'){
    cur.stage='second';cur.picked=null;
    [...$('#qExtra').children].forEach(b=>{const i=+b.dataset.i;b.classList.remove('picked','locked');b.disabled=i===cur.wrong;});
    const sa=$('#btnShowAnswer');sa.style.display='';sa.disabled=false;sa.textContent=isDual()?'Lösung auf dem Beamer zeigen':'Lösung zeigen';
  }
  sfx('tick');pushState();
}
function wrongFirst(){
  cur.wrong=cur.picked;cur.stage='wrong1';
  [...$('#qExtra').children].forEach(b=>{const i=+b.dataset.i;b.classList.remove('locked');if(i===cur.wrong){b.classList.add('wrong');b.disabled=true;}});
  $('#btnShowAnswer').style.display='none';
  $('#btnOk').disabled=true;$('#btnOk').style.opacity=.4;
  $('#qTurn').innerHTML=TXT.wrong;
  const sb=$('#btnSecond');if(sb)sb.style.display='';
  sfx('lose');pushState();
}
function closeQ(){$('#qOverlay').classList.remove('show');cur=null;pushState();}
$('#qX').onclick=()=>closeQ();
function lockMC(i){
  cur.picked=i;cur.stage='locked';
  [...$('#qExtra').children].forEach(b=>{const on=+b.dataset.i===i;b.classList.toggle('locked',on);b.classList.toggle('picked',on);});
  $('#btnShowAnswer').textContent='Auflösen';sfx('tick');pushState();
}
function startRevealMC(){
  if(!cur||cur.stage!=='locked')return;
  const it=S.categories[cur.ci].items[cur.ri];
  cur.stage='revealing';$('#qExtra').classList.add('suspense');$('#btnShowAnswer').disabled=true;
  sfx('drum');pushState();
  setTimeout(()=>{if(!cur)return;$('#qExtra').classList.remove('suspense');$('#btnShowAnswer').disabled=false;
    const right=cur.picked===it.correct;
    if(!right&&!cur.second&&cur.wrong==null&&S.teams.length>1)wrongFirst();else revealMC(right);},1300);
}
function revealMC(pickedRight){
  if(!cur||cur.stage==='revealed')return;cur.stage='revealed';
  const it=S.categories[cur.ci].items[cur.ri];
  $('#btnShowAnswer').style.display='none';
  $('#qTurn').innerHTML=$('#qTurn').innerHTML.replace(' · Antwort antippen zum Einloggen','');
  [...$('#qExtra').children].forEach(b=>{const i=+b.dataset.i;b.disabled=true;b.classList.remove('locked');
    if(i===it.correct)b.classList.add('right');else if(b.classList.contains('picked')||i===cur.wrong)b.classList.add('wrong');else b.classList.add('dim');});
  if(cur.second){const ok=pickedRight===true;$('#btnOk').disabled=!ok;$('#btnOk').style.opacity=ok?1:.4;}
  if(pickedRight===true)sfx('win');else if(pickedRight===false)sfx('lose');else sfx('tick');
  pushState();
}
function solveEstimate(){
  const it=S.categories[cur.ci].items[cur.ri];
  const target=parseNum(it.answer);
  const rows=[...$('#qExtra').children];
  const guesses=rows.map(r=>({id:r.dataset.id,row:r,v:parseNum(r.querySelector('input').value)}));
  cur.stage='solved';cur.answerShown=true;
  $('#qAnswer').classList.remove('secret');$('#qAnswer').classList.add('show');
  rows.forEach(r=>{r.classList.add('solved');const inp=r.querySelector('input');inp.readOnly=true;inp.blur();});
  if(!isNaN(target)){
    const valid=guesses.filter(g=>!isNaN(g.v));
    valid.forEach(g=>{const d=Math.abs(g.v-target);g.row.querySelector('.ed').textContent=d===0?'Volltreffer!':'daneben um '+fmtNum(d);});
    if(valid.length){const min=Math.min(...valid.map(g=>Math.abs(g.v-target)));
      valid.filter(g=>Math.abs(g.v-target)===min).forEach(g=>{cur.sel.add(g.id);g.row.classList.add('sel');});}
  }
  $('#qTurn').innerHTML=cur.sel.size?'Am nächsten dran! (Zum Ändern eine Gruppe antippen)':'Tippe die Gewinner-Gruppe an';
  cur.setWinBtn();sfx('reveal');
}
function playDone(o){
  const fx=$('#doneFx');
  fx.classList.toggle('bad',!o.ok);
  ransom(fx.querySelector('.dword'),o.title);
  const sub=fx.querySelector('.dsub');sub.textContent=o.sub||'';sub.style.display=o.sub?'':'none';
  fx.classList.remove('show');void fx.offsetWidth;fx.classList.add('show');
  if(o.ok)confetti();
  clearTimeout(playDone.t);playDone.t=setTimeout(()=>fx.classList.remove('show'),2600);
}
$('#doneFx').onclick=()=>$('#doneFx').classList.remove('show');
function award(list,half){
  if(!cur)return;
  let done=null;
  if(cur.type==='aufgabe'||cur.type==='action'){
    const p=S.points[cur.ri],pos=list.filter(a=>a.teamId&&a.delta>0);
    const names=pos.map(a=>(S.teams.find(t=>t.id===a.teamId)||{}).name).filter(Boolean).join(' & ');
    if(cur.type==='action')done=pos.length?{ok:true,title:'GEWONNEN!',sub:pos.map(a=>(S.teams.find(t=>t.id===a.teamId)||{}).name+' +'+a.delta).join(' & ')}:{ok:false,title:'KEIN GEWINNER',sub:''};
    else{const t=S.teams[S.turn];
      done=pos.length?{ok:true,title:'GESCHAFFT!',sub:`${names} +${p}`}:{ok:false,title:'LEIDER NICHT!',sub:t?t.name:''};}
  }
  const k=cur.ci+'-'+cur.ri,prevTurn=S.turn;
  list=list.filter(a=>a.teamId&&a.delta);
  list.forEach(a=>{const t=S.teams.find(x=>x.id===a.teamId);if(t)t.score+=a.delta;});
  const winners=list.filter(a=>a.delta>0).map(a=>a.teamId);
  S.used[k]={team:winners[0]||null,teams:winners,delta:list.length?list[0].delta:0,half:!!half};
  S.history.push({k,awards:list,prevTurn});
  if(S.teams.length)S.turn=(S.turn+1)%S.teams.length;
  save();closeQ();renderBoard();
  sfx(winners.length?'win':'lose');
  if(done){send({t:'fx',k:'done',o:done});playDone(done);}
  list.forEach(a=>floatScore(a.teamId,a.delta));
  setTimeout(()=>list.forEach(a=>send({t:'fx',k:'float',id:a.teamId,delta:a.delta})),120);
  checkEnd();
}
$('#btnOk').onclick=()=>{
  if(!cur)return;const p=S.points[cur.ri];
  if(cur.type==='schaetz'&&cur.stage!=='solved'){solveEstimate();return;}
  if(cur.type==='action'){if(!cur.sel.size)return;const dt=S.teams[S.turn];award([...cur.sel].map(id=>({teamId:id,delta:dt&&id===dt.id?2*p:p})));return;}
  if(cur.type==='schaetz'){if(!cur.sel.size)return;award([...cur.sel].map(id=>({teamId:id,delta:p})));return;}
  if(cur.second){award([{teamId:cur.second,delta:Math.round(p/2)}],true);return;}
  const t=S.teams[S.turn];if(t)award([{teamId:t.id,delta:p}]);
};
$('#btnBad').onclick=()=>{
  if(!cur)return;const t=S.teams[S.turn];
  award([]);
};
$('#btnShowAnswer').onclick=()=>{if(!cur)return;if(cur.type==='mc'){if(cur.stage==='locked')startRevealMC();else revealMC(null);return;}
  cur.answerShown=true;$('#qAnswer').classList.remove('secret');$('#qAnswer').classList.add('show');sfx('tick');pushState();};

/* ---------- Rückgängig ---------- */
$('#btnUndo').onclick=()=>{
  const h=S.history[S.history.length-1];if(!h)return;
  const aw=(h.awards||(h.teamId?[{teamId:h.teamId,delta:h.delta}]:[])).map(a=>({t:S.teams.find(x=>x.id===a.teamId),delta:a.delta})).filter(a=>a.t&&a.delta);
  const [ci,ri]=h.k.split('-').map(Number);
  const cat=S.categories[ci]?S.categories[ci].name:'';
  const what=aw.length?aw.map(a=>`${a.delta>0?'+':''}${a.delta} für ${a.t.name}`).join(', '):'keine Punkte';
  ask(`Letzte Wertung rückgängig machen?\n${cat} · ${S.points[ri]} (${what})`,'Rückgängig',()=>{
    S.history.pop();aw.forEach(a=>a.t.score-=a.delta);delete S.used[h.k];
    if(h.prevTurn<S.teams.length)S.turn=h.prevTurn;
    save();renderBoard();toast('Rückgängig gemacht – Feld ist wieder offen.');
  });
};

/* ---------- Spielende ---------- */
function checkEnd(){
  const total=S.categories.length*S.points.length;
  const played=Object.keys(S.used).filter(k=>{const [c,r]=k.split('-').map(Number);return c<S.categories.length&&r<S.points.length;}).length;
  if(total>0&&played>=total&&S.teams.length)setTimeout(showEnd,700);
}
let endT=[],endData=null,endCtx='preis',endTeams=null;
function clearEndTimers(){endT.forEach(clearTimeout);endT=[];}
// opt: {teams, sub, ctx:'own'} – ohne opt gilt das Spielbrett von „Der große Preis“
function showEnd(opt){
  opt=opt||{};
  const teams=opt.teams||S.teams;
  if(!teams.length)return;
  clearEndTimers();
  endCtx=opt.ctx||'preis';endTeams=teams;
  const total=S.categories.length*S.points.length,played=Object.keys(S.used).length;
  $('#endSub').textContent=opt.sub||(played>=total?'Alle Felder gespielt':'Spiel beendet');
  const rank=[...teams].sort((a,b)=>b.score-a.score);
  let place=0,last=null;
  const placed=rank.map((t,i)=>{if(t.score!==last){place=i+1;last=t.score;}return{t,place};});
  const winners=placed.filter(x=>x.place===1).map(x=>x.t);
  endData={placed,winners};
  const modOnly=!VIEW&&isDual();
  const es=$('#endScreen');es.classList.toggle('mod-only',modOnly);
  [1,2,3].forEach(n=>{const el=$('#st'+n),x=placed[n-1];el.classList.remove('on','drum');el.classList.toggle('empty',!x);
    if(x){el.style.setProperty('--c',x.t.color);el.querySelector('.nm').textContent=x.t.name;el.querySelector('.pt').textContent=x.t.score;
      el.querySelector('.block span').textContent=x.place;el.classList.toggle('gold',x.place===1);
      el.classList.remove('p1','p2','p3','p4');el.classList.add('p'+Math.min(x.place,4));}});
  const w=$('#endTitle');w.innerHTML='';w.classList.remove('on');
  const oth=$('#others');oth.innerHTML='';oth.classList.remove('on');
  placed.slice(3).forEach(x=>{const d=document.createElement('div');d.className='clip';d.style.setProperty('--c',x.t.color);
    d.innerHTML=`<b>${x.place}.</b>${esc(x.t.name)}<span>${x.t.score}</span>`;oth.appendChild(d);});
  $('#endActions').classList.toggle('on',modOnly);
  es.classList.add('show');
  if(!VIEW){endShown=true;pushState();}
  const seq=(ms,fn)=>endT.push(setTimeout(fn,ms));
  const up=n=>{const el=$('#st'+n);if(!el.classList.contains('empty')){el.classList.add('on');sfx('tick');}};
  seq(900,()=>up(3));
  seq(2200,()=>up(2));
  seq(3300,()=>{$('#st1').classList.add('on','drum');sfx('drum');});
  seq(4700,()=>revealWinner(modOnly));
  seq(5600,()=>{oth.classList.add('on');$('#endActions').classList.add('on');});
}
function revealWinner(modOnly){
  if(!endData)return;
  $('#st1').classList.remove('drum');$('#st1').classList.add('on');
  const w=$('#endTitle');
  if(!w.classList.contains('on')){ransom(w,endData.winners.length>1?'Unentschieden!':endData.winners[0].name);w.classList.add('on');sfx('fanfare');if(!modOnly)confetti();}
}
$('#ceremony').onclick=()=>{
  if(!$('#endScreen').classList.contains('show'))return;
  clearEndTimers();[1,2,3].forEach(n=>{const el=$('#st'+n);el.classList.remove('drum');if(!el.classList.contains('empty'))el.classList.add('on');});
  revealWinner(false);$('#others').classList.add('on');$('#endActions').classList.add('on');
};
$('#btnEndMenu').onclick=()=>{clearEndTimers();$('#endScreen').classList.remove('show');endShown=false;
  if(endCtx==='own'){OR=null;saveRun();}endCtx='preis';endTeams=null;closeQ();showScreen('shows');};
function resetRound(){S.teams.forEach(t=>t.score=0);S.used={};S.history=[];S.turn=0;save();renderBoard();}

function confetti(){
  const cv=$('#confetti'),cx=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;
  const cols=(endTeams||(screenName==='ownplay'&&OR?OR.teams:S.teams)).map(t=>t.color).concat(['#ece6da','#c9a77c','#f2df6b','#e3b2ab','#d9ded0','#ffffff']);
  const P=Array.from({length:220},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.6,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,s:6+Math.random()*8,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.floor(Math.random()*cols.length)]}));
  let frames=0;
  (function loop(){
    cx.clearRect(0,0,cv.width,cv.height);
    P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;p.vy+=.03;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore();});
    if(++frames<420)requestAnimationFrame(loop);else cx.clearRect(0,0,cv.width,cv.height);
  })();
}

/* ---------- Vollbild ---------- */
function toggleFull(){
  const d=document,el=d.documentElement;
  try{
    if(d.fullscreenElement||d.webkitFullscreenElement){(d.exitFullscreen||d.webkitExitFullscreen).call(d);}
    else{const f=el.requestFullscreen||el.webkitRequestFullscreen;if(!f)throw 0;const r=f.call(el);if(r&&r.catch)r.catch(()=>toast('Vollbild wird hier nicht unterstützt.'));}
  }catch(e){toast('Vollbild wird hier nicht unterstützt.');}
}
$('#btnFull').onclick=toggleFull;

/* ================= EINSTELLUNGEN ================= */
let selCat=0;
let boardSigAtOpen='';
const boardSig=()=>JSON.stringify([S.title,S.points,S.categories]);
function openSettings(){closeQ();document.querySelectorAll('.screen').forEach(x=>x.classList.remove('show'));screenName='settings';boardSigAtOpen=boardSig();
  renderSettings();$('#settings').classList.add('show');$('#settings').scrollTop=0;pushState();}
function closeSettings(){if(boardSig()!==boardSigAtOpen)markUnsaved();$('#settings').classList.remove('show');screenName='board';applyMode();renderBoard();}
$('#btnSettings').onclick=openSettings;$('#btnBack').onclick=closeSettings;

function renderSettings(){
  $('#sTitle').value=S.title;
  $('#sSound').checked=!!S.settings.sound;
  const pg=$('#sPoints');pg.innerHTML='';
  S.points.forEach((p,i)=>{const inp=document.createElement('input');inp.className='inp';inp.type='number';inp.inputMode='numeric';inp.value=p;
    inp.oninput=()=>{S.points[i]=Number(inp.value)||0;save();};pg.appendChild(inp);});
  renderTeams();renderCats();
}
$('#sTitle').oninput=e=>{S.title=e.target.value;save();};
$('#sSound').onchange=e=>{S.settings.sound=e.target.checked;save();if(e.target.checked)sfx('win');};

function renderTeams(){
  const box=$('#sTeams');box.innerHTML='';
  if(!S.teams.length)box.innerHTML='<p class="hint" style="margin:0 0 12px">Noch keine Gruppen.</p>';
  S.teams.forEach((t,i)=>{
    const r=document.createElement('div');r.className='teamrow';
    r.innerHTML=`<input type="color" value="${esc(t.color)}"><input class="inp nm" placeholder="Name der Gruppe" maxlength="30"><input class="inp sc" type="number" inputmode="numeric" title="Punktestand"><button class="btn danger small" title="Gruppe löschen">✕</button>`;
    const [col,nm,sc,del]=r.children;
    nm.value=t.name;sc.value=t.score;
    col.oninput=()=>{t.color=col.value;save();};
    nm.oninput=()=>{t.name=nm.value;save();};
    sc.oninput=()=>{t.score=Number(sc.value)||0;save();};
    del.onclick=()=>ask(`Gruppe „${t.name}“ löschen?`,'Löschen',()=>{
      S.teams.splice(i,1);
      // steht die gelöschte Gruppe vor der Gruppe am Zug, rückt der Zug mit (sonst wäre plötzlich die übernächste dran)
      if(i<S.turn)S.turn--;
      if(S.turn>=S.teams.length)S.turn=0;
      save();renderTeams();});
    box.appendChild(r);
  });
}
$('#btnAddTeam').onclick=()=>{
  if(S.teams.length>=8){toast('Maximal 8 Gruppen.');return;}
  const used=S.teams.map(t=>t.color);
  S.teams.push({id:uid(),name:'Gruppe '+String.fromCharCode(65+S.teams.length),color:COLORS.find(c=>!used.includes(c))||COLORS[S.teams.length%COLORS.length],score:0});
  save();renderTeams();
  const n=$('#sTeams').querySelectorAll('.nm');n[n.length-1].focus();n[n.length-1].select();
};

function renderCats(){
  if(selCat>=S.categories.length)selCat=Math.max(0,S.categories.length-1);
  const tabs=$('#sTabs');tabs.innerHTML='';
  S.categories.forEach((c,i)=>{const b=document.createElement('button');b.className='tab'+(i===selCat?' on':'');b.textContent=c.name||('Kategorie '+(i+1));b.onclick=()=>{selCat=i;renderCats();};tabs.appendChild(b);});
  if(S.categories.length<8){const add=document.createElement('button');add.className='tab add';add.textContent='+ Kategorie';
    add.onclick=()=>{S.categories.push({name:'Neue Kategorie',items:S.points.map(blank)});selCat=S.categories.length-1;save();renderCats();const n=$('#catName');n.focus();n.select();};tabs.appendChild(add);}
  const box=$('#sCat');box.innerHTML='';
  const c=S.categories[selCat];if(!c){box.innerHTML='<p class="hint">Lege eine Kategorie an.</p>';return;}
  const head=document.createElement('div');head.className='row';head.style.marginBottom='6px';
  head.innerHTML=`<label class="f" style="flex:1;min-width:220px">Name der Kategorie<input class="inp" id="catName" maxlength="40"></label>
    <div class="row" style="align-self:flex-end"><button class="btn small" id="catLeft" title="Nach links">◀</button><button class="btn small" id="catRight" title="Nach rechts">▶</button><button class="btn danger small" id="catDel">Kategorie löschen</button></div>`;
  box.appendChild(head);
  const cn=head.querySelector('#catName');cn.value=c.name;
  cn.oninput=()=>{c.name=cn.value;save();const t=$('#sTabs').children[selCat];if(t)t.textContent=c.name||('Kategorie '+(selCat+1));};
  head.querySelector('#catLeft').onclick=()=>moveCat(-1);
  head.querySelector('#catRight').onclick=()=>moveCat(1);
  head.querySelector('#catDel').onclick=()=>ask(`Kategorie „${c.name}“ mit allen Fragen löschen?`,'Löschen',()=>{
    S.categories.splice(selCat,1);remapUsedAfterDelete(selCat);save();renderCats();});
  S.points.forEach((p,ri)=>{
    const it=c.items[ri]||(c.items[ri]=blank());
    const row=document.createElement('div');row.className='item';
    row.innerHTML=`<div class="pv">${p}</div><div class="flds">
      <div class="seg"><button class="frage">Klassisch</button><button class="mc">Multiple Choice</button><button class="schaetz">Schätzfrage</button><button class="aufgabe">Aufgabe</button><button class="action">ACTION</button></div>
      <textarea class="ta tx" rows="2"></textarea>
      <input class="inp an">
      <div class="mcedit">${[0,1,2,3].map(i=>`<label><input type="radio" name="mc-${selCat}-${ri}" value="${i}" title="Richtige Antwort"><span class="ml">${'ABCD'[i]}</span><input class="inp opt" placeholder="Antwort ${'ABCD'[i]}"></label>`).join('')}</div>
      <div class="estedit"><input class="inp num" inputmode="decimal" placeholder="Richtige Zahl, z. B. 1440"><input class="inp unit" placeholder="Einheit (optional), z. B. km"></div>
    </div>`;
    const segBtns=[...row.querySelectorAll('.seg button')],tx=row.querySelector('.tx'),an=row.querySelector('.an');
    const mcBox=row.querySelector('.mcedit'),estBox=row.querySelector('.estedit'),num=row.querySelector('.num'),unit=row.querySelector('.unit');
    const PH={
      frage:'Frage, z. B. „Wie viele Beine hat eine Spinne?“',
      mc:'Frage – unten 2–4 Antworten eintragen und die richtige mit dem Kreis markieren',
      schaetz:'Schätzfrage, z. B. „Wie viele Minuten hat ein Tag?“ – jede Gruppe schätzt, wer am nächsten dran ist, gewinnt',
      aufgabe:'Aufgabe & Erklärung, z. B. „Eine Person macht 10 Liegestütze. Schafft sie es, gibt es die Punkte.“',
      action:'ACTION-Spiel & Erklärung – alle Gruppen spielen mit, am Ende wählst du den Gewinner (erst nach der Animation sichtbar)'};
    an.placeholder='Lösung (verdeckt, wird auf Klick gezeigt)';
    const sync=()=>{segBtns.forEach(b=>b.classList.toggle('on',b.className.split(' ')[0]===it.type));
      tx.placeholder=PH[it.type];
      an.style.display=it.type==='frage'?'':'none';
      mcBox.style.display=it.type==='mc'?'':'none';
      estBox.style.display=it.type==='schaetz'?'':'none';
      tx.rows=it.type==='aufgabe'||it.type==='action'?4:2;};
    tx.value=it.text;an.value=it.answer;num.value=it.answer;unit.value=it.unit;
    row.querySelectorAll('.opt').forEach((o,i)=>{o.value=it.options[i];o.oninput=()=>{it.options[i]=o.value;save();};});
    row.querySelectorAll('input[type=radio]').forEach((r,i)=>{r.checked=it.correct===i;r.onchange=()=>{it.correct=i;save();};});
    sync();
    segBtns.forEach(b=>b.onclick=()=>{const old=it.type;it.type=b.className.split(' ')[0];
      if(old!==it.type&&(old==='schaetz'||it.type==='schaetz')){an.value=it.answer;num.value=it.answer;}
      sync();save();});
    tx.oninput=()=>{it.text=tx.value;save();};
    an.oninput=()=>{it.answer=an.value;save();};
    num.oninput=()=>{it.answer=num.value;save();};
    unit.oninput=()=>{it.unit=unit.value;save();};
    box.appendChild(row);
  });
}
function moveCat(dir){
  const j=selCat+dir;if(j<0||j>=S.categories.length)return;
  const a=S.categories;[a[selCat],a[j]]=[a[j],a[selCat]];
  const nu={};Object.entries(S.used).forEach(([k,v])=>{let [c,r]=k.split('-').map(Number);if(c===selCat)c=j;else if(c===j)c=selCat;nu[c+'-'+r]=v;});S.used=nu;
  S.history.forEach(h=>{let [c,r]=h.k.split('-').map(Number);if(c===selCat)c=j;else if(c===j)c=selCat;h.k=c+'-'+r;});
  selCat=j;save();renderCats();
}
function remapUsedAfterDelete(ci){
  const nu={};Object.entries(S.used).forEach(([k,v])=>{let [c,r]=k.split('-').map(Number);if(c===ci)return;if(c>ci)c--;nu[c+'-'+r]=v;});S.used=nu;
  S.history=S.history.filter(h=>Number(h.k.split('-')[0])!==ci).map(h=>{let [c,r]=h.k.split('-').map(Number);if(c>ci)c--;return Object.assign(h,{k:c+'-'+r});});
}

$('#btnReset').onclick=()=>ask('Neue Runde starten? Alle Punkte gehen auf 0 und alle Felder werden wieder geöffnet. Fragen & Gruppen bleiben.','Neue Runde',()=>{resetRound();renderSettings();toast('Neue Runde – alles auf 0.');});

$('#btnExport').onclick=()=>{
  const data={title:S.title,points:S.points,settings:S.settings,teams:S.teams.map(t=>({name:t.name,color:t.color})),categories:S.categories};
  const txt=JSON.stringify(data,null,1);$('#ioText').value=txt;
  const st=$('#ioStatus');
  try{navigator.clipboard.writeText(txt).then(()=>{st.textContent='Export in die Zwischenablage kopiert.';},()=>{st.textContent='Export erzeugt – bitte Text oben markieren und kopieren.';});}
  catch(e){st.textContent='Export erzeugt – bitte Text oben markieren und kopieren.';}
};
function doImport(txt){
  const st=$('#ioStatus');
  try{const d=JSON.parse(txt);if(!d||!Array.isArray(d.categories))throw 0;
    // vorher prüfen, damit eine kaputte Datei nicht erst nach „Importieren“ still scheitert
    const n=normalize(Object.assign({},d,{used:{},history:[],turn:0}));n.teams.forEach(t=>t.score=0);
    ask('Import übernehmen? Kategorien, Fragen und Gruppen werden ersetzt, die Punkte auf 0 gesetzt.','Importieren',()=>{
      S=n;save();selCat=0;renderSettings();st.textContent='Import erfolgreich.';});
  }catch(e){st.style.color='#ff8fa3';st.textContent='Das sieht nicht nach einem gültigen Export aus.';setTimeout(()=>st.style.color='',3000);}
}
$('#btnImport').onclick=()=>doImport($('#ioText').value.trim());
$('#fileImport').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#ioText').value=r.result;doImport(String(r.result));};r.readAsText(f);e.target.value='';};

/* ---------- Tastatur ---------- */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!VIEW&&(screenName==='tpl'||screenName==='set'||screenName==='help')&&!$('#dialog').classList.contains('show')){showScreen('gmenu');return;}
  if(e.key==='Escape'&&!VIEW&&screenName==='game'){showScreen('coll');return;}
  if(e.key==='Escape'&&!VIEW&&(screenName==='coll'||screenName==='shows')){showScreen('home');return;}
  if(e.key==='Escape'&&!VIEW&&(screenName==='paed'||screenName==='art')&&!$('#dialog').classList.contains('show')){$(SCREENS[screenName].el+' > .back-link').click();return;}
  if(e.key==='Escape'&&!VIEW&&screenName==='timer'&&!$('#dialog').classList.contains('show')){$('#btnTimerBack').click();return;}
  if(e.key==='Escape'&&!VIEW){if($('#clDialog').classList.contains('show'))$('#clDialog').classList.remove('show');else if($('#dialog').classList.contains('show'))$('#dialog').classList.remove('show');else if($('#qOverlay').classList.contains('show'))closeQ();else if($('#endScreen').classList.contains('show'))$('#btnEndMenu').click();}
});
addEventListener('resize',()=>{const cv=$('#confetti');cv.width=innerWidth;cv.height=innerHeight;});
