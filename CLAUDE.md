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

## Arbeitsweise
- Immer erst schreiben, was gemacht werden soll, bevor etwas startet.
- Texte, die für Nutzer sichtbar eingebaut werden, Lukas vorher schicken. Er formuliert sie in eigenen Worten, seine Fassung wird übernommen. Bei rechtlichen Texten danach prüfen, dass alle Pflichtangaben erhalten bleiben.
- Wünsche werden gesammelt (ROADMAP.md, Todoist-Projekt „Manna Roadmap“), umgesetzt wird auf Ansage.
- Neue Funktion = neue Version: `APP_VERSION` in `js/data.js` und `VERSION` in `sw.js` gleich hochzählen, Eintrag in `CHANGELOG` (js/data.js) und `CHANGELOG.md`.
- Neue Spiele in der Spielesammlung ändern die Version nicht, sie kommen erst beim nächsten Funktions-Update in den Changelog.
- Vor dem Einbauen: `python3 tests/run_tests.py` muss komplett grün sein.
