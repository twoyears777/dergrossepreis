/* Manna – anonyme Besucherzählung mit GoatCounter (ohne Cookies).
   Eigenes kleines Script statt count.js, damit nichts von fremden Servern nachgeladen wird.
   Zählt nur auf manna-games.de (nicht lokal, nicht in Tests) und nicht im Editor.
   Eigene Besuche ausschließen: einmal manna-games.de/#nicht-zaehlen aufrufen (wieder an: #wieder-zaehlen). */
(function () {
  try {
    if (!/(^|\.)manna-games\.de$/.test(location.hostname)) return;
    if (location.hash === '#nicht-zaehlen') { localStorage.setItem('skipgc', 't'); return; }
    if (location.hash === '#wieder-zaehlen') localStorage.removeItem('skipgc');
    if (localStorage.getItem('skipgc') === 't' || navigator.webdriver) return;
    var q = 'p=' + encodeURIComponent(location.pathname) +
      '&r=' + encodeURIComponent(document.referrer) +
      '&t=' + encodeURIComponent(document.title) +
      '&s=' + encodeURIComponent(screen.width) +
      '&rnd=' + Math.random().toString(36).slice(2);
    new Image().src = 'https://twoyears.goatcounter.com/count?' + q;
  } catch (e) { /* Zählung ist unwichtig, Manna läuft immer weiter */ }
})();
