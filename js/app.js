/* Manna – App-Logik (Startseite, „Der große Preis“, Eigenes Spiel, Countdown, Spielesammlung)
   Lädt nach js/data.js. Beide Dateien teilen sich den globalen Gültigkeitsbereich. */

const KEY='grosserPreis_v1';
const VIEW=location.hash==='#zuschauer';
if(VIEW)document.body.classList.add('viewer');
const OLD_COLORS=['#ff4d6d','#3ddc97','#4dabff','#ffd23f','#c77dff','#ff9f1c','#2ee6e6','#ff70d0'];
const COLORS=['#c8505f','#5b8e7d','#4f7fae','#d9a33a','#8e6bb0','#d27f3a','#3f9a9c','#c26a95'];
const PAPERS=['#ece6da','#e6d6bc','#dfd9cd','#ead8d2','#d9ded0'];
const R_FONTS=['Georgia,"Times New Roman",serif','Futura,"Avenir Next","Arial Black",sans-serif','"Helvetica Neue","Arial Black",Arial,sans-serif','Didot,"Bodoni 72","Times New Roman",serif','Rockwell,"Arial Black",Impact,sans-serif'];
const R_PAPER=[['#ece6da','#1d1d1b'],['#1d1d1b','#ece6da'],['#c9a77c','#1d1d1b'],['#f2df6b','#1d1d1b'],['#e3b2ab','#1d1d1b'],['#ffffff','#b8432f'],['#d9ded0','#1d1d1b']];
function ransom(el,text){
  text=String(text||'');el.textContent='';el.classList.add('ransom');el.setAttribute('aria-label',text);
  let h=7,word=null;
  [...text].forEach((ch,i)=>{
    if(ch===' '){const sp=document.createElement('span');sp.className='rsp';el.appendChild(sp);word=null;return;}
    if(!word){word=document.createElement('span');word.className='rw';el.appendChild(word);}
    h=(h*31+ch.charCodeAt(0)*13+i*7)%99991;
    const sEl=document.createElement('span');sEl.className='rl';sEl.setAttribute('aria-hidden','true');
    const pc=R_PAPER[(h>>3)%R_PAPER.length];
    sEl.style.fontFamily=R_FONTS[h%R_FONTS.length];sEl.style.background=pc[0];sEl.style.color=pc[1];
    sEl.style.transform=`rotate(${((h%11)-5)*1.3}deg) translateY(${(h%5)-2}px)`;
    if(h%6===0)sEl.style.fontStyle='italic';
    sEl.style.animationDelay=(i*0.035)+'s';
    sEl.textContent=ch;word.appendChild(sEl);
  });
}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
function sample(){
  return {
    title:'Der große Preis',
    points:[10,20,40,60,100],
    settings:{minus:false,sound:true},
    teams:[
      {id:uid(),name:'Gruppe A',color:COLORS[0],score:0},
      {id:uid(),name:'Gruppe B',color:COLORS[1],score:0},
      {id:uid(),name:'Gruppe C',color:COLORS[2],score:0},
      {id:uid(),name:'Gruppe D',color:COLORS[3],score:0}
    ],
    categories:TEMPLATES[0].categories(),
    used:{},history:[],turn:0
  };
}
function emptyGame(){
  const s=sample();
  s.categories=[1,2,3,4,5].map(i=>({name:'Kategorie '+i,items:s.points.map(blank)}));
  return s;
}
function normalize(d){
  const s=sample();
  if(!d||typeof d!=='object') return s;
  const o={
    title:typeof d.title==='string'?d.title:s.title,
    points:Array.isArray(d.points)&&d.points.length?d.points.map(n=>Number(n)||0):s.points,
    settings:Object.assign({},s.settings,d.settings||{}),
    teams:Array.isArray(d.teams)?d.teams.map((t,i)=>({id:t.id||uid(),name:String(t.name||('Gruppe '+(i+1))),color:(()=>{const c=t.color||COLORS[i%COLORS.length];const k=OLD_COLORS.indexOf(c);return k>=0?COLORS[k]:c;})(),score:Number(t.score)||0})):s.teams,
    categories:Array.isArray(d.categories)?d.categories.map(c=>({name:String(c.name||''),items:Array.isArray(c.items)?c.items.map(it=>({type:TYPES.includes(it.type)?it.type:'frage',text:String(it.text||''),answer:String(it.answer||''),
      options:[0,1,2,3].map(i=>String((Array.isArray(it.options)&&it.options[i])||'')),correct:Math.min(3,Math.max(0,Number(it.correct)||0)),unit:String(it.unit||'')})):[]})):s.categories,
    used:d.used&&typeof d.used==='object'?d.used:{},
    history:Array.isArray(d.history)?d.history:[],
    turn:Number(d.turn)||0
  };
  o.categories.forEach(c=>{while(c.items.length<o.points.length)c.items.push(blank());});
  if(o.turn>=o.teams.length)o.turn=0;
  return o;
}
function load(){try{const r=localStorage.getItem(KEY);if(r)return normalize(JSON.parse(r));}catch(e){}return sample();}
function save(){if(VIEW)return;try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
let S=load();

/* ---------- Sound ---------- */
let AC=null;
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}if(AC.state==='suspended')AC.resume();return AC;}
function tone(f,t0,dur,type,vol,f2){
  const a=ac();if(!a)return;const t=a.currentTime+t0;
  const o=a.createOscillator(),g=a.createGain();o.type=type||'square';
  o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol||.06,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.05);
}
function sfx(n){
  if(!S.settings.sound)return;
  try{
    if(n==='reveal'){tone(220,0,.4,'sawtooth',.04,880);tone(660,.32,.25,'triangle',.07);}
    else if(n==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,i*.1,.28,'square',.05));tone(1047,.42,.5,'triangle',.06);}
    else if(n==='lose'){tone(200,0,.3,'sawtooth',.06,150);tone(150,.3,.5,'sawtooth',.06,80);}
    else if(n==='tick'){tone(1200,0,.06,'square',.03);}
    else if(n==='aufgabe'){
      [0,.1,.2,.3,.4,.5].forEach((t,i)=>tone(110+i*10,t,.09,'square',.07,60));
      [392,494,587,784].forEach((f,i)=>tone(f,.7+i*.12,.22,'triangle',.08));
      tone(988,1.2,.5,'square',.05);
    }
    else if(n==='drum'){for(let i=0;i<14;i++)tone(90+Math.random()*30,i*.085,.07,'square',.05+i*.003,50);}
    else if(n==='action'){
      for(let i=0;i<3;i++){tone(500,i*.32,.16,'sawtooth',.05,1100);tone(1100,i*.32+.16,.16,'sawtooth',.05,500);}
      [0,.12,.24].forEach(t=>tone(90,t,.12,'square',.09,50));
      tone(80,.35,.5,'triangle',.12,40);
      [523,659,784,1047,1319].forEach((f,i)=>tone(f,1.05+i*.07,.25,'square',.05));
    }
    else if(n==='gong'){tone(196,0,1.6,'triangle',.12,190);tone(392,0,1.2,'sine',.06);tone(294,.02,1.4,'triangle',.06);}
    else if(n==='fanfare'){[392,523,659,784,659,784,1047].forEach((f,i)=>tone(f,i*.14,.3,'square',.05));}
  }catch(e){}
}

/* ---------- Toast & Dialog ---------- */
let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600);}
function ask(msg,yesLabel,onYes,opt){
  $('#dMsg').textContent=msg;$('#dYes').textContent=yesLabel||'OK';$('#dialog').classList.add('show');
  const inp=$('#dInput'),withInput=!!(opt&&opt.input);
  inp.style.display=withInput?'':'none';
  if(withInput){inp.value=opt.value||'';inp.placeholder=opt.placeholder||'';setTimeout(()=>{inp.focus();inp.select();},50);}
  const yes=()=>{const v=inp.value.trim();if(withInput&&!v){inp.focus();return;}$('#dialog').classList.remove('show');onYes(v);};
  $('#dYes').onclick=yes;
  inp.onkeydown=e=>{if(e.key==='Enter')yes();};
  $('#dNo').onclick=()=>$('#dialog').classList.remove('show');
}

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
  cur.type=it.type;cur.sel=new Set();cur.stage='';
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
    $('#btnOk').textContent=n?`+${p} für ${n===1?S.teams.find(t=>cur.sel.has(t.id)).name:n+' Gruppen'}`:'Gewinner antippen';pushState();};
  cur.setWinBtn=setWinBtn;

  // Multiple Choice: Antwortkacheln
  if(isMC){
    ex.className='mc';
    it.options.forEach((o,i)=>{if(!o.trim())return;
      const b=document.createElement('button');b.className='mcopt';b.dataset.i=i;
      b.innerHTML=`<span class="ml">${'ABCD'[i]}</span><span>${esc(o)}</span>`;
      if(i===it.correct)b.classList.add('hint-right');
      b.onclick=()=>{if(cur.stage==='revealed'||cur.stage==='revealing')return;lockMC(i);};
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
    $('#qTurn').innerHTML=`Wer hat gewonnen? Jede Gewinner-Gruppe bekommt <b style="color:var(--gold)">${p}</b> Punkte`;
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
    $('#btnBad').textContent=S.settings.minus&&team?`Nicht geschafft (−${p})`:'Nicht geschafft';
    $('#btnOk').disabled=!hasTeams;$('#btnOk').style.opacity=hasTeams?1:.4;
    // Halbe Punktzahl bei klassischen Fragen und Multiple Choice
    if((isQ||isMC)&&S.teams.length>1){
      const hb=document.createElement('button');hb.className='chip';hb.style.setProperty('--c','#ffd23f');
      hb.textContent=`½ Halbe Punktzahl (${half}) für …`;
      hb.onclick=()=>pick.classList.toggle('show');
      other.appendChild(hb);
      const l=document.createElement('span');l.textContent='Welche Gruppe bekommt '+half+' Punkte?';pick.appendChild(l);
      S.teams.forEach((t,i)=>{if(i===S.turn)return;const b=document.createElement('button');b.className='chip';b.style.setProperty('--c',t.color);b.textContent=`${t.name} +${half}`;b.onclick=()=>award([{teamId:t.id,delta:half}],true);pick.appendChild(b);});
    }
  }
  const back=document.createElement('button');back.className='chip ghost';back.textContent='Zurück, Feld bleibt offen';back.onclick=closeQ;other.appendChild(back);

  $('#qOverlay').classList.add('show');
  pushState();
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
  setTimeout(()=>{if(!cur)return;$('#qExtra').classList.remove('suspense');$('#btnShowAnswer').disabled=false;revealMC(cur.picked===it.correct);},1300);
}
function revealMC(pickedRight){
  if(!cur||cur.stage==='revealed')return;cur.stage='revealed';
  const it=S.categories[cur.ci].items[cur.ri];
  $('#btnShowAnswer').style.display='none';
  $('#qTurn').innerHTML=$('#qTurn').innerHTML.replace(' · Antwort antippen zum Einloggen','');
  [...$('#qExtra').children].forEach(b=>{const i=+b.dataset.i;b.disabled=true;b.classList.remove('locked');
    if(i===it.correct)b.classList.add('right');else if(b.classList.contains('picked'))b.classList.add('wrong');else b.classList.add('dim');});
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
    if(cur.type==='action')done=pos.length?{ok:true,title:'GEWONNEN!',sub:`${names} +${p}`}:{ok:false,title:'KEIN GEWINNER',sub:''};
    else{const t=S.teams[S.turn],neg=list.find(a=>a.delta<0);
      done=pos.length?{ok:true,title:'GESCHAFFT!',sub:`${names} +${p}`}:{ok:false,title:'LEIDER NICHT!',sub:t?(t.name+(neg?' '+neg.delta:'')):''};}
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
  if(cur.type==='action'||cur.type==='schaetz'){if(!cur.sel.size)return;award([...cur.sel].map(id=>({teamId:id,delta:p})));return;}
  const t=S.teams[S.turn];if(t)award([{teamId:t.id,delta:p}]);
};
$('#btnBad').onclick=()=>{
  if(!cur)return;const t=S.teams[S.turn];
  if(cur.type!=='action'&&cur.type!=='schaetz'&&S.settings.minus&&t)award([{teamId:t.id,delta:-S.points[cur.ri]}]);else award([]);
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
  if(endCtx==='own'){OR=null;saveRun();}endCtx='preis';endTeams=null;closeQ();showScreen('home');};
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
  $('#sMinus').checked=!!S.settings.minus;
  $('#sSound').checked=!!S.settings.sound;
  const pg=$('#sPoints');pg.innerHTML='';
  S.points.forEach((p,i)=>{const inp=document.createElement('input');inp.className='inp';inp.type='number';inp.inputMode='numeric';inp.value=p;
    inp.oninput=()=>{S.points[i]=Number(inp.value)||0;save();};pg.appendChild(inp);});
  renderTeams();renderCats();
}
$('#sTitle').oninput=e=>{S.title=e.target.value;save();};
$('#sMinus').onchange=e=>{S.settings.minus=e.target.checked;save();};
$('#sSound').onchange=e=>{S.settings.sound=e.target.checked;save();if(e.target.checked)sfx('win');};

