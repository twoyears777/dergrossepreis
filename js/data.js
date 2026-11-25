/* Der große Preis – Daten
   Version, Changelog, Feld-Modell und Vorlagen.
   Neue Vorlagen oder Changelog-Einträge nur hier eintragen. */

/* ---------- Version & Changelog ---------- */
const APP_VERSION='1.26.0';
const CHANGELOG=[
  {v:'1.26.0',d:'25.11.2026',items:[
    'Neu: Spiele mit dem Label „Erlebnispädagogik“, mit eigenem Filter in der Spielesammlung',
    'Neue Kachel „Erlebnispädagogik“ bei „Pädagogischer Kram“'
  ]},
  {v:'1.25.0',d:'24.11.2026',items:[
    'Neu: Suche in der Spielesammlung',
    'Neuer Filter nach Gruppenphase',
    'Neuer Artikel „Sicherheit“ bei „Pädagogischer Kram“',
    'Startseite aufgeräumt: mehr Fokus auf die Spielesammlung'
  ]},
  {v:'1.24.0',d:'24.11.2026',items:[
    'Neuer Artikel „Vier-Ohren-Modell“ bei „Pädagogischer Kram“',
    'Kacheln sind besser lesbar',
    'Impressum und Datenschutz sind jetzt vollständig',
    'Mehr Sicherheit und unter der Haube aufgeräumt'
  ]},
  {v:'1.23.0',d:'24.11.2026',items:[
    'Neuer Bereich „Pädagogischer Kram“ mit dem Artikel „Gruppenphasen“',
    'Spiele zeigen, in welche Gruppenphasen sie passen',
    'Neue Abschnitte „Pädagogische Gedanken“ und „Fragen zum Nachgespräch“ bei den Spielen',
    'Zurück-Knöpfe jetzt auch oben auf jeder Seite',
    'Die Spielesammlung steht jetzt an erster Stelle, und Überschriften passen auch aufs Handy'
  ]},
  {v:'1.22.0',d:'24.11.2026',items:[
    'Neue Seite „Gameshows“: Der große Preis, Eigenes Spiel und Countdown sind jetzt dort zusammengefasst',
    'Deutlich mehr Texte sind nun menschengemacht',
    'Halbe Punktzahl: Manna lost die andere Gruppe jetzt selbst aus',
    'Multiple Choice: Nach einer falschen Antwort bekommt eine ausgeloste Gruppe eine zweite Chance',
    'ACTION: Gewinnt die Gruppe, die das Feld gezogen hat, bekommt sie die doppelte Punktzahl',
    'Minuspunkte entfernt, damit das Spiel schlank bleibt'
  ]},
  {v:'1.21.0',d:'24.11.2026',items:[
    'Auch Material, Varianten und Gefahren zeigen Aufzählungszeichen nur noch dort, wo du sie selbst gesetzt hast',
    'Favorisieren von Spielen und entsprechende Filter',
    'Neuer Knopf „Zufälliges Spiel“ in der Spielesammlung',
    'Manna bittet den Browser, deine gespeicherten Spiele nicht von selbst zu löschen',
    'Neue Spiele erscheinen jetzt beim Öffnen der Spielesammlung, ohne dass Manna neu gestartet werden muss'
  ]},
  {v:'1.20.0',d:'24.11.2026',items:[
    'Neue Seite „Rechtliches“ mit Impressum, Datenschutz und weiteren Hinweisen, verlinkt unten auf der Startseite',
    'Die Seite funktioniert auch offline',
    'Anleitungen zeigen Aufzählungszeichen und Nummern nur noch dort, wo du sie selbst gesetzt hast'
  ]},
  {v:'1.19.0',d:'24.11.2026',items:[
    'Neu auf der Startseite: eine kurze Erklärung, was Manna kann, mit Link zur Vision',
    'Neue Screenshots auf der Startseite: Der große Preis, Eigenes Spiel, Countdown und Spielesammlung',
    'Der große Preis, Eigenes Spiel und Countdown gibt es vorerst nur am Laptop oder PC. Auf Handy und Tablet kommt ein Hinweis, die Spielesammlung bleibt dort nutzbar'
  ]},
  {v:'1.18.0',d:'24.11.2026',items:[
    'Spielesammlung verschlankt: „Spiel erstellen“ und „Spiel einsenden“ gibt es nicht mehr',
    'Neue Spiele erscheinen in der Spielesammlung jetzt ohne App-Update',
    'Die Sicherung enthält keine selbst erstellten Sammlungsspiele mehr. Ältere Sicherungen lassen sich weiter einspielen'
  ]},
  {v:'1.17.1',d:'23.11.2026',items:[
    'Neues Spiel in der Spielesammlung: Simon Says'
  ]},
  {v:'1.17.0',d:'23.11.2026',items:[
    'Spielesammlung: neuer Knopf „Spiel erstellen“ mit Eingabemaske für alle Angaben eines Spiels',
    'Eigene Spiele erscheinen sofort in der Sammlung, markiert als „eigenes“, und lassen sich bearbeiten und löschen',
    '„Spiel einsenden“ öffnet eine fertige E-Mail. Eingesendete Spiele werden geprüft und kommen dann für alle in die Sammlung',
    'Die Sicherung enthält jetzt auch selbst erstellte Spiele'
  ]},
  {v:'1.16.0',d:'23.11.2026',items:[
    'Neuer Name: Manna, mit neuem Logo und App-Symbol',
    'Die Startseite und die Zuschaueransicht im Startmenü zeigen jetzt das Manna-Logo',
    'Sicherungen und Exporte heißen jetzt „manna-…“, alte Dateien lassen sich weiter einspielen'
  ]},
  {v:'1.15.0',d:'23.11.2026',items:[
    'Neu auf der Startseite: Eigenes Spiel',
    'Eigene Spiele anlegen mit Gruppen, frei wählbarer Rundenzahl und Punktevergabe (gleich viele pro Runde oder jede Runde einen mehr, nur Sieger oder mehrere Plätze)',
    'Jede Runde hat eine Titelfolie und eine Erklärung, dazu beliebig viele weitere Folien mit Text und Bild',
    'Punkte live zählen, immer sichtbar oben auf dem Bildschirm, mit Rückgängig und Siegerehrung am Ende',
    'Eigene Spiele speichern, exportieren, importieren und mit Zuschaueransicht spielen',
    'Die Sicherung enthält jetzt auch die eigenen Spiele'
  ]},
  {v:'1.14.0',d:'23.11.2026',items:[
    'Neues Werkzeug auf der Startseite: Countdown',
    'Zeit per Schnellauswahl oder Plus/Minus einstellen, Start, Pause und Zurücksetzen',
    'Mit Zuschaueransicht: Der Beamer zeigt erst nur den Hintergrund, dann den Countdown und am Ende „Zeit vorbei!“'
  ]},
  {v:'1.13.0',d:'23.11.2026',items:[
    'Spielesammlung: neuer Bereich „Gefahren und Risiken“ bei jedem Spiel',
    'Neue Spiele: Zeitungsschlagen und Nachts in Palermo (mit Rollenliste zum Abschreiben)',
    'Musterspiel entfernt',
    'Startseite: mehr Platz unter dem Titel'
  ]},
  {v:'1.12.0',d:'23.11.2026',items:[
    'Neu auf der Startseite: Spielesammlung mit Filtern für Alter, Personenzahl, drinnen/draußen und Material',
    'Detailseite für jedes Spiel mit Ablauf, Material, Varianten und Tipp',
    'Erstes Musterspiel: Zip Zap Boing'
  ]},
  {v:'1.11.0',d:'23.11.2026',items:[
    'Startseite heißt jetzt „Die Spiele“',
    'Screenshot-Collage aus dem Spiel statt der Illustration',
    'Neue Bereiche „Genau das, was du brauchst!“ und „Unsere Vision“',
    '„So funktioniert\'s“ erklärt die Zuschaueransicht am Laptop',
    'Neu im Spielmenü: „Erklärung“ mit Spielablauf, Feldtypen, Sonderregeln und Tipps fürs Spielleiten',
    'Tipp zum Teilen von Vorlagen auf der Vorlagen-Seite'
  ]},
  {v:'1.10.0',d:'23.11.2026',items:[
    'Sicherung: Hinweis im Spielmenü, wenn Änderungen noch nicht als Datei gesichert sind',
    'Sicherung erstellen und einspielen unter „Einstellungen“ – enthält Spielbrett und alle eigenen Vorlagen',
    'Nach dem Speichern einer Vorlage wird direkt die Sicherung als Datei angeboten',
    'Neue Vorlage: Weihnachtsquiz',
    'Technisch aufgeräumt: Code in übersichtliche Dateien aufgeteilt, alte Reste entfernt',
    'Automatische Tests prüfen jede neue Version'
  ]},
  {v:'1.9.0',d:'23.11.2026',items:[
    'Neue Siegerehrung: Treppchen aus Pappe, Platz 3, 2 und 1 werden nacheinander enthüllt, der Sieger mit Trommelwirbel',
    'Mit Zuschaueransicht siehst du bei der Siegerehrung nur den Knopf „Zurück zum Startmenü“',
    'Spielmenü aufgeräumt: „Vorlagen“ und „Einstellungen“ als eigene Unterseiten, keine Untertitel mehr',
    '„Neues Spiel mit aktuellem Spielbrett“ und „Neues Spiel mit leerem Spielbrett“',
    'Keine Emojis mehr – Knöpfe mit schlichten Symbolen',
    'Kräftigere Schrift statt Schreibmaschine und Handschrift',
    'Startseite ohne Untertitel, Illustration ohne Bildunterschrift',
    'Changelog zeigt nur noch die Versionsnummern'
  ]},
  {v:'1.8.1',d:'23.11.2026',items:[
    'Startseite: Illustration einer Gruppe beim Spielen vor der Anleitung'
  ]},
  {v:'1.8.0',d:'23.11.2026',items:[
    'Anleitung auf der Startseite: in vier Schritten vom Spielbrett bis zum Beamer, dazu alle Feldtypen erklärt'
  ]},
  {v:'1.7.1',d:'23.11.2026',items:[
    'Neu: Spiel vorzeitig beenden mit Siegerehrung – über die Zielflagge oben links im Spiel oder im Spielmenü',
    'Fehler behoben: Das Fenster „Was ist neu?“ nach einem Update war leer'
  ]},
  {v:'1.7.0',d:'23.11.2026',items:[
    'Neues Design: Collage-Look mit Zeitungsschnipseln, Papier und Klebeband – ruhiger und entspannter',
    'Überschriften wie aus ausgeschnittenen Buchstaben zusammengeklebt',
    'Gedämpfte Gruppenfarben statt Neon (bestehende Standardfarben werden automatisch angepasst)'
  ]},
  {v:'1.6.0',d:'23.11.2026',items:[
    'Neues Design im 2000er-Look: Aqua-Gel-Felder, Chrom-Schrift, Fenster mit Titelleiste',
    'Fragen öffnen sich als Fenster – das Kreuz oben rechts schließt sie (Feld bleibt offen)',
    'Keine Schriften mehr von Google-Servern – besser für Datenschutz und offline'
  ]},
  {v:'1.5.1',d:'23.11.2026',items:[
    'Fehler behoben: Animationen liefen nicht mehr auf dem eigenen Gerät, sobald irgendwo eine Zuschaueransicht offen war – sie laufen jetzt immer',
    'Eine Zuschaueransicht im Hintergrund-Tab zählt nicht mehr als „verbunden“',
    'Changelog hat jetzt ein Kreuz zum Schließen (auch Tippen daneben schließt)'
  ]},
  {v:'1.5.0',d:'23.11.2026',items:[
    'Versionsnummer unten im Menü – antippen öffnet den Changelog',
    'Aufgaben bekommen eine eigene Intro-Animation („AUFGABE!“)',
    'Nach Aufgaben und ACTION-Feldern gibt es eine Ergebnis-Animation: „GESCHAFFT!“, „GEWONNEN!“ oder „LEIDER NICHT!“',
    'Multiple Choice: Antwort antippen loggt sie ein (änderbar), „Auflösen“ deckt sie mit Trommelwirbel auf',
    'Eigene Vorlagen: aktuelles Spielbrett als Vorlage speichern, Vorlagen löschen, als Datei exportieren und wieder importieren',
    'Gelöschte Standard-Vorlagen lassen sich wiederherstellen',
    'Menü aufgeräumt: „Spielbrett bearbeiten“ und „Zuschaueransicht“ unter „Einstellungen“'
  ]},
  {v:'1.4.1',d:'23.11.2026',items:[
    'Kein Umschalten mehr nötig: Die App startet in der Moderatoransicht, „Zuschaueransicht zeigen“ öffnet automatisch ein zweites Fenster für den Beamer',
    'Sobald die Zuschaueransicht verbunden ist, siehst nur du die Lösungen – wird sie geschlossen, verhält sich die App wieder wie gespiegelt'
  ]},
  {v:'1.4.0',d:'23.11.2026',items:[
    'Neues Startmenü: erst das Spiel auswählen, dann Weiterspielen, Neues Spiel, Leeres Spiel oder eine Vorlage',
    'Vorlagen: „Gemischtes Quiz“ und neu „Bibel-Quiz“',
    'Zwei-Bildschirm-Modus: Der Beamer zeigt nur die Show, du siehst Lösungen, richtige MC-Antwort und alle Knöpfe vorab',
    'Zuschaueransicht mit Startbild („Gleich geht\'s los!“), ACTION-Animation, Punkte-Animation und Siegerehrung',
    'Bei Schätzfragen sieht der Beamer nur „abgegeben“, bis du auflöst',
    'Haus-Knopf im Spiel führt zurück ins Menü'
  ]},
  {v:'1.3.0',d:'23.11.2026',items:[
    'Neue Fragetypen: Klassisch, Multiple Choice und Schätzfrage',
    'Multiple Choice: bis zu 4 Antworten (A–D). Antippen zeigt sofort richtig (grün) oder falsch (rot)',
    'Schätzfrage: Jede Gruppe trägt ihre Zahl ein, „Auflösen“ zeigt die Lösung und markiert automatisch die Gruppe, die am nächsten dran ist (bei Gleichstand mehrere)',
    'Beispielbrett: Schätzen-Kategorie als Schätzfragen, zwei Multiple-Choice-Fragen in Allgemeinwissen'
  ]},
  {v:'1.2.0',d:'23.11.2026',items:[
    'Aufgabe & ACTION: nur noch Text mit Erklärung, ohne Lösung oder Hinweis',
    'Aufgabe: Punkte nur für die Gruppe, die dran ist (keine halbe Punktzahl für andere)',
    'ACTION: Alle Gruppen spielen mit, du wählst den Gewinner (auch mehrere bei Gleichstand), jede Gewinner-Gruppe bekommt die volle Punktzahl',
    'Halbe Punktzahl für eine andere Gruppe gibt es nur noch bei Fragen'
  ]},
  {v:'1.1.0',d:'23.11.2026',items:[
    'Läuft jetzt über GitHub Pages und als App auf dem Home-Bildschirm – auch komplett offline',
    'Automatische Updates: Neue Versionen werden im WLAN im Hintergrund geladen',
    'Changelog in den Einstellungen und „Was ist neu“-Hinweis nach einem Update',
    'Neu: „Halbe Punktzahl für …“ – eine andere Gruppe bekommt die halben Punkte',
    'Neu: Feldtyp ACTION mit Überraschungs-Animation beim Aufdecken',
    'Countdown-Timer entfernt',
    'Beispielbrett nur noch mit Fragen (ohne Spiele/Aufgaben)'
  ]},
  {v:'1.0.0',d:'23.11.2026',items:[
    'Erste Version: Spielbrett mit 5 Kategorien, Live-Punktestand, Gruppen, Fragen & Aufgaben, Siegerehrung'
  ]}
];

