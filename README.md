# Manna

Spiele und Werkzeuge für die Jugendarbeit: die Quiz-Gameshow „Der große Preis“, eigene Spiele mit Folien und Punktestand, ein Countdown und eine Spielesammlung. Gemacht für Laptop und Beamer, mit Zuschaueransicht auf dem zweiten Bildschirm.

## Installieren (iPad)
1. **https://manna-games.de** in **Safari** öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Die App einmal **mit Internet** vom Home-Bildschirm aus öffnen. Danach läuft sie auch offline.

Fragen, Gruppen und Punkte werden auf dem Gerät gespeichert (in der Home-Bildschirm-App, nicht in Safari).

## Spiele pflegen
Die Spiele der Spielesammlung liegen als Textdateien in `spiele/` (eine Datei pro Spiel, Format `MANNA-SPIEL v1`, siehe `js/spielformat.js`). Gepflegt werden sie mit dem **Editor**:

**`https://manna-games.de/editor/`**

- Funktioniert am Desktop, auf dem iPad und auf dem Handy. Auf iPad/iPhone am besten in Safari „Zum Home-Bildschirm“ hinzufügen, dann bleibt die Anmeldung dauerhaft gespeichert.
- „Veröffentlichen“ legt die Textdatei auf GitHub an oder ändert sie, „Löschen“ entfernt sie. Jede Fassung bleibt in der GitHub-Historie erhalten.
- Danach baut GitHub die Spieleliste, lässt alle Tests laufen und stellt die Seite nur online, wenn alles grün ist. Der Editor zeigt an, ob es geklappt hat.
- Neue, geänderte oder gelöschte Spiele ändern **keine** Versionsnummer und stehen nicht im Changelog. Die App lädt die Spiele bei jedem Öffnen frisch (offline: zuletzt geladener Stand).
- Der Text wird genau so übernommen, wie er eingegeben wird. Nur Aufzählungszeichen und Nummern am Zeilenanfang fallen weg.

### Zugangsschlüssel anlegen (einmal pro Jahr)
1. Auf GitHub: Profilbild → **Settings** → ganz unten **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `Manna Editor`. Expiration: z. B. 1 Jahr (das Datum kannst du im Editor eintragen, dann erinnert er dich rechtzeitig).
3. Repository access: **Only select repositories** → `twoyears777/manna`.
4. Permissions → Repository permissions: **Contents: Read and write** und **Actions: Read-only**.
5. **Generate token**, den Schlüssel kopieren (er wird nur einmal angezeigt) und im Editor einfügen.

Den Schlüssel nie weitergeben. Auf einem fremden Gerät nach der Arbeit „Abmelden“.

### Veröffentlichen über GitHub Actions (einmalig eingestellt)
Settings → **Pages** → Build and deployment → Source: **GitHub Actions**. Der Ablauf steht in `.github/workflows/tests.yml`.

## Planung
Wohin es geht und welche Ideen gesammelt sind, steht in der [ROADMAP.md](ROADMAP.md).

## Aufbau
- `index.html` – Aufbau der Seiten
- `css/app.css` – Aussehen
- `js/data.js` – Versionsnummer, Changelog, Vorlagen, Filter der Spielesammlung
- `js/app.js` – Spiellogik
- `js/spielformat.js` – liest und schreibt das Textformat der Spiele (App, Editor und Bau-Schritt)
- `spiele/*.txt` – die Spiele der Spielesammlung (`spiele/alle.json` wird beim Veröffentlichen daraus gebaut)
- `editor/` – Editor für die Spiele
- `tools/build-spiele.js` – baut `spiele/alle.json` und prüft alle Spieldateien
- `tools/neue-spiele.py` – listet die Spiele, die seit der letzten Version dazugekommen sind
- `img/` – Screenshots für die Startseite
- `sw.js` – Offline-Modus und automatische Updates
- `tests/run_tests.py` – automatische Tests (laufen bei jedem Push auf GitHub, mit festen Testspielen aus `tests/testspiele/`)

## Ein Update veröffentlichen
1. Änderungen machen.
2. In `js/data.js` **`APP_VERSION`** hochzählen und oben in `CHANGELOG` einen Eintrag ergänzen.
3. In `sw.js` **`VERSION`** auf dieselbe Nummer setzen, sonst merkt das iPad das Update nicht.
4. `CHANGELOG.md` ergänzen.
5. Neue Spiele seit der letzten Version: `python tools/neue-spiele.py` ausführen und, falls es welche gibt, die ausgegebene Zeile „Neue Spiele in der Spielesammlung: …“ in beide Changelogs übernehmen.
6. Spiele bauen und Tests lokal laufen lassen: `node tools/build-spiele.js` und `python tests/run_tests.py`
7. Push auf `main`. GitHub veröffentlicht nur, wenn alle Tests grün sind.

Ist das iPad im WLAN, lädt es die neue Version automatisch und zeigt „Neue Version geladen“ an.
