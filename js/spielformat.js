/* Manna – Textformat für die Spielesammlung (MANNA-SPIEL v1)
   Jedes Spiel liegt als Textdatei in spiele/<id>.txt.
   Diese Datei liest und schreibt das Format. Sie wird von der App, vom Editor
   (editor/) und vom Bau-Schritt (tools/build-spiele.js) gemeinsam benutzt. */
(function (root) {
  'use strict';
  const HEADER = 'MANNA-SPIEL v1';
  const ALTER = [
    { id: 'kinder', label: 'Kinder (6–12)', wort: 'kinder' },
    { id: 'jugend', label: 'Jugendliche (13–17)', wort: 'jugendliche' },
    { id: 'erwachsene', label: 'Erwachsene (18+)', wort: 'erwachsene' }
  ];
  const ORTE = [
    { id: 'drinnen', label: 'drinnen' },
    { id: 'draussen', label: 'draußen' }
  ];
  const OHNE_MAX = 9999;
  // einzeilige Angaben „Schlüssel: Wert“
  const FELDER = { 'Name': 'name', 'Kurzbeschreibung': 'kurz', 'Alter': 'alter', 'Personen': 'personen',
    'Ort': 'ort', 'Dauer': 'dauer', 'Rollen-Hinweis': 'rollenHinweis', 'Tipp': 'hinweis' };
  // Listen „Überschrift:“ und darunter eine Zeile pro Eintrag
  const LISTEN = { 'Material': 'material', 'Ablauf': 'ablauf', 'Rollen': 'rollen', 'Rollen-Tabelle': 'tabelle',
    'Varianten': 'varianten', 'Gefahren und Risiken': 'risiken' };
  const MARKER = /^\s*(?:[-*•–]|\d+[.)])\s+/;

  function slug(name) {
    return String(name || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const keins = a => a.length === 1 && /^(keins|keine|kein|-|–)$/i.test(a[0]);

  function parseAlter(v, err) {
    const out = [];
    v.split(/[,;/]|\bund\b/).map(s => s.trim()).filter(Boolean).forEach(w => {
      const s = w.toLowerCase(), a = ALTER.find(x => s === x.id || s.startsWith(x.wort));
      if (a) { if (!out.includes(a.id)) out.push(a.id); } else err('Alter: „' + w + '“ ist unbekannt (Kinder, Jugendliche, Erwachsene)');
    });
    return ALTER.map(a => a.id).filter(id => out.includes(id));
  }
  function parsePersonen(v, err) {
    let m = v.match(/^ab\s+(\d+)/i);
    if (m) return { min: +m[1], max: OHNE_MAX };
    m = v.match(/^(\d+)\s*(?:bis|-|–)\s*(\d+)/i);
    if (m && +m[2] >= +m[1]) return { min: +m[1], max: +m[2] };
    err('Personen: „' + v + '“ nicht verstanden (z. B. „8 bis 15“ oder „ab 20“)');
    return null;
  }
  function parseOrt(v, err) {
    const out = [];
    v.split(/[,;/]|\bund\b/).map(s => s.trim()).filter(Boolean).forEach(w => {
      const s = w.toLowerCase(), o = s.startsWith('drin') ? 'drinnen' : (s.startsWith('drau') ? 'draussen' : null);
      if (o) { if (!out.includes(o)) out.push(o); } else err('Ort: „' + w + '“ ist unbekannt (drinnen, draußen)');
    });
    return ORTE.map(o => o.id).filter(id => out.includes(id));
  }

  /* Freie Listen (Material, Ablauf, Varianten, Gefahren): Jede Zeile bleibt so, wie sie geschrieben wurde.
     „- Text“ = Aufzählungspunkt, „1. Text“ = nummerierter Schritt, ohne Zeichen = Absatz.
     Die Felder material, ablauf, varianten, risiken enthalten weiter die Einträge ohne Zeichen
     (für ältere App-Versionen und die Filter), die Fassung mit Zeichen steht in <feld>Zeilen. */
  const FREI = ['material', 'ablauf', 'varianten', 'risiken'];
  const PUNKT = /^\s*[-*•–]\s+/, NUMMER = /^\s*(\d+)[.)]\s+/;
  function zeile(t) {
    t = String(t || '').trim();
    if (PUNKT.test(t)) return '- ' + t.replace(PUNKT, '').trim();
    const m = t.match(NUMMER);
    if (m) return m[1] + '. ' + t.replace(NUMMER, '').trim();
    return t;
  }
  // Zeilen eines Feldes; ältere Daten ohne Zeilen: Ablauf nummeriert, sonst Punkte
  function zeilenVon(g, key) {
    const z = g && g[key + 'Zeilen'];
    if (Array.isArray(z) && z.length) return z;
    return ((g && g[key]) || []).map((x, n) => (key === 'ablauf' ? (n + 1) + '. ' : '- ') + x);
  }
  const ablaufZeilen = g => zeilenVon(g, 'ablauf');
  // Zeilen -> Blöcke: [{ typ: 'p'|'ul'|'ol', eintraege: [{ text, nr }] }]
  function ablaufBloecke(zeilen) {
    const out = [];
    (zeilen || []).forEach(z => {
      z = String(z || '').trim(); if (!z) return;
      let typ = 'p', text = z, nr = null;
      const m = z.match(NUMMER);
      if (PUNKT.test(z)) { typ = 'ul'; text = z.replace(PUNKT, '').trim(); }
      else if (m) { typ = 'ol'; nr = +m[1]; text = z.replace(NUMMER, '').trim(); }
      const last = out[out.length - 1];
      if (typ !== 'p' && last && last.typ === typ) last.eintraege.push({ text, nr });
      else out.push({ typ, eintraege: [{ text, nr }] });
    });
    return out;
  }
  function zeilenHtml(zeilen, esc) {
    return ablaufBloecke(zeilen).map(b => b.typ === 'p'
      ? '<p>' + esc(b.eintraege[0].text) + '</p>'
      : '<' + b.typ + '>' + b.eintraege.map(e => '<li' + (b.typ === 'ol' ? ' value="' + e.nr + '"' : '') + '>' + esc(e.text) + '</li>').join('') + '</' + b.typ + '>'
    ).join('');
  }
  const listeHtml = (g, key, esc) => zeilenHtml(zeilenVon(g, key), esc);
  const ablaufHtml = (g, esc) => listeHtml(g, 'ablauf', esc);

  /* Text -> Spiel. Gibt { spiel, fehler: [] } zurück. */
  function parse(text) {
    const fehler = [];
    const lines = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
    const raw = {}, lists = {}, zeilenRoh = {};
    let i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    if ((lines[i] || '').trim() !== HEADER) fehler.push('Die erste Zeile muss „' + HEADER + '“ sein');
    else i++;
    let cur = null;
    for (; i < lines.length; i++) {
      const line = lines[i], t = line.trim(), nr = i + 1;
      if (!t) continue;
      const isItem = MARKER.test(line);
      if (!isItem) {
        const lm = t.match(/^([^:]+):\s*$/);
        if (lm && LISTEN[lm[1].trim()]) {
          cur = LISTEN[lm[1].trim()];
          if (lists[cur]) fehler.push('Zeile ' + nr + ': „' + lm[1].trim() + '“ steht doppelt');
          lists[cur] = [];
          continue;
        }
        const fm = t.match(/^([^:]+):\s*(.*)$/);
        if (fm && FELDER[fm[1].trim()]) {
          const k = FELDER[fm[1].trim()];
          if (k in raw) fehler.push('Zeile ' + nr + ': „' + fm[1].trim() + '“ steht doppelt');
          raw[k] = fm[2].trim(); cur = null;
          continue;
        }
      }
      if (cur) {
        if (FREI.includes(cur)) { (zeilenRoh[cur] = zeilenRoh[cur] || []).push(zeile(t)); }
        lists[cur].push(cur === 'tabelle' ? t : t.replace(MARKER, '').trim());
        continue;
      }
      fehler.push('Zeile ' + nr + ' nicht verstanden: „' + t.slice(0, 60) + '“');
    }
    const err = m => fehler.push(m);
    const list = k => { const a = (lists[k] || []).map(clean).filter(Boolean); return keins(a) ? [] : a; };
    const frei = k => list(k).length ? (zeilenRoh[k] || []).map(clean).filter(Boolean) : [];
    const g = {
      name: clean(raw.name), kurz: clean(raw.kurz),
      alter: raw.alter ? parseAlter(raw.alter, err) : [],
      spieler: raw.personen ? parsePersonen(raw.personen, err) : null,
      ort: raw.ort ? parseOrt(raw.ort, err) : [],
      material: list('material'),
      dauer: /^(-|–)?$/.test(clean(raw.dauer)) ? '' : clean(raw.dauer),
      ablauf: list('ablauf'),
      ablaufZeilen: frei('ablauf'),
      materialZeilen: frei('material'),
      risikenZeilen: frei('risiken'),
      risiken: list('risiken')
    };
    const rl = list('rollen').map(l => { const p = l.indexOf(':'); return p > 0 ? { name: clean(l.slice(0, p)), text: clean(l.slice(p + 1)) } : { name: l, text: '' }; });
    const tz = (lists.tabelle || []).map(l => l.split('|').map(clean)).filter(z => z.some(Boolean));
    const rh = clean(raw.rollenHinweis);
    if (rl.length || tz.length || rh) {
      g.rollen = { liste: rl };
      if (tz.length) {
        if (tz.length < 2) fehler.push('Rollen-Tabelle: braucht eine Kopfzeile und mindestens eine Zeile');
        const n = tz[0].length;
        if (tz.some(z => z.length !== n)) fehler.push('Rollen-Tabelle: alle Zeilen brauchen gleich viele Spalten (getrennt mit |)');
        g.rollen.tabelle = { kopf: tz[0], zeilen: tz.slice(1) };
      }
      if (rh) g.rollen.hinweis = rh;
    }
    const v = list('varianten'); if (v.length) { g.varianten = v; g.variantenZeilen = frei('varianten'); }
    if (clean(raw.hinweis)) g.hinweis = clean(raw.hinweis);
    pflicht(g).forEach(m => fehler.push('Es fehlt: ' + m));
    if (!g.spieler) g.spieler = { min: 1, max: OHNE_MAX };
    return { spiel: g, fehler };
  }

  /* Welche Pflichtangaben fehlen? */
  function pflicht(g) {
    const miss = [];
    if (!g.name) miss.push('Name');
    if (!g.kurz) miss.push('Kurzbeschreibung');
    if (!g.alter || !g.alter.length) miss.push('Alter');
    if (!g.spieler) miss.push('Personen');
    if (!g.ort || !g.ort.length) miss.push('Ort');
    if (!g.ablauf || !g.ablauf.length) miss.push('Ablauf');
    return miss;
  }

  /* Spiel -> Text */
  function serialize(g) {
    const L = [HEADER];
    const one = s => clean(s);
    L.push('Name: ' + one(g.name));
    L.push('Kurzbeschreibung: ' + one(g.kurz));
    L.push('Alter: ' + ALTER.filter(a => (g.alter || []).includes(a.id)).map(a => a.label).join(', '));
    const sp = g.spieler || { min: 1, max: OHNE_MAX };
    L.push('Personen: ' + (sp.max >= OHNE_MAX ? 'ab ' + sp.min : sp.min + ' bis ' + sp.max));
    L.push('Ort: ' + ORTE.filter(o => (g.ort || []).includes(o.id)).map(o => o.label).join(', '));
    L.push('Dauer: ' + (one(g.dauer) || '-'));
    const block = (title, a, num, leer) => {
      a = (a || []).map(one).filter(Boolean);
      if (!a.length && !leer) return;
      L.push(''); L.push(title + ':');
      if (!a.length) L.push('- keins');
      a.forEach((x, n) => L.push((num ? (n + 1) + '. ' : '- ') + x));
    };
    const frei = (title, key, leer) => {
      const z = zeilenVon(g, key).map(one).filter(Boolean);
      if (!z.length && !leer) return;
      L.push(''); L.push(title + ':');
      if (!z.length) L.push('- keins');
      z.forEach(x => L.push(x));
    };
    frei('Material', 'material', true);
    frei('Ablauf', 'ablauf', true);
    const r = g.rollen;
    if (r) {
      block('Rollen', (r.liste || []).filter(x => one(x.name)).map(x => one(x.name) + (one(x.text) ? ': ' + one(x.text) : '')));
      if (r.tabelle && r.tabelle.kopf && r.tabelle.kopf.length) {
        L.push(''); L.push('Rollen-Tabelle:');
        [r.tabelle.kopf].concat(r.tabelle.zeilen || []).forEach(z => L.push(z.map(one).join(' | ')));
      }
      if (one(r.hinweis)) { L.push(''); L.push('Rollen-Hinweis: ' + one(r.hinweis)); }
    }
    frei('Varianten', 'varianten', false);
    frei('Gefahren und Risiken', 'risiken', true);
    if (one(g.hinweis)) { L.push(''); L.push('Tipp: ' + one(g.hinweis)); }
    return L.join('\n') + '\n';
  }

  const api = { HEADER, ALTER, ORTE, OHNE_MAX, slug, parse, serialize, pflicht, FREI, zeile, zeilenVon, ablaufZeilen, ablaufBloecke, zeilenHtml, listeHtml, ablaufHtml };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MannaSpiel = api;
})(typeof self !== 'undefined' ? self : this);
