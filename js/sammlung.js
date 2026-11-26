/* Manna – Spielesammlung: Laden, Filter, Favoriten, Detailseite
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* ================= SPIELESAMMLUNG ================= */
/* Die Spiele kommen aus spiele/alle.json (gebaut aus spiele/*.txt).
   Der Service Worker holt die Datei immer zuerst frisch und hat offline die letzte Fassung. */
let GAMES=[],gamesState='laden';
function validGame(g){
  return g&&typeof g.id==='string'&&typeof g.name==='string'&&g.name&&typeof g.kurz==='string'&&Array.isArray(g.alter)&&
    g.spieler&&Number.isFinite(g.spieler.min)&&Number.isFinite(g.spieler.max)&&Array.isArray(g.ort)&&Array.isArray(g.material)&&Array.isArray(g.ablauf);
}
/* Wird beim Start, bei jedem Öffnen der Spielesammlung und beim Zurückkehren in die App geladen,
   damit neue Spiele auch ohne App-Update erscheinen. Die bisherige Liste bleibt sichtbar, bis die neue da ist. */
let gamesLoading=null;
function loadGames(){
  if(gamesLoading)return gamesLoading;
  if(!GAMES.length)gamesState='laden';
  return gamesLoading=fetch('spiele/alle.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(d=>{
    GAMES=(d&&Array.isArray(d.spiele)?d.spiele:[]).filter(validGame).map(g=>Object.assign({risiken:[]},g));gamesState='ok';
  }).catch(()=>{if(!GAMES.length)gamesState='fehler';}).then(()=>{gamesLoading=null;showGameCount();if(screenName==='coll')renderColl();});
}
/* Zähler auf der Startseite: wie viele Spiele online sind. Zählt einmal hoch, sobald er ins Bild kommt.
   Ohne geladene Spiele bleibt er versteckt (lieber nichts als eine falsche 0). */
let countShown=0,countSeen=false;
function showGameCount(){
  const box=document.getElementById('gameCount'),num=document.getElementById('gameCountNum');
  if(!box||!num)return;
  const n=GAMES.length;
  box.classList.toggle('leer',!n);box.hidden=!n&&gamesState==='fehler';
  if(!n)return;
  if(!countSeen)return;
  if(n===countShown||matchMedia('(prefers-reduced-motion: reduce)').matches){num.textContent=n;countShown=n;return;}
  const from=countShown,t0=performance.now(),dur=Math.min(1400,500+Math.abs(n-from)*12);
  countShown=n;
  (function step(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);num.textContent=Math.round(from+(n-from)*e);if(k<1)requestAnimationFrame(step);})(t0);
}
if(!VIEW&&'IntersectionObserver' in window){
  const el=document.getElementById('gameCount');
  if(el)new IntersectionObserver((es,o)=>{if(es.some(x=>x.isIntersecting)){countSeen=true;o.disconnect();showGameCount();}},{threshold:.6}).observe(el);
}else countSeen=true;
document.addEventListener('visibilitychange',()=>{if(!VIEW&&document.visibilityState==='visible')loadGames();});
if(!VIEW)loadGames();
const FILTER_KEY='grosserPreis_filter';
const FAV_KEY='manna_favoriten';
let favs=(()=>{const a=jget(FAV_KEY,[]);return Array.isArray(a)?a.filter(x=>typeof x==='string'):[];})();
const isFav=id=>favs.includes(id);
function toggleFav(id){const i=favs.indexOf(id);if(i>=0)favs.splice(i,1);else favs.push(id);lsSet(FAV_KEY,JSON.stringify(favs));}
const FILTER_DEFS=[
  {key:'alter',label:'Alter',opts:()=>AGE_GROUPS.map(a=>({id:a.id,label:a.label}))},
  {key:'groesse',label:'Personen',opts:()=>SIZE_GROUPS.map(g=>({id:g.id,label:g.label}))},
  {key:'phase',label:'Gruppenphase',opts:()=>MannaSpiel.PHASEN.map(x=>({id:x.id,label:x.label.replace(/sphase$|phase$/,'')}))},
  {key:'ort',label:'Ort',opts:()=>[{id:'drinnen',label:'Drinnen'},{id:'draussen',label:'Draußen'}]},
  {key:'material',label:'Material',opts:()=>[{id:'ohne',label:'Ohne Material'},{id:'mit',label:'Mit Material'}]},
  {key:'erlebnis',label:'Erlebnispädagogik',opts:()=>[{id:'nur',label:'Nur Erlebnispädagogik'}]},
  {key:'fav',label:'Favoriten',opts:()=>[{id:'nur',label:'Nur Favoriten'}]}
];
let filter=(()=>{const f=jget(FILTER_KEY,null);const e={alter:[],groesse:[],ort:[],material:[],phase:[],erlebnis:[],fav:[]};
  if(f&&typeof f==='object')Object.keys(e).forEach(k=>{if(Array.isArray(f[k]))e[k]=f[k];});return e;})();