function renderTeams(){
  const box=$('#sTeams');box.innerHTML='';
  if(!S.teams.length)box.innerHTML='<p class="hint" style="margin:0 0 12px">Noch keine Gruppen.</p>';
  S.teams.forEach((t,i)=>{
    const r=document.createElement('div');r.className='teamrow';
    r.innerHTML=`<input type="color" value="${t.color}"><input class="inp nm" placeholder="Name der Gruppe" maxlength="30"><input class="inp sc" type="number" inputmode="numeric" title="Punktestand"><button class="btn danger small" title="Gruppe löschen">✕</button>`;
    const [col,nm,sc,del]=r.children;
    nm.value=t.name;sc.value=t.score;
    col.oninput=()=>{t.color=col.value;save();};
    nm.oninput=()=>{t.name=nm.value;save();};
    sc.oninput=()=>{t.score=Number(sc.value)||0;save();};
    del.onclick=()=>ask(`Gruppe „${t.name}“ löschen?`,'Löschen',()=>{
      S.teams.splice(i,1);
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
    ask('Import übernehmen? Kategorien, Fragen und Gruppen werden ersetzt, die Punkte auf 0 gesetzt.','Importieren',()=>{
      S=normalize(Object.assign({},d,{used:{},history:[],turn:0}));S.teams.forEach(t=>t.score=0);save();selCat=0;renderSettings();st.textContent='Import erfolgreich.';});
  }catch(e){st.style.color='#ff8fa3';st.textContent='Das sieht nicht nach einem gültigen Export aus.';setTimeout(()=>st.style.color='',3000);}
}
$('#btnImport').onclick=()=>doImport($('#ioText').value.trim());
$('#fileImport').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#ioText').value=r.result;doImport(String(r.result));};r.readAsText(f);e.target.value='';};

/* ---------- Tastatur ---------- */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!VIEW&&(screenName==='tpl'||screenName==='set'||screenName==='help')&&!$('#dialog').classList.contains('show')){showScreen('gmenu');return;}
  if(e.key==='Escape'&&!VIEW&&screenName==='game'){showScreen('coll');return;}
  if(e.key==='Escape'&&!VIEW&&screenName==='coll'){showScreen('home');return;}
  if(e.key==='Escape'&&!VIEW&&screenName==='timer'&&!$('#dialog').classList.contains('show')){$('#btnTimerBack').click();return;}
  if(e.key==='Escape'&&!VIEW){if($('#clDialog').classList.contains('show'))$('#clDialog').classList.remove('show');else if($('#dialog').classList.contains('show'))$('#dialog').classList.remove('show');else if($('#qOverlay').classList.contains('show'))closeQ();else if($('#endScreen').classList.contains('show'))$('#btnEndMenu').click();}
});
addEventListener('resize',()=>{const cv=$('#confetti');cv.width=innerWidth;cv.height=innerHeight;});

/* ---------- Changelog ---------- */
function showChangelog(onlyNew,since){
  const last=onlyNew?since:null;
  const list=onlyNew&&last?CHANGELOG.filter(e=>cmpVer(e.v,last)>0):CHANGELOG;
  $('#clTitle').textContent=onlyNew?'Neu in Version '+APP_VERSION:'Changelog';
  $('#clBody').innerHTML=list.map(e=>`<h3>Version ${esc(e.v)}</h3><ul>${e.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`).join('');
  $('#clDialog').classList.add('show');
}
$('#clClose').onclick=$('#clX').onclick=()=>$('#clDialog').classList.remove('show');
$('#clDialog').onclick=e=>{if(e.target.id==='clDialog')$('#clDialog').classList.remove('show');};
$('#btnChangelog').onclick=()=>showChangelog(false);
function cmpVer(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)-(y[i]||0);}return 0;}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
(function whatsNew(){
  if(VIEW)return;
  const seen=lsGet('grosserPreis_seenVersion');
  if(seen&&cmpVer(APP_VERSION,seen)>0)setTimeout(()=>showChangelog(true,seen),600);
  lsSet('grosserPreis_seenVersion',APP_VERSION);
})();

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
  const q={ci:cur.ci,ri:cur.ri,type:cur.type,stage:cur.stage||'',answerShown:!!cur.answerShown,sel:[...(cur.sel||[])],picked:cur.picked==null?null:cur.picked,guesses:{}};
  if(cur.type==='schaetz')document.querySelectorAll('#qExtra .estrow').forEach(r=>{q.guesses[r.dataset.id]=r.querySelector('input').value;});
  return q;
}
function pushState(){
  if(VIEW)return;
  clearTimeout(pushT);
  pushT=setTimeout(()=>send({t:'state',S:S,screen:screenName,q:qState(),end:endShown,endSub:$('#endSub').textContent,tm:TM,own:screenName==='ownplay'?OR:null}),30);
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

/* ---------- Menüs ---------- */
const PREIS_SCREENS=['gmenu','tpl','set','help','settings','board'];
function showScreen(n){
  screenName=n;
  if(!VIEW)document.title=PREIS_SCREENS.includes(n)?(S.title||'Der große Preis'):'Manna';
  $('#home').classList.toggle('show',n==='home');
  $('#gmenu').classList.toggle('show',n==='gmenu');
  $('#tplScreen').classList.toggle('show',n==='tpl');
  $('#setScreen').classList.toggle('show',n==='set');
  $('#helpScreen').classList.toggle('show',n==='help');
  $('#collScreen').classList.toggle('show',n==='coll');
  $('#gameScreen').classList.toggle('show',n==='game');
  $('#geScreen').classList.toggle('show',n==='gedit');
  if(n==='gedit')renderGameEditor();
  $('#timerScreen').classList.toggle('show',n==='timer');
  $('#ownScreen').classList.toggle('show',n==='own');
  $('#ownEdit').classList.toggle('show',n==='ownedit');
  $('#ownPlay').classList.toggle('show',n==='ownplay');
  if(n==='own')renderOwnList();
  if(n==='ownedit')renderOwnEditor();
  if(n==='timer')renderTimerScreen();
  if(n==='coll')renderColl();
  if(n==='help')ransom($('#helpTitle'),'Erklärung');
  if(n==='gmenu')renderGMenu();
  if(n==='tpl')renderTpl();
  if(n==='set')renderSet();
  document.querySelectorAll('.screen.show').forEach(x=>x.scrollTop=0);
  pushState();
}
function hasContent(){return S.categories.some(c=>c.items.some(it=>(it.text||'').trim()));}
function confirmReplace(fn){
  if(hasContent())ask('Dein aktuelles Spielbrett wird ersetzt. Tipp: Wenn du es behalten willst, vorher in den Einstellungen exportieren.','Ersetzen',fn);else fn();
}
function startGame(){showScreen('board');applyMode();renderBoard();
}
function keepTeams(){return S.teams.map(t=>Object.assign({},t,{score:0}));}
function applyTemplate(tp){
  const teams=keepTeams(),settings=S.settings;
  S=sample();S.title=tp.title||tp.name;S.categories=tp.categories();
  if(Array.isArray(tp.points)&&tp.points.length)S.points=tp.points.slice();
  S.teams=teams.length?teams:S.teams;S.settings=settings;
  S=normalize(S);save();
}
/* ---------- Eigene Vorlagen ---------- */
const TPL_KEY='grosserPreis_templates',HID_KEY='grosserPreis_hiddenTpl';
function jget(k,def){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?def:v;}catch(e){return def;}}
function ownTpl(){const a=jget(TPL_KEY,[]);return Array.isArray(a)?a.filter(t=>t&&Array.isArray(t.cats)):[];}
function hiddenTpl(){const a=jget(HID_KEY,[]);return Array.isArray(a)?a:[];}
function allTemplates(){
  const hid=hiddenTpl();
  return TEMPLATES.filter(t=>!hid.includes(t.id)).map(t=>Object.assign({},t,{builtin:true}))
    .concat(ownTpl().map(t=>Object.assign({},t,{own:true,categories:()=>JSON.parse(JSON.stringify(t.cats))})));
}
function boardToTpl(name){
  return {id:'own-'+uid(),name,title:S.title||name,points:S.points.slice(),
    desc:S.categories.map(c=>c.name).filter(Boolean).join(', '),
    cats:JSON.parse(JSON.stringify(S.categories))};
}
function saveAsTemplate(){
  ask('Unter welchem Namen soll das aktuelle Spielbrett als Vorlage gespeichert werden?','Speichern',name=>{
    const a=ownTpl();a.push(boardToTpl(name));lsSet(TPL_KEY,JSON.stringify(a));renderTpl();markUnsaved();
    setTimeout(()=>ask(`Vorlage „${name}“ ist gespeichert. Willst du sie gleich auch als Datei sichern? Dann geht sie nicht verloren, falls der Browser-Speicher gelöscht wird.`,'Als Datei sichern',()=>backupNow()),250);
  },{input:true,value:S.title||'',placeholder:'z. B. Weihnachtsquiz 2026'});
}
function deleteTemplate(tp){
  if(tp.own)markUnsaved();
  if(tp.own)lsSet(TPL_KEY,JSON.stringify(ownTpl().filter(t=>t.id!==tp.id)));
  else{const h=hiddenTpl();if(!h.includes(tp.id))h.push(tp.id);lsSet(HID_KEY,JSON.stringify(h));}
}
/* ---------- Sicherung ---------- */
const UNSAVED_KEY='grosserPreis_unsaved',BACKUP_KEY='grosserPreis_lastBackup',SNOOZE_KEY='grosserPreis_backupLater';
function markUnsaved(){lsSet(UNSAVED_KEY,String(Date.now()));try{sessionStorage.removeItem(SNOOZE_KEY);}catch(e){}}
function needsBackup(){return !!lsGet(UNSAVED_KEY);}
function backupSnoozed(){try{return sessionStorage.getItem(SNOOZE_KEY)==='1';}catch(e){return false;}}
function lastBackupText(){const t=Number(lsGet(BACKUP_KEY));if(!t)return 'Noch keine Sicherung erstellt.';
  const d=new Date(t);return 'Letzte Sicherung: '+d.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})+'.';}
