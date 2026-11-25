/* Manna Editor
   Legt Spiele als Textdateien (spiele/<id>.txt, Format MANNA-SPIEL v1) direkt im
   GitHub-Repo an, ändert und löscht sie. GitHub baut, testet und veröffentlicht danach
   selbst (.github/workflows/tests.yml). Der Zugangsschlüssel bleibt im Browser. */
(function () {
  'use strict';
  const F = window.MannaSpiel;
  // Repo aus der Adresse ablesen (<owner>.github.io/<repo>/editor/), so übersteht der Editor ein Umbenennen.
  // Bei einer eigenen Domain oder lokal gelten die festen Werte.
  const GH_PAGES = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
  const OWNER = GH_PAGES ? GH_PAGES[1] : 'twoyears777';
  const REPO = (GH_PAGES && location.pathname.split('/')[1] && location.pathname.split('/')[1] !== 'editor') ? location.pathname.split('/')[1] : 'manna';
  const BRANCH = 'main', DIR = 'spiele';
  // Rohfassungen: liegen nur im Repo, nicht in der App und nicht auf der Website. Erst „Veröffentlichen“ verschiebt sie nach spiele/.
  const ROH = 'rohfassungen';
  const API = 'https://api.github.com', R = '/repos/' + OWNER + '/' + REPO;
  const K_TOKEN = 'manna-editor-token', K_EXP = 'manna-editor-ablauf', K_DRAFT = 'manna-editor-entwurf', K_RUNS = 'manna-editor-laeufe', K_CACHE = 'manna-editor-dateien';

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
    json(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  };

  let token = store.get(K_TOKEN) || '';
  let games = [];          // {id, path, sha, text, spiel, fehler}
  let ED = null;           // aktuelles Formular: {orig, sig}

  /* ---------- Anzeige ---------- */
  function show(id) { document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== id; }); window.scrollTo(0, 0); }
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 4200); }
  function dialog(msg, buttons) {
    return new Promise(res => {
      $('#mMsg').textContent = msg;
      const box = $('#mBtns'); box.innerHTML = '';
      buttons.forEach(b => {
        const el = document.createElement('button');
        el.className = b.cls || 'btn'; el.textContent = b.label;
        el.onclick = () => { $('#modal').hidden = true; res(b.value); };
        box.appendChild(el);
      });
      $('#modal').hidden = false;
      box.lastChild.focus();
    });
  }
  const confirmBox = (msg, ok, cls) => dialog(msg, [{ label: 'Abbrechen', value: false }, { label: ok, value: true, cls: cls || 'primary' }]);

  /* ---------- GitHub ---------- */
  function b64encode(str) { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function b64decode(b64) { const s = atob(String(b64).replace(/\s/g, '')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); }

  async function gh(path, opts) {
    opts = opts || {};
    let r;
    try {
      r = await fetch(API + path, {
        method: opts.method || 'GET', cache: 'no-store',
        headers: Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
          opts.body ? { 'Content-Type': 'application/json' } : {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) { const er = new Error('Keine Verbindung zu GitHub. Bist du online?'); er.status = 0; throw er; }
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      const er = new Error(body.message || ('Fehler ' + r.status)); er.status = r.status; er.body = body; throw er;
    }
    return r.status === 204 ? null : r.json();
  }
  function explain(e) {
    if (e.status === 401) return 'Der Zugangsschlüssel ist ungültig oder abgelaufen. Melde dich ab und trag einen neuen ein.';
    if (e.status === 403 && /rate limit/i.test(e.message)) return 'GitHub bremst gerade (zu viele Anfragen). Versuch es in ein paar Minuten noch einmal.';
    if (e.status === 403) return 'Der Zugangsschlüssel darf das nicht. Er braucht für dieses Repo „Contents: Read and write“ und „Actions: Read-only“.';
    if (e.status === 404) return 'Das Repo wurde nicht gefunden. Hat der Schlüssel Zugriff auf ' + OWNER + '/' + REPO + '?';
    return e.message || 'Unbekannter Fehler.';
  }
  const fileUrl = (p, ref) => R + '/contents/' + p.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(ref || BRANCH);
  async function fileSha(path, ref) {
    try { return (await gh(fileUrl(path, ref))).sha; } catch (e) { if (e.status === 404) return null; throw e; }
  }

  /* Ein Commit mit mehreren Änderungen. check(head) prüft vorher auf Konflikte. */
  async function commit(changes, message, check) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const head = (await gh(R + '/git/ref/heads/' + BRANCH)).object.sha;
      if (check) await check(head);
      const base = (await gh(R + '/git/commits/' + head)).tree.sha;
      const tree = await gh(R + '/git/trees', { method: 'POST', body: { base_tree: base, tree: changes.map(c => c.del
        ? { path: c.path, mode: '100644', type: 'blob', sha: null }
        : { path: c.path, mode: '100644', type: 'blob', content: c.content }) } });
      const nc = await gh(R + '/git/commits', { method: 'POST', body: { message, tree: tree.sha, parents: [head] } });
      try { await gh(R + '/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: nc.sha, force: false } }); return nc.sha; }
      catch (e) { if (e.status === 422 && attempt < 2) continue; throw e; }
    }
  }

  /* ---------- Anmelden ---------- */
  async function login() {
    const t = $('#inToken').value.trim(), msg = $('#loginMsg');
    if (!t) { msg.textContent = 'Bitte den Zugangsschlüssel einfügen.'; return; }
    msg.textContent = ''; $('#btnLogin').disabled = true;
    token = t;
    try {
      await gh(R);
      store.set(K_TOKEN, t);
      const exp = $('#inExpiry').value; if (exp) store.set(K_EXP, exp); else store.del(K_EXP);
      $('#inToken').value = '';
      start();
    } catch (e) { token = ''; msg.textContent = explain(e); }
    $('#btnLogin').disabled = false;
  }
  async function logout() {
    if (!(await confirmBox('Abmelden? Der Zugangsschlüssel wird auf diesem Gerät gelöscht.', 'Abmelden'))) return;
    token = ''; store.del(K_TOKEN); store.del(K_EXP); store.del(K_CACHE); games = [];
    updateTop(); show('vLogin');
  }
  function updateTop() {
    $('#btnLogout').hidden = !token;
    $('#who').textContent = token ? 'angemeldet' : '';
  }

  /* ---------- Liste ---------- */
  async function loadGames() {
    const liste = dir => gh(fileUrl(dir)).catch(e => { if (e.status === 404) return []; throw e; });
    const [list, roh] = await Promise.all([liste(DIR), liste(ROH)]);
    const files = list.concat(roh).filter(f => f.type === 'file' && /\.txt$/.test(f.name));
    // Zwischenspeicher auf diesem Gerät: Inhalt je Datei-Fassung (sha). Geladen wird nur, was neu oder geändert ist.
    const cache = store.json(K_CACHE, {}), keep = {};
    const out = new Array(files.length);
    let i = 0;
    async function worker() {
      while (i < files.length) {
        const n = i++, f = files[n];
        let text = typeof cache[f.sha] === 'string' ? cache[f.sha] : null, sha = f.sha;
        if (text === null) { const d = await gh(fileUrl(f.path)); text = b64decode(d.content); sha = d.sha; }
        keep[sha] = text;
        const p = F.parse(text);
        out[n] = { id: f.name.slice(0, -4), path: f.path, roh: f.path.startsWith(ROH + '/'), sha, text, spiel: p.spiel, fehler: p.fehler };
      }
    }
    await Promise.all(Array.from({ length: 10 }, worker));
    if (!store.set(K_CACHE, JSON.stringify(keep))) store.del(K_CACHE);
    games = out.sort((a, b) => (a.spiel.name || a.id).localeCompare(b.spiel.name || b.id, 'de'));
  }
  function renderList() {
    const q = $('#inSearch').value.trim().toLowerCase();
    const art = $('#inArt').value, nRoh = games.filter(g => g.roh).length;
    const hits = games.filter(g => (art === 'alle' || (art === 'roh') === g.roh) && (!q || (g.spiel.name + ' ' + g.spiel.kurz).toLowerCase().includes(q)));
    $('#listCount').textContent = (games.length === 1 ? '1 Spiel' : games.length + ' Spiele') + (nRoh ? ', davon ' + nRoh + (nRoh === 1 ? ' Rohfassung' : ' Rohfassungen') : '') +
      (q || art !== 'alle' ? ', ' + hits.length + ' angezeigt' : '');
    const ul = $('#gameList'); ul.innerHTML = '';
    if (!hits.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = q ? 'Nichts gefunden.' : 'Noch keine Spiele.'; ul.appendChild(li); }
    hits.forEach(g => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.className = 'game' + (g.roh ? ' roh' : '');
      b.innerHTML = '<b>' + esc(g.spiel.name || g.id) + (g.roh ? ' <em class="tag">Rohfassung</em>' : '') + '</b><span>' + esc(g.spiel.kurz) + '</span>' +
        (g.fehler.length ? '<span class="bad">Datei fehlerhaft: ' + esc(g.fehler[0]) + '</span>' : '');
      b.onclick = () => openEdit(g);
      li.appendChild(b); ul.appendChild(li);
    });
    renderNotices();
  }
  async function start() {
    updateTop();
    if (!token) { show('vLogin'); return; }
    show('vLoading');
    try { await loadGames(); }
    catch (e) {
      if (e.status === 401) { token = ''; store.del(K_TOKEN); updateTop(); show('vLogin'); $('#loginMsg').textContent = explain(e); return; }
      show('vList'); games = []; renderList(); toast(explain(e)); return;
    }
    show('vList'); renderList(); pollRuns();
  }

  /* ---------- Hinweise: Ablauf des Schlüssels, Veröffentlichungen ---------- */
  function runs() { return store.json(K_RUNS, []).filter(r => Date.now() - r.t < 3 * 864e5); }
  function saveRuns(a) { store.set(K_RUNS, JSON.stringify(a.slice(0, 6))); }
  function addRun(sha, text) { const a = runs(); a.unshift({ sha, text, t: Date.now(), state: 'run' }); saveRuns(a); renderNotices(); pollRuns(); }
  function renderNotices() {
    const box = $('#notices'); if (!box) return; box.innerHTML = '';
    const exp = store.get(K_EXP);
    if (exp) {
      const days = Math.ceil((new Date(exp + 'T23:59:59') - Date.now()) / 864e5);
      if (days <= 14) box.insertAdjacentHTML('beforeend', '<div class="notice ' + (days < 0 ? 'err' : 'run') + '"><p>' +
        (days < 0 ? 'Dein Zugangsschlüssel ist abgelaufen. Leg bei GitHub einen neuen an, melde dich ab und wieder an.'
          : 'Dein Zugangsschlüssel läuft in ' + (days === 1 ? 'einem Tag' : days + ' Tagen') + ' ab. Leg rechtzeitig einen neuen an.') + '</p></div>');
    }
    runs().forEach((r, i) => {
      const txt = r.state === 'run' ? esc(r.text) + ' – wird geprüft und veröffentlicht …'
        : r.state === 'ok' ? esc(r.text) + ' – ist online. In der App erscheint es beim nächsten Öffnen der Spielesammlung.'
        : esc(r.text) + ' – Veröffentlichung fehlgeschlagen. Online bleibt die vorherige Fassung.' + (r.url ? ' <a href="' + esc(r.url) + '" target="_blank" rel="noopener">Details</a>' : '');
      const el = document.createElement('div');
      el.className = 'notice ' + r.state;
      el.innerHTML = '<p>' + txt + '</p>' + (r.state !== 'run' ? '<button class="x" aria-label="Ausblenden">✕</button>' : '');
      const x = el.querySelector('.x'); if (x) x.onclick = () => { const a = runs(); a.splice(i, 1); saveRuns(a); renderNotices(); };
      box.appendChild(el);
    });
  }
  let pollT = 0;
  async function pollRuns() {
    clearTimeout(pollT);
    const a = runs(), open = a.filter(r => r.state === 'run');
    if (!open.length || !token) return;
    for (const r of open) {
      try {
        const d = await gh(R + '/actions/runs?head_sha=' + r.sha + '&per_page=10');
        const run = (d.workflow_runs || []).find(x => /tests\.yml$/.test(x.path || '')) || null;
        if (run && run.status === 'completed') { r.state = run.conclusion === 'success' ? 'ok' : 'err'; r.url = run.html_url; }
        else if (!run && Date.now() - r.t > 10 * 60e3) { r.state = 'err'; }
      } catch (e) { if (e.status === 403 || e.status === 404) { r.state = 'ok'; r.text += ' (Status nicht abrufbar, bitte in der App prüfen)'; } }
      if (r.state === 'run' && Date.now() - r.t > 20 * 60e3) r.state = 'err';
    }
    saveRuns(a); renderNotices();
    if (a.some(r => r.state === 'run')) pollT = setTimeout(pollRuns, 6000);
  }

  /* ---------- Formular ---------- */
  const lines = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
  // freie Listen: jede Zeile so, wie sie eingegeben wurde (Zeichen nur, wenn selbst gesetzt)
  const frei = t => lines(t).map(F.zeile).filter(Boolean);
  const items = t => lines(t).map(s => s.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, '').trim()).filter(Boolean);
  const chipVals = id => [...document.querySelectorAll('#' + id + ' .chip.on')].map(b => b.dataset.v);

  function buildChips(id, opts) {
    const box = $('#' + id); box.innerHTML = '';
    opts.forEach(o => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = o.id; b.textContent = o.label;
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); changed(); };
      box.appendChild(b);
    });
  }
  function setChips(id, vals) { document.querySelectorAll('#' + id + ' .chip').forEach(b => { const on = vals.includes(b.dataset.v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }

  function formValues() {
    return {
      name: $('#fName').value, kurz: $('#fKurz').value, alter: chipVals('fAlter'), min: $('#fMin').value, max: $('#fMax').value,
      ort: chipVals('fOrt'), phasen: chipVals('fPhasen'), dauer: $('#fDauer').value, ablauf: $('#fAblauf').value, material: $('#fMaterial').value,
      varianten: $('#fVarianten').value, paedagogik: $('#fPaed').value, nachgespraech: $('#fNach').value, rollen: $('#fRollen').value, tabelle: $('#fTabelle').value,
      rollenHinweis: $('#fRollenHinweis').value, risiken: $('#fRisiken').value, tipp: $('#fTipp').value
    };
  }
  function setForm(v) {
    $('#fName').value = v.name || ''; $('#fKurz').value = v.kurz || ''; setChips('fAlter', v.alter || []);
    $('#fMin').value = v.min || ''; $('#fMax').value = v.max || ''; setChips('fOrt', v.ort || []); setChips('fPhasen', v.phasen || []); $('#fDauer').value = v.dauer || '';
    $('#fAblauf').value = v.ablauf || ''; $('#fMaterial').value = v.material || ''; $('#fVarianten').value = v.varianten || ''; $('#fPaed').value = v.paedagogik || ''; $('#fNach').value = v.nachgespraech || '';
    $('#fRollen').value = v.rollen || ''; $('#fTabelle').value = v.tabelle || ''; $('#fRollenHinweis').value = v.rollenHinweis || '';
    $('#fRisiken').value = v.risiken || ''; $('#fTipp').value = v.tipp || '';
  }
  function valuesFromGame(g) {
    const r = g.rollen || {};
    return {
      name: g.name, kurz: g.kurz, alter: g.alter.slice(), min: String(g.spieler.min), max: g.spieler.max >= F.OHNE_MAX ? '' : String(g.spieler.max),
      ort: g.ort.slice(), phasen: (g.phasen || []).slice(), dauer: g.dauer || '', ablauf: F.ablaufZeilen(g).join('\n'), material: F.zeilenVon(g, 'material').join('\n'),
      varianten: F.zeilenVon(g, 'varianten').join('\n'), paedagogik: F.zeilenVon(g, 'paedagogik').join('\n'), nachgespraech: F.zeilenVon(g, 'nachgespraech').join('\n'), rollen: (r.liste || []).map(x => x.name + (x.text ? ': ' + x.text : '')).join('\n'),
      tabelle: r.tabelle ? [r.tabelle.kopf].concat(r.tabelle.zeilen).map(z => z.join(' | ')).join('\n') : '',
      rollenHinweis: r.hinweis || '', risiken: F.zeilenVon(g, 'risiken').join('\n'), tipp: g.hinweis || ''
    };
  }
  /* Formular -> Spiel. Texte bleiben, wie sie eingegeben wurden. Aufzählungszeichen nur, wo sie selbst gesetzt sind. */
  function gameFromValues(v) {
    const min = parseInt(v.min, 10), maxRaw = String(v.max).trim(), max = parseInt(maxRaw, 10);
    const g = {
      name: v.name.trim(), kurz: v.kurz.replace(/\s+/g, ' ').trim(), alter: v.alter, ort: v.ort, phasen: v.phasen || [],
      spieler: Number.isFinite(min) && min >= 1 && (!maxRaw || (Number.isFinite(max) && max >= min)) ? { min, max: maxRaw ? max : F.OHNE_MAX } : null,
      material: items(v.material), materialZeilen: frei(v.material), dauer: v.dauer.trim(), ablauf: items(v.ablauf), ablaufZeilen: frei(v.ablauf), risiken: items(v.risiken), risikenZeilen: frei(v.risiken)
    };
    const rl = items(v.rollen).map(l => { const p = l.indexOf(':'); return p > 0 ? { name: l.slice(0, p).trim(), text: l.slice(p + 1).trim() } : { name: l, text: '' }; });
    const tz = lines(v.tabelle).map(l => l.split('|').map(c => c.trim()));
    const rh = v.rollenHinweis.replace(/\s+/g, ' ').trim();
    if (rl.length || tz.length || rh) {
      g.rollen = { liste: rl };
      if (tz.length) g.rollen.tabelle = { kopf: tz[0], zeilen: tz.slice(1) };
      if (rh) g.rollen.hinweis = rh;
    }
    const va = items(v.varianten); if (va.length) { g.varianten = va; g.variantenZeilen = frei(v.varianten); }
    const pg = items(v.paedagogik || ''); if (pg.length) { g.paedagogik = pg; g.paedagogikZeilen = frei(v.paedagogik); }
    const ng = items(v.nachgespraech || ''); if (ng.length) { g.nachgespraech = ng; g.nachgespraechZeilen = frei(v.nachgespraech); }
    const tipp = v.tipp.replace(/\s+/g, ' ').trim(); if (tipp) g.hinweis = tipp;
    return g;
  }
  /* Prüft wie der Bau-Schritt auf GitHub: was hier durchgeht, wird auch veröffentlicht. */
  function validate(v) {
    const g = gameFromValues(v), miss = [];
    if (!g.name) miss.push(['name', 'Name']);
    if (!g.kurz) miss.push(['kurz', 'Kurzbeschreibung']);
    if (!g.alter.length) miss.push(['alter', 'Alter']);
    if (!g.spieler) miss.push(['personen', 'Personen (mindestens 1, höchstens nicht kleiner als mindestens)']);
    if (!g.ort.length) miss.push(['ort', 'Ort']);
    if (!g.ablauf.length) miss.push(['ablauf', 'Ablauf']);
    const id = F.slug(g.name);
    if (g.name && !id) miss.push(['name', 'ein Name mit Buchstaben oder Zahlen']);
    const other = games.find(x => x.id === id && (!ED.orig || x.id !== ED.orig.id));
    if (id && other) miss.push(['name', 'ein anderer Name – „' + (other.spiel.name || other.id) + '“ gibt es schon']);
    let text = '', fehler = [];
    if (!miss.length) {
      text = F.serialize(g);
      fehler = F.parse(text).fehler;
      if (g.rollen && g.rollen.tabelle && fehler.some(f => /Rollen-Tabelle/.test(f))) miss.push(['tabelle', 'eine gültige Verteilungstabelle']);
    }
    return { g, id, text, miss, fehler };
  }
  /* Textfelder wachsen mit dem Text, damit man alles sieht */
  function grow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 3) + 'px'; }
  const growAll = () => document.querySelectorAll('#form textarea').forEach(grow);
  function changed(ev) {
    if (ev && ev.target && ev.target.tagName === 'TEXTAREA') grow(ev.target);
    if (!ED) return;
    const v = formValues();
    const sig = JSON.stringify(v);
    if (sig !== ED.sig) store.set(K_DRAFT, JSON.stringify({ key: ED.orig ? ED.orig.id : '', v, t: Date.now() }));
    else store.del(K_DRAFT);
    document.querySelectorAll('#form .bad').forEach(el => el.classList.remove('bad'));
    renderPreview(v);
  }
  function renderPreview(v) {
    const g = gameFromValues(v);
    const ph = s => '<span class="ph">' + s + '</span>';
    const list = (a, tag) => '<' + tag + '>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</' + tag + '>';
    const age = F.ALTER.filter(a => g.alter.includes(a.id)).map(a => a.label).join(', ');
    const pers = g.spieler ? (g.spieler.max >= F.OHNE_MAX ? 'ab ' + g.spieler.min + ' Personen' : g.spieler.min + '–' + g.spieler.max + ' Personen') : '';
    const ort = g.ort.length === 2 ? 'drinnen und draußen' : g.ort[0] === 'draussen' ? 'draußen' : g.ort[0] ? 'drinnen' : '';
    let h = '<h2>' + (g.name ? esc(g.name) : ph('Name')) + '</h2><p class="lead">' + (g.kurz ? esc(g.kurz) : ph('Kurzbeschreibung')) + '</p>' +
      '<ul class="facts"><li><b>Personen</b>' + (pers || ph('fehlt')) + '</li><li><b>Alter</b>' + (age ? esc(age) : ph('fehlt')) + '</li>' +
      '<li><b>Ort</b>' + (ort || ph('fehlt')) + '</li><li><b>Dauer</b>' + esc(g.dauer || 'keine Angabe') + '</li></ul>' +
      (g.phasen.length ? '<p class="phasen"><b>Gruppenphasen:</b> ' + F.PHASEN.filter(x => g.phasen.includes(x.id)).map(x => esc(x.label)).join(', ') + '</p>' : '');
    h += '<h3>Material</h3>' + (g.material.length ? F.listeHtml(g, 'material', esc) : '<p>Kein Material nötig.</p>');
    if (g.rollen) {
      h += '<h3>Rollen</h3>';
      if (g.rollen.liste.length) h += '<dl>' + g.rollen.liste.map(r => '<dt>' + esc(r.name) + '</dt><dd>' + esc(r.text) + '</dd>').join('') + '</dl>';
      if (g.rollen.tabelle) h += '<table><thead><tr>' + g.rollen.tabelle.kopf.map(k => '<th>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' +
        g.rollen.tabelle.zeilen.map(z => '<tr>' + z.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
      if (g.rollen.hinweis) h += '<p>' + esc(g.rollen.hinweis) + '</p>';
    }
    h += '<h3>So geht’s</h3>' + (g.ablauf.length ? F.ablaufHtml(g, esc) : '<p>' + ph('Ablauf fehlt') + '</p>');
    if (g.varianten) h += '<h3>Varianten</h3>' + F.listeHtml(g, 'varianten', esc);
    if (g.paedagogik) h += '<h3>Pädagogische Gedanken</h3>' + F.listeHtml(g, 'paedagogik', esc);
    if (g.nachgespraech) h += '<h3>Fragen zum Nachgespräch</h3>' + F.listeHtml(g, 'nachgespraech', esc);
    if (g.risiken.length) h += '<div class="risk"><h3>Gefahren und Risiken</h3>' + F.listeHtml(g, 'risiken', esc) + '</div>';
    if (g.hinweis) h += '<div class="tip"><h3>Tipp</h3><p>' + esc(g.hinweis) + '</p></div>';
    $('#prevCard').innerHTML = h;
    $('#prevTxt').textContent = F.serialize(Object.assign({}, g, { spieler: g.spieler || { min: 1, max: F.OHNE_MAX } }));
  }
  function setTab(txt) {
    $('#tabPrev').classList.toggle('on', !txt); $('#tabTxt').classList.toggle('on', txt);
    $('#tabPrev').setAttribute('aria-selected', !txt); $('#tabTxt').setAttribute('aria-selected', txt);
    $('#prevCard').hidden = txt; $('#prevTxt').hidden = !txt;
  }

  function openEdit(orig) {
    const base = orig ? valuesFromGame(orig.spiel) : { alter: ['jugend'], ort: ['drinnen'], min: '6', max: '' };
    ED = { orig, sig: '' };
    setForm(base); ED.sig = JSON.stringify(formValues());
    $('#editTitle').textContent = orig ? (orig.roh ? 'Rohfassung bearbeiten' : 'Spiel bearbeiten') : 'Neues Spiel';
    $('#btnDelete').hidden = !orig;
    $('#btnRoh').hidden = !!(orig && !orig.roh);
    $('#rohInfo').hidden = !(orig && orig.roh);
    const box = $('#draftBox'), d = store.json(K_DRAFT, null);
    box.hidden = true;
    if (d && d.key === (orig ? orig.id : '') && JSON.stringify(d.v) !== ED.sig) {
      const when = new Date(d.t).toLocaleString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      box.innerHTML = '<p>Hier gibt es einen nicht veröffentlichten Entwurf vom ' + esc(when) + '.</p><div class="row"><button type="button" class="primary" id="dRestore">Entwurf weiter bearbeiten</button><button type="button" class="btn" id="dDrop">Verwerfen</button></div>';
      box.hidden = false;
      $('#dRestore').onclick = () => { setForm(d.v); box.hidden = true; changed(); growAll(); };
      $('#dDrop').onclick = () => { store.del(K_DRAFT); box.hidden = true; };
    }
    if (orig && orig.fehler.length) toast('Die Datei hat Fehler: ' + orig.fehler.join('; '));
    setTab(false); renderPreview(formValues()); show('vEdit'); growAll();
    if (!orig) $('#fName').focus();
  }
  async function leaveEdit() {
    if (ED && JSON.stringify(formValues()) !== ED.sig) {
      const a = await dialog('Deine Änderungen sind noch nicht veröffentlicht. Der Entwurf bleibt auf diesem Gerät gespeichert.', [
        { label: 'Weiter bearbeiten', value: 'stay' }, { label: 'Entwurf verwerfen', value: 'drop' }, { label: 'Zur Liste', value: 'keep', cls: 'primary' }]);
      if (a === 'stay') return;
      if (a === 'drop') store.del(K_DRAFT);
    }
    ED = null; show('vList'); renderList();
  }
  function markBad(miss) {
    miss.forEach(m => { const el = document.querySelector('[data-f="' + m[0] + '"]'); if (el) el.classList.add('bad'); });
    const first = document.querySelector('[data-f="' + miss[0][0] + '"]');
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); const i = first.querySelector('input,textarea,button'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 300); }
  }

  let busy = false;
  async function publish(alsRoh) {
    if (busy || !ED) return;
    alsRoh = alsRoh === true;
    const v = formValues(), res = validate(v);
    if (res.miss.length) { toast('Bitte noch ergänzen: ' + res.miss.map(m => m[1]).join(', ') + '.'); markBad(res.miss); return; }
    if (res.fehler.length) { toast('Das Spiel passt nicht ins Format: ' + res.fehler.join('; ')); return; }
    const orig = ED.orig, path = (alsRoh ? ROH : DIR) + '/' + res.id + '.txt';
    if (orig && orig.text === res.text && orig.path === path) { toast(alsRoh ? 'Keine Änderungen zum Speichern.' : 'Keine Änderungen zum Veröffentlichen.'); return; }
    const changes = [{ path, content: res.text }];
    if (orig && orig.path !== path) changes.push({ path: orig.path, del: true });
    const umben = orig && orig.spiel.name !== res.g.name ? orig.spiel.name + ' → ' + res.g.name : res.g.name;
    const label = alsRoh ? (orig ? 'Rohfassung überarbeitet: ' + umben : 'Neue Rohfassung: ' + res.g.name)
      : orig && orig.roh ? 'Neues Spiel aus Rohfassung: ' + umben
      : orig ? 'Spiel überarbeitet: ' + umben : 'Neues Spiel: ' + res.g.name;
    const btn = alsRoh ? $('#btnRoh') : $('#btnPublish'), btnText = btn.textContent;
    busy = true; $('#btnPublish').disabled = true; $('#btnRoh').disabled = true; btn.textContent = alsRoh ? 'Wird gespeichert …' : 'Wird veröffentlicht …';
    let force = false;
    try {
      const sha = await commitWithChecks(changes, label, orig, path, () => force, f => { force = f; });
      store.del(K_DRAFT);
      if (alsRoh) toast('Als Rohfassung gespeichert. In der App ist sie nicht zu sehen.');
      else { addRun(sha, '„' + res.g.name + '“'); toast('Veröffentlicht. GitHub prüft das Spiel jetzt und stellt es online.'); }
      await refreshAfter();
      ED = null; show('vList'); renderList();
    } catch (e) {
      const nicht = alsRoh ? 'Nicht gespeichert' : 'Nicht veröffentlicht';
      if (e.abgebrochen) toast(nicht + '. Dein Entwurf bleibt gespeichert.');
      else toast(nicht + ': ' + explain(e) + ' Dein Entwurf bleibt gespeichert.');
    } finally {
      busy = false; $('#btnPublish').disabled = false; $('#btnRoh').disabled = false; btn.textContent = btnText;
    }
  }
  async function commitWithChecks(changes, message, orig, path, getForce, setForce) {
    return commit(changes, message, async head => {
      if (orig) {
        const now = await fileSha(orig.path, head);
        if (now === null && !getForce()) {
          const ok = await confirmBox('„' + orig.spiel.name + '“ wurde inzwischen auf einem anderen Gerät gelöscht. Trotzdem wieder veröffentlichen?', 'Veröffentlichen');
          if (!ok) throw Object.assign(new Error(''), { abgebrochen: true }); setForce(true);
          const di = changes.findIndex(c => c.del); if (di >= 0) changes.splice(di, 1);
        } else if (now !== orig.sha && !getForce()) {
          const ok = await confirmBox('„' + orig.spiel.name + '“ wurde inzwischen auf einem anderen Gerät geändert. Wenn du jetzt veröffentlichst, wird diese Änderung überschrieben.', 'Trotzdem überschreiben', 'danger');
          if (!ok) throw Object.assign(new Error(''), { abgebrochen: true }); setForce(true);
        }
      }
      if (!orig || orig.path !== path) {
        const name = path.split('/').pop();
        for (const p of [DIR + '/' + name, ROH + '/' + name]) {
          if (orig && orig.path === p) continue;
          if ((await fileSha(p, head)) !== null) throw new Error('Ein Spiel mit diesem Namen gibt es inzwischen schon. Lade die Liste neu und wähle einen anderen Namen.');
        }
      }
    });
  }
  async function remove() {
    if (busy || !ED || !ED.orig) return;
    const orig = ED.orig;
    if (!(await confirmBox('„' + orig.spiel.name + '“ wirklich aus der Spielesammlung entfernen?\n\nIn der GitHub-Historie bleibt jede Fassung erhalten.', 'Löschen', 'danger'))) return;
    busy = true; $('#btnDelete').disabled = true;
    try {
      const sha = await commit([{ path: orig.path, del: true }], 'Spiel gelöscht: ' + orig.spiel.name, async head => {
        const now = await fileSha(orig.path, head);
        if (now === null) throw Object.assign(new Error('schon gelöscht'), { schonWeg: true });
        if (now !== orig.sha && !(await confirmBox('„' + orig.spiel.name + '“ wurde inzwischen auf einem anderen Gerät geändert. Trotzdem löschen?', 'Löschen', 'danger')))
          throw Object.assign(new Error(''), { abgebrochen: true });
      });
      store.del(K_DRAFT);
      addRun(sha, '„' + orig.spiel.name + '“ gelöscht');
      toast('Gelöscht. Die Spielesammlung wird jetzt aktualisiert.');
      await refreshAfter(); ED = null; show('vList'); renderList();
    } catch (e) {
      if (e.schonWeg) { toast('Das Spiel war schon gelöscht.'); await refreshAfter(); ED = null; show('vList'); renderList(); }
      else if (!e.abgebrochen) toast('Nicht gelöscht: ' + explain(e));
    } finally { busy = false; $('#btnDelete').disabled = false; }
  }
  async function refreshAfter() { try { await loadGames(); } catch (e) {} }

  /* ---------- Start ---------- */
  buildChips('fAlter', F.ALTER.map(a => ({ id: a.id, label: a.label })));
  buildChips('fOrt', [{ id: 'drinnen', label: 'Drinnen' }, { id: 'draussen', label: 'Draußen' }]);
  buildChips('fPhasen', F.PHASEN.map(x => ({ id: x.id, label: x.label })));
  $('#form').addEventListener('input', changed);
  $('#form').addEventListener('submit', e => e.preventDefault());
  $('#btnLogin').onclick = login;
  $('#inToken').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#btnLogout').onclick = logout;
  $('#btnNew').onclick = () => openEdit(null);
  $('#inSearch').addEventListener('input', renderList);
  $('#btnBack').onclick = leaveEdit;
  $('#btnPublish').onclick = () => publish(false);
  $('#btnRoh').onclick = () => publish(true);
  $('#inArt').addEventListener('change', renderList);
  $('#btnDelete').onclick = remove;
  $('#tabPrev').onclick = () => setTab(false);
  $('#tabTxt').onclick = () => setTab(true);
  window.addEventListener('beforeunload', e => { if (ED && JSON.stringify(formValues()) !== ED.sig) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollRuns(); });
  start();
})();
