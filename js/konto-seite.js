/* Manna – Konto 3/3: die Konto-Seite (ab Version 1.29.0)
   Teil von app.js, aufgeteilt nach Bereichen; Lade-Reihenfolge siehe js/konto.js.
   Knöpfe, Formulare und Anzeigen der Konto-Seite; alle Texte stehen in KT (js/konto.js) und index.html. */
/* ================= KONTO: OBERFLÄCHE ================= */
/* ---------- Oberfläche ---------- */
let kontoVon='home';
/* Ohne Login zeigt die Konto-Seite eine von drei Ansichten: Anmelden, Konto erstellen oder Code eingeben */
let kAnsicht='login';
const K_ANSICHT={login:['#kForm','#kMsg'],reg:['#kRegForm','#kRegMsg'],code:['#kCodeForm','#kCodeMsg']};
const kMsg=t=>{const m=$(K_ANSICHT[kAnsicht][1]);if(m)m.textContent=t||'';const m2=$('#kMsg2');if(m2)m2.textContent='';};
function kZeige(a,fokus){
  if(a==='code'&&!kWartet)a='login';
  if(a==='reg'&&!K_FUER_ALLE)a='login';
  kAnsicht=a;
  Object.keys(K_ANSICHT).forEach(x=>{$(K_ANSICHT[x][0]).hidden=x!==a;$(K_ANSICHT[x][1]).textContent='';});
  if(a==='code'){
    const t=kWartet.typ==='recovery'?KT.vergessenInfo:kWartet.neu?KT.registriert:KT.bestaetigenInfo;
    $('#kCodeInfo').textContent=t.replace('{mail}',kWartet.mail);
    $('#kCode').value='';
  }
  if(fokus)setTimeout(()=>{const f=$(fokus);if(f)f.focus();},100);
}
function kontoZeigeNeuesPw(an){$('#kNeuForm').hidden=!an;if(an)setTimeout(()=>$('#kNeuPass').focus(),100);}
function kontoUI(){
  const an=!!konto;
  const hb=$('#btnKonto');if(hb){hb.textContent=an?KT.homeAn:KT.homeAus;hb.classList.toggle('an',an);}
  $('#btnKReg').hidden=!K_FUER_ALLE;
  $('#kontoAus').hidden=an;$('#kontoAn').hidden=!an;
  if(an&&kAnsicht!=='login')kZeige('login');
  if(!an)$('#kNeuForm').hidden=true;
  if(an)$('#kWer').textContent=konto.email||'';
  kontoStandUI();
  if(typeof daumenKontoGewechselt==='function')daumenKontoGewechselt();   // js/daumen.js
  if(typeof klicksKontoGewechselt==='function')klicksKontoGewechselt();   // js/klicks.js
  if(typeof statistikKontoGewechselt==='function')statistikKontoGewechselt();   // js/statistik.js
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
$('#btnKonto').onclick=()=>{kontoVon=screenName==='konto'?'home':screenName;if(kAnsicht!=='code')kZeige('login');kMsg('');showScreen('konto');};
$('#btnKontoBack').onclick=()=>showScreen(SCREENS[kontoVon]?kontoVon:'home');
$('#kForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKLogin'),async()=>{
  const f=kFelder(true);if(!f)return;kMsg('');
  try{await kontoAnmelden(f.mail,f.pass);}
  catch(x){
    // Konto da, aber noch nicht bestätigt: gleich die Code-Eingabe anbieten
    if(x.code==='email_not_confirmed'){kWartet={mail:f.mail,typ:'signup'};$('#kPass').value='';kZeige('code','#kCode');return;}
    throw x;
  }
  $('#kPass').value='';
})();});
$('#btnKReg').onclick=()=>{
  // Was schon im Anmeldeformular steht, mitnehmen
  const m=$('#kMail').value.trim();if(m&&!$('#kRMail').value)$('#kRMail').value=m;
  kZeige('reg',$('#kRMail').value?'#kRName':'#kRMail');
};
$('#btnKZurLogin').onclick=()=>{const m=$('#kRMail').value.trim();if(m)$('#kMail').value=m;kZeige('login','#kMail');};
$('#kRegForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKRegLos'),async()=>{
  if(!K_FUER_ALLE)return;
  const mail=$('#kRMail').value.trim(),name=$('#kRName').value.trim(),pass=$('#kRPass').value;
  if(!mail||!name||!pass){kMsg(KT.felderReg);return;}
  if(!kMailOk(mail)){kMsg(KT.mailUngueltig);return;}
  if(!NAME_MUSTER.test(name)){kMsg(DT.nameUngueltig);return;}   // js/daumen.js
  if(pass.length<8){kMsg(KT.pwKurz);return;}
  kMsg('');
  const frei=await usernameFrei(name);
  if(frei==='vergeben'){kMsg(DT.nameVergeben);return;}
  if(frei==='gesperrt'){kMsg(DT.nameGesperrt);return;}
  if(frei==='ungueltig'){kMsg(DT.nameUngueltig);return;}
  const r=await kontoRegistrieren(mail,pass,name);$('#kRPass').value='';
  if(r==='mail'){kWartet.neu=true;$('#kMail').value=mail;kZeige('code','#kCode');}
})();});
$('#btnKVergessen').onclick=kBusy($('#btnKVergessen'),async()=>{
  const f=kFelder(false);if(!f)return;kMsg('');
  await kontoVergessen(f.mail);kZeige('code','#kCode');
});
$('#kCodeForm').addEventListener('submit',e=>{e.preventDefault();kBusy($('#btnKCode'),async()=>{
  const c=$('#kCode').value.replace(/\s+/g,'');
  if(!c){kMsg(KT.code);return;}
  if(!/^\d{6,10}$/.test(c)){kMsg(KT.codeFalsch);return;}
  kMsg('');
  await kontoCodePruefen(c);
})();});
$('#btnKCodeNeu').onclick=kBusy($('#btnKCodeNeu'),async()=>{
  kMsg('');await kontoCodeNeu();kMsg(KT.codeNeu);
});
$('#btnKCodeZurueck').onclick=()=>{if(kWartet)$('#kMail').value=kWartet.mail;kWartet=null;kZeige('login','#kMail');};
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