function dateStamp(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function backupNow(){
  const games=ownGames();
  ownImagesFor(games).then(bilder=>backupWrite(games,bilder));
}
function backupWrite(games,bilder){
  const txt=JSON.stringify({app:'grosser-preis',typ:'sicherung',version:APP_VERSION,exportiert:new Date().toISOString(),
    spielbrett:{title:S.title,points:S.points,categories:S.categories,teams:S.teams.map(t=>({name:t.name,color:t.color})),settings:S.settings},
    vorlagen:ownTpl().map(({id,...t})=>t),eigeneSpiele:games.map(({id,...g})=>g),bilder,sammlung:userGames()},null,1);
  const ok=downloadFile(`manna-sicherung-${dateStamp()}.json`,txt);
  if(!ok){try{navigator.clipboard.writeText(txt);toast('Download nicht möglich – Sicherung in die Zwischenablage kopiert.');}catch(e){toast('Sicherung nicht möglich.');return;}}
  else toast('Sicherung gespeichert. Auf dem iPad findest du sie in der Dateien-App unter Downloads.');
  lsSet(BACKUP_KEY,String(Date.now()));try{localStorage.removeItem(UNSAVED_KEY);}catch(e){}
  if(screenName==='gmenu')renderGMenu();
  if(screenName==='set')renderSet();
  if(screenName==='own')renderOwnList();
}
function downloadFile(name,text){
  try{const u=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);return true;}catch(e){return false;}
}
function exportTemplates(){
  const a=ownTpl();
  if(!a.length){toast('Du hast noch keine eigenen Vorlagen. Speichere zuerst ein Spielbrett als Vorlage.');return;}
  const txt=JSON.stringify({app:'grosser-preis',typ:'vorlagen',version:APP_VERSION,exportiert:new Date().toISOString(),vorlagen:a.map(({id,...t})=>t)},null,1);
  const d=new Date(),stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(downloadFile(`manna-vorlagen-${stamp}.json`,txt))toast(`${a.length} Vorlage${a.length>1?'n':''} exportiert.`);
  else{try{navigator.clipboard.writeText(txt);toast('Download nicht möglich – Vorlagen in die Zwischenablage kopiert.');}catch(e){toast('Export nicht möglich.');}}
}
function importTemplates(txt){
  let d;try{d=JSON.parse(txt);}catch(e){toast('Die Datei ist keine gültige Vorlagen-Datei.');return;}
  let arr=[];
  if(d&&d.typ==='sicherung'){
    arr=Array.isArray(d.vorlagen)?d.vorlagen.slice():[];
    const sb=d.spielbrett;
    if(sb&&Array.isArray(sb.categories))arr.push({name:'Gesichertes Spielbrett: '+(sb.title||'Der große Preis'),title:sb.title,points:sb.points,cats:sb.categories});
  }
  else if(d&&Array.isArray(d.vorlagen))arr=d.vorlagen;
  else if(Array.isArray(d))arr=d;
  else if(d&&Array.isArray(d.categories))arr=[{name:d.title||'Importiertes Spielbrett',title:d.title,points:d.points,cats:d.categories}];
  else if(d&&Array.isArray(d.cats))arr=[d];
  arr=arr.filter(t=>t&&Array.isArray(t.cats||t.categories));
  const nOwn=d&&d.typ==='sicherung'&&Array.isArray(d.eigeneSpiele)?importOwnData({spiele:d.eigeneSpiele,bilder:d.bilder}):0;
  if(d&&d.typ==='sicherung'&&Array.isArray(d.sammlung))importUserGames(d.sammlung);
  if(!arr.length){toast(nOwn?`${nOwn} eigene${nOwn>1?' Spiele':'s Spiel'} eingespielt.`:'In der Datei wurden keine Vorlagen gefunden.');return;}
  const own=ownTpl();
  arr.forEach(t=>{const cats=t.cats||t.categories;
    const n=normalize({title:t.title||t.name,points:t.points,categories:cats,teams:[]});
    own.push({id:'own-'+uid(),name:String(t.name||t.title||'Importierte Vorlage'),title:n.title,points:n.points,
      desc:String(t.desc||n.categories.map(c=>c.name).join(', ')),cats:n.categories});});
  lsSet(TPL_KEY,JSON.stringify(own));renderTpl();
  toast(`${arr.length} Vorlage${arr.length>1?'n':''} importiert.`+(d&&d.typ==='sicherung'?' Du findest sie unter „Vorlagen“.':'')+(nOwn?` Dazu ${nOwn} eigene${nOwn>1?' Spiele':'s Spiel'}.`:''));
}
$('#tplFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>importTemplates(String(r.result));r.readAsText(f);e.target.value='';};
function menuBtn(list,title,fn,cls){
  const b=document.createElement('button');b.className='mbtn'+(cls?' '+cls:'');
  const t=document.createElement('b');t.textContent=title;b.appendChild(t);b.onclick=fn;list.appendChild(b);return b;
}
function backupNote(rerender){
  if(!needsBackup()||backupSnoozed())return null;
  const n=document.createElement('div');n.className='backup-note';n.setAttribute('role','status');
  n.innerHTML='<p>Du hast Änderungen, die noch nicht als Datei gesichert sind. Wenn der Browser-Speicher gelöscht wird, wären sie weg.</p>';
  const row=document.createElement('div');row.className='backup-actions';
  const go=document.createElement('button');go.className='primary';go.textContent='Jetzt sichern';go.onclick=()=>backupNow();
  const later=document.createElement('button');later.className='btn';later.textContent='Später';later.onclick=()=>{try{sessionStorage.setItem(SNOOZE_KEY,'1');}catch(e){}rerender();};
  row.append(go,later);n.appendChild(row);return n;
}
function renderGMenu(){
  ransom($('#gmTitle'),S.title||'Der große Preis');
  const played=Object.keys(S.used).length,anyScore=S.teams.some(t=>t.score);
  const running=played>0||anyScore;
  const list=$('#gmList');list.innerHTML='';
  const note=backupNote(renderGMenu);if(note)list.appendChild(note);
  if(running)menuBtn(list,'Weiterspielen',startGame,'primary-m');
  menuBtn(list,'Neues Spiel mit aktuellem Spielbrett',()=>{
    if(running)ask('Neues Spiel starten? Alle Punkte gehen auf 0 und alle Felder werden wieder geöffnet. Fragen & Gruppen bleiben.','Neues Spiel',()=>{resetRound();startGame();});
    else{resetRound();startGame();}
  },running?'':'primary-m');
  menuBtn(list,'Neues Spiel mit leerem Spielbrett',()=>confirmReplace(()=>{
    const teams=keepTeams(),settings=S.settings;S=emptyGame();S.teams=teams.length?teams:S.teams;S.settings=settings;save();selCat=0;openSettings();}));
  menuBtn(list,'Vorlagen',()=>showScreen('tpl'),'sub');
  menuBtn(list,'Erklärung',()=>showScreen('help'),'sub');
  if(running)menuBtn(list,'Spiel beenden',()=>finishGame());
  menuBtn(list,'Einstellungen',()=>showScreen('set'),'sub');
}
function renderTpl(){
  ransom($('#tplTitle'),'Vorlagen');
  const list=$('#tplList');list.innerHTML='';
  const tps=allTemplates();
  if(!tps.length){const e=document.createElement('p');e.className='mhint';e.textContent='Keine Vorlagen vorhanden.';list.appendChild(e);}
  tps.forEach(tp=>{
    const row=document.createElement('div');row.className='trow';
    const b=document.createElement('button');b.className='mbtn';
    b.innerHTML=`<b>${esc(tp.name)}${tp.own?'<span class="own">eigene</span>':''}</b>`;
    b.onclick=()=>confirmReplace(()=>{applyTemplate(tp);startGame();toast('Vorlage „'+tp.name+'“ geladen.');});
    const d=document.createElement('button');d.className='tdel';d.title='Vorlage löschen';d.setAttribute('aria-label','Vorlage „'+tp.name+'“ löschen');d.innerHTML='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
    d.onclick=()=>ask(`Vorlage „${tp.name}“ löschen?`+(tp.own?' Sie ist dann weg (außer du hast sie exportiert).':' Du kannst Standard-Vorlagen später wiederherstellen.'),'Löschen',()=>{deleteTemplate(tp);renderTpl();toast('Vorlage gelöscht.');});
    row.append(b,d);list.appendChild(row);
  });
  const tools=document.createElement('div');tools.className='ttools';
  const tb=(txt,fn)=>{const x=document.createElement('button');x.className='btn';x.textContent=txt;x.onclick=fn;tools.appendChild(x);};
  tb('Aktuelles Brett als Vorlage speichern',saveAsTemplate);
  tb('Eigene Vorlagen exportieren',exportTemplates);
  tb('Vorlagen importieren',()=>$('#tplFile').click());
  if(hiddenTpl().length)tb('Standard-Vorlagen wiederherstellen',()=>{lsSet(HID_KEY,'[]');renderTpl();toast('Standard-Vorlagen sind wieder da.');});
  list.appendChild(tools);
  const tip=document.createElement('p');tip.className='mhint';
  tip.textContent='Tipp: Speichere ein fertiges Spielbrett als Vorlage und exportiere es. Die Datei kannst du anderen schicken, die sie über „Vorlagen importieren“ bei sich einspielen.';
  list.appendChild(tip);
}
function renderSet(){
  ransom($('#setTitle'),'Einstellungen');
  $('#backupInfo').textContent=lastBackupText();
  const hint=$('#dualHint');
  if(standalone){hint.classList.add('warn');hint.textContent='Achtung: Als Home-Bildschirm-App öffnet sich das zweite Fenster in Safari und ist dann nicht verbunden. Für die Zuschaueransicht die Seite direkt im Browser öffnen.';}
  updViewerStatus();
}
$('#btnTplBack').onclick=()=>showScreen('gmenu');
$('#btnSetBack').onclick=()=>showScreen('gmenu');
$('#btnHelpBack').onclick=()=>showScreen('gmenu');
$('#btnEditBoard').onclick=()=>openSettings();
$('#btnBackup').onclick=()=>backupNow();
$('#btnRestore').onclick=()=>$('#tplFile').click();
$('#gcColl').onclick=()=>showScreen('coll');
$('#gcPreis').onclick=()=>showScreen('gmenu');
$('#btnGmBack').onclick=()=>showScreen('home');
$('#btnGuide').onclick=()=>{try{$('#info').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}catch(e){$('#info').scrollIntoView();}};
function finishGame(){
  if(!S.teams.length){toast('Es gibt noch keine Gruppen.');return;}
  const total=S.categories.length*S.points.length,left=total-Object.keys(S.used).length;
  ask(left>0?`Spiel jetzt beenden? ${left} ${left===1?'Feld ist':'Felder sind'} noch offen. Danach kommt die Siegerehrung.`:'Spiel beenden und Siegerehrung zeigen?','Spiel beenden',()=>{
    closeQ();if(screenName!=='board'){showScreen('board');applyMode();renderBoard();}showEnd();});
}
$('#btnFinish').onclick=()=>finishGame();
$('#btnHome').onclick=()=>{closeQ();showScreen('gmenu');};

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
  if(m.tm){Object.assign(TM,m.tm);tmRender();}
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
    b.classList.toggle('wrong',rev&&i!==it.correct&&q.picked===i);
    b.classList.toggle('dim',rev&&i!==it.correct&&q.picked!==i);});
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

