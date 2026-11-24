#!/usr/bin/env node
/* Baut aus allen spiele/*.txt die Datei spiele/alle.json, die die App lädt.
   Bricht mit Fehlercode ab, wenn eine Datei nicht ins Format MANNA-SPIEL v1 passt.

   node tools/build-spiele.js                 -> spiele/ nach spiele/alle.json
   node tools/build-spiele.js <ordner> <ziel> -> anderer Ordner / andere Zieldatei */
const fs = require('fs'), path = require('path');
const F = require(path.join(__dirname, '..', 'js', 'spielformat.js'));

const root = path.join(__dirname, '..');
const dir = path.resolve(process.argv[2] || path.join(root, 'spiele'));
const out = path.resolve(process.argv[3] || path.join(dir, 'alle.json'));

const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort();
const spiele = [], fehler = [], namen = new Map();
for (const f of files) {
  const id = f.slice(0, -4);
  const txt = fs.readFileSync(path.join(dir, f), 'utf8');
  const { spiel, fehler: fe } = F.parse(txt);
  fe.forEach(m => fehler.push(f + ': ' + m));
  if (spiel.name && F.slug(spiel.name) !== id) fehler.push(f + ': Dateiname passt nicht zum Namen, erwartet ' + F.slug(spiel.name) + '.txt');
  const key = spiel.name.toLowerCase();
  if (spiel.name && namen.has(key)) fehler.push(f + ': Name „' + spiel.name + '“ gibt es schon in ' + namen.get(key));
  namen.set(key, f);
  if (!fe.length && F.serialize(spiel) !== txt.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n'))
    console.warn('Hinweis: ' + f + ' ist nicht in der Standard-Schreibweise (wird trotzdem verwendet).');
  spiele.push(Object.assign({ id }, spiel));
}
if (fehler.length) {
  console.error('Spiele fehlerhaft:\n  ' + fehler.join('\n  '));
  process.exit(1);
}
spiele.sort((a, b) => a.name.localeCompare(b.name, 'de'));
fs.writeFileSync(out, JSON.stringify({ format: F.HEADER, spiele }) + '\n');
console.log(spiele.length + ' Spiele -> ' + path.relative(root, out));
