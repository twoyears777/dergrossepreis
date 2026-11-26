# Changelog – Manna

## 1.30.0 – 26.11.2026
- Testphase wie bei 1.29.0: kein Eintrag im App-Changelog, solange Konten nur für Tester offen sind
- Neu: Username im Konto (Konto-Seite, Feld „Username“). 3–20 Zeichen, eindeutig ohne Rücksicht auf Groß-/Kleinschreibung, ein paar Namen gesperrt (admin, manna, …). Abfrage bei der Registrierung folgt später
- Neu: Daumen hoch für Spiele der Spielesammlung (erster Teil von Rezensionen). Nur mit Konto und Username, ein Daumen pro Spiel, nochmal tippen nimmt ihn zurück, kein Daumen runter. Knopf auf der Detailseite neben „Favorit“, in der Liste ein kleines Daumen-Symbol mit Anzahl (nur bei Spielen mit mindestens einem Daumen)
- Datenschutz: Wer welches Spiel mag, sieht nur der Nutzer selbst; für alle sichtbar ist nur die Anzahl. Die Anzahl wird erst beim Öffnen der Spielesammlung bei Supabase abgefragt (nicht schon auf der Startseite)
- Intern: Supabase-Tabellen `profile` und `daumen` mit Zugriffsregeln (nur eigene Zeilen), Funktion `daumen_zahlen()` (für alle, nur Zahlen), Obergrenze 3000 Daumen pro Konto. SQL in `supabase/username-und-daumen.sql`. Neue Datei js/daumen.js
- Tests: Username (zu kurz, vergeben, reserviert) und Daumen (ohne Username, setzen, zurücknehmen, Anzahl für andere und für Gäste)

## 1.29.0 – [Datum beim Veröffentlichen]
- Testphase: Kein Eintrag im App-Changelog. Anmelden ist sichtbar, Registrieren ausgeblendet (`kontenFuerAlle: false` in js/supabase.js); Testkonten werden von Hand im Supabase-Dashboard angelegt. Der App-Changelog-Eintrag kommt mit der Freischaltung für alle
- Neu: Konten (freiwillig). Mit Login werden Spielbrett, eigene Vorlagen, eigene Spiele mit Bildern, Favoriten und ausgeblendete Standard-Vorlagen automatisch zwischen Geräten abgeglichen. Ohne Login bleibt alles wie bisher im Browser
- Konto: Registrieren mit E-Mail-Bestätigung, Anmelden, Passwort vergessen/ändern, Abmelden (wahlweise mit Entfernen der Daten vom Gerät), Konto löschen
- Abgleich: geht nichts verloren. Ändern zwei Geräte dasselbe, bleibt die eigene Fassung als Kopie, Favoriten werden zusammengelegt, ein überschriebenes Spielbrett wird als Vorlage gesichert. Ein laufendes Spiel wird nie ausgetauscht, das neue Brett wartet im Gameshow-Menü. Offline wird nachgeholt
- Sicherheit: anderes Konto auf demselben Gerät übernimmt nichts ungefragt; Anmeldelink aus der Mail wird sofort aus der Adresszeile entfernt; das Admin-Konto lässt sich in der App nicht löschen
- Intern: Supabase-Tabellen `sync_eintraege` und `sync_bilder` mit Zugriffsregeln (nur eigene Zeilen), Obergrenzen (2000 Einträge, 500 Bilder bzw. 100 MB pro Konto), Funktion `konto_loeschen()`. SQL zum Nachlesen in `supabase/`. Abgleich lädt nur geänderte Inhalte (erst Zeitstempel, dann Inhalte)
- Intern: Wach-Halter für den kostenlosen Supabase-Tarif: GitHub Action ruft alle 3 Tage `wach()` auf, damit das Projekt nicht pausiert (läuft erst, wenn es auf main ist)
- Tests: neuer Testblock „Konto & Sync“ mit nachgebautem Supabase und zwei Geräten
- Aufräumen: Konto-Code in drei Dateien getrennt (js/konto.js Anmeldung, js/sync.js Abgleich, js/konto-seite.js Oberfläche). Statt die Speicherfunktionen heimlich zu umhüllen, melden sie Änderungen jetzt sichtbar über datenGeaendert()/seiteGewechselt() (js/kern.js)
- Stabilität: alle Supabase-Anfragen haben ein Zeitlimit (45 s), damit Anmeldung und Abgleich nie hängen bleiben; Rückkehr aus einer E-Mail wird erst behandelt, wenn alle Skripte geladen sind
- Sicherheit: Rechte auf sync_eintraege/sync_bilder gehärtet (authenticated hatte aus den Supabase-Standardrechten noch TRUNCATE, das die Zugriffsregeln umgangen hätte); zusätzlicher Test, dass ein Anmelde-Link für ein fremdes Konto nichts ungefragt hochlädt