/* ================= SPIELESAMMLUNG ================= */
const FILTER_KEY='grosserPreis_filter';
const FILTER_DEFS=[
  {key:'alter',label:'Alter',opts:()=>AGE_GROUPS.map(a=>({id:a.id,label:a.label}))},
  {key:'groesse',label:'Personen',opts:()=>SIZE_GROUPS.map(g=>({id:g.id,label:g.label}))},
  {key:'ort',label:'Ort',opts:()=>[{id:'drinnen',label:'Drinnen'},{id:'draussen',label:'Draußen'}]},
  {key:'material',label:'Material',opts:()=>[{id:'ohne',label:'Ohne Material'},{id:'mit',label:'Mit Material'}]}
];
let filter=(()=>{const f=jget(FILTER_KEY,null);const e={alter:[],groesse:[],ort:[],material:[]};
  if(f&&typeof f==='object')Object.keys(e).forEach(k=>{if(Array.isArray(f[k]))e[k]=f[k];});return e;})();
function saveFilter(){lsSet(FILTER_KEY,JSON.stringify(filter));}
function gameMatches(g,f){
  if(f.alter.length&&!f.alter.some(a=>g.alter.includes(a)))return false;
  if(f.groesse.length&&!f.groesse.some(id=>{const s=SIZE_GROUPS.find(x=>x.id===id);return s&&g.spieler.min<=s.max&&g.spieler.max>=s.min;}))return false;
  if(f.ort.length&&!f.ort.some(o=>g.ort.includes(o)))return false;
  if(f.material.length){const has=g.material.length>0;if(!f.material.some(m=>(m==='mit')===has))return false;}
  return true;
}
const personText=g=>g.spieler.max>=9999?`ab ${g.spieler.min} Personen`:`${g.spieler.min}–${g.spieler.max} Personen`;
const ortText=g=>g.ort.length===2?'drinnen und draußen':(g.ort[0]==='drinnen'?'drinnen':'draußen');
const matText=g=>g.material.length?'mit Material':'ohne Material';
function renderColl(){
  ransom($('#collTitle'),'Spielesammlung');
  const box=$('#filters');box.innerHTML='';
  FILTER_DEFS.forEach(def=>{
    const grp=document.createElement('div');grp.className='fgroup';
    const lab=document.createElement('span');lab.className='flabel';lab.textContent=def.label;grp.appendChild(lab);
    const wrap=document.createElement('div');wrap.className='fchips';
    def.opts().forEach(o=>{
      const b=document.createElement('button');b.className='fchip';b.textContent=o.label;
      const on=filter[def.key].includes(o.id);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
      b.onclick=()=>{const a=filter[def.key];const i=a.indexOf(o.id);if(i>=0)a.splice(i,1);else a.push(o.id);saveFilter();renderColl();};
      wrap.appendChild(b);
    });
    grp.appendChild(wrap);box.appendChild(grp);
  });
  const list=$('#gameList');list.innerHTML='';
  const hits=allGames().filter(g=>gameMatches(g,filter)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  const active=Object.values(filter).some(a=>a.length);
  $('#collCount').textContent=hits.length===1?'1 Spiel':hits.length+' Spiele';
  $('#btnFilterReset').style.visibility=active?'visible':'hidden';
  if(!hits.length){
    const li=document.createElement('li');li.className='games-empty';
    li.textContent='Kein Spiel passt zu diesen Filtern. Nimm einen Filter heraus, um mehr Spiele zu sehen.';
    list.appendChild(li);return;
  }
  hits.forEach(g=>{
    const li=document.createElement('li');
    const b=document.createElement('button');b.className='game-row';
    b.innerHTML=`<span class="gname">${esc(g.name)}${g.own?'<span class="own">eigenes</span>':''}</span><span class="gshort">${esc(g.kurz)}</span>
      <span class="gtags"><span>${esc(personText(g))}</span><span>${esc(ortText(g))}</span><span>${esc(matText(g))}</span>${g.dauer?`<span>${esc(g.dauer)}</span>`:''}</span>`;
    b.onclick=()=>openGame(g.id);
    li.appendChild(b);list.appendChild(li);
  });
}
function rolesHtml(r){
  let h='';
  if(r.liste&&r.liste.length)h+='<dl class="roles">'+r.liste.map(x=>`<dt>${esc(x.name)}</dt><dd>${esc(x.text)}</dd>`).join('')+'</dl>';
  if(r.tabelle)h+='<table class="role-table"><thead><tr>'+r.tabelle.kopf.map(k=>`<th scope="col">${esc(k)}</th>`).join('')+'</tr></thead><tbody>'+
    r.tabelle.zeilen.map(z=>'<tr>'+z.map((c,i)=>i?`<td>${esc(c)}</td>`:`<th scope="row">${esc(c)}</th>`).join('')+'</tr>').join('')+'</tbody></table>';
  if(r.hinweis)h+=`<p>${esc(r.hinweis)}</p>`;
  return h;
}
function openGame(id){
  const g=allGames().find(x=>x.id===id);if(!g)return;
  const ages=g.alter.map(a=>(AGE_GROUPS.find(x=>x.id===a)||{}).label).filter(Boolean).join(', ');
  const sec=(title,html)=>html?`<section class="note"><h3>${title}</h3>${html}</section>`:'';
  $('#gameSheet').innerHTML=`
    <h1 class="menu-title" id="gameTitle"></h1>
    <p class="game-lead">${esc(g.kurz)}</p>
    <ul class="game-facts">
      <li><b>Personen</b>${esc(personText(g))}</li>
      <li><b>Alter</b>${esc(ages)}</li>
      <li><b>Ort</b>${esc(ortText(g))}</li>
      <li><b>Dauer</b>${esc(g.dauer||'keine Angabe')}</li>
    </ul>
    <div class="game-notes">
      ${sec('Material',g.material.length?'<ul>'+g.material.map(m=>`<li>${esc(m)}</li>`).join('')+'</ul>':'<p>Kein Material nötig.</p>')}
      ${g.rollen?sec('Rollen',rolesHtml(g.rollen)):''}
      ${sec('So geht’s','<ol>'+g.ablauf.map(s=>`<li>${esc(s)}</li>`).join('')+'</ol>')}
      ${g.varianten&&g.varianten.length?sec('Varianten','<ul>'+g.varianten.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>'):''}
      ${g.risiken&&g.risiken.length?`<section class="note risk"><h3>Gefahren und Risiken</h3><ul>${g.risiken.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`:''}
      ${g.hinweis?`<section class="note tip"><h3>Tipp</h3><p>${esc(g.hinweis)}</p></section>`:''}
    </div>`+(g.own?ugActionsHtml(g):'');
  if(g.own)ugBindActions(g);
  ransom($('#gameTitle'),g.name);
  showScreen('game');
}
$('#btnFilterReset').onclick=()=>{Object.keys(filter).forEach(k=>filter[k]=[]);saveFilter();renderColl();};
$('#btnCollBack').onclick=()=>showScreen('home');
$('#btnGameBack').onclick=()=>showScreen('coll');

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
$('#gcTimer').onclick=()=>showScreen('timer');
$('#btnTimerBack').onclick=()=>{if(TM.phase==='running'||TM.phase==='paused'){ask('Der Countdown läuft noch. Trotzdem zurück? Der Countdown wird dabei beendet.','Zurück',()=>{tmReset();showScreen('home');});}else{tmReset();showScreen('home');}};
if(!VIEW)tmRender();

/* ================= EIGENES SPIEL ================= */
const OWN_KEY='grosserPreis_own',OWN_RUN_KEY='grosserPreis_ownRun';
const clampInt=(v,min,max,def)=>{v=Math.round(Number(v));return isNaN(v)?def:Math.min(max,Math.max(min,v));};
const ptsText=n=>n===1?'1 Punkt':n+' Punkte';
const fileSlug=s=>String(s||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'spiel';
function newRound(){return {title:'',text:'',img:'',extra:[]};}
function defaultOwnTeams(){const src=S.teams.length>=2?S.teams:sample().teams;return src.map((t,i)=>({name:t.name,color:t.color||COLORS[i%COLORS.length]}));}
function normOwn(g){
  g=g&&typeof g==='object'?g:{};
  const sc=g.scoring||{},img=v=>typeof v==='string'&&/^img-[a-z0-9]+$/.test(v)?v:'';
  const teams=(Array.isArray(g.teams)&&g.teams.length>=2?g.teams:defaultOwnTeams()).slice(0,8);
  return {
    id:typeof g.id==='string'&&g.id?g.id:'og-'+uid(),
    name:String(g.name||'Eigenes Spiel').slice(0,60),
    teams:teams.map((t,i)=>({name:String((t&&t.name)||('Gruppe '+String.fromCharCode(65+i))).slice(0,30),color:t&&/^#[0-9a-f]{6}$/i.test(t.color)?t.color:COLORS[i%COLORS.length]})),
    scoring:{mode:sc.mode==='steigend'?'steigend':'gleich',wertung:sc.wertung==='plaetze'?'plaetze':'sieger',base:clampInt(sc.base,1,999,1),
      places:(Array.isArray(sc.places)&&sc.places.length>=2?sc.places:[3,2,1]).slice(0,8).map(n=>clampInt(n,0,999,1))},
    rounds:(Array.isArray(g.rounds)&&g.rounds.length?g.rounds:[1,2,3,4,5].map(newRound)).slice(0,40).map(r=>({
      title:String((r&&r.title)||'').slice(0,80),text:String((r&&r.text)||'').slice(0,2000),img:img(r&&r.img),
      extra:(r&&Array.isArray(r.extra)?r.extra:[]).slice(0,20).map(x=>({text:String((x&&x.text)||'').slice(0,2000),img:img(x&&x.img)}))}))
  };
}
function ownGames(){const a=jget(OWN_KEY,[]);return Array.isArray(a)?a.map(normOwn):[];}
function storeOwnGames(a){try{localStorage.setItem(OWN_KEY,JSON.stringify(a));return true;}catch(e){toast('Speichern nicht möglich – der Speicher des Browsers ist voll.');return false;}}
function ownImgRefs(g){const r=[];((g&&g.rounds)||[]).forEach(x=>{if(x.img)r.push(x.img);(x.extra||[]).forEach(e=>{if(e.img)r.push(e.img);});});return r;}
// Punkte je Platz in Runde ri (Index 0 = Platz 1)
function roundPts(g,ri){
  const s=g.scoring;
  if(s.wertung==='sieger')return [s.mode==='steigend'?ri+1:s.base];
  const m=s.mode==='steigend'?ri+1:1;
  return s.places.slice(0,Math.max(2,g.teams.length)).map(p=>p*m);
}
function ptsLine(g,ri){const p=roundPts(g,ri);return g.scoring.wertung==='sieger'?`Der Sieger bekommt ${ptsText(p[0])}`:p.map((x,i)=>`Platz ${i+1}: ${ptsText(x)}`).join(', ');}
function ptsShort(g,ri){const p=roundPts(g,ri);return g.scoring.wertung==='sieger'?ptsText(p[0])+' für den Sieger':p.join(', ')+' Punkte für Platz 1 bis '+p.length;}
function roundTitle(g,ri){return ((g.rounds[ri]||{}).title||'').trim()||('Runde '+(ri+1));}
function roundSlides(r){
  const s=[{k:'title'}];
  if((r.text||'').trim()||r.img)s.push({k:'text',text:r.text||'',img:r.img||''});
  (r.extra||[]).forEach(x=>{if((x.text||'').trim()||x.img)s.push({k:'extra',text:x.text||'',img:x.img||''});});
  return s;
}

/* ---------- Bilder (IndexedDB, damit der normale Speicher nicht vollläuft) ---------- */
const IMG={};let idbP=null;
function idb(){
  if(!idbP)idbP=new Promise((res,rej)=>{try{const r=indexedDB.open('grosserPreis',1);r.onupgradeneeded=()=>r.result.createObjectStore('bilder');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});
  return idbP;
}
function idbDo(mode,fn){return idb().then(db=>new Promise((res,rej)=>{const tx=db.transaction('bilder',mode),rq=fn(tx.objectStore('bilder'));tx.oncomplete=()=>res(rq?rq.result:undefined);tx.onerror=()=>rej(tx.error);}));}
function imgPut(id,data){IMG[id]=data;return idbDo('readwrite',st=>st.put(data,id)).catch(()=>{});}
function imgGet(id){if(IMG[id])return Promise.resolve(IMG[id]);return idbDo('readonly',st=>st.get(id)).then(v=>{if(v)IMG[id]=v;return v||'';}).catch(()=>'');}
function imgDel(id){delete IMG[id];return idbDo('readwrite',st=>st.delete(id)).catch(()=>{});}
function fillImgs(root){root.querySelectorAll('img[data-img]').forEach(el=>imgGet(el.dataset.img).then(src=>{if(src)el.src=src;else el.closest('figure')&&el.closest('figure').classList.add('missing');}));}
function ownImagesFor(games){
  const ids=[...new Set(games.flatMap(ownImgRefs))];
  return Promise.all(ids.map(id=>imgGet(id).then(d=>[id,d]))).then(p=>{const o={};p.forEach(([id,d])=>{if(d)o[id]=d;});return o;});
}
// Nicht mehr benutzte Bilder aufräumen
function gcImages(){
  if(VIEW)return;
  const keep=new Set();ownGames().forEach(g=>ownImgRefs(g).forEach(i=>keep.add(i)));
  if(OE)ownImgRefs(OE.g).forEach(i=>keep.add(i));
  if(OR)ownImgRefs(OR.game).forEach(i=>keep.add(i));
  idbDo('readonly',st=>st.getAllKeys()).then(ks=>(ks||[]).forEach(k=>{if(!keep.has(k))imgDel(k);})).catch(()=>{});
}
// Bild verkleinern (max. 1600 px), als JPEG speichern
function readImage(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{const im=new Image();
      im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));
        const x=c.getContext('2d');x.fillStyle='#ece6da';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
        res(c.toDataURL('image/jpeg',.82));};
      im.onerror=()=>rej(new Error('bild'));im.src=fr.result;};
    fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file);
  });
}

/* ---------- Export & Import ---------- */
function exportOwn(games){
  ownImagesFor(games).then(bilder=>{
    const txt=JSON.stringify({app:'grosser-preis',typ:'eigenes-spiel',version:APP_VERSION,exportiert:new Date().toISOString(),spiele:games.map(({id,...g})=>g),bilder});
    const name=games.length===1?'manna-spiel-'+fileSlug(games[0].name):'manna-spiele';
    if(downloadFile(`${name}-${dateStamp()}.json`,txt))toast('Spiel exportiert. Die Datei kannst du sichern oder anderen schicken.');
    else toast('Export nicht möglich.');
  });
}
function importOwnData(d){
  const arr=Array.isArray(d.spiele)?d.spiele:(d.spiel?[d.spiel]:[]);
  const bilder=d.bilder&&typeof d.bilder==='object'?d.bilder:{};
  const list=ownGames();let n=0;
  arr.forEach(raw=>{
    if(!raw||typeof raw!=='object')return;
    const g=normOwn(Object.assign({},raw,{id:''}));
    const remap=o=>{const src=bilder[o.img];if(typeof src==='string'&&src.startsWith('data:image/')){const nid='img-'+uid()+uid();imgPut(nid,src);o.img=nid;}else o.img='';};
    g.rounds.forEach(r=>{if(r.img)remap(r);r.extra.forEach(x=>{if(x.img)remap(x);});});
    list.push(g);n++;
  });
  if(n){storeOwnGames(list);markUnsaved();}
  return n;
}
$('#ownFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{let d;try{d=JSON.parse(String(r.result));}catch(x){toast('Die Datei ist kein gültiges Spiel.');return;}
    const n=d&&d.typ==='sicherung'?importOwnData({spiele:d.eigeneSpiele||[],bilder:d.bilder}):importOwnData(d||{});
    toast(n?`${n} Spiel${n>1?'e':''} importiert.`:'In der Datei wurde kein eigenes Spiel gefunden.');renderOwnList();};
  r.readAsText(f);e.target.value='';};

