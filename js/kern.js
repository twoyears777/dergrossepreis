/* Manna – Grundlagen: Hilfsfunktionen, Papierbuchstaben, Spielstand von „Der große Preis“, Sound, Hinweise und Dialoge, Handy/Tablet-Erkennung
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* Speichernamen: Viele Schlüssel im Browser-Speicher beginnen noch mit „grosserPreis_“ (aus der Zeit vor Manna),
   ebenso Cache- und Dateinamen mit „grosser-preis“. Bitte NICHT umbenennen: Sonst wären bei allen Nutzern
   Spielbrett, Vorlagen, eigene Spiele, Filter und Einstellungen weg. */

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
  // längstes Wort merken: Überschriften werden auf schmalen Bildschirmen danach verkleinert (CSS --rlen)
  el.style.setProperty('--rlen',Math.max(4,...text.split(' ').map(w=>[...w].length)));
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
    settings:{sound:true},
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
/* Obergrenzen für alles, was aus dem Speicher oder aus Dateien kommt (Dateien können von anderen stammen) */
const LIM={teams:8,points:10,cats:50,team:30,cat:40,title:60,text:5000,answer:2000,option:500,unit:40};
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const cut=(v,n)=>String(v==null?'':v).slice(0,n);
function normalize(d){
  const s=sample();
  if(!isObj(d)) return s;
  const o={
    title:typeof d.title==='string'?cut(d.title,LIM.title):s.title,
    points:Array.isArray(d.points)&&d.points.length?d.points.slice(0,LIM.points).map(n=>{n=Math.round(Number(n));return Number.isFinite(n)?Math.min(99999,Math.max(-99999,n)):0;}):s.points,
    settings:Object.assign({},s.settings,isObj(d.settings)?d.settings:{}),
    teams:Array.isArray(d.teams)?d.teams.filter(isObj).slice(0,LIM.teams).map((t,i)=>({id:typeof t.id==='string'&&/^[\w-]{1,40}$/.test(t.id)?t.id:uid(),name:cut(t.name||('Gruppe '+(i+1)),LIM.team),color:(()=>{const c=t.color||COLORS[i%COLORS.length];const k=OLD_COLORS.indexOf(c);const f=k>=0?COLORS[k]:c;return /^#[0-9a-f]{6}$/i.test(f)?f:COLORS[i%COLORS.length];})(),score:Number(t.score)||0})):s.teams,
    categories:Array.isArray(d.categories)?d.categories.filter(isObj).slice(0,LIM.cats).map(c=>({name:cut(c.name,LIM.cat),items:Array.isArray(c.items)?c.items.map(it=>isObj(it)?it:{}).map(it=>({type:TYPES.includes(it.type)?it.type:'frage',text:cut(it.text,LIM.text),answer:cut(it.answer,LIM.answer),
      options:[0,1,2,3].map(i=>cut((Array.isArray(it.options)&&it.options[i])||'',LIM.option)),correct:Math.min(3,Math.max(0,Number(it.correct)||0)),unit:cut(it.unit,LIM.unit)})):[]})):s.categories,
    used:isObj(d.used)?d.used:{},
    history:Array.isArray(d.history)?d.history.filter(h=>isObj(h)&&typeof h.k==='string'):[],
    turn:Number(d.turn)||0
  };
  o.categories.forEach(c=>{c.items=c.items.slice(0,o.points.length);while(c.items.length<o.points.length)c.items.push(blank());});
  if(!(o.turn>=0&&o.turn<o.teams.length))o.turn=0;
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
/* Hinweis nur mit OK-Knopf */
function notice(msg){ask(msg,'OK',()=>{});$('#dNo').style.display='none';}

/* Beamer-Spiele gibt es vorerst nur am Laptop/PC. Handy und Tablet bekommen sie mit der App.
   iPads melden sich in Safari als Mac, deshalb zählt zusätzlich der Touchscreen. */
function isHandyOderTablet(){
  try{
    const ua=navigator.userAgent||'';
    if(navigator.userAgentData&&navigator.userAgentData.mobile)return true;
    if(/iPhone|iPad|iPod|Android|Mobile|Silk|Kindle/i.test(ua))return true;
    if(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)return true;
    return matchMedia('(pointer:coarse)').matches&&!matchMedia('(any-pointer:fine)').matches;
  }catch(e){return false;}
}
function nurAmPC(start){
  return ()=>{if(isHandyOderTablet()){notice('Diese Funktion ist aktuell nur auf einem Laptop oder PC verfügbar.');return;}start();};
}
function ask(msg,yesLabel,onYes,opt){
  $('#dMsg').textContent=msg;$('#dYes').textContent=yesLabel||'OK';$('#dialog').classList.add('show');
  const inp=$('#dInput'),withInput=!!(opt&&opt.input);
  inp.style.display=withInput?'':'none';
  if(withInput){inp.value=opt.value||'';inp.placeholder=opt.placeholder||'';setTimeout(()=>{inp.focus();inp.select();},50);}
  const yes=()=>{const v=inp.value.trim();if(withInput&&!v){inp.focus();return;}$('#dialog').classList.remove('show');onYes(v);};
  $('#dYes').onclick=yes;
  inp.onkeydown=e=>{if(e.key==='Enter')yes();};
  $('#dNo').style.display='';$('#dNo').onclick=()=>$('#dialog').classList.remove('show');
}
