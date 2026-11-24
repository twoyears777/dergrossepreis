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
  }).catch(()=>{if(!GAMES.length)gamesState='fehler';}).then(()=>{gamesLoading=null;if(screenName==='coll')renderColl();});
}
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
  {key:'ort',label:'Ort',opts:()=>[{id:'drinnen',label:'Drinnen'},{id:'draussen',label:'Draußen'}]},
  {key:'material',label:'Material',opts:()=>[{id:'ohne',label:'Ohne Material'},{id:'mit',label:'Mit Material'}]},
  {key:'fav',label:'Favoriten',opts:()=>[{id:'nur',label:'Nur Favoriten'}]}
];
let filter=(()=>{const f=jget(FILTER_KEY,null);const e={alter:[],groesse:[],ort:[],material:[],fav:[]};
  if(f&&typeof f==='object')Object.keys(e).forEach(k=>{if(Array.isArray(f[k]))e[k]=f[k];});return e;})();
function saveFilter(){lsSet(FILTER_KEY,JSON.stringify(filter));}
function gameMatches(g,f){
  if(f.alter.length&&!f.alter.some(a=>g.alter.includes(a)))return false;
  if(f.groesse.length&&!f.groesse.some(id=>{const s=SIZE_GROUPS.find(x=>x.id===id);return s&&g.spieler.min<=s.max&&g.spieler.max>=s.min;}))return false;
  if(f.ort.length&&!f.ort.some(o=>g.ort.includes(o)))return false;
  if(f.material.length){const has=g.material.length>0;if(!f.material.some(m=>(m==='mit')===has))return false;}
  if(f.fav&&f.fav.length&&!isFav(g.id))return false;
  return true;
}
const personText=g=>g.spieler.max>=9999?`ab ${g.spieler.min} Personen`:`${g.spieler.min}–${g.spieler.max} Personen`;
const ortText=g=>g.ort.length===2?'drinnen und draußen':(g.ort[0]==='drinnen'?'drinnen':'draußen');
const matText=g=>g.material.length?'mit Material':'ohne Material';
let collHits=[];
function randomGame(){if(collHits.length)openGame(collHits[Math.floor(Math.random()*collHits.length)].id);}
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
  const hits=GAMES.filter(g=>gameMatches(g,filter)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
  const active=Object.values(filter).some(a=>a.length);
  $('#collCount').textContent=!GAMES.length&&gamesState!=='ok'?'':hits.length===1?'1 Spiel':hits.length+' Spiele';
  $('#btnFilterReset').style.visibility=active?'visible':'hidden';
  collHits=hits;$('#btnRandom').style.display=hits.length?'':'none';
  if(!hits.length){
    const li=document.createElement('li');li.className='games-empty';
    li.textContent=GAMES.length||gamesState==='ok'?'Kein Spiel passt zu diesen Filtern. Nimm einen Filter heraus, um mehr Spiele zu sehen.':
      gamesState==='fehler'?'Die Spiele konnten nicht geladen werden. Öffne die Spielesammlung noch einmal, sobald du Internet hast.':'Spiele werden geladen …';
    list.appendChild(li);return;
  }
  hits.forEach(g=>{
    const li=document.createElement('li');
    const b=document.createElement('button');b.className='game-row';
    b.innerHTML=`<span class="gname">${isFav(g.id)?'<span class="gfav" aria-label="Favorit">★</span> ':''}${esc(g.name)}</span><span class="gshort">${esc(g.kurz)}</span>
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
    ${g.phasen&&g.phasen.length?`<div class="game-phasen"><span class="gp-label">${TXT_PHASEN}</span>${g.phasen.length>=MannaSpiel.PHASEN.length?'<button class="phase-chip" data-p="">Alle Gruppenphasen</button>':MannaSpiel.PHASEN.filter(x=>g.phasen.includes(x.id)).map(x=>`<button class="phase-chip" data-p="${x.id}">${esc(x.label)}</button>`).join('')}</div>`:''}
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
  $('#gameSheet').querySelectorAll('.phase-chip').forEach(b=>b.onclick=()=>openPhasen(b.dataset.p||null,'game'));
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