/* ---------- Übersicht ---------- */
function renderOwnList(){
  ransom($('#ownTitle'),'Eigenes Spiel');
  const list=$('#ownList');list.innerHTML='';
  const note=backupNote(renderOwnList);if(note)list.appendChild(note);
  if(OR)menuBtn(list,'Weiterspielen: '+OR.game.name,()=>{showScreen('ownplay');applyMode();opRender();},'primary-m');
  menuBtn(list,'Neues eigenes Spiel',()=>openOwnEditor(null),OR?'':'primary-m');
  ownGames().forEach(g=>{
    const row=document.createElement('div');row.className='trow';
    const b=document.createElement('button');b.className='mbtn';b.innerHTML=`<b>${esc(g.name)}</b>`;b.onclick=()=>openOwnEditor(g);
    const d=document.createElement('button');d.className='tdel';d.title='Spiel löschen';d.setAttribute('aria-label','Spiel „'+g.name+'“ löschen');
    d.innerHTML='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
    d.onclick=()=>ask(`Spiel „${g.name}“ löschen? Es ist dann weg (außer du hast es exportiert).`,'Löschen',()=>{
      storeOwnGames(ownGames().filter(x=>x.id!==g.id));markUnsaved();gcImages();renderOwnList();toast('Spiel gelöscht.');});
    row.append(b,d);list.appendChild(row);
  });
  const tools=document.createElement('div');tools.className='ttools';
  const x=document.createElement('button');x.className='btn';x.textContent='Spiel importieren';x.onclick=()=>$('#ownFile').click();tools.appendChild(x);
  list.appendChild(tools);
  const tip=document.createElement('p');tip.className='mhint';
  tip.textContent='Tipp: Exportiere ein fertiges Spiel als Datei. So hast du eine Sicherung und kannst es anderen schicken.';
  list.appendChild(tip);
}
$('#gcOwn').onclick=()=>showScreen('own');
$('#btnOwnBack').onclick=()=>showScreen('home');

