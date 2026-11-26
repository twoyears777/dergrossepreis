# Roadmap – Manna

## Das Ziel
Eine App fürs iPhone für Jugendleiterinnen und Jugendleiter: Handy an den Beamer anschließen und eine Spieleshow haben, oder unterwegs spontan das passende Gruppenspiel finden.

Leitgedanke (siehe „Unsere Vision“ auf der Startseite): Ehrenamtliche sollen ohne viel Technik und ohne Vorbereitung einen guten Spieleabend gestalten können. Wir optimieren zuerst für Laptop und PC, danach fürs Handy.

## Strategie: erst Inhalt, dann Wachstum
- Der Fokus liegt darauf, möglichst viel **Hilfreiches für Jugendleiter** hineinzulegen: Spiele, Vorlagen und praktische Funktionen, die im Alltag fehlen.
- Erst wenn viel guter Inhalt da ist, soll das Projekt bewusst wachsen (Verbreitung). Davon profitiert es am meisten.
- Monetarisierung kommt erst, wenn das Tool groß und gut genutzt ist.
- Qualität vor Menge: lieber erprobte, gut beschriebene Inhalte als viele halbe.

---

## Etappen

### Etappe 0 – „Der große Preis“ ✔ (Stand: Version 1.11.0)
- Quiz-Gameshow mit Kategorien, Punkten und Gruppen
- Feldtypen: Frage, Multiple Choice, Schätzfrage, Aufgabe, ACTION
- Vorlagen (Gemischtes Quiz, Bibel-Quiz, Weihnachtsquiz), eigene Vorlagen, Export/Import, Sicherung
- Zuschaueransicht für den Beamer (zweites Fenster im selben Browser)
- Siegerehrung, Animationen, Collage-Design
- Offline-fähig, automatische Updates, automatische Tests

### Etappe 1 – Spielesammlung, erste Version (in Arbeit)
- ✔ Eintrag „Spielesammlung“ auf der Startseite neben „Der große Preis“ (Version 1.12.0)
- ✔ Übersichtliche Liste mit Filtern: Alter (Kinder 6–12, Jugendliche 13–17, Erwachsene 18+), Personen (3–9, 10–19, 20–39, 40 und mehr), drinnen/draußen, Material ja/nein
- ✔ Detailseite pro Spiel: Ablauf, Material, Rollen, Varianten, Gefahren und Risiken, Tipp (Version 1.13.0)
- ✔ Erste Spiele: Zeitungsschlagen, Nachts in Palermo
- ca. 20 erprobte Gruppenspiele mit Kurzbeschreibung, Ablauf, Material, Dauer, Gruppengröße (Inhalte kommen von dir)
- Später überlegen: Filter für Dauer und ruhig/wild, Zufallsknopf
- ✔ Suche in der Spielesammlung (Version 1.25.0) (durchsucht alle Texte, verzeiht Tippfehler und Umlaute, zeigt die Fundstelle; auf dem Handy sind die Filter eingeklappt)
- Später: Rollen bei „Nachts in Palermo“ anpassen und erweitern (weitere Sonderrollen, andere Verteilung)
- Hinweise zu Sicherheit und Körperkontakt, niemand wird bloßgestellt
- ✔ Artikel „Sicherheit“ (Version 1.25.0, Texte folgen) bei „Pädagogischer Kram“, erster Abschnitt „Was tun im Notfall?“ (Rahmen: Erste-Hilfe-Schein, Material, wo es liegt, Ablauf im Notfall, wen man kontaktiert)
- Idee für später: Anleitung zur Ersten Hilfe im Artikel „Sicherheit“
- Ziel: im Alltag schneller ein passendes Spiel finden als bisher