function saveFilter(){lsSet(FILTER_KEY,JSON.stringify(filter));}
function gameMatches(g,f){
  if(f.alter.length&&!f.alter.some(a=>g.alter.includes(a)))return false;
  if(f.groesse.length&&!f.groesse.some(id=>{const s=SIZE_GROUPS.find(x=>x.id===id);return s&&g.spieler.min<=s.max&&g.spieler.max>=s.min;}))return false;
  if(f.ort.length&&!f.ort.some(o=>g.ort.includes(o)))return false;
  if(f.material.length){const has=g.material.length>0;if(!f.material.some(m=>(m==='mit')===has))return false;}
  if(f.phase&&f.phase.length&&!f.phase.some(p=>(g.phasen||[]).includes(p)))return false;
  if(f.erlebnis&&f.erlebnis.length&&!g.erlebnis)return false;
  if(f.fav&&f.fav.length&&!isFav(g.id))return false;
  return true;
}
const personText=g=>g.spieler.max>=9999?`ab ${g.spieler.min} Personen`:`${g.spieler.min}–${g.spieler.max} Personen`;
const ortText=g=>g.ort.length===2?'drinnen und draußen':(g.ort[0]==='drinnen'?'drinnen':'draußen');
const matText=g=>g.material.length?'mit Material':'ohne Material';

/* ---------- Suche ----------
   Sucht in allen Texten eines Spiels. Verzeiht Groß-/Kleinschreibung, ä/ae, ß/ss, Bindestriche,
   getrennt geschriebene Wörter („Zeitung schlagen“ findet „Zeitungsschlagen“) und kleine Tippfehler.
   Alle Suchwörter müssen passen. Treffer im Namen zählen am meisten, dann Kurzbeschreibung, dann der Rest. */
/* ä, ae und a gelten als gleich (ebenso ö/oe/o, ü/ue/u), ß wie ss. Beide Seiten werden gleich behandelt. */
const normTxt=t=>String(t||'').toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u').replace(/[^a-z0-9]+/g,' ').trim();
const SUCH_FELDER=[
  {key:'name',label:'Name',w:100,get:g=>[g.name]},
  {key:'kurz',label:'Kurzbeschreibung',w:40,get:g=>[g.kurz]},
  {key:'material',label:'Material',w:12,get:g=>g.material},
  {key:'rollen',label:'Rollen',w:12,get:g=>g.rollen&&Array.isArray(g.rollen.liste)?g.rollen.liste.map(r=>`${r.name}: ${r.text}`):[]},
  {key:'ablauf',label:'So geht’s',w:10,get:g=>g.ablauf},
  {key:'varianten',label:'Varianten',w:10,get:g=>g.varianten||[]},
  {key:'paedagogik',label:'Pädagogische Gedanken',w:8,get:g=>g.paedagogik||[]},
  {key:'nachgespraech',label:'Fragen zum Nachgespräch',w:8,get:g=>g.nachgespraech||[]},
  {key:'risiken',label:'Gefahren und Risiken',w:8,get:g=>g.risiken||[]},
  {key:'hinweis',label:'Tipp',w:8,get:g=>g.hinweis?[g.hinweis]:[]},
  {key:'eckdaten',label:'Eckdaten',w:15,get:g=>[g.alter.map(a=>(AGE_GROUPS.find(x=>x.id===a)||{}).label).join(' '),ortText(g),g.dauer||'']},
  {key:'erlebnis',label:'Erlebnispädagogik',w:15,get:g=>g.erlebnis?['Erlebnispädagogik']:[]},
  {key:'phasen',label:'Gruppenphasen',w:15,get:g=>[(g.phasen||[]).map(id=>(MannaSpiel.PHASEN.find(x=>x.id===id)||{}).label||'').filter(Boolean).join(', ')]}
];
/* Abstand zweier Wörter (Tippfehler: vertauschte, fehlende, falsche oder doppelte Buchstaben), bricht ab, sobald er zu groß wird */
function wortAbstand(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;
  let pp=null,p=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){
    const c=[i];let lo=i;
    for(let j=1;j<=b.length;j++){
      let v=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
      if(pp&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,pp[j-2]+1);
      c.push(v);if(v<lo)lo=v;
    }
    if(lo>max)return max+1;pp=p;p=c;
  }
  return p[b.length];
}
const erlaubteFehler=w=>w.length>=9?2:w.length>=5?1:0;
/* Wie gut passt ein Suchwort zu einem Text? 1 = steht drin, 0.6 = mit Tippfehler, 0 = gar nicht.
   Tippfehler zählen nur, wenn es keine genauen Treffer gibt (unscharf=true). */
