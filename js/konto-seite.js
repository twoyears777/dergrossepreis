/* Manna – Konto 3/3: die Konto-Seite (ab Version 1.29.0)
   Teil von app.js, aufgeteilt nach Bereichen; Lade-Reihenfolge siehe js/konto.js.
   Knöpfe, Formulare und Anzeigen der Konto-Seite; alle Texte stehen in KT (js/konto.js) und index.html. */
/* ================= KONTO: OBERFLÄCHE ================= */
/* ---------- Oberfläche ---------- */
let kontoVon='home';
const kMsg=t=>{const m=$('#kMsg');if(m)m.textContent=t||'';const m2=$('#kMsg2');if(m2)m2.textContent='';};
function kontoZeigeNeuesPw(an){$('#kNeuForm').hidden=!an;if(an)setTimeout(()=>$('#kNeuPass').focus(),100);}
function kontoUI(){
  const an=!!konto;
  const hb=$('#btnKonto');if(hb){hb.textContent=an?KT.homeAn:KT.homeAus;hb.classList.toggle('an',an);}
  $('#btnKReg').hidden=!K_FUER_ALLE;
  $('#kontoAus').hidden=an;$('#kontoAn').hidden=!an;
  if(!an)$('#kNeuForm').hidden=true;
  if(an)$('#kWer').textContent=konto.email||'';
  kontoStandUI();
  if(typeof daumenKontoGewechselt==='function')daumenKontoGewechselt();   // js/daumen.js
}
function kontoStandUI(){
  const el=$('#kStand');if(!el)return;
  const st=syncState();
  let t;
  if(kStand.art==='laeuft')t=KT.standLaeuft;
  else if(kStand.art==='offline')t=KT.standOffline;
  else if(kStand.art==='fehler')t=KT.standFehler+(kStand.text?': '+kStand.text:'');
  else if(konto&&st.user===konto.id&&st.zuletzt)t=KT.standOk+' · '+new Date(st.zuletzt).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  else t=KT.standNie;
  el.textContent=t;
  const w=$('#kWarnung');if(w){w.textContent=kWarnung;w.hidden=!kWarnung;}
}
SCREENS.konto={el:'#kontoScreen',title:'Konto',show:()=>{kontoUI();}};
function kBusy(btn,fn){
  return async()=>{
    if(btn.disabled)return;
    btn.disabled=true;
    try{await fn();}catch(e){kMsg(e.message||KT.fehler);}
    finally{btn.disabled=false;}
  };
}
function kFelder(mitPw){
  const mail=$('#kMail').value.trim(),pass=$('#kPass').value;
  if(!mail||(mitPw&&!pass)){kMsg(mitPw?KT.felder:KT.mail);return null;}
  if(!kMailOk(mail)){kMsg(KT.mailUngueltig);return null;}
  return {mail,pass};
}
$('#btnKonto').onclick=()=>{kontoVon=screenName==='konto'?'home':screenName;kMsg('');showScreen('konto');};
$('#btnKontoBack').onclick=()=>showScreen(SCREENS[kontoVon]?kontoVon:'home');
$('#kForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKLogin'),async()=>{
  const f=kFelder(true);if(!f)return;kMsg('');
  await kontoAnmelden(f.mail,f.pass);$('#kPass').value='';
})();});
$('#btnKReg').onclick=kBusy($('#btnKReg'),async()=>{
  if(!K_FUER_ALLE)return;
  const f=kFelder(true);if(!f)return;
  if(f.pass.length<8){kMsg(KT.pwKurz);return;}
  kMsg('');
  const r=await kontoRegistrieren(f.mail,f.pass);$('#kPass').value='';
  if(r==='mail')kMsg(KT.registriert);
});
$('#btnKVergessen').onclick=kBusy($('#btnKVergessen'),async()=>{
  const f=kFelder(false);if(!f)return;kMsg('');
  await kontoVergessen(f.mail);kMsg(KT.vergessenGesendet);
});
$('#kNeuForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKNeu'),async()=>{
  const p=$('#kNeuPass').value,m=$('#kMsg2');
  m.textContent='';
  if(p.length<8){m.textContent=KT.pwKurz;return;}
  try{await kontoNeuesPasswort(p);}catch(x){m.textContent=x.message;return;}
  $('#kNeuPass').value='';kontoZeigeNeuesPw(false);toast(KT.pwGeaendert);
})();});
$('#btnKSync').onclick=()=>kontoSync('knopf');
$('#btnKPw').onclick=()=>kontoZeigeNeuesPw($('#kNeuForm').hidden);
$('#btnKAbmelden').onclick=()=>ask(KT.abmeldenFrage,KT.abmeldenJa,()=>kontoAbmelden(false));
$('#btnKEntfernen').onclick=()=>ask(KT.entfernenFrage,KT.entfernenJa,()=>kontoAbmelden(true));
$('#btnKLoeschen').onclick=()=>ask(KT.loeschenFrage,KT.loeschenJa,()=>{
  kontoLoeschen().catch(e=>notice(e.message||KT.fehler));
});
if(!VIEW)kontoUI();