/* ---------- Einrichten ---------- */
let OE=null,oeImgTarget=null;
const oeDirty=()=>!!OE&&JSON.stringify(OE.g)!==OE.sig;
function openOwnEditor(g){
  const isNew=!g;
  g=isNew?normOwn({name:'Mein Spiel',teams:defaultOwnTeams()}):normOwn(JSON.parse(JSON.stringify(g)));
  OE={g,isNew,sig:isNew?'':JSON.stringify(g)};
  showScreen('ownedit');
}
function oeEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function oeSec(parent,title){const s=oeEl('section','oe-sec');s.appendChild(oeEl('h2',null,title));parent.appendChild(s);return s;}
function oeInput(val,ph,max,onIn,multi){
  const i=multi?oeEl('textarea','oe-inp oe-ta'):oeEl('input','oe-inp');
  i.value=val;i.placeholder=ph||'';i.maxLength=max;i.oninput=()=>onIn(i.value);return i;
}
function oeLabeled(parent,label,ctrl){const l=oeEl('label','oe-l');l.appendChild(oeEl('span',null,label));l.appendChild(ctrl);parent.appendChild(l);return l;}
function oeChips(parent,label,opts,val,onPick){
  const w=oeEl('div','oe-field');w.appendChild(oeEl('span','oe-flabel',label));
  const c=oeEl('div','fchips');c.setAttribute('role','group');c.setAttribute('aria-label',label);
  opts.forEach(([v,t])=>{const b=oeEl('button','fchip'+(v===val?' on':''),t);b.setAttribute('aria-pressed',v===val);b.onclick=()=>onPick(v);c.appendChild(b);});
  w.appendChild(c);parent.appendChild(w);return w;
}
function oeStepper(parent,label,val,min,max,onSet){
  const w=oeEl('div','oe-step');w.appendChild(oeEl('span','oe-flabel',label));
  const minus=oeEl('button','btn','−'),num=oeEl('span','oe-num',String(val)),plus=oeEl('button','btn','+');
  minus.setAttribute('aria-label',label+': weniger');plus.setAttribute('aria-label',label+': mehr');
  const upd=()=>{minus.disabled=val<=min;plus.disabled=val>=max;num.textContent=val;};
  minus.onclick=()=>{if(val>min){val--;upd();onSet(val);}};plus.onclick=()=>{if(val<max){val++;upd();onSet(val);}};
  upd();w.append(minus,num,plus);parent.appendChild(w);return w;
}
function oeImgCtl(parent,obj){
  const w=oeEl('div','oe-img');
  if(obj.img){
    const f=oeEl('figure');const im=document.createElement('img');im.dataset.img=obj.img;im.alt='Bild auf dieser Folie';f.appendChild(im);w.appendChild(f);
    const ch=oeEl('button','btn small','Anderes Bild');ch.onclick=()=>{oeImgTarget=obj;$('#oeImgFile').click();};
    const rm=oeEl('button','btn small','Bild entfernen');rm.onclick=()=>{obj.img='';renderOwnEditor();};
    w.append(ch,rm);
  }else{const add=oeEl('button','btn small','Bild hinzufügen');add.onclick=()=>{oeImgTarget=obj;$('#oeImgFile').click();};w.appendChild(add);}
  parent.appendChild(w);
}
function oeExample(g){
  if(g.scoring.mode==='gleich')return 'So wird gewertet: In jeder Runde gibt es '+ptsShort(g,0)+'.';
  const n=g.rounds.length,idx=[...new Set([0,1,n-1])].filter(i=>i<n).sort((a,b)=>a-b);
  return 'So wird gewertet: '+idx.map(i=>`Runde ${i+1}: ${ptsShort(g,i)}`).join('. ')+'.';
}
function renderOwnEditor(){
  if(!OE)return;
  const g=OE.g,b=$('#oeBody'),scr=$('#ownEdit'),y=scr.scrollTop;
  ransom($('#oeTitle'),OE.isNew?'Neues eigenes Spiel':'Spiel einrichten');
  b.innerHTML='';
  // Name
  const s1=oeSec(b,'Name des Spiels');
  oeLabeled(s1,'So heißt das Spiel auf dem Beamer',oeInput(g.name,'z. B. Freizeit-Olympiade',60,v=>{g.name=v;}));
  // Gruppen
  const s2=oeSec(b,'Gruppen');
  g.teams.forEach((t,i)=>{
    const r=oeEl('div','oe-team');
    const col=oeEl('button','oe-col');col.style.background=t.color;col.title='Farbe wechseln';col.setAttribute('aria-label','Farbe von '+t.name+' wechseln');
    col.onclick=()=>{t.color=COLORS[(COLORS.indexOf(t.color)+1)%COLORS.length];col.style.background=t.color;};
    const nm=oeInput(t.name,'Name der Gruppe',30,v=>{t.name=v;});nm.setAttribute('aria-label','Name der Gruppe '+(i+1));
    const del=oeEl('button','tdel oe-del','✕');del.title='Gruppe entfernen';del.setAttribute('aria-label','Gruppe '+t.name+' entfernen');del.disabled=g.teams.length<=2;
    del.onclick=()=>{g.teams.splice(i,1);if(g.scoring.places.length>Math.max(2,g.teams.length))g.scoring.places.length=Math.max(2,g.teams.length);renderOwnEditor();};
    r.append(col,nm,del);s2.appendChild(r);
  });
  if(g.teams.length<8){const add=oeEl('button','btn oe-add','+ Gruppe');add.onclick=()=>{const used=g.teams.map(t=>t.color);
    g.teams.push({name:'Gruppe '+String.fromCharCode(65+g.teams.length),color:COLORS.find(c=>!used.includes(c))||COLORS[g.teams.length%COLORS.length]});renderOwnEditor();};s2.appendChild(add);}
  // Punkte
  const s3=oeSec(b,'Punkte'),sc=g.scoring;
  const ex=oeEl('p','oe-ex');
  const updEx=()=>{ex.textContent=oeExample(g);b.querySelectorAll('.oe-rpts').forEach(e=>{e.textContent=ptsShort(g,+e.dataset.ri);});};
  oeChips(s3,'Punkte pro Runde',[['gleich','Gleich viele jede Runde'],['steigend','Jede Runde einen mehr']],sc.mode,v=>{sc.mode=v;renderOwnEditor();});
  oeChips(s3,'Wer bekommt Punkte',[['sieger','Nur der Rundensieger'],['plaetze','Mehrere Plätze']],sc.wertung,v=>{sc.wertung=v;renderOwnEditor();});
  if(sc.wertung==='sieger'&&sc.mode==='gleich')oeStepper(s3,'Punkte für den Sieger',sc.base,1,999,v=>{sc.base=v;updEx();});
  if(sc.wertung==='plaetze'){
    const maxP=Math.max(2,Math.min(8,g.teams.length));
    if(sc.places.length>maxP)sc.places.length=maxP;
    sc.places.forEach((p,i)=>oeStepper(s3,`Platz ${i+1}`+(sc.mode==='steigend'?' (Grundwert)':''),p,0,999,v=>{sc.places[i]=v;updEx();}));
    const pr=oeEl('div','oe-row');
    if(sc.places.length<maxP){const a=oeEl('button','btn small','+ Platz');a.onclick=()=>{sc.places.push(Math.max(0,(sc.places[sc.places.length-1]||1)-1));renderOwnEditor();};pr.appendChild(a);}
    if(sc.places.length>2){const r=oeEl('button','btn small','− Platz');r.onclick=()=>{sc.places.pop();renderOwnEditor();};pr.appendChild(r);}
    if(pr.children.length)s3.appendChild(pr);
    if(sc.mode==='steigend')s3.appendChild(oeEl('p','oe-hint','Der Grundwert wird mit der Rundennummer malgenommen.'));
  }
  s3.appendChild(ex);updEx();
  // Runden
  const s4=oeSec(b,'Runden');
  oeStepper(s4,'Anzahl Runden',g.rounds.length,1,40,v=>{
    if(v>g.rounds.length){g.rounds.push(newRound());renderOwnEditor();return;}
    const last=g.rounds[g.rounds.length-1],filled=last.title.trim()||last.text.trim()||last.img||last.extra.length;
    if(filled){renderOwnEditor();ask(`Runde ${g.rounds.length} hat schon Inhalt. Trotzdem entfernen?`,'Entfernen',()=>{g.rounds.pop();renderOwnEditor();});}
    else{g.rounds.pop();renderOwnEditor();}
  });
  s4.appendChild(oeEl('p','oe-hint','Jede Runde beginnt mit einer Titelfolie. Danach kommt die Erklärung, und du kannst weitere Folien anhängen, zum Beispiel für Regeln oder ein Foto vom Aufbau.'));
  g.rounds.forEach((r,ri)=>{
    const c=oeEl('div','oe-round');
    const h=oeEl('div','oe-rhead');h.appendChild(oeEl('b',null,'Runde '+(ri+1)));const rp=oeEl('span','oe-rpts');rp.dataset.ri=ri;h.appendChild(rp);c.appendChild(h);
    oeLabeled(c,'Spieltitel',oeInput(r.title,'z. B. Teebeutel-Weitwurf',80,v=>{r.title=v;}));
    oeLabeled(c,'Erklärung',oeInput(r.text,'So geht das Spiel …',2000,v=>{r.text=v;},true));
    oeImgCtl(c,r);
    r.extra.forEach((x,xi)=>{
      const sl=oeEl('div','oe-slide');const sh=oeEl('div','oe-rhead');sh.appendChild(oeEl('b',null,'Weitere Folie '+(xi+1)));
      const rm=oeEl('button','btn small','Folie entfernen');rm.onclick=()=>{r.extra.splice(xi,1);renderOwnEditor();};sh.appendChild(rm);sl.appendChild(sh);
      const ta=oeInput(x.text,'Text auf der Folie',2000,v=>{x.text=v;},true);ta.setAttribute('aria-label','Text der weiteren Folie '+(xi+1));sl.appendChild(ta);
      oeImgCtl(sl,x);c.appendChild(sl);
    });
    if(r.extra.length<20){const a=oeEl('button','btn small oe-add','+ Weitere Folie');a.onclick=()=>{r.extra.push({text:'',img:''});renderOwnEditor();};c.appendChild(a);}
    s4.appendChild(c);
  });
  updEx();fillImgs(b);
  scr.scrollTop=y;
}
$('#oeImgFile').onchange=e=>{
  const f=e.target.files[0],target=oeImgTarget;e.target.value='';if(!f||!target)return;
  if(!/^image\//.test(f.type)){toast('Bitte eine Bilddatei auswählen.');return;}
  readImage(f).then(data=>{const id='img-'+uid()+uid();return imgPut(id,data).then(()=>{target.img=id;renderOwnEditor();});})
    .catch(()=>toast('Das Bild konnte nicht gelesen werden.'));
};
function oeSave(quiet){
  if(!OE)return false;
  const g=OE.g;g.name=g.name.trim()||'Eigenes Spiel';
  g.teams.forEach((t,i)=>{t.name=t.name.trim()||('Gruppe '+String.fromCharCode(65+i));});
  const list=ownGames(),i=list.findIndex(x=>x.id===g.id);
  if(i>=0)list[i]=JSON.parse(JSON.stringify(g));else list.push(JSON.parse(JSON.stringify(g)));
  if(!storeOwnGames(list))return false;
  OE.sig=JSON.stringify(g);OE.isNew=false;markUnsaved();gcImages();
  if(!quiet){toast('Spiel gespeichert.');renderOwnEditor();}
  return true;
}
$('#btnOeSave').onclick=()=>oeSave(false);
$('#btnOeExport').onclick=()=>{if(OE)exportOwn([normOwn(JSON.parse(JSON.stringify(OE.g)))]);};
$('#btnOeStart').onclick=()=>{
  if(!OE||!oeSave(true))return;
  const g=JSON.parse(JSON.stringify(OE.g));
  const go=()=>{OE=null;startOwn(g);};
  if(OR)ask(`Es läuft noch „${OR.game.name}“. Neues Spiel starten? Der alte Punktestand geht verloren.`,'Neues Spiel',go);else go();
};
$('#btnOeBack').onclick=()=>{
  const leave=()=>{OE=null;gcImages();showScreen('own');};
  if(oeDirty())ask('Deine Änderungen sind noch nicht gespeichert. Trotzdem zurück?','Verwerfen',leave);else leave();
};

/* ---------- Spielen ---------- */
let OR=VIEW?null:(()=>{const r=jget(OWN_RUN_KEY,null);if(!r||!r.game||!Array.isArray(r.teams))return null;
  r.game=normOwn(r.game);r.round=clampInt(r.round,0,r.game.rounds.length-1,0);r.slide=Number(r.slide)||0;
  r.phase=['play','award','done'].includes(r.phase)?r.phase:'play';r.history=Array.isArray(r.history)?r.history:[];r.sel=Array.isArray(r.sel)?r.sel:[];return r;})();
let opStageKey='',opEndT=null;
function saveRun(){if(VIEW)return;try{if(OR)localStorage.setItem(OWN_RUN_KEY,JSON.stringify(OR));else localStorage.removeItem(OWN_RUN_KEY);}catch(e){}}
function startOwn(g){
  OR={game:normOwn(g),teams:g.teams.map(t=>({id:'ot'+uid(),name:t.name,color:t.color,score:0})),round:0,slide:0,phase:'play',history:[],sel:[]};
  opStageKey='';saveRun();showScreen('ownplay');applyMode();opRender();
}
function opScores(){
  const box=$('#opScores');box.innerHTML='';
  const max=Math.max(...OR.teams.map(t=>t.score));
  OR.teams.forEach(t=>{
    const d=document.createElement('div');d.className='team'+(max>0&&t.score===max?' leader':'');d.dataset.id=t.id;d.style.setProperty('--c',t.color);
    d.innerHTML=`<span class="name">${esc(t.name)}</span><span class="pts bungee">${t.score}</span>`+(VIEW?'':
      `<span class="adj"><button data-d="-1" title="Einen Punkt abziehen" aria-label="${esc(t.name)}: einen Punkt abziehen">−</button><button data-d="1" title="Einen Punkt dazu" aria-label="${esc(t.name)}: einen Punkt dazu">+</button></span>`);
    d.querySelectorAll('.adj button').forEach(b=>b.onclick=()=>{const dl=+b.dataset.d;t.score+=dl;saveRun();opRender();floatScore(t.id,dl);setTimeout(()=>send({t:'fx',k:'float',id:t.id,delta:dl}),80);});
    box.appendChild(d);
  });
}
// Großer Titel: Schriftgröße so wählen, dass das längste Wort in eine Zeile passt
function opBig(el,text){ransom(el,text);const L=Math.max(4,...String(text).split(' ').map(w=>w.length));el.style.fontSize=`min(11vh,${(100/L).toFixed(2)}vw)`;}
function opStage(g,ri,sl,done){
  const st=$('#opStage');
  if(done){st.innerHTML='<div class="os os-title"><span class="os-round">Alle Runden gespielt</span><h2 class="os-big"></h2></div>';opBig(st.querySelector('.os-big'),'Gleich kommt die Siegerehrung');return;}
  const title=roundTitle(g,ri);
  if(sl.k==='title'){
    st.innerHTML=`<div class="os os-title"><span class="os-round">Runde ${ri+1} von ${g.rounds.length}</span><h2 class="os-big"></h2><p class="os-pts">${esc(ptsLine(g,ri))}</p></div>`;
    opBig(st.querySelector('.os-big'),title);return;
  }
  const t=sl.text.trim(),cls=['os','os-sheet'];
  if(t&&sl.img)cls.push('two');if(!t)cls.push('imgonly');if(t.length>320)cls.push('long');
  st.innerHTML=`<div class="${cls.join(' ')}"><div class="os-head"><span class="os-label">${sl.k==='text'?'So geht’s':'Runde '+(ri+1)}</span><h3>${esc(title)}</h3></div>`+
    `<div class="os-body">${t?`<div class="os-text">${esc(sl.text)}</div>`:''}${sl.img?`<figure class="os-img"><img data-img="${esc(sl.img)}" alt=""></figure>`:''}</div></div>`;
  fillImgs(st);
}
function opAwardRender(g,ri){
  const el=$('#opAward'),show=OR.phase==='award';el.classList.toggle('show',show);
  if(!show){el.innerHTML='';return;}
  const pts=roundPts(g,ri),sieger=g.scoring.wertung==='sieger',sel=OR.sel;
  let h=`<div class="op-card" role="dialog" aria-label="Wertung"><h3>Wertung: ${esc(roundTitle(g,ri))}</h3>`;
  if(sieger)h+=`<p>Wer hat gewonnen? Die Gewinner bekommen ${ptsText(pts[0])}. Bei Gleichstand mehrere Gruppen antippen.</p><div class="fchips">`+
    OR.teams.map(t=>`<button class="fchip${sel.includes(t.id)?' on':''}" data-t="${t.id}" style="--c:${t.color}">${esc(t.name)}</button>`).join('')+'</div>';
  else h+='<p>Tippe für jeden Platz eine Gruppe an.</p>'+pts.map((p,pi)=>`<div class="op-place"><b>Platz ${pi+1}<span>${ptsText(p)}</span></b><div class="fchips">`+
    OR.teams.map(t=>`<button class="fchip${sel[pi]===t.id?' on':''}" data-p="${pi}" data-t="${t.id}" style="--c:${t.color}">${esc(t.name)}</button>`).join('')+'</div></div>').join('');
  h+='<div class="op-acts"><button class="btn" id="opCancel">Zurück zur Folie</button><button class="btn" id="opNone">Keine Punkte</button><button class="primary" id="opGive">Punkte vergeben</button></div></div>';
  el.innerHTML=h;
  el.querySelectorAll('.fchip').forEach(b=>b.onclick=()=>{
    const id=b.dataset.t;
    if(sieger){const i=sel.indexOf(id);if(i>=0)sel.splice(i,1);else sel.push(id);}
    else{const pi=+b.dataset.p;if(sel[pi]===id)sel[pi]=null;else{for(let j=0;j<pts.length;j++)if(sel[j]===id)sel[j]=null;sel[pi]=id;}}
    saveRun();opAwardRender(g,ri);
  });
  $('#opGive').disabled=!(sieger?sel.length:sel.some(Boolean));
  $('#opGive').onclick=()=>opAward(false);
  $('#opNone').onclick=()=>opAward(true);
  $('#opCancel').onclick=()=>{OR.phase='play';saveRun();opRender();};
}
function opAward(none){
  const g=OR.game,ri=OR.round,pts=roundPts(g,ri),list=[];
  if(!none){
    if(g.scoring.wertung==='sieger')OR.sel.forEach(id=>list.push({id,delta:pts[0]}));
    else OR.sel.forEach((id,pi)=>{if(id&&pts[pi])list.push({id,delta:pts[pi]});});
  }
  list.forEach(a=>{const t=OR.teams.find(x=>x.id===a.id);if(t)t.score+=a.delta;});
  OR.history.push({round:ri,slide:OR.slide,awards:list,sel:OR.sel.slice()});
  const name=id=>(OR.teams.find(t=>t.id===id)||{}).name||'';
  const done=list.length?{ok:true,title:g.scoring.wertung==='sieger'?list.map(a=>name(a.id)).join(' & '):name(list[0].id),
    sub:g.scoring.wertung==='sieger'?'+'+ptsText(pts[0]):list.map(a=>name(a.id)+' +'+a.delta).join(', ')}:{ok:false,title:'Keine Punkte',sub:''};
  const last=ri>=g.rounds.length-1;
  if(last)OR.phase='done';else{OR.round++;OR.slide=0;OR.phase='play';}
  OR.sel=[];saveRun();opRender();
  sfx(list.length?'win':'lose');
  send({t:'fx',k:'done',o:done});playDone(done);
  list.forEach(a=>floatScore(a.id,a.delta));
  setTimeout(()=>list.forEach(a=>send({t:'fx',k:'float',id:a.id,delta:a.delta})),120);
  clearTimeout(opEndT);
  if(last)opEndT=setTimeout(()=>{if(OR&&OR.phase==='done'&&screenName==='ownplay'&&!endShown)showOwnEnd('Alle Runden gespielt');},2900);
}
function showOwnEnd(sub){clearTimeout(opEndT);if(!OR)return;showEnd({teams:OR.teams,sub,ctx:'own'});}
function opRender(){
  if(!OR)return;
  const g=OR.game,ri=Math.min(OR.round,g.rounds.length-1),slides=roundSlides(g.rounds[ri]),si=Math.min(OR.slide,slides.length-1),done=OR.phase==='done';
  const nm=$('#opName');if(nm.dataset.t!==g.name){ransom(nm,g.name);nm.dataset.t=g.name;}
  opScores();
  const key=done?'done':[ri,si,JSON.stringify(slides[si]),roundTitle(g,ri),ptsLine(g,ri)].join('|');
  if(key!==opStageKey){opStageKey=key;opStage(g,ri,slides[si],done);}
  if(!VIEW){
    $('#opPos').textContent=done?'Alle Runden gespielt':`Runde ${ri+1} von ${g.rounds.length}, Folie ${si+1} von ${slides.length}`;
    $('#btnOpPrev').disabled=done||si===0||OR.phase==='award';
    const nx=$('#btnOpNext');
    nx.textContent=done?'Siegerehrung':(si<slides.length-1&&OR.phase!=='award')?'Weiter':'Runde werten';
    nx.disabled=OR.phase==='award';
    $('#btnOpUndo').disabled=!OR.history.length;
    opAwardRender(g,ri);
  }
  pushState();
}
function opNext(){
  if(!OR||endShown)return;
  if(OR.phase==='done'){showOwnEnd('Alle Runden gespielt');return;}
  if(OR.phase!=='play')return;
  const n=roundSlides(OR.game.rounds[OR.round]).length;
  if(OR.slide<n-1)OR.slide++;else{OR.phase='award';OR.sel=[];}
  saveRun();opRender();
}
function opPrev(){if(!OR||OR.phase!=='play'||OR.slide<=0)return;OR.slide--;saveRun();opRender();}
$('#btnOpNext').onclick=opNext;
$('#btnOpPrev').onclick=opPrev;
$('#btnOpUndo').onclick=()=>{
  const h=OR&&OR.history[OR.history.length-1];if(!h)return;
  const name=id=>(OR.teams.find(t=>t.id===id)||{}).name||'';
  const what=h.awards.length?h.awards.map(a=>`+${a.delta} für ${name(a.id)}`).join(', '):'keine Punkte';
  ask(`Wertung von Runde ${h.round+1} rückgängig machen? (${what})`,'Rückgängig',()=>{
    OR.history.pop();h.awards.forEach(a=>{const t=OR.teams.find(x=>x.id===a.id);if(t)t.score-=a.delta;});
    OR.round=h.round;OR.slide=h.slide;OR.phase='award';OR.sel=Array.isArray(h.sel)?h.sel.slice():[];
    clearTimeout(opEndT);saveRun();opRender();toast('Rückgängig gemacht – du kannst die Runde neu werten.');
  });
};
$('#btnOpFinish').onclick=()=>{if(!OR)return;
  ask(OR.phase==='done'?'Siegerehrung zeigen?':'Spiel jetzt beenden? Danach kommt die Siegerehrung.',OR.phase==='done'?'Siegerehrung':'Spiel beenden',
    ()=>showOwnEnd(OR.phase==='done'?'Alle Runden gespielt':'Spiel beendet'));};
$('#btnOpHome').onclick=()=>showScreen('own');
$('#btnOpViewer').onclick=openViewer;
$('#btnOpFull').onclick=toggleFull;
document.addEventListener('keydown',e=>{
  if(VIEW||screenName!=='ownplay'||endShown||$('#dialog').classList.contains('show')||$('#doneFx').classList.contains('show'))return;
  if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target&&e.target.tagName)||'')&&e.key===' ')return;
  if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();opNext();}
  else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();opPrev();}
  else if(e.key==='Escape'){if(OR&&OR.phase==='award'){OR.phase='play';saveRun();opRender();}}
});
if(!VIEW)setTimeout(gcImages,4000);