## 1.28.1 – 26.11.2026
- Fehlerbehebungen aus der Sicherheits- und Stabilitätsprüfung. Kein Eintrag im App-Changelog.
- Import: kaputte Dateien (leere Einträge) stürzen nicht mehr still ab; Obergrenzen für Gruppen (8), Punktwerte, Kategorien, Textlängen, Vorlagen und Bilder aus Dateien
- Zwei offene Manna-Tabs überschreiben sich das Spielbrett nicht mehr gegenseitig; neue Bilder sind 24 Stunden vor dem Aufräumen eines anderen Tabs geschützt
- Gruppe löschen: der Zug bleibt bei derselben Gruppe
- „Jetzt aktualisieren“ wartet, solange ein Countdown läuft
- Spiel einreichen: ohne Internet eigene Meldung statt „zu viele Einsendungen“
- Editor: Entwürfe je Spiel getrennt (vorher überschrieb ein Entwurf den anderen); übernommene Einreichungen behalten ihren Entwurf
- Editor: übernommene Einreichungen werden in Supabase gelöscht (wie in der Datenschutzerklärung zugesagt), nicht nur markiert
- Editor: kann der Schlüssel den Veröffentlichungsstatus nicht abfragen, heißt es nicht mehr „ist online“
- Intern: Playwright-Version in den Tests fest (1.63.0), Countdown-Länge aus dem Speicher nach oben begrenzt, laufendes eigenes Spiel wird beim Laden geprüft

## 1.28.0 – 25.11.2026
- Neu: Du kannst selbst ein Spiel für die Spielesammlung einreichen (Knopf ganz unten in der Spielesammlung)
- Editor: neuer Bereich „Eingereicht“ (Anmeldung mit dem Supabase-Admin-Login). Einreichungen lassen sich als Rohfassung übernehmen oder ablehnen (wird gelöscht)
- Intern: Einreichungen liegen in Supabase (Frankfurt), Tabelle „einreichungen“. Ohne Anmeldung darf man dort nur einreichen, nicht lesen. Schutz gegen Bots: verstecktes Feld, Mindestzeit, höchstens 30 Einreichungen pro Stunde

## 1.27.1 – 25.11.2026
- Startseite: nur noch zwei Screenshots (Filter und Spiel). Kein Eintrag im App-Changelog.
- Intern: Geländespiele aus den Rohfassungen entfernt, sie bekommen später eine eigene Rubrik.

## 1.27.0 – 25.11.2026
- Startseite: zwei neue Kacheln „Eine starke Spielesammlung“ und „Fertige Gameshows für den Beamer“
- Manna zählt jetzt anonym, wie viele Leute die Seite besuchen (ohne Cookies, mit GoatCounter). Mehr dazu im Datenschutz
- Intern: eigenes Zählscript js/zaehler.js (kein Nachladen von fremden Servern), zählt nur auf manna-games.de und nicht im Editor; eigene Besuche ausschließen über manna-games.de/#nicht-zaehlen

## 1.26.0 – 25.11.2026
- Neu: Spiele mit dem Label „Erlebnispädagogik“, mit eigenem Filter in der Spielesammlung
- Neue Kachel „Erlebnispädagogik“ bei „Pädagogischer Kram“
- Editor: Spiele lassen sich als „Erlebnispädagogik“ markieren (Zeile „Erlebnispädagogik: ja“ im Spieleformat)

## 1.25.1 – 25.11.2026
- Intern: Editor kann Spiele als Rohfassung speichern (nur im Editor sichtbar, nicht in der App). Kein Eintrag im App-Changelog.

## 1.25.0 – 24.11.2026
- Neu: Suche in der Spielesammlung
- Neuer Filter nach Gruppenphase
- Neuer Artikel „Sicherheit“ bei „Pädagogischer Kram“
- Startseite aufgeräumt: mehr Fokus auf die Spielesammlung

## 1.24.0 – 24.11.2026
- Neuer Artikel „Vier-Ohren-Modell“ bei „Pädagogischer Kram“
- Kacheln sind besser lesbar
- Impressum und Datenschutz sind jetzt vollständig
- Mehr Sicherheit und unter der Haube aufgeräumt

