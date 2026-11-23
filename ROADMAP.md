# Roadmap

## Das Ziel
Eine App fürs iPhone für Jugendleiterinnen und Jugendleiter: Handy an den Beamer anschließen und eine Spieleshow haben, oder unterwegs spontan das passende Gruppenspiel finden.

Leitgedanke (siehe „Unsere Vision“ auf der Startseite): Ehrenamtliche sollen ohne viel Technik und ohne Vorbereitung einen guten Spieleabend gestalten können. Wir optimieren zuerst für Laptop und PC, danach fürs Handy.

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
- ✔ Detailseite pro Spiel: Ablauf, Material, Varianten, Tipp
- ✔ Musterspiel „Zip Zap Boing“
- ca. 20 erprobte Gruppenspiele mit Kurzbeschreibung, Ablauf, Material, Dauer, Gruppengröße (Inhalte kommen von dir)
- Später überlegen: Filter für Dauer und ruhig/wild, Zufallsknopf
- Hinweise zu Sicherheit und Körperkontakt, niemand wird bloßgestellt
- Ziel: im Alltag schneller ein passendes Spiel finden als bisher

### Etappe 2 – Spielekiste ausbauen
- Eigene Spiele ergänzen, Favoriten
- Teilen und Sicherung wie bei den Vorlagen
- Beamer-Anzeige: Regeln groß, Timer, Punktezähler für Gruppen

### Etappe 3 – Handy-tauglich
- „Der große Preis“ und die Spielekiste fürs iPhone optimieren (Bedienung, Layout, Schriftgrößen)

### Etappe 4 – iPhone-App
- Web-App als echte App verpacken, Bau automatisch über GitHub (ohne Mac)
- Test per TestFlight (Apple-Entwickler-Account nötig, ca. 99 € pro Jahr)
- Echter Zwei-Bildschirm-Modus: Handy steuert, Beamer zeigt die Show (HDMI-Adapter oder AirPlay)
- Eigener Name für die App

### Etappe 5 – Verbreiten
- Arbeitgeber klären, Impressum und Datenschutzhinweis
- Eigene Domain, Startpaket mit Vorlagen, Ankündigungstext
- Kann vorgezogen werden, sobald die Web-Version weitergegeben werden soll

---

## Ideen-Sammlung
Ideen, die noch keiner Etappe fest zugeordnet sind. Neue Ideen kommen hier rein.

- Spielesammlung als zweite Säule neben der Gameshow (→ Etappe 1)
- Weitere Vorlagen, z. B. Kennenlernabend, Freizeit-Abschlussabend
- Später denkbar: Finanzierung über Zusatzfunktionen oder fertige Fragenkataloge (erst nach erfolgreichem Test mit anderen Jugendleitern)
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
