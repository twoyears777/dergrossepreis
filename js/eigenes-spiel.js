/* Manna – Eigenes Spiel: Bilder, Export/Import, Übersicht, Einrichten, Spielen
   Teil von app.js, aufgeteilt nach Bereichen. Die Dateien werden in index.html in fester Reihenfolge geladen
   und teilen sich dieselben globalen Variablen. Reihenfolge nicht ändern. */
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
$('#gcOwn').onclick=nurAmPC(()=>showScreen('own'));
$('#btnOwnBack').onclick=()=>showScreen('shows');

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