/* ---------- Feld-Modell ---------- */
const TYPES=['frage','mc','schaetz','aufgabe','action'];
const blank=()=>({type:'frage',text:'',answer:'',options:['','','',''],correct:0,unit:''});
const F=(text,answer)=>Object.assign(blank(),{type:'frage',text,answer});
const MC=(text,options,correct)=>Object.assign(blank(),{type:'mc',text,options,correct});
const EST=(text,answer,unit)=>Object.assign(blank(),{type:'schaetz',text,answer:String(answer),unit:unit||''});

/* ---------- Vorlagen ---------- */
const TEMPLATES=[
  {id:'mix',name:'Gemischtes Quiz',title:'Der große Preis',desc:'Allgemeinwissen, Bibel, Sport, Schätzen, Natur & Tiere – mit allen Fragetypen',
   categories:()=>[
      {name:'Allgemeinwissen',items:[
        F('Wie viele Beine hat eine Spinne?','8'),
        MC('Wie heißt die Hauptstadt von Australien?',['Sydney','Canberra','Melbourne','Perth'],1),
        F('Wie viele Bundesländer hat Deutschland?','16'),
        MC('Welches chemische Element hat das Symbol „Au“?',['Silber','Aluminium','Gold','Argon'],2),
        F('In welchem Jahr fiel die Berliner Mauer?','1989')]},
      {name:'Bibel',items:[
        F('Wer baute die Arche?','Noah'),
        F('Wie viele Jünger hatte Jesus?','12'),
        F('In welcher Stadt wurde Jesus geboren?','Bethlehem'),
        F('Wie hieß der Riese, den David besiegt hat?','Goliat'),
        F('Wie viele Bücher hat die Bibel (evangelische Ausgabe)?','66')]},
      {name:'Sport',items:[
        F('Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?','11'),
        F('Wie oft wurde die deutsche Männer-Nationalmannschaft Fußball-Weltmeister?','4-mal (1954, 1974, 1990, 2014)'),
        F('Wie lang ist ein Marathon?','42,195 km'),
        F('In welcher Sportart gibt es einen „Birdie“?','Golf'),
        F('In welcher deutschen Stadt fanden 1972 die Olympischen Sommerspiele statt?','München')]},
      {name:'Schätzen',items:[
        EST('Wie viele Minuten hat ein Tag?',1440,'Minuten'),
        EST('Wie hoch ist der Eiffelturm (in Metern)?',330,'m'),
        EST('Wie viele Millionen Einwohner hat Deutschland?',84,'Millionen'),
        EST('Wie viele Knochen hat ein erwachsener Mensch?',206,'Knochen'),
        EST('Wie viele Kilometer ist der Mond von der Erde entfernt?',384400,'km')]},
      {name:'Natur & Tiere',items:[
        F('Welches ist das größte Säugetier der Welt?','Blauwal'),
        F('Wie nennt man ein Känguru-Baby?','Joey'),
        F('Wie viele Herzen hat ein Oktopus?','3'),
        F('Welcher Planet ist der Sonne am nächsten?','Merkur'),
        F('Welches Tier schläft bis zu 22 Stunden am Tag?','Koala')]}
    ]},
  {id:'bibel',name:'Bibel-Quiz',title:'Der große Bibel-Preis',desc:'Altes & Neues Testament, Personen, Wunder & Gleichnisse, Bibel-Schätzfragen',
   categories:()=>[
      {name:'Altes Testament',items:[
        F('Wer baute die Arche?','Noah'),
        F('An wie vielen Tagen erschuf Gott die Welt, bevor er am siebten Tag ruhte?','6'),
        F('Wer führte das Volk Israel aus Ägypten?','Mose'),
        MC('Wie hieß die Frau von Abraham?',['Rebekka','Sara','Rahel','Lea'],1),
        MC('Wie viele Plagen kamen über Ägypten?',['7','10','12','40'],1)]},
      {name:'Neues Testament',items:[
        F('In welcher Stadt wurde Jesus geboren?','Bethlehem'),
        F('Wie viele Jünger hatte Jesus?','12'),
        MC('Wie viele Evangelien gibt es im Neuen Testament?',['3','4','5','12'],1),
        F('Welcher Jünger hat Jesus verraten?','Judas (Iskariot)'),
        F('Wie heißt das letzte Buch der Bibel?','Die Offenbarung (des Johannes)')]},
      {name:'Personen',items:[
        F('Wer besiegte den Riesen Goliat?','David'),
        MC('Wie hieß der Bruder von Mose?',['Aaron','Josua','Kaleb','Elia'],0),
        F('Wer war der erste König Israels?','Saul'),
        F('Welcher Jünger ging Jesus auf dem Wasser entgegen?','Petrus'),
        F('Wie hieß der Zöllner, der auf einen Baum kletterte, um Jesus zu sehen?','Zachäus')]},
      {name:'Wunder & Gleichnisse',items:[
        F('Was verwandelte Jesus bei der Hochzeit zu Kana?','Wasser in Wein'),
        MC('Wie viele Brote hatte Jesus bei der Speisung der Fünftausend?',['2','5','7','12'],1),
        F('Welche Tiere hütete der verlorene Sohn, als es ihm ganz schlecht ging?','Schweine'),
        F('Welchen Freund weckte Jesus nach vier Tagen im Grab wieder auf?','Lazarus'),
        F('In welchem Gleichnis hilft ein Mann einem Überfallenen, an dem andere vorbeigegangen sind?','Der barmherzige Samariter')]},
      {name:'Bibel-Schätzfragen',items:[
        EST('Wie viele Bücher hat die Bibel (evangelische Ausgabe)?',66,'Bücher'),
        EST('Wie viele Tage und Nächte regnete es bei der Sintflut?',40,'Tage'),
        EST('Wie viele Psalmen gibt es?',150,'Psalmen'),
        EST('Wie viele Männer wurden bei der Speisung mit fünf Broten und zwei Fischen satt?',5000,'Männer'),
        EST('Wie alt wurde Methusalem laut Bibel?',969,'Jahre')]}
   ]},
  {id:'weihnachten',name:'Weihnachtsquiz',title:'Der große Weihnachtspreis',desc:'Weihnachtsgeschichte, Weihnachten weltweit, Klassiker, Plätzchen & Co., Schätzfragen',
   categories:()=>[
      {name:'Weihnachtsgeschichte',items:[
        F('Wie hießen die Eltern von Jesus?','Maria und Josef'),
        F('In welcher Stadt wurde Jesus geboren?','Bethlehem'),
        MC('Wem erschienen die Engel in der Weihnachtsnacht auf dem Feld?',['Den Hirten','Den Weisen','Den Soldaten','Den Wirtsleuten'],0),
        MC('Was brachten die Weisen aus dem Morgenland mit?',['Gold, Weihrauch und Myrrhe','Gold, Silber und Seide','Brot, Wein und Öl','Myrrhe, Zimt und Gold'],0),
        F('In welchen zwei Evangelien wird die Geburt Jesu erzählt?','Matthäus und Lukas')]},
      {name:'Weihnachten weltweit',items:[
        MC('An welchem Tag ist in Deutschland Heiligabend?',['23. Dezember','24. Dezember','25. Dezember','6. Januar'],1),
        F('Wie heißt der Weihnachtsmann in Großbritannien?','Father Christmas'),
        MC('In welchem Land isst man an Weihnachten traditionell gern Fast-Food-Hähnchen?',['USA','Japan','Brasilien','Australien'],1),
        F('Welche Stadt in Finnland gilt als Wohnort des Weihnachtsmanns?','Rovaniemi'),
        MC('In welchem Land bringt die Hexe Befana am 6. Januar Geschenke?',['Spanien','Italien','Polen','Griechenland'],1)]},
      {name:'Klassiker',items:[
        F('Wie heißt das Rentier mit der roten Nase?','Rudolph'),
        MC('In welchem Land wurde der Adventskranz erfunden?',['Deutschland','Schweden','Italien','USA'],0),
        F('Wer hat den Adventskranz erfunden?','Johann Hinrich Wichern'),
        MC('Wer komponierte das Ballett „Der Nussknacker“?',['Tschaikowsky','Mozart','Bach','Beethoven'],0),
        F('Wie heißt der geizige Hauptcharakter in Charles Dickens’ „Eine Weihnachtsgeschichte“?','Ebenezer Scrooge')]},
      {name:'Plätzchen & Co.',items:[
        F('Wie heißt das Weihnachtsgebäck mit Rosinen, für das Dresden berühmt ist?','Stollen'),
        MC('Woraus besteht Marzipan hauptsächlich?',['Mandeln und Zucker','Nüssen und Honig','Mehl und Butter','Kokos und Zucker'],0),
        F('Wie heißt das heiße Getränk aus Rotwein und Gewürzen vom Weihnachtsmarkt?','Glühwein'),
        MC('Aus welcher Stadt kommen die berühmten Lebkuchen mit geschützter Herkunftsbezeichnung?',['Nürnberg','Köln','Dresden','Lübeck'],0),
        F('Was bedeutet das Wort „Advent“ übersetzt?','Ankunft')]},
      {name:'Weihnachts-Schätzfragen',items:[
        EST('Wie viele Türchen hat ein klassischer Adventskalender?',24,'Türchen'),
        EST('Wie viele Strophen hatte „Stille Nacht, heilige Nacht“ im Original?',6,'Strophen'),
        EST('In welchem Jahr wurde „Stille Nacht, heilige Nacht“ zum ersten Mal gesungen?',1818,''),
        EST('Wie viele Kilometer sind es Luftlinie von Berlin nach Bethlehem?',2900,'km'),
        EST('Wie viele Sekunden hat der Heiligabend?',86400,'Sekunden')]}
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