/* ================= SPIEL ERSTELLEN & EINSENDEN ================= */
const UG_KEY='grosserPreis_userGames';
const SUBMIT_ADDR='add.task.buq0vrdnwndfbifx@todoist.net';
const ORT_OPTS=[['drinnen','Drinnen'],['draussen','Draußen']];
function normUserGame(g){
  g=g&&typeof g==='object'?g:{};
  const arr=(a,max)=>(Array.isArray(a)?a:[]).map(x=>String(x||'').trim().slice(0,600)).filter(Boolean).slice(0,max);
  const min=clampInt(g.spieler&&g.spieler.min,1,999,2),max=clampInt(g.spieler&&g.spieler.max,min,9999,9999);
  const o={id:typeof g.id==='string'&&/^u-[a-z0-9]+$/.test(g.id)?g.id:'u-'+uid()+uid(),own:true,
    name:String(g.name||'').trim().slice(0,60),kurz:String(g.kurz||'').trim().slice(0,200),
    alter:(Array.isArray(g.alter)?g.alter:[]).filter(a=>AGE_GROUPS.some(x=>x.id===a)),
    spieler:{min,max},ort:(Array.isArray(g.ort)?g.ort:[]).filter(a=>a==='drinnen'||a==='draussen'),
    material:arr(g.material,30),dauer:String(g.dauer||'').trim().slice(0,40),ablauf:arr(g.ablauf,40),
    varianten:arr(g.varianten,20),risiken:arr(g.risiken,20),hinweis:String(g.hinweis||'').trim().slice(0,600),
    sentAt:Number(g.sentAt)||0};
  const rl=(g.rollen&&Array.isArray(g.rollen.liste)?g.rollen.liste:[]).map(r=>({name:String((r&&r.name)||'').trim().slice(0,60),text:String((r&&r.text)||'').trim().slice(0,400)})).filter(r=>r.name).slice(0,20);
  if(rl.length)o.rollen={liste:rl};
  return o;
}
function userGames(){const a=jget(UG_KEY,[]);return Array.isArray(a)?a.map(normUserGame).filter(g=>g.name):[];}
function storeUserGames(a){try{localStorage.setItem(UG_KEY,JSON.stringify(a));return true;}catch(e){toast('Speichern nicht möglich – der Speicher des Browsers ist voll.');return false;}}
function allGames(){return GAMES.concat(userGames());}
function importUserGames(arr){
  const list=userGames();let n=0;
  arr.forEach(x=>{const g=normUserGame(x);if(!g.name)return;const i=list.findIndex(y=>y.id===g.id);if(i>=0)list[i]=g;else list.push(g);n++;});
  if(n)storeUserGames(list);return n;
}