### Nebenbei – praktische Werkzeuge für den Alltag
- ✔ Countdown mit Moderator- und Zuschaueransicht (Version 1.14.0)
- ✔ **„Eigenes Spiel“** (Version 1.15.0)
  - Vorher alles einstellen: Gruppen, Anzahl der Runden (frei wählbar), Punktevergabe
  - Punktevergabe: entweder gleich viele Punkte pro Runde oder jede Runde gibt einen Punkt mehr (Runde 1 = 1 Punkt, Runde 2 = 2 Punkte usw.)
  - In den Einstellungen wählbar: nur der Rundensieger bekommt Punkte oder Punkte für mehrere Plätze
  - Jede Runde besteht aus einer Titelfolie (eigener Spieltitel) und einer Erklärungsfolie, bei Bedarf weitere Folien manuell einfügen
  - Folien mit Bildern per Upload (Bilder werden im Gerät gespeichert und beim Export mitgenommen)
  - Perspektivisch: Folien-Editor mit vielen weiteren Funktionen ausbauen (z. B. Runden verschieben, Folien während des Spiels einfügen, Countdown auf einer Folie, Vorlagen für eigene Spiele)
  - Live Punkte zählen, Punkte schön ins Design integriert und immer gut sichtbar
  - Mit Zuschaueransicht wie beim großen Preis, am Ende Siegerehrung
  - Eigene Spiele speichern, exportieren oder direkt starten
- Weitere Ideen: Gruppen einteilen (zufällig, nach Anzahl), Zufallsauswahl (Name ziehen, wer fängt an), Abendplaner (Ablauf eines Jugendkreises mit Zeiten)

### Gameshows: Anleitung und FAQ
- Ausführliche Anleitung im Bereich „Gameshows“: Beamer anschließen, Anzeige auf „Erweitern“ statt „Spiegeln“ (Windows-Taste + P, Mac: Systemeinstellungen → Displays), Zuschaueransicht öffnen, Fenster auf den Beamer ziehen, Vollbild
- Dazu ein FAQ mit typischen Fragen und Problemen
- Die Startseite erklärt das nicht mehr (die drei Schritte sind entfernt, Fokus auf Spielesammlung und Vision), die Anleitung gehört in den Bereich „Gameshows“

### Etappe 2 – Spielekiste ausbauen
- Ziel: 100 und mehr Spiele, bevor Manna breiter weitergegeben wird (Qualität vor Menge: mit eigenen Erfahrungen, Pädagogischen Gedanken und Gruppenphasen)
- ✔ **Spiele pflegen mit Editor** (Version 1.18.0): eigene Web-App unter `/editor/`, Spiele liegen als Textdateien in `spiele/`, Veröffentlichen direkt auf GitHub, neue Spiele erscheinen ohne App-Update
- Verworfen (Version 1.18.0): „Spiel erstellen“ und „Spiel einsenden“ in der App für alle Nutzer, die App bleibt erst einmal schlank
- Favoriten
- Teilen und Sicherung wie bei den Vorlagen
- Beamer-Anzeige: Regeln groß, Punktezähler für Gruppen

### Erstes Standbein – Web-App unter manna-games.de (als Nächstes)
- ✔ Domain manna-games.de mit GitHub Pages verbunden (24.11.2026), www.manna-games.de geht auch, die alte Adresse leitet weiter
- Am Laptop und PC voll nutzbar, mit allen Beamer-Funktionen
- ✔ Auf Handy und Tablet startet kein Beamer-Spiel (Der große Preis, Eigenes Spiel, Countdown). Stattdessen kommt die Meldung „Diese Funktion ist aktuell nur auf einem Laptop oder PC verfügbar.“, ohne dass etwas startet. Tablets über den Touchscreen erkennen (iPad meldet sich im Browser als Mac) (Version 1.19.0)
- ✔ Startseite: kurze Erklärung mit Link zur Vision, neue Screenshots (Version 1.19.0)
- ✔ Startseite entschlankt: zwei Kacheln, von Lukas neu geschrieben („Eine starke Spielesammlung“ und „Fertige Gameshows für den Beamer“) (Version 1.27.0)
- ✔ Anonyme Besucherzählung mit GoatCounter, ohne Cookies, Datenschutz angepasst (Version 1.27.0)
- Alles ohne Beamer (Spielesammlung, Vorlagen, Vorbereiten) bleibt auf Handy und Tablet nutzbar
- ✔ Arbeitgeber geklärt (24.11.2026), er befürwortet das Projekt
- ✔ Impressum und Datenschutzhinweis (Version 1.24.0)
- Code bleibt öffentlich (kostenloser App-Bau über GitHub). Bezahlinhalte später getrennt aufbewahren

