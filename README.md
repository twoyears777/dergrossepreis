# Manna

Spiele und Werkzeuge für die Jugendarbeit: die Quiz-Gameshow „Der große Preis“, eigene Spiele mit Folien und Punktestand, ein Countdown und eine Spielesammlung. Gemacht für Laptop und Beamer, mit Zuschaueransicht auf dem zweiten Bildschirm.

## Installieren (iPad)
1. Die GitHub-Pages-Adresse in **Safari** öffnen (`https://twoyears777.github.io/dergrossepreis/`).
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Die App einmal **mit Internet** vom Home-Bildschirm aus öffnen. Danach läuft sie auch offline.

Fragen, Gruppen und Punkte werden auf dem Gerät gespeichert (in der Home-Bildschirm-App, nicht in Safari).

## Eingesendete Spiele
Wie Spiele aus „Spiel einsenden“ geprüft und eingebaut werden, steht in [EINSENDUNGEN.md](EINSENDUNGEN.md).

## Planung
Wohin es geht und welche Ideen gesammelt sind, steht in der [ROADMAP.md](ROADMAP.md).

## Aufbau
- `index.html` – Aufbau der Seiten
- `css/app.css` – Aussehen
- `js/data.js` – Versionsnummer, Changelog, Vorlagen und Spielesammlung
- `js/app.js` – Spiellogik
- `img/` – Screenshots für die Startseite
- `sw.js` – Offline-Modus und automatische Updates
- `tests/run_tests.py` – automatische Tests (laufen bei jedem Push auf GitHub)

## Ein Update veröffentlichen
1. Änderungen machen.
2. In `js/data.js` **`APP_VERSION`** hochzählen und oben in `CHANGELOG` einen Eintrag ergänzen.
3. In `sw.js` **`VERSION`** auf dieselbe Nummer setzen, sonst merkt das iPad das Update nicht.
4. `CHANGELOG.md` ergänzen.
5. Tests lokal laufen lassen: `python tests/run_tests.py`

Ist das iPad im WLAN, lädt es die neue Version automatisch und zeigt „Neue Version geladen“ an.