/* ---------- Text zum Einsenden ---------- */
function ugSubmitText(g){
  const L=[];
  L.push('MANNA-SPIEL v1');
  L.push('Name: '+g.name);
  L.push('Kurzbeschreibung: '+g.kurz);
  L.push('Alter: '+g.alter.map(a=>(AGE_GROUPS.find(x=>x.id===a)||{}).label).join(', '));
  L.push('Personen: '+(g.spieler.max>=9999?'ab '+g.spieler.min:g.spieler.min+' bis '+g.spieler.max));
  L.push('Ort: '+g.ort.map(o=>o==='drinnen'?'drinnen':'draußen').join(', '));
  L.push('Dauer: '+(g.dauer||'-'));
  const list=(title,a,num)=>{L.push('');L.push(title+':');if(!a.length)L.push('- keins');a.forEach((x,i)=>L.push((num?(i+1)+'. ':'- ')+x));};
  list('Material',g.material);
  list('Ablauf',g.ablauf,true);
  if(g.rollen)list('Rollen',g.rollen.liste.map(r=>r.name+': '+r.text));
  if(g.varianten.length)list('Varianten',g.varianten);
  list('Gefahren und Risiken',g.risiken);
  if(g.hinweis){L.push('');L.push('Tipp: '+g.hinweis);}
  L.push('');L.push('Eingesendet mit Manna '+APP_VERSION);
  return L.join('\n');
}
function ugActionsHtml(g){
  const sent=g.sentAt?`<p class="ug-sent">Zuletzt eingesendet am ${new Date(g.sentAt).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}.</p>`:'';
  return `<section class="note ug-box"><h3>Dein eigenes Spiel</h3>
    <p>Dieses Spiel liegt nur auf diesem Gerät. Schick es ein, dann wird es geprüft und kommt für alle in die Spielesammlung.</p>${sent}
    <div class="ug-acts"><button class="primary" id="ugSend">Spiel einsenden</button><button class="btn" id="ugEdit">Bearbeiten</button><button class="btn" id="ugDel">Löschen</button></div>
    <div class="ug-send" id="ugSendBox" hidden>
      <p>Es öffnet sich eine fertige E-Mail. Du musst sie nur noch abschicken. Klappt das nicht, kopiere den Text und schick ihn an <b>${esc(SUBMIT_ADDR)}</b>.</p>
      <textarea class="oe-inp oe-ta" id="ugText" readonly aria-label="Text zum Einsenden"></textarea>
      <div class="ug-acts"><a class="primary" id="ugMail">E-Mail öffnen</a><button class="btn" id="ugCopy">Text kopieren</button></div>
    </div></section>`;
}
function ugMarkSent(id){const a=userGames(),g=a.find(x=>x.id===id);if(g){g.sentAt=Date.now();storeUserGames(a);}}
function ugBindActions(g){
  const txt=ugSubmitText(g);
  $('#ugText').value=txt;
  $('#ugMail').href='mailto:'+SUBMIT_ADDR+'?subject='+encodeURIComponent('Neues Spiel: '+g.name)+'&body='+encodeURIComponent(txt);
  $('#ugSend').onclick=()=>{const b=$('#ugSendBox');b.hidden=!b.hidden;if(!b.hidden)b.scrollIntoView({block:'nearest'});};
  $('#ugMail').onclick=()=>{ugMarkSent(g.id);setTimeout(()=>toast('Danke! Nach dem Abschicken wird dein Spiel geprüft.'),400);};
  $('#ugCopy').onclick=()=>{
    const done=()=>{ugMarkSent(g.id);toast('Text kopiert. Schick ihn per E-Mail an '+SUBMIT_ADDR+'.');};
    try{navigator.clipboard.writeText(txt).then(done,()=>{$('#ugText').select();document.execCommand('copy');done();});}catch(e){$('#ugText').select();try{document.execCommand('copy');done();}catch(x){toast('Kopieren nicht möglich. Markiere den Text und kopiere ihn von Hand.');}}
  };
  $('#ugEdit').onclick=()=>openGameEditor(g);
  $('#ugDel').onclick=()=>ask(`Spiel „${g.name}“ löschen? Es ist dann weg (außer du hast eine Sicherung).`,'Löschen',()=>{
    storeUserGames(userGames().filter(x=>x.id!==g.id));markUnsaved();showScreen('coll');toast('Spiel gelöscht.');});
}

/* ---------- Eingabemaske ---------- */
let GE=null;
const linesOf=t=>String(t||'').split('\n').map(s=>s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean);
function geDirty(){return !!GE&&JSON.stringify([GE.g,GE.raw])!==GE.sig;}
function openGameEditor(g){
  const isNew=!g;
  g=isNew?normUserGame({alter:['jugend'],ort:['drinnen'],spieler:{min:6,max:30}}):normUserGame(JSON.parse(JSON.stringify(g)));
  const raw={material:g.material.join('\n'),ablauf:g.ablauf.join('\n'),varianten:g.varianten.join('\n'),risiken:g.risiken.join('\n'),
    rollen:g.rollen?g.rollen.liste.map(r=>r.name+': '+r.text).join('\n'):'',max:g.spieler.max>=9999?'':String(g.spieler.max)};
  GE={g,raw,isNew,sig:''};GE.sig=isNew?'':JSON.stringify([GE.g,GE.raw]);
  showScreen('gedit');
}
function geMulti(parent,label,opts,arr){
  const w=oeEl('div','oe-field');w.appendChild(oeEl('span','oe-flabel',label));
  const c=oeEl('div','fchips');c.setAttribute('role','group');c.setAttribute('aria-label',label);
  opts.forEach(([v,t])=>{const b=oeEl('button','fchip'+(arr.includes(v)?' on':''),t);b.setAttribute('aria-pressed',arr.includes(v));
    b.onclick=()=>{const i=arr.indexOf(v);if(i>=0)arr.splice(i,1);else arr.push(v);b.classList.toggle('on',i<0);b.setAttribute('aria-pressed',i<0);};c.appendChild(b);});
  w.appendChild(c);parent.appendChild(w);return w;
}
function renderGameEditor(){
  if(!GE)return;
  const g=GE.g,r=GE.raw,b=$('#geBody');
  ransom($('#geTitle'),GE.isNew?'Spiel erstellen':'Spiel bearbeiten');
  b.innerHTML='';
  const s1=oeSec(b,'Das Spiel');
  oeLabeled(s1,'Name',oeInput(g.name,'z. B. Zeitungsschlagen',60,v=>{g.name=v;})).dataset.f='name';
  oeLabeled(s1,'Kurzbeschreibung (ein Satz)',oeInput(g.kurz,'Worum geht es?',200,v=>{g.kurz=v;})).dataset.f='kurz';
  const s2=oeSec(b,'Für wen und wo');
  geMulti(s2,'Alter',AGE_GROUPS.map(a=>[a.id,a.label]),g.alter).dataset.f='alter';
  const pr=oeEl('div','ge-people');pr.dataset.f='spieler';
  const mi=oeInput(String(g.spieler.min),'',3,v=>{g.spieler.min=clampInt(v,1,999,g.spieler.min);});mi.type='number';mi.min=1;mi.inputMode='numeric';
  const ma=oeInput(r.max,'egal',4,v=>{r.max=v;});ma.type='number';ma.min=1;ma.inputMode='numeric';
  oeLabeled(pr,'Personen mindestens',mi);oeLabeled(pr,'Personen höchstens (leer lassen, wenn egal)',ma);s2.appendChild(pr);
  geMulti(s2,'Ort',ORT_OPTS,g.ort).dataset.f='ort';
  oeLabeled(s2,'Dauer',oeInput(g.dauer,'z. B. ca. 15 Minuten',40,v=>{g.dauer=v;}));
  const s3=oeSec(b,'Ablauf');
  s3.appendChild(oeEl('p','oe-hint','Schreib jeden Schritt in eine eigene Zeile. Aufzählungszeichen und Nummern brauchst du nicht.'));
  oeLabeled(s3,'So geht’s',oeInput(r.ablauf,'Alle stellen sich im Kreis auf.\nEine Person beginnt …',4000,v=>{r.ablauf=v;},true)).dataset.f='ablauf';
  oeLabeled(s3,'Material (eins pro Zeile, leer lassen, wenn keins nötig ist)',oeInput(r.material,'z. B. eine Zeitung',3000,v=>{r.material=v;},true));
  oeLabeled(s3,'Rollen (optional, eine pro Zeile im Format „Name: Beschreibung“)',oeInput(r.rollen,'z. B. Mafia: wählt nachts ein Opfer',3000,v=>{r.rollen=v;},true));
  oeLabeled(s3,'Varianten (optional, eine pro Zeile)',oeInput(r.varianten,'',3000,v=>{r.varianten=v;},true));
  const s4=oeSec(b,'Sicherheit und Tipp');
  oeLabeled(s4,'Gefahren und Risiken (eins pro Zeile)',oeInput(r.risiken,'Worauf muss die Spielleitung achten?',3000,v=>{r.risiken=v;},true));
  oeLabeled(s4,'Tipp (optional)',oeInput(g.hinweis,'Was macht das Spiel besser?',600,v=>{g.hinweis=v;}));
  b.querySelectorAll('textarea').forEach(t=>t.rows=5);
}
function geBuild(){
  const g=GE.g,r=GE.raw;
  const out=normUserGame(Object.assign({},g,{
    spieler:{min:g.spieler.min,max:String(r.max).trim()?clampInt(r.max,g.spieler.min,9999,9999):9999},
    material:linesOf(r.material),ablauf:linesOf(r.ablauf),varianten:linesOf(r.varianten),risiken:linesOf(r.risiken),
    rollen:{liste:linesOf(r.rollen).map(l=>{const i=l.indexOf(':');return i>0?{name:l.slice(0,i),text:l.slice(i+1)}:{name:l,text:''};})}}));
  out.sentAt=0;return out;
}
function geCheck(g){
  const miss=[];
  if(!g.name)miss.push(['name','den Namen']);
  if(!g.kurz)miss.push(['kurz','die Kurzbeschreibung']);
  if(!g.alter.length)miss.push(['alter','mindestens eine Altersgruppe']);
  if(!g.ort.length)miss.push(['ort','drinnen oder draußen']);
  if(!g.ablauf.length)miss.push(['ablauf','den Ablauf']);
  return miss;
}
$('#btnGeSave').onclick=()=>{
  if(!GE)return;
  const g=geBuild(),miss=geCheck(g);
  if(miss.length){
    toast('Bitte noch ergänzen: '+miss.map(m=>m[1]).join(', ')+'.');
    const el=$(`#geBody [data-f="${miss[0][0]}"]`);if(el){el.scrollIntoView({block:'center'});const i=el.querySelector('input,textarea,button');if(i)i.focus();}
    return;
  }
  const list=userGames(),i=list.findIndex(x=>x.id===g.id);
  if(i>=0)list[i]=g;else list.push(g);
  if(!storeUserGames(list))return;
  markUnsaved();GE=null;openGame(g.id);
  toast('Spiel gespeichert. Unten kannst du es einsenden.');
};
$('#btnGeBack').onclick=()=>{
  const leave=()=>{GE=null;showScreen('coll');};
  if(geDirty())ask('Deine Eingaben sind noch nicht gespeichert. Trotzdem zurück?','Verwerfen',leave);else leave();
};
$('#btnGameNew').onclick=()=>openGameEditor(null);