### Etappe 3 – Handy-tauglich
- Spielekiste und alles ohne Beamer fürs iPhone optimieren (Bedienung, Layout, Schriftgrößen)
- Beamer-Spiele aufs Handy erst mit der App (→ Etappe 4)

### Zwischenschritt – Konto und Sync zwischen Geräten (vor der App)
- **Umgesetzt in Version 1.29.0** (liegt auf `naechstes-update`, noch nicht veröffentlicht)
- Ziel: Am PC oder Handy ein Spiel vorbereiten (z. B. Der große Preis) und es auf einem anderen Gerät nach der Anmeldung genauso abrufen
- Anmeldung mit E-Mail und Passwort (entschieden am 26.11.2026 statt E-Mail-Link: braucht weniger Mails, wichtig solange der eingebaute Mailversand von Supabase gilt)
- Gespeichert werden Vorlagen, vorbereitete Spiele, eigene Spiele und Favoriten (Favoriten bis dahin nur auf dem Gerät, nicht in der Sicherung)
- Manna bleibt offline nutzbar, abgeglichen wird bei Verbindung
- Dienst: **Supabase**, Projekt in Frankfurt (entschieden am 24.11.2026). Kein eigener Server, Manna bleibt auf GitHub Pages
  - Kostenloser Plan (Stand 11/2026): 50.000 aktive Nutzer im Monat, 500 MB Datenbank, 5 GB Datenverkehr, 1 GB Dateien. Ein Entwurf hat nur wenige KB, das reicht lange
  - Haken: Projekt pausiert nach einer Woche ohne Aktivität, keine automatischen Sicherungen
  - Phase 1, entwickeln und mit Kollegen testen: kostenlos
  - Phase 2, für Nutzer freigeben: Pro-Plan (ab 25 $ im Monat), ohne Pause und mit Sicherungen. Erst ab hier Kosten
  - Anmeldemails über ein eigenes Postfach verschicken (z. B. anmeldung@manna-games.de), der eingebaute Mailversand ist nur für Tests
  - Beim Einrichten prüfen: Frankfurt im kostenlosen Plan wählbar
  - Verworfen: Firebase (Anmeldung über US-Server), Appwrite (sperrt bei Überschreitung, kleiner Anbieter)
- Vorher: Datenschutzhinweis ergänzen, Vertrag zur Auftragsverarbeitung mit dem Anbieter
- Konto löschen löscht auch alle Entwürfe (DSGVO), Entwürfe exportierbar
- Ohne Konto bleibt alles wie bisher nutzbar. Bis dahin: Sicherung exportieren und auf dem anderen Gerät importieren
- Die iPhone-App nutzt das Konto dann von Anfang an

### Etappe 4 – iPhone-App
- Web-App als echte App verpacken, Bau automatisch über GitHub (ohne Mac)
- Test per TestFlight (Apple-Entwickler-Account nötig, ca. 99 € pro Jahr)
- Echter Zwei-Bildschirm-Modus: Handy steuert, Beamer zeigt die Show (HDMI-Adapter oder AirPlay). Erst damit gibt es die Beamer-Spiele auf Handy und Tablet
- Eigener Name für die App
- Daten sicher in der App speichern, Sync über das Manna-Konto (siehe Zwischenschritt)

### Etappe 5 – Verbreiten (erst wenn genug Inhalt da ist)
- Startpaket mit Vorlagen, Ankündigungstext
- Domain, Impressum, Datenschutz und Arbeitgeber sind ins erste Standbein vorgezogen

---

## Ideen-Sammlung
Ideen, die noch keiner Etappe fest zugeordnet sind. Neue Ideen kommen hier rein.

- **Alle Texte in deinen eigenen Worten:** Am Ende sollen alle Texte, die Nutzer sehen, von dir selbst formuliert sein, **vor allem der auf der Startseite**. Die bisherigen Texte klingen noch zu sehr nach KI (Startseite, Erklärung, Spielbeschreibungen, Hinweise, Changelog, Rechtliches).
  - Ab jetzt bei jeder Umsetzung: Ich schicke dir jeden Text, der für Nutzer sichtbar eingebaut werden soll. Du formulierst ihn in deinen Worten, ich übernehme deine Fassung.
  - Für die bestehenden Texte: Ich schicke sie dir nach und nach, du schreibst sie neu, ich baue sie ein. Anfang: die Erklärung auf der Startseite.
  - Bei rechtlichen Texten prüfe ich nach deiner Umformulierung, dass alle Pflichtangaben erhalten bleiben.

