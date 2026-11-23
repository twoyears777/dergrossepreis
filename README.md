# Der große Preis 🎉

Quiz-Gameshow für Jugendgruppen. Das iPad wird an den Beamer angeschlossen, die Gruppen wählen abwechselnd ein Feld, und die Punkte werden live gezählt.

## Installieren (iPad)
1. Die GitHub-Pages-Adresse in **Safari** öffnen (`https://twoyears777.github.io/dergrossepreis/`).
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Die App einmal **mit Internet** vom Home-Bildschirm aus öffnen. Danach läuft sie auch offline.

Fragen, Gruppen und Punkte werden auf dem Gerät gespeichert (in der Home-Bildschirm-App, nicht in Safari).

## Ein Update veröffentlichen
1. Änderungen in `index.html` machen.
2. In `index.html` **`APP_VERSION`** hochzählen und oben in `CHANGELOG` einen Eintrag ergänzen.
3. In `sw.js` **`VERSION`** auf dieselbe Nummer setzen. Das ist wichtig, sonst merkt das iPad das Update nicht.
4. `CHANGELOG.md` ergänzen und alles hochladen.

Ist das iPad im WLAN, lädt es die neue Version automatisch und zeigt „Neue Version geladen“ an.
