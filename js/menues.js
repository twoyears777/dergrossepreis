/* Manna – Seiten und Navigation, Menüs, Vorlagen, Sicherung, Pädagogischer Kram, Zurück-Knöpfe
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
/* ---------- Menüs ---------- */
const PREIS_SCREENS=['gmenu','tpl','set','help','settings','board'];
/* Alle Seiten an einer Stelle: Element, Überschrift aus Papierbuchstaben (optional) und was beim Öffnen passiert.
   Neue Seite = neuer Eintrag hier. Zurück-Knöpfe: der .back-link der Seite (oben wird automatisch eine Kopie angezeigt). */
const SCREENS={
  home:{el:'#home'},
  coll:{el:'#collScreen',show:()=>renderColl()},
  game:{el:'#gameScreen'},
  submit:{el:'#submitScreen',title:'Hilf uns beim Content!',show:()=>renderSubmit()},
  paed:{el:'#paedScreen',title:'Pädagogischer Kram',show:()=>renderArtTiles()},
  art:{el:'#artScreen'},
  shows:{el:'#showsScreen',title:'Gameshows'},
  gmenu:{el:'#gmenu',show:()=>renderGMenu()},
  tpl:{el:'#tplScreen',show:()=>renderTpl()},
  set:{el:'#setScreen',show:()=>renderSet()},
  help:{el:'#helpScreen',title:'Erklärung'},
  timer:{el:'#timerScreen',show:()=>renderTimerScreen()},
  own:{el:'#ownScreen',show:()=>renderOwnList()},
  ownedit:{el:'#ownEdit',show:()=>renderOwnEditor()},
  ownplay:{el:'#ownPlay'}
};
function showScreen(n){
  screenName=n;
  if(!VIEW)document.title=PREIS_SCREENS.includes(n)?(S.title||'Der große Preis'):'Manna';
  Object.entries(SCREENS).forEach(([k,d])=>$(d.el).classList.toggle('show',k===n));
  const d=SCREENS[n];
  if(d){if(d.title)ransom($(d.el).querySelector('.menu-title'),d.title);if(d.show)d.show();}
  document.querySelectorAll('.screen.show').forEach(x=>x.scrollTop=0);
  pushState();
  seiteGewechselt(n);
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
    const a=ownTpl();a.push(boardToTpl(name));lsSet(TPL_KEY,JSON.stringify(a));datenGeaendert();renderTpl();markUnsaved();
    setTimeout(()=>ask(`Vorlage „${name}“ ist gespeichert. Willst du sie gleich auch als Datei sichern? Dann geht sie nicht verloren, falls der Browser-Speicher gelöscht wird.`,'Als Datei sichern',()=>backupNow()),250);
  },{input:true,value:S.title||'',placeholder:'z. B. Weihnachtsquiz 2026'});
}
function deleteTemplate(tp){
  if(tp.own)markUnsaved();
  if(tp.own)lsSet(TPL_KEY,JSON.stringify(ownTpl().filter(t=>t.id!==tp.id)));
  else{const h=hiddenTpl();if(!h.includes(tp.id))h.push(tp.id);lsSet(HID_KEY,JSON.stringify(h));}
  datenGeaendert();
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
    vorlagen:ownTpl().map(({id,...t})=>t),eigeneSpiele:games.map(({id,...g})=>g),bilder},null,1);
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
  if(!arr.length){toast(nOwn?`${nOwn} eigene${nOwn>1?' Spiele':'s Spiel'} eingespielt.`:'In der Datei wurden keine Vorlagen gefunden.');return;}
  const own=ownTpl();
  arr=arr.slice(0,50);
  arr.forEach(t=>{const cats=t.cats||t.categories;
    const n=normalize({title:t.title||t.name,points:t.points,categories:cats,teams:[]});
    own.push({id:'own-'+uid(),name:String(t.name||t.title||'Importierte Vorlage').slice(0,60),title:n.title,points:n.points,
      desc:String(t.desc||n.categories.map(c=>c.name).join(', ')).slice(0,300),cats:n.categories});});
  if(!lsSet(TPL_KEY,JSON.stringify(own))){toast('Speichern nicht möglich – der Speicher des Browsers ist voll.');return;}
  datenGeaendert();
  renderTpl();
  toast(`${arr.length} Vorlage${arr.length>1?'n':''} importiert.`+(d&&d.typ==='sicherung'?' Du findest sie unter „Vorlagen“.':'')+(nOwn?` Dazu ${nOwn} eigene${nOwn>1?' Spiele':'s Spiel'}.`:''));
}
$('#tplFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{importTemplates(String(r.result));}catch(x){toast('Die Datei ist keine gültige Vorlagen-Datei.');}};r.readAsText(f);e.target.value='';};
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
  if(typeof brettHinweis==='function')brettHinweis();   // Konto & Sync (js/sync.js): Hinweis, wenn ein neues Spielbrett wartet
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
  if(hiddenTpl().length)tb('Standard-Vorlagen wiederherstellen',()=>{lsSet(HID_KEY,'[]');datenGeaendert();renderTpl();toast('Standard-Vorlagen sind wieder da.');});
  list.appendChild(tools);
  const tip=document.createElement('p');tip.className='mhint';
  tip.textContent='Tipp: Speichere ein fertiges Spielbrett als Vorlage und exportiere es. Die Datei kannst du über „Vorlagen importieren“ wieder einfügen.';
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
$('#gcColl').onclick=()=>{loadGames();showScreen('coll');};
$('#gcPreis').onclick=nurAmPC(()=>showScreen('gmenu'));
$('#btnGmBack').onclick=()=>showScreen('shows');
$('#gcShows').onclick=nurAmPC(()=>showScreen('shows'));
$('#btnShowsBack').onclick=()=>showScreen('home');
/* Pädagogischer Kram: Kacheln und Artikelseite entstehen aus ARTIKEL (js/artikel.js) */
let artFrom='paed';
function renderArtTiles(){
  const box=$('#artTiles');if(box.children.length)return;
  ARTIKEL.forEach(a=>{
    const b=document.createElement('button');b.className='gcard';b.dataset.art=a.id;
    b.innerHTML=`<span class="wbar">${esc(a.kachelTitel||a.titel)}</span><span class="gbody"><span>${esc(a.kachel||'')}</span></span>`;
    b.onclick=()=>openArticle(a.id,null,'paed');box.appendChild(b);
  });
}
/* Absätze: Text oder Liste von Texten. Zeilen mit „- “ am Anfang werden zu Aufzählungspunkten. */
const paras=t=>{let h='',ul=[];const fl=()=>{if(ul.length)h+=`<ul>${ul.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;ul=[];};
  (Array.isArray(t)?t:[t]).filter(Boolean).forEach(x=>{if(/^- /.test(x))ul.push(x.slice(2));else{fl();h+=`<p>${esc(x)}</p>`;}});fl();return h;};
/* Ein Abschnitt kann Unterpunkte haben (teile: [{titel,text}]), sie stehen als kleine Überschriften darunter. */
const teileHtml=x=>(x.teile||[]).map(u=>`<h4>${esc(u.titel)}</h4>${paras(u.text)}`).join('');
function openArticle(id,abschnitt,from){
  const a=ARTIKEL.find(x=>x.id===id);if(!a)return;
  artFrom=from||'paed';
  $('#btnArtBack').textContent=artFrom==='game'?'← Zurück zum Spiel':'← Pädagogischer Kram';
  $('#artLead').textContent=a.untertitel||'';$('#artLead').style.display=a.untertitel?'':'none';
  $('#artBody').innerHTML=(a.kiHinweis?`<p class="ki-hinweis"><em>${a.kiHinweis}</em></p>`:'')+(a.einleitung?`<section class="note">${paras(a.einleitung)}</section>`:'')+
    (a.abschnitte||[]).map(x=>`<section class="note" id="art-${esc(a.id)}-${esc(x.id)}"><h3>${esc(x.titel)}</h3>${paras(x.text)}${teileHtml(x)}</section>`).join('');
  showScreen('art');ransom($('#artTitle'),a.titel);
  if(abschnitt){const el=document.getElementById('art-'+a.id+'-'+abschnitt);if(el)setTimeout(()=>{el.scrollIntoView({block:'start'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600);},60);}
  syncBackTop();
}
// Gruppenphasen-Schilder an den Spielen
const openPhasen=(phase,from)=>openArticle('gruppenphasen',phase,from);
$('#gcPaed').onclick=()=>showScreen('paed');
$('#btnPaedBack').onclick=()=>showScreen('home');
$('#btnArtBack').onclick=()=>showScreen(artFrom==='game'?'game':'paed');
/* Zurück-Knöpfe zusätzlich oben (gleiche Funktion wie unten) */
const backTops=[];
document.querySelectorAll('.screen > .back-link').forEach(b=>{
  const t=document.createElement('button');t.type='button';t.className='back-top';t.textContent=b.textContent;
  t.onclick=()=>b.click();b.parentNode.prepend(t);backTops.push([t,b]);
});
function syncBackTop(){backTops.forEach(([t,b])=>{t.textContent=b.textContent;});}
$('#lnkVision').onclick=e=>{e.preventDefault();try{$('#vision').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}catch(err){$('#vision').scrollIntoView();}};
$('#btnGuide').onclick=()=>{try{$('#info').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}catch(e){$('#info').scrollIntoView();}};
function finishGame(){
  if(!S.teams.length){toast('Es gibt noch keine Gruppen.');return;}
  const total=S.categories.length*S.points.length,left=total-Object.keys(S.used).length;
  ask(left>0?`Spiel jetzt beenden? ${left} ${left===1?'Feld ist':'Felder sind'} noch offen. Danach kommt die Siegerehrung.`:'Spiel beenden und Siegerehrung zeigen?','Spiel beenden',()=>{
    closeQ();if(screenName!=='board'){showScreen('board');applyMode();renderBoard();}showEnd();});
}
$('#btnFinish').onclick=()=>finishGame();
$('#btnHome').onclick=()=>{closeQ();showScreen('gmenu');};