function wortPasst(q,n,unscharf){
  if(!q)return 1;
  if(n.text.includes(q)||n.ohne.includes(q))return 1;
  const max=unscharf?erlaubteFehler(q):0;if(!max)return 0;
  for(const t of n.woerter){
    if(wortAbstand(q,t,max)<=max)return .6;
    // Wortanfang mit Tippfehler, z. B. „zeitng“ in „zeitungsschlagen“
    for(const L of [q.length-1,q.length,q.length+1])if(L>=4&&L<t.length&&wortAbstand(q,t.slice(0,L),max)<=max)return .6;
  }
  return 0;
}
const suchIndex=new WeakMap();
function indexFuer(g){
  let ix=suchIndex.get(g);if(ix)return ix;
  ix=SUCH_FELDER.map(f=>({f,zeilen:f.get(g).filter(Boolean).map(z=>{const t=normTxt(z);return{orig:String(z),text:t,ohne:t.replace(/ /g,''),woerter:t.split(' ').filter(Boolean)};})}));
  suchIndex.set(g,ix);return ix;
}
/* Ergebnis: null = passt nicht, sonst {score, felder:[Feldnamen], zeile:{label,orig} für die Fundstelle} */
function sucheIn(g,query,unscharf){
  const qn=normTxt(query);if(!qn)return{score:0,felder:[]};
  const worte=qn.split(' '),ganz=qn.replace(/ /g,'');
  const ix=indexFuer(g);let score=0;const felder=new Set();let fund=null;
  for(const q of worte){
    let best=0,bestF=null,bestZ=null;
    for(const {f,zeilen} of ix)for(const z of zeilen){
      let m=wortPasst(q,z,unscharf);
      if(!m&&worte.length>1&&z.ohne.includes(ganz))m=1; // getrennt geschrieben, zusammen gemeint
      if(m){const v=m*f.w+(f.key==='name'&&z.woerter.some(t=>t.startsWith(q))?30:0);if(v>best){best=v;bestF=f;bestZ=z;}}
    }
    if(!best)return null;
    score+=best;felder.add(bestF.key);
    if(!['name','kurz','eckdaten','erlebnis'].includes(bestF.key)&&!fund)fund={label:bestF.label,orig:bestZ.orig};
  }
  if(normTxt(g.name).replace(/ /g,'').startsWith(ganz))score+=60;
  return{score,felder:[...felder],fund};
}
/* Markiert ganze Wörter im Originaltext, die zur Suche passen */
const WORT_TRENNER=/([^\wäöüÄÖÜßéèêáàâíìîóòôúùû]+)/;
function wortTreffer(teil,worte,ganz,unscharf){
  const n=normTxt(teil);if(!n)return false;
  const z={text:n,ohne:n.replace(/ /g,''),woerter:[n]};
  return worte.some(q=>wortPasst(q,z,unscharf))||(worte.length>1&&z.ohne.includes(ganz));
}
function markiere(text,query,unscharf){
  const worte=normTxt(query).split(' ').filter(Boolean),ganz=worte.join('');
  if(!worte.length)return esc(text);
  return String(text).split(WORT_TRENNER).map(t=>wortTreffer(t,worte,ganz,unscharf)?`<mark>${esc(t)}</mark>`:esc(t)).join('');
}
/* Ausschnitt aus einer langen Zeile rund um das erste passende Wort */
function ausschnitt(text,query,unscharf){
  text=String(text);if(text.length<=120)return markiere(text,query,unscharf);
  const worte=normTxt(query).split(' ').filter(Boolean),ganz=worte.join('');
  let pos=0,at=0;
  for(const t of text.split(WORT_TRENNER)){if(wortTreffer(t,worte,ganz,unscharf)){at=pos;break;}pos+=t.length;}
  let start=Math.max(0,at-45);
  if(start>0){const sp=text.indexOf(' ',start);if(sp>=0&&sp<at)start=sp+1;}
  let end=Math.min(text.length,start+120);
  if(end<text.length){const sp=text.lastIndexOf(' ',end);if(sp>at)end=sp;}
  return (start>0?'… ':'')+markiere(text.slice(start,end),query,unscharf)+(end<text.length?' …':'');
}
let collQuery='';
/* Auf schmalen Bildschirmen sind die Filter eingeklappt, damit die Treffer direkt unter dem Suchfeld stehen */
let filterOffen=false;
let collHits=[];
function randomGame(){if(collHits.length)openGame(collHits[Math.floor(Math.random()*collHits.length)].id);}
function renderColl(){
  ransom($('#collTitle'),'Spielesammlung');
  const box=$('#filters');box.innerHTML='';
  FILTER_DEFS.forEach(def=>{
    const grp=document.createElement('div');grp.className='fgroup f-'+def.key;
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
  const active=Object.values(filter).some(a=>a.length);
  const sucht=!!normTxt(collQuery);
  /* Erst genau suchen. Nur wenn nichts passt, auch Tippfehler zulassen („ähnliche Spiele“). */
  let treffer=new Map(),unscharf=false;
  const suche=u=>{const t=new Map();GAMES.forEach(g=>{const r=sucheIn(g,collQuery,u);if(r)t.set(g.id,r);});return t;};
  if(sucht){treffer=suche(false);if(!treffer.size){treffer=suche(true);unscharf=treffer.size>0;}}
  const hits=GAMES.filter(g=>gameMatches(g,filter)&&(!sucht||treffer.has(g.id)))
    .sort((a,b)=>sucht?(treffer.get(b.id).score-treffer.get(a.id).score)||a.name.localeCompare(b.name,'de'):a.name.localeCompare(b.name,'de'));
  const versteckt=sucht&&active?treffer.size-hits.length:0;
  $('#collSearchClear').hidden=!collQuery;
  const nAktiv=Object.values(filter).reduce((n,x)=>n+x.length,0);
  $('#btnFilterToggle').textContent=nAktiv?`Filter (${nAktiv} aktiv)`:'Filter';
  $('#btnFilterToggle').setAttribute('aria-expanded',filterOffen);$('#filters').classList.toggle('zu',!filterOffen);
  $('#collCount').textContent=!GAMES.length&&gamesState!=='ok'?'':(hits.length===1?(unscharf?'1 ähnliches Spiel':'1 Spiel'):hits.length+(unscharf?' ähnliche Spiele':' Spiele'))+(sucht?' gefunden':'');
  $('#btnFilterReset').style.visibility=active?'visible':'hidden';
  collHits=hits;$('#btnRandom').style.display=hits.length?'':'none';
  if(!hits.length){
    const li=document.createElement('li');li.className='games-empty';
    li.textContent=!(GAMES.length||gamesState==='ok')?(gamesState==='fehler'?'Die Spiele konnten nicht geladen werden. Öffne die Spielesammlung noch einmal, sobald du Internet hast.':'Spiele werden geladen …'):
      sucht&&!versteckt?`Kein Spiel gefunden für „${collQuery.trim()}“. Prüf die Schreibweise oder versuch ein anderes Wort.`:
      sucht?`Kein Spiel gefunden für „${collQuery.trim()}“, solange die Filter aktiv sind.`:
      'Kein Spiel passt zu diesen Filtern. Nimm einen Filter heraus, um mehr Spiele zu sehen.';
    list.appendChild(li);if(versteckt)list.appendChild(verstecktHinweis(versteckt));return;
  }
  hits.forEach(g=>{
    const li=document.createElement('li');
    const b=document.createElement('button');b.className='game-row';
    const r=sucht?treffer.get(g.id):null,mk=t=>sucht?markiere(t,collQuery,unscharf):esc(t);
    b.innerHTML=`<span class="gname">${isFav(g.id)?'<span class="gfav" aria-label="Favorit">★</span> ':''}${mk(g.name)}</span><span class="gshort">${mk(g.kurz)}</span>
      ${r&&r.fund?`<span class="gfund"><b>Gefunden in ${esc(r.fund.label)}:</b> ${ausschnitt(r.fund.orig,collQuery,unscharf)}</span>`:''}
      <span class="gtags">${g.erlebnis?'<span class="gtag-ep">Erlebnispädagogik</span>':''}<span>${esc(personText(g))}</span><span>${esc(ortText(g))}</span><span>${esc(matText(g))}</span>${g.dauer?`<span>${esc(g.dauer)}</span>`:''}</span>`;
    b.onclick=()=>openGame(g.id);
    li.appendChild(b);list.appendChild(li);
  });
  if(versteckt)list.appendChild(verstecktHinweis(versteckt));
}
function verstecktHinweis(n){
  const li=document.createElement('li');li.className='games-hidden';
  li.innerHTML=`<span>${n===1?'1 weiterer Treffer':n+' weitere Treffer'}, wenn du die Filter zurücksetzt.</span>`;
  const b=document.createElement('button');b.className='btn';b.textContent='Filter zurücksetzen';
  b.onclick=()=>$('#btnFilterReset').click();li.appendChild(b);return li;
}
/* Suchfeld: filtert beim Tippen, × und Esc leeren, „/“ springt ins Feld */
(()=>{const inp=$('#collSearch');if(!inp)return;
  // Auf schmalen Bildschirmen passt das Beispiel nicht ins Feld
  const langerText=inp.placeholder,mq=matchMedia('(max-width:520px)');
  const ph=()=>{inp.placeholder=mq.matches?'Spiel suchen':langerText;};ph();mq.addEventListener&&mq.addEventListener('change',ph);
  inp.addEventListener('input',()=>{collQuery=inp.value;renderColl();});
  inp.addEventListener('keydown',e=>{if(e.key==='Escape'&&inp.value){e.preventDefault();e.stopPropagation();inp.value='';collQuery='';renderColl();}
    else if(e.key==='Enter'){e.preventDefault();if(collHits.length===1)openGame(collHits[0].id);else inp.blur();}});
  $('#btnFilterToggle').onclick=()=>{filterOffen=!filterOffen;renderColl();};
  $('#collSearchClear').onclick=()=>{inp.value='';collQuery='';renderColl();inp.focus();};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&screenName==='coll'&&!/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();inp.focus();}});
})();
function rolesHtml(r){
  let h='';
  if(r.liste&&r.liste.length)h+='<dl class="roles">'+r.liste.map(x=>`<dt>${esc(x.name)}</dt><dd>${esc(x.text)}</dd>`).join('')+'</dl>';
  if(r.tabelle)h+='<table class="role-table"><thead><tr>'+r.tabelle.kopf.map(k=>`<th scope="col">${esc(k)}</th>`).join('')+'</tr></thead><tbody>'+
    r.tabelle.zeilen.map(z=>'<tr>'+z.map((c,i)=>i?`<td>${esc(c)}</td>`:`<th scope="row">${esc(c)}</th>`).join('')+'</tr>').join('')+'</tbody></table>';
  if(r.hinweis)h+=`<p>${esc(r.hinweis)}</p>`;
  return h;
}
const TXT_PHASEN='Passt in diese Gruppenphasen:';
function openGame(id){
  const g=GAMES.find(x=>x.id===id);if(!g)return;
  const ages=g.alter.map(a=>(AGE_GROUPS.find(x=>x.id===a)||{}).label).filter(Boolean).join(', ');
  const sec=(title,html)=>html?`<section class="note"><h3>${title}</h3>${html}</section>`:'';
  $('#gameSheet').innerHTML=`
    <h1 class="menu-title" id="gameTitle"></h1>
    <p class="game-lead">${esc(g.kurz)}</p>
    <div class="game-actions"><button class="btn fav-btn" id="btnFav"></button></div>
    <ul class="game-facts">
      <li><b>Personen</b>${esc(personText(g))}</li>
      <li><b>Alter</b>${esc(ages)}</li>
      <li><b>Ort</b>${esc(ortText(g))}</li>
      <li><b>Dauer</b>${esc(g.dauer||'keine Angabe')}</li>
    </ul>
    ${(g.phasen&&g.phasen.length)||g.erlebnis?`<div class="game-phasen">${g.phasen&&g.phasen.length?`<span class="gp-label">${TXT_PHASEN}</span>${g.phasen.length>=MannaSpiel.PHASEN.length?'<button class="phase-chip" data-p="">Alle Gruppenphasen</button>':MannaSpiel.PHASEN.filter(x=>g.phasen.includes(x.id)).map(x=>`<button class="phase-chip" data-p="${x.id}">${esc(x.label)}</button>`).join('')}`:''}${g.erlebnis?'<button class="phase-chip ep-chip" id="btnEp">Erlebnispädagogik</button>':''}</div>`:''}
    <div class="game-notes">
      ${sec('Material',g.material.length?MannaSpiel.listeHtml(g,'material',esc):'<p>Kein Material nötig.</p>')}
      ${g.rollen?sec('Rollen',rolesHtml(g.rollen)):''}
      ${sec('So geht’s',MannaSpiel.ablaufHtml(g,esc))}
      ${g.varianten&&g.varianten.length?sec('Varianten',MannaSpiel.listeHtml(g,'varianten',esc)):''}
      ${g.paedagogik&&g.paedagogik.length?`<section class="note paed"><h3>Pädagogische Gedanken</h3>${MannaSpiel.listeHtml(g,'paedagogik',esc)}</section>`:''}
      ${g.nachgespraech&&g.nachgespraech.length?`<section class="note paed"><h3>Fragen zum Nachgespräch</h3>${MannaSpiel.listeHtml(g,'nachgespraech',esc)}</section>`:''}
      ${g.risiken&&g.risiken.length?`<section class="note risk"><h3>Gefahren und Risiken</h3>${MannaSpiel.listeHtml(g,'risiken',esc)}</section>`:''}
      ${g.hinweis?`<section class="note tip"><h3>Tipp</h3><p>${esc(g.hinweis)}</p></section>`:''}
    </div>`;
  const fb=$('#btnFav');
  const favLabel=()=>{const on=isFav(g.id);fb.textContent='Favorit';fb.classList.toggle('on',on);fb.setAttribute('aria-pressed',on);};
  favLabel();fb.onclick=()=>{toggleFav(g.id);favLabel();};
  $('#gameSheet').querySelectorAll('.phase-chip:not(.ep-chip)').forEach(b=>b.onclick=()=>openPhasen(b.dataset.p||null,'game'));
  const ep=$('#btnEp');if(ep)ep.onclick=()=>openArticle('erlebnispaedagogik',null,'game');
  ransom($('#gameTitle'),g.name);
  showScreen('game');
}
$('#btnRandom').onclick=randomGame;
/* Den Browser bitten, die gespeicherten Daten nicht von selbst zu löschen (z. B. Safari nach längerer Nichtnutzung).
   Einmal beim ersten Tippen, ohne Rückmeldung. */
function askPersist(){try{if(VIEW||!navigator.storage||!navigator.storage.persist)return;navigator.storage.persisted().then(p=>{if(!p)return navigator.storage.persist();}).catch(()=>{});}catch(e){}}
document.addEventListener('pointerdown',askPersist,{once:true});
$('#btnFilterReset').onclick=()=>{Object.keys(filter).forEach(k=>filter[k]=[]);saveFilter();renderColl();};
$('#btnCollBack').onclick=()=>showScreen('home');
$('#btnGameBack').onclick=()=>showScreen('coll');
