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
- Später: Rollen bei „Nachts in Palermo“ anpassen und erweitern (weitere Sonderrollen, andere Verteilung)
- Hinweise zu Sicherheit und Körperkontakt, niemand wird bloßgestellt
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

### Etappe 2 – Spielekiste ausbauen
- ✔ **Spiele pflegen mit Editor** (Version 1.18.0): eigene Web-App unter `/editor/`, Spiele liegen als Textdateien in `spiele/`, Veröffentlichen direkt auf GitHub, neue Spiele erscheinen ohne App-Update
- Verworfen (Version 1.18.0): „Spiel erstellen“ und „Spiel einsenden“ in der App für alle Nutzer, die App bleibt erst einmal schlank
- Favoriten
- Teilen und Sicherung wie bei den Vorlagen
- Beamer-Anzeige: Regeln groß, Punktezähler für Gruppen

### Erstes Standbein – Web-App unter manna-games.de (als Nächstes)
- Domain manna-games.de mit GitHub Pages verbinden (vorher eigene Daten unter der alten Adresse exportieren)
- Am Laptop und PC voll nutzbar, mit allen Beamer-Funktionen
- **Wunsch:** Auf Handy und Tablet startet kein Beamer-Spiel (Der große Preis, Eigenes Spiel, Countdown). Stattdessen kommt die Meldung „Diese Funktion ist aktuell nur auf einem Laptop oder PC verfügbar.“, ohne dass etwas startet. Tablets über den Touchscreen erkennen (iPad meldet sich im Browser als Mac)
- Alles ohne Beamer (Spielesammlung, Vorlagen, Vorbereiten) bleibt auf Handy und Tablet nutzbar
- Vor dem Weitergeben: Arbeitgeber klären, Impressum und Datenschutzhinweis
- Code bleibt öffentlich (kostenloser App-Bau über GitHub). Bezahlinhalte später getrennt aufbewahren

### Etappe 3 – Handy-tauglich
- Spielekiste und alles ohne Beamer fürs iPhone optimieren (Bedienung, Layout, Schriftgrößen)
- Beamer-Spiele aufs Handy erst mit der App (→ Etappe 4)

### Etappe 4 – iPhone-App
- Web-App als echte App verpacken, Bau automatisch über GitHub (ohne Mac)
- Test per TestFlight (Apple-Entwickler-Account nötig, ca. 99 € pro Jahr)
- Echter Zwei-Bildschirm-Modus: Handy steuert, Beamer zeigt die Show (HDMI-Adapter oder AirPlay). Erst damit gibt es die Beamer-Spiele auf Handy und Tablet
- Eigener Name für die App
- Daten sicher in der App speichern, Sync und Sicherung über iCloud

### Etappe 5 – Verbreiten (erst wenn genug Inhalt da ist)
- Startpaket mit Vorlagen, Ankündigungstext
- Domain, Impressum, Datenschutz und Arbeitgeber sind ins erste Standbein vorgezogen

---

## Ideen-Sammlung
Ideen, die noch keiner Etappe fest zugeordnet sind. Neue Ideen kommen hier rein.

- **Texte überarbeiten:** Alle Texte klingen noch zu sehr nach KI (Startseite, Erklärung, Spielbeschreibungen, Hinweise, Changelog). Kommt **ganz am Ende**: Du schreibst sie einmal selbst in deinen Worten, ich baue sie ein. Dafür vorher eine Liste aller Texte zum Überschreiben erstellen.

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
