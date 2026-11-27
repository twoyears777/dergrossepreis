# Arbeitsregeln für Manna

## Veröffentlichen nur mit Freigabe (Regel!)
- Jeder Push auf `main` veröffentlicht sofort auf manna-games.de. Deshalb: **nie ohne ausdrückliches Okay von Lukas auf `main` pushen.**
- Das gilt für alles im Repo, auch für `ROADMAP.md`, `README.md` und `CHANGELOG.md`.
- Als Okay zählt z. B. „bau das alles ein“, „einbauen“, „veröffentlichen“.
- Bis dahin nur vorbereiten: lokal oder auf einem eigenen Zweig arbeiten, Tests laufen lassen, Ergebnis mit Screenshots zeigen.
- Fragt Lukas nach den Änderungen: Liste der vorbereiteten Änderungen geben und Knöpfe anbieten:
  - „Einbauen“: jetzt veröffentlichen
  - „Auf die Liste für das nächste Update setzen“: sammeln und später zusammen mit anderen Änderungen veröffentlichen
  - „Noch nicht“: liegen lassen
- Gesammelt wird auf dem Zweig `naechstes-update`. Pushes dorthin sind erlaubt: Die Tests laufen mit, veröffentlicht wird nur von `main`. Beim Einbauen wird `naechstes-update` nach `main` übernommen. Vorher `main` hineinholen, damit nichts verloren geht.
- Zu Beginn einer Sitzung prüfen, ob auf `naechstes-update` schon gesammelte Änderungen liegen.
- Datenbank-Änderungen beim Einbauen: In `supabase/` nach SQL-Dateien mit „NOCH NICHT EINGESPIELT“ suchen. Sie gehören zum Update und werden
  direkt NACH dem Push auf `main` im Supabase-Projekt „manna“ eingespielt (Reihenfolge steht oben in der Datei). Danach in der Datei
  „NOCH NICHT EINGESPIELT“ durch „Eingespielt am …“ ersetzen und `supabase/README.md` anpassen. Lukas Bescheid geben, dass es erledigt ist.

## Arbeitsweise
- Immer erst schreiben, was gemacht werden soll, bevor etwas startet.
- Texte, die für Nutzer sichtbar eingebaut werden, Lukas vorher schicken. Er formuliert sie in eigenen Worten, seine Fassung wird übernommen. Bei rechtlichen Texten danach prüfen, dass alle Pflichtangaben erhalten bleiben.
- Wünsche werden gesammelt (ROADMAP.md, Todoist-Projekt „Manna Roadmap“), umgesetzt wird auf Ansage.
- Neue Funktion = neue Version: `APP_VERSION` in `js/data.js` und `VERSION` in `sw.js` gleich hochzählen, Eintrag in `CHANGELOG` (js/data.js) und `CHANGELOG.md`.
- Neue Spiele in der Spielesammlung ändern die Version nicht und kommen nicht in den Changelog.
- **Release-Plan-Doc (Regel!):** Jede vorbereitete Änderung sofort auch im Release-Plan der Version eintragen: Google Drive,
  Ordner „Manna – Release-Pläne“, Doc „Manna – Release-Plan X.Y.Z“ (fehlt es, anlegen). Pro Änderung ein Abschnitt im gleichen
  Format wie die vorhandenen (Überschrift „X.Y.Z Titel“, kurzer Text, UMSETZUNG, GEPRÜFT, OFFEN) und oben „Stand“ aktualisieren.
  Gilt zusätzlich zu CHANGELOG.md, nicht statt. Eine Änderung ist erst fertig vorbereitet, wenn sie im Doc steht.
- Vor dem Einbauen: `python3 tests/run_tests.py` muss komplett grün sein.
- **Einbauen ist erst fertig, wenn das Release-Plan-Doc stimmt (Regel!):** Nach Push und Datenbank-Änderungen im Doc der Version
  oben die Statuszeile auf „LIVE seit …“ setzen und am Ende einen Abschnitt „X.Y.Z Veröffentlicht“ (UMSETZUNG / GEPRÜFT / OFFEN)
  anhängen. Danach das Doc neu lesen und prüfen, dass es wirklich drinsteht: Die Statuszeile enthält geschützte Leerzeichen,
  daran scheitert „Text ersetzen“ ohne Fehlermeldung. Erst dann Lukas Bescheid geben.