## 1.23.0 – 24.11.2026
- Neuer Bereich „Pädagogischer Kram“ mit dem Artikel „Gruppenphasen“
- Spiele zeigen, in welche Gruppenphasen sie passen
- Neue Abschnitte „Pädagogische Gedanken“ und „Fragen zum Nachgespräch“ bei den Spielen
- Zurück-Knöpfe jetzt auch oben auf jeder Seite
- Die Spielesammlung steht jetzt an erster Stelle, und Überschriften passen auch aufs Handy

## 1.22.0 – 24.11.2026
- Neue Seite „Gameshows“: Der große Preis, Eigenes Spiel und Countdown sind jetzt dort zusammengefasst
- Deutlich mehr Texte sind nun menschengemacht
- Halbe Punktzahl: Manna lost die andere Gruppe jetzt selbst aus
- Multiple Choice: Nach einer falschen Antwort bekommt eine ausgeloste Gruppe eine zweite Chance
- ACTION: Gewinnt die Gruppe, die das Feld gezogen hat, bekommt sie die doppelte Punktzahl
- Minuspunkte entfernt, damit das Spiel schlank bleibt

## 1.21.0 – 24.11.2026
- Auch Material, Varianten und Gefahren zeigen Aufzählungszeichen nur noch dort, wo du sie selbst gesetzt hast
- Favorisieren von Spielen und entsprechende Filter
- Neuer Knopf „Zufälliges Spiel“ in der Spielesammlung
- Manna bittet den Browser, deine gespeicherten Spiele nicht von selbst zu löschen
- Neue Spiele erscheinen jetzt beim Öffnen der Spielesammlung, ohne dass Manna neu gestartet werden muss

## 1.20.0 – 24.11.2026
- Neue Seite „Rechtliches“ mit Impressum, Datenschutz und weiteren Hinweisen, verlinkt unten auf der Startseite
- Die Seite funktioniert auch offline
- Anleitungen zeigen Aufzählungszeichen und Nummern nur noch dort, wo du sie selbst gesetzt hast

## 1.19.0 – 24.11.2026
- Neu auf der Startseite: eine kurze Erklärung, was Manna kann, mit Link zur Vision
- Neue Screenshots auf der Startseite: Der große Preis, Eigenes Spiel, Countdown und Spielesammlung
- Der große Preis, Eigenes Spiel und Countdown gibt es vorerst nur am Laptop oder PC. Auf Handy und Tablet kommt ein Hinweis, die Spielesammlung bleibt dort nutzbar

## 1.18.0 – 24.11.2026
- Spielesammlung verschlankt: „Spiel erstellen“ und „Spiel einsenden“ gibt es nicht mehr
- Neue Spiele erscheinen in der Spielesammlung jetzt ohne App-Update
- Die Sicherung enthält keine selbst erstellten Sammlungsspiele mehr. Ältere Sicherungen lassen sich weiter einspielen

## 1.17.1 – 23.11.2026
- Neues Spiel in der Spielesammlung: Simon Says

## 1.17.0 – 23.11.2026
- Spielesammlung: neuer Knopf „Spiel erstellen“ mit Eingabemaske für alle Angaben eines Spiels
- Eigene Spiele erscheinen sofort in der Sammlung, markiert als „eigenes“, und lassen sich bearbeiten und löschen
- „Spiel einsenden“ öffnet eine fertige E-Mail. Eingesendete Spiele werden geprüft und kommen dann für alle in die Sammlung
- Die Sicherung enthält jetzt auch selbst erstellte Spiele

## 1.16.0 – 23.11.2026
- Neuer Name: Manna, mit neuem Logo und App-Symbol
- Die Startseite und die Zuschaueransicht im Startmenü zeigen jetzt das Manna-Logo
- Sicherungen und Exporte heißen jetzt „manna-…“, alte Dateien lassen sich weiter einspielen

## 1.15.0 – 23.11.2026
- Neu auf der Startseite: Eigenes Spiel
- Eigene Spiele anlegen mit Gruppen, frei wählbarer Rundenzahl und Punktevergabe (gleich viele pro Runde oder jede Runde einen mehr, nur Sieger oder mehrere Plätze)
- Jede Runde hat eine Titelfolie und eine Erklärung, dazu beliebig viele weitere Folien mit Text und Bild
- Punkte live zählen, immer sichtbar oben auf dem Bildschirm, mit Rückgängig und Siegerehrung am Ende
- Eigene Spiele speichern, exportieren, importieren und mit Zuschaueransicht spielen
- Die Sicherung enthält jetzt auch die eigenen Spiele

