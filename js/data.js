/* Manna – Einstellungen der App
   Version und Changelog, Schalter für die Gameshows, Filter der Spielesammlung.
   Changelog-Einträge nur hier eintragen. Gameshow-Vorlagen stehen in js/gameshow-vorlagen.js,
   die Spiele selbst in spiele/*.txt, die Artikel in js/artikel.js. */

/* ---------- Version & Changelog ---------- */
/* ---------- Gameshows an/aus ----------
   Gameshows (Der große Preis, Eigenes Spiel, Countdown) sind vorerst ausgeblendet. Der Code bleibt komplett drin.
   Wieder einschalten: GAMESHOWS_AN auf true setzen.
   Nur im eigenen Browser zum Testen einschalten: in der Konsole localStorage.manna_gameshows='1' und neu laden. */
const GAMESHOWS_AN=false;
const GAMESHOWS=GAMESHOWS_AN||(()=>{try{return localStorage.getItem('manna_gameshows')==='1';}catch(e){return false;}})();

const APP_VERSION='1.34.0';
const CHANGELOG=[
  {v:'1.34.0',d:'27.11.2026',items:[
    'Neue Features implementiert',
    'Technische Optimierung'
  ]},
  {v:'1.33.0',d:'27.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.32.0',d:'27.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.31.0',d:'26.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.28.0',d:'25.11.2026',items:[
    'Neues Feature implementiert'
  ]},
  {v:'1.27.0',d:'25.11.2026',items:[
    'Neues Feature implementiert',
    'Design angepasst'
  ]},
  {v:'1.26.0',d:'25.11.2026',items:[
    'Neues Feature implementiert'
  ]},
  {v:'1.25.0',d:'24.11.2026',items:[
    'Neue Features implementiert',
    'Design angepasst'
  ]},
  {v:'1.24.0',d:'24.11.2026',items:[
    'Neues Feature implementiert',
    'Design angepasst',
    'Technische Optimierung'
  ]},
  {v:'1.23.0',d:'24.11.2026',items:[
    'Neue Features implementiert',
    'Design angepasst'
  ]},
  {v:'1.22.0',d:'24.11.2026',items:[
    'Neue Features implementiert',
    'Technische Optimierung'
  ]},
  {v:'1.21.0',d:'24.11.2026',items:[
    'Neue Features implementiert',
    'Technische Optimierung'
  ]},
  {v:'1.20.0',d:'24.11.2026',items:[
    'Neues Feature implementiert',
    'Technische Optimierung'
  ]},
  {v:'1.19.0',d:'24.11.2026',items:[
    'Neues Feature implementiert',
    'Design angepasst'
  ]},
  {v:'1.18.0',d:'24.11.2026',items:[
    'Technische Optimierung'
  ]},
  {v:'1.17.0',d:'23.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.16.0',d:'23.11.2026',items:[
    'Design angepasst'
  ]},
  {v:'1.15.0',d:'23.11.2026',items:[
    'Neues Feature implementiert'
  ]},
  {v:'1.14.0',d:'23.11.2026',items:[
    'Neues Feature implementiert'
  ]},
  {v:'1.13.0',d:'23.11.2026',items:[
    'Neues Feature implementiert',
    'Design angepasst'
  ]},
  {v:'1.12.0',d:'23.11.2026',items:[
    'Neues Feature implementiert'
  ]},
  {v:'1.11.0',d:'23.11.2026',items:[
    'Neue Features implementiert',
    'Design angepasst'
  ]},
  {v:'1.10.0',d:'23.11.2026',items:[
    'Neue Features implementiert',
    'Technische Optimierung'
  ]},
  {v:'1.9.0',d:'23.11.2026',items:[
    'Neue Features implementiert',
    'Design angepasst'
  ]},
  {v:'1.8.1',d:'23.11.2026',items:[
    'Design angepasst'
  ]},
  {v:'1.8.0',d:'23.11.2026',items:[
    'Neues Feature implementiert'
  ]},
  {v:'1.7.1',d:'23.11.2026',items:[
    'Neues Feature implementiert',
    'Bug-Fix'
  ]},
  {v:'1.7.0',d:'23.11.2026',items:[
    'Design angepasst'
  ]},
  {v:'1.6.0',d:'23.11.2026',items:[
    'Design angepasst',
    'Technische Optimierung'
  ]},
  {v:'1.5.1',d:'23.11.2026',items:[
    'Bug-Fix',
    'Stabilität verbessert'
  ]},
  {v:'1.5.0',d:'23.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.4.1',d:'23.11.2026',items:[
    'Technische Optimierung'
  ]},
  {v:'1.4.0',d:'23.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.3.0',d:'23.11.2026',items:[
    'Neue Features implementiert'
  ]},
  {v:'1.2.0',d:'23.11.2026',items:[
    'Technische Optimierung'
  ]},
  {v:'1.1.0',d:'23.11.2026',items:[
    'Neue Features implementiert',
    'Technische Optimierung'
  ]},
  {v:'1.0.0',d:'23.11.2026',items:[
    'Erste Version'
  ]}
];

/* ---------- Spielesammlung ----------
   Die Spiele liegen als Textdateien in spiele/*.txt (Format: js/spielformat.js).
   Beim Veröffentlichen wird daraus spiele/alle.json gebaut, die App lädt sie beim Start.
   Neue Spiele brauchen deshalb keine neue Version. */
const AGE_GROUPS=MannaSpiel.ALTER.map(({id,label})=>({id,label}));
const SIZE_GROUPS=[
  {id:'s',label:'3–9',min:3,max:9},
  {id:'m',label:'10–19',min:10,max:19},
  {id:'l',label:'20–39',min:20,max:39},
  {id:'xl',label:'40 und mehr',min:40,max:9999}
];
