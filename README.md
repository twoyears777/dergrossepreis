# Manna

Spiele und Werkzeuge für die Jugendarbeit. Kern ist die Spielesammlung, dazu der Bereich „Pädagogischer Kram“, freiwillige Konten (Abgleich zwischen Geräten, Username, Daumen hoch) und „Spiel einreichen“. Die Gameshows (Der große Preis, eigene Spiele mit Folien und Punktestand, Countdown, Zuschaueransicht für den Beamer) sind vorerst ausgeblendet, der Code bleibt drin (Schalter `GAMESHOWS_AN` in `js/data.js`).

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
Logik, Inhalte und Einstellungen liegen getrennt:

**Einstellungen**
- `js/data.js` – Versionsnummer, Changelog, Schalter für die Gameshows, Filter der Spielesammlung
- `js/supabase.js` – Adresse und öffentlicher Schlüssel der Datenbank, Schalter „Konten für alle“

**Inhalte**
- `spiele/*.txt` – die Spiele der Spielesammlung (`spiele/alle.json` wird beim Veröffentlichen daraus gebaut)
- `rohfassungen/*.txt` – Spiele in Arbeit, nur im Editor sichtbar (im öffentlichen Repo aber lesbar)
- `js/artikel.js` – Artikel für „Pädagogischer Kram“ (neuer Artikel = neuer Eintrag)
- `js/gameshow-vorlagen.js` – fertige Vorlagen für „Der große Preis“
- Texte, die Nutzer sehen: in `index.html` und je Bereich gesammelt oben in der Datei (z. B. `KT` in `js/konto.js`);
  Übersicht aller Texte in `TEXTE.md` (wird mit `node tools/texte-liste.js` erzeugt)

**App-Logik** (in `index.html` in fester Reihenfolge geladen, die Dateien teilen sich globale Variablen)
- `js/spielformat.js` – liest und schreibt das Textformat der Spiele (App, Editor und Bau-Schritt)
- `js/kern.js` – Grundlagen: Speichern, Spielbrett-Modell, Dialoge, Änderungs-Meldungen
- `js/system.js` – Changelog, Offline-Betrieb und Updates
- `js/menues.js` – Seiten und Navigation, Menüs, Vorlagen, Sicherung, Pädagogischer Kram
- `js/sammlung.js` – Spielesammlung (Suche, Filter, Spielseite)
- `js/einreichen.js` – Spiel einreichen
- `js/preis.js`, `js/zuschauer.js`, `js/countdown.js`, `js/eigenes-spiel.js` – Gameshows (vorerst ausgeblendet)
- `js/konto.js`, `js/sync.js`, `js/konto-seite.js` – Konto: Anmeldung, Abgleich zwischen Geräten, Konto-Seite
- `js/daumen.js`, `js/klicks.js` – Username und Daumen hoch, Klicks pro Spiel und „Empfehlung für dich“
- `js/zaehler.js` – Besucherzähler (GoatCounter)
- `css/app.css` – Aussehen
- `sw.js` – Offline-Modus und automatische Updates

**Sonstiges**
- `editor/` – Editor für die Spiele (eigene Seite, ohne Service Worker)
- `supabase/` – alles, was in der Datenbank eingerichtet ist, zum Nachlesen (siehe `supabase/README.md`)
- `tools/build-spiele.js` – baut `spiele/alle.json` und prüft alle Spieldateien
- `tools/neue-spiele.py` – listet die Spiele, die seit der letzten Version dazugekommen sind
- `tools/texte-liste.js` – erzeugt `TEXTE.md`
- `img/` – Logo
- `tests/run_tests.py` – automatische Tests (laufen bei jedem Push auf GitHub, mit festen Testspielen aus `tests/testspiele/`)

## Ein Update veröffentlichen
1. Änderungen machen.
2. In `js/data.js` **`APP_VERSION`** hochzählen und oben in `CHANGELOG` einen Eintrag ergänzen.
3. In `sw.js` **`VERSION`** auf dieselbe Nummer setzen, sonst merkt das iPad das Update nicht.
4. `CHANGELOG.md` ergänzen.
5. Spiele bauen und Tests lokal laufen lassen: `node tools/build-spiele.js` und `python tests/run_tests.py`
6. Push auf `main`. GitHub veröffentlicht nur, wenn alle Tests grün sind.

Ist das iPad im WLAN, lädt es die neue Version automatisch und zeigt „Neue Version geladen“ an.