## 1.14.0 – 23.11.2026
- Neues Werkzeug auf der Startseite: Countdown
- Zeit per Schnellauswahl oder Plus/Minus einstellen, Start, Pause und Zurücksetzen
- Mit Zuschaueransicht: Der Beamer zeigt erst nur den Hintergrund, dann den Countdown und am Ende „Zeit vorbei!“

## 1.13.0 – 23.11.2026
- Spielesammlung: neuer Bereich „Gefahren und Risiken“ bei jedem Spiel
- Neue Spiele: Zeitungsschlagen und Nachts in Palermo (mit Rollenliste zum Abschreiben)
- Musterspiel entfernt
- Startseite: mehr Platz unter dem Titel

## 1.12.0 – 23.11.2026
- Neu auf der Startseite: Spielesammlung mit Filtern für Alter, Personenzahl, drinnen/draußen und Material
- Detailseite für jedes Spiel mit Ablauf, Material, Varianten und Tipp
- Erstes Musterspiel: Zip Zap Boing

## 1.11.0 – 23.11.2026
- Startseite heißt jetzt „Die Spiele“
- Screenshot-Collage aus dem Spiel statt der Illustration
- Neue Bereiche „Genau das, was du brauchst!“ und „Unsere Vision“
- „So funktioniert's“ erklärt die Zuschaueransicht am Laptop
- Neu im Spielmenü: „Erklärung“ mit Spielablauf, Feldtypen, Sonderregeln und Tipps fürs Spielleiten
- Tipp zum Teilen von Vorlagen auf der Vorlagen-Seite

## 1.10.0 – 23.11.2026
- Sicherung: Hinweis im Spielmenü, wenn Änderungen noch nicht als Datei gesichert sind
- Sicherung erstellen und einspielen unter „Einstellungen“ – enthält Spielbrett und alle eigenen Vorlagen
- Nach dem Speichern einer Vorlage wird direkt die Sicherung als Datei angeboten
- Neue Vorlage: Weihnachtsquiz
- Technisch aufgeräumt: Code in übersichtliche Dateien aufgeteilt, alte Reste entfernt
- Automatische Tests prüfen jede neue Version

## 1.9.0 – 23.11.2026
- Neue Siegerehrung: Treppchen aus Pappe, Platz 3, 2 und 1 werden nacheinander enthüllt, der Sieger mit Trommelwirbel
- Mit Zuschaueransicht siehst du bei der Siegerehrung nur den Knopf „Zurück zum Startmenü“
- Spielmenü aufgeräumt: „Vorlagen“ und „Einstellungen“ als eigene Unterseiten, keine Untertitel mehr
- „Neues Spiel mit aktuellem Spielbrett“ und „Neues Spiel mit leerem Spielbrett“
- Keine Emojis mehr – Knöpfe mit schlichten Symbolen
- Kräftigere Schrift statt Schreibmaschine und Handschrift
- Startseite ohne Untertitel, Illustration ohne Bildunterschrift
- Changelog zeigt nur noch die Versionsnummern

## 1.8.1 – 23.11.2026
- Startseite: Illustration einer Gruppe beim Spielen vor der Anleitung

## 1.8.0 – 23.11.2026
- Anleitung auf der Startseite: in vier Schritten vom Spielbrett bis zum Beamer, dazu alle Feldtypen erklärt

## 1.7.1 – 23.11.2026
- Neu: Spiel vorzeitig beenden mit Siegerehrung – über die Zielflagge oben links im Spiel oder im Spielmenü
- Fehler behoben: Das Fenster „Was ist neu?“ nach einem Update war leer

## 1.7.0 – 23.11.2026
- Neues Design: Collage-Look mit Zeitungsschnipseln, Papier und Klebeband – ruhiger und entspannter
- Überschriften wie aus ausgeschnittenen Buchstaben zusammengeklebt
- Gedämpfte Gruppenfarben statt Neon (bestehende Standardfarben werden automatisch angepasst)

## 1.6.0 – 23.11.2026
- Neues Design im 2000er-Look: Aqua-Gel-Felder, Chrom-Schrift, Fenster mit Titelleiste
- Fragen öffnen sich als Fenster – das Kreuz oben rechts schließt sie (Feld bleibt offen)
- Keine Schriften mehr von Google-Servern – besser für Datenschutz und offline

