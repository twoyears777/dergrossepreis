/* Manna – Liste aller sichtbaren Texte
   Sammelt Texte aus den HTML-Seiten, den Artikeln und Texte in Anführungszeichen aus dem JavaScript
   und schreibt sie nach TEXTE.md. Hilft beim Überarbeiten der Texte in eigenen Worten.
   Aufruf: node tools/texte-liste.js
   Hinweis: Beim JavaScript ist es eine Schätzung (Sätze mit Leerzeichen und Buchstaben), technische Werte
   können durchrutschen, einzelne Wörter fehlen. Die Spiele selbst stehen in spiele/*.txt. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const out = ['# Texte in Manna', '', 'Automatisch erzeugt mit `node tools/texte-liste.js`. Nicht von Hand bearbeiten.', ''];

function htmlTexte(f) {
  const s = read(f).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '');
  const lines = s.split('\n'), found = [];
  lines.forEach((l, i) => {
    const attr = [...l.matchAll(/\b(?:placeholder|title|aria-label|alt)="([^"]*[A-Za-zÄÖÜäöüß][^"]*)"/g)].map(m => m[1]);
    const txt = l.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (txt && /[A-Za-zÄÖÜäöüß]{2}/.test(txt)) found.push([i + 1, txt]);
    attr.forEach(a => found.push([i + 1, '(Attribut) ' + a]));
  });
  return found;
}
function jsTexte(f) {
  const lines = read(f).split('\n'), found = [];
  lines.forEach((l, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(l)) return;
    for (const m of l.matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
      const t = (m[1] || m[2] || '').replace(/\$\{[^}]*\}/g, '…');
      if (/\s/.test(t) && /[A-Za-zÄÖÜäöüß]{3}/.test(t) && !/^[\w\s.#>:\-\[\]="(),*]+$/.test(t.replace(/[ÄÖÜäöüß]/g, 'a')) || /[ÄÖÜäöüß„“…–]/.test(t) && /\s/.test(t))
        found.push([i + 1, t.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()]);
    }
  });
  return found.filter(x => x[1]);
}
const section = (title, rows) => { if (!rows.length) return; out.push('## ' + title, ''); rows.forEach(([n, t]) => out.push(`- Z. ${n}: ${t}`)); out.push(''); };

['index.html', 'rechtliches.html', 'editor/index.html'].forEach(f => section(f, htmlTexte(f)));
const jsFiles = ['js/kern.js', 'js/preis.js', 'js/system.js', 'js/menues.js', 'js/zuschauer.js', 'js/sammlung.js', 'js/countdown.js', 'js/eigenes-spiel.js', 'js/konto.js', 'js/sync.js', 'js/konto-seite.js', 'js/data.js', 'js/artikel.js', 'editor/editor.js'];
jsFiles.forEach(f => section(f, jsTexte(f)));
fs.writeFileSync(path.join(ROOT, 'TEXTE.md'), out.join('\n') + '\n');
console.log('TEXTE.md geschrieben:', out.filter(l => l.startsWith('- ')).length, 'Texte');