- Spielesammlung als zweite Säule neben der Gameshow (→ Etappe 1)
- **Designs für die Zuschaueransicht:** verschiedene Looks für den Beamer zum Auswählen (z. B. passend zu Anlass oder Jahreszeit), gültig für alle Spiele mit Zuschaueransicht
  - Zuerst: eine große Auswahl, die kostenlos zur Verfügung steht
  - Perspektivisch: zusätzliche Designs als Einmalkauf (siehe Finanzierung)
- Weitere Vorlagen, z. B. Kennenlernabend, Freizeit-Abschlussabend
- Später denkbar: Finanzierung – **kein Abo für Ehrenamtliche**, stattdessen Einmalkäufe; Grundausstattung bleibt kostenlos
  - Vorlagenpakete (Quiz-Themenpakete, günstiger Einstieg)
  - Geländespiele mit Material zum Ausdrucken (Rollenkarten, Stationen, Geschichte) – Premium-Angebot, muss real getestet sein
  - Besondere Beamerspiele als einmaliger Extra-Kauf (keine Namen/Logos von TV-Shows verwenden)
  - Zusätzliche Designs für die Zuschaueransicht als Einmalkauf (Grundauswahl bleibt kostenlos)
  - Ergänzend denkbar: Träger-Lizenz für Verbände/Kirchenbezirke, freiwilliger „Unterstützen“-Knopf
  - Vorher: ein Paket mit Kollegen testen (Zahlungsbereitschaft), Arbeitgeber/Gewerbe/Zahlungsanbieter klären
- **Sicherer speichern:** Im Browser kann der Speicher gelöscht werden (Safari räumt z. B. Daten von Seiten weg, die länger nicht geöffnet wurden). Zwischenschritte in der Web-Version: dauerhaften Speicher beim Browser anfragen, automatische Sicherung in einen Ordner (z. B. iCloud Drive oder OneDrive), wo der Browser das kann. Richtig sicher wird es in der App: Speicher in der App plus Sync über iCloud (→ Etappe 4)
- **Lieder / Liedtexte anzeigen:** erst sinnvoll, wenn das Speichern sicherer ist (am besten mit der App)
  - Keine direkte SongSelect-Anbindung möglich: CCLI nimmt keine neuen API-Partner mehr auf
  - Stattdessen: SongSelect-Dateien importieren oder Text einfügen, automatisch in Folien aufteilen, Anzeige über die Zuschaueransicht
  - CCLI-Angaben unten auf jeder Folie, Liste der gezeigten Lieder für die CCLI-Meldung
  - Keine Liedtexte mitliefern, nur was Nutzer selbst importieren (CCLI-Lizenz der Gemeinde nötig)
- Später: **Feedback-Button**, damit Nutzer Rückmeldung geben können (erst zur Testphase, Button-Text formuliert Lukas selbst)
- Später denkbar: Jugendliche spielen mit dem eigenen Handy mit (Buzzer, Schätzzahlen eintippen)

---

## Grundsätze für Design und Inhalte
- Collage-Look: Papierschnipsel, Klebeband, Erpresserbrief-Überschriften auf ruhigem, dunklem Grund
- Keine Emojis, schlichte Strich-Symbole für Knöpfe
- Schriften: Georgia, Futura (fett) – keine Schreibmaschinen- oder Handschrift
- Menüs ohne Untertitel, Bilder ohne Bildunterschrift
- Beispiel-Inhalte sorgfältig prüfen, keine Texte aus Büchern oder fremden Webseiten übernehmen

## Arbeitsweise
- Wünsche werden gesammelt und nummeriert, umgesetzt wird gesammelt auf Ansage („einbauen“)
- Jede Version bekommt einen Changelog-Eintrag (`js/data.js` und `CHANGELOG.md`)
- Vor jedem Update laufen die automatischen Tests (`tests/run_tests.py`)