## 1.5.1 – 23.11.2026
- Fehler behoben: Animationen liefen nicht mehr auf dem eigenen Gerät, sobald irgendwo eine Zuschaueransicht offen war – sie laufen jetzt immer
- Eine Zuschaueransicht im Hintergrund-Tab zählt nicht mehr als „verbunden“
- Changelog hat jetzt ein Kreuz zum Schließen (auch Tippen daneben schließt)

## 1.5.0 – 23.11.2026
- Versionsnummer unten im Menü – antippen öffnet den Changelog
- Aufgaben bekommen eine eigene Intro-Animation („AUFGABE!“)
- Nach Aufgaben und ACTION-Feldern gibt es eine Ergebnis-Animation: „GESCHAFFT!“, „GEWONNEN!“ oder „LEIDER NICHT!“
- Multiple Choice: Antwort antippen loggt sie ein (änderbar), „Auflösen“ deckt sie mit Trommelwirbel auf
- Eigene Vorlagen: aktuelles Spielbrett als Vorlage speichern, Vorlagen löschen, als Datei exportieren und wieder importieren
- Gelöschte Standard-Vorlagen lassen sich wiederherstellen
- Menü aufgeräumt: „Spielbrett bearbeiten“ und „Zuschaueransicht“ unter „Einstellungen“

## 1.4.1 – 23.11.2026
- Kein Umschalten mehr nötig: Die App startet in der Moderatoransicht, „Zuschaueransicht zeigen“ öffnet automatisch ein zweites Fenster für den Beamer
- Sobald die Zuschaueransicht verbunden ist, siehst nur du die Lösungen – wird sie geschlossen, verhält sich die App wieder wie gespiegelt

## 1.4.0 – 23.11.2026
- Neues Startmenü: erst das Spiel auswählen, dann Weiterspielen, Neues Spiel, Leeres Spiel oder eine Vorlage
- Vorlagen: „Gemischtes Quiz“ und neu „Bibel-Quiz“
- Zwei-Bildschirm-Modus: Der Beamer zeigt nur die Show, du siehst Lösungen, richtige MC-Antwort und alle Knöpfe vorab
- Zuschaueransicht mit Startbild („Gleich geht's los!“), ACTION-Animation, Punkte-Animation und Siegerehrung
- Bei Schätzfragen sieht der Beamer nur „abgegeben“, bis du auflöst
- Haus-Knopf im Spiel führt zurück ins Menü

## 1.3.0 – 23.11.2026
- Neue Fragetypen: Klassisch, Multiple Choice und Schätzfrage
- Multiple Choice: bis zu 4 Antworten (A–D). Antippen zeigt sofort richtig (grün) oder falsch (rot)
- Schätzfrage: Jede Gruppe trägt ihre Zahl ein, „Auflösen“ zeigt die Lösung und markiert automatisch die Gruppe, die am nächsten dran ist (bei Gleichstand mehrere)
- Beispielbrett: Schätzen-Kategorie als Schätzfragen, zwei Multiple-Choice-Fragen in Allgemeinwissen

## 1.2.0 – 23.11.2026
- Aufgabe & ACTION: nur noch Text mit Erklärung, ohne Lösung oder Hinweis
- Aufgabe: Punkte nur für die Gruppe, die dran ist (keine halbe Punktzahl für andere)
- ACTION: Alle Gruppen spielen mit, du wählst den Gewinner (auch mehrere bei Gleichstand), jede Gewinner-Gruppe bekommt die volle Punktzahl
- Halbe Punktzahl für eine andere Gruppe gibt es nur noch bei Fragen

## 1.1.0 – 23.11.2026
- Läuft jetzt über GitHub Pages und als App auf dem Home-Bildschirm, auch komplett offline
- Automatische Updates: Neue Versionen werden im WLAN im Hintergrund geladen
- Changelog in den Einstellungen und „Was ist neu“-Hinweis nach einem Update
- Neu: „Halbe Punktzahl für …“, damit eine andere Gruppe die halben Punkte bekommt
- Neu: Feldtyp ACTION mit Überraschungs-Animation beim Aufdecken
- Countdown-Timer entfernt
- Beispielbrett nur noch mit Fragen (ohne Spiele/Aufgaben)

## 1.0.0 – 23.11.2026
- Erste Version: Spielbrett mit 5 Kategorien, Live-Punktestand, Gruppen, Fragen & Aufgaben, Siegerehrung
