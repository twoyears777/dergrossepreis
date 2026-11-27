# Supabase (Projekt „manna“, Frankfurt)

Hier liegt zum Nachlesen, was in der Datenbank eingerichtet ist. Ausgeführt wird es im Supabase-Projekt selbst,
nicht von hier aus.

- `konten-und-sync.sql` – Konten & Sync (ab Version 1.29.0): Tabellen `sync_eintraege` und `sync_bilder`,
  Zugriffsregeln (jeder sieht nur seine eigenen Daten), Obergrenzen gegen Missbrauch, Funktion `konto_loeschen()`, dazu `wach()` für den Wach-Halter (`.github/workflows/wach-halten.yml`).
- `einreichungen-und-admins.sql` – Spiel einreichen und Editor-Login (ab Version 1.28.0): Tabellen `einreichungen` und `admins`,
  Spam-Bremse, nächtliches Aufräumen (pg_cron, nach 6 Monaten bzw. wenn erledigt). Eingespielt am 25.11.2026,
  am 26.11.2026 nachträglich nach dem Stand in der Datenbank aufgeschrieben.
- `username-und-daumen.sql` – Username & Daumen hoch (ab Version 1.30.0): Tabellen `profile` und `daumen`, Zugriffsregeln
  (nur eigene Zeilen), Funktion `daumen_zahlen()` (Anzahl pro Spiel, für alle). Eingespielt am 26.11.2026.
- `registrierung.sql` – Registrierung für alle (ab Version 1.31.0): Funktion `username_frei()` (ist ein Username noch frei?).
  Eingespielt am 26.11.2026.
- `einreichen-mit-konto.sql` – Einreichen nur mit Konto (ab Version 1.32.0): Spalten `user_id` und `username`,
  Trigger setzt beides aus dem Login, nur Angemeldete mit Username dürfen einreichen, höchstens 5 pro Konto in 24 Stunden.
  Eingespielt am 27.11.2026.
- `klicks.sql` – Klicks pro Spiel und Konto (ab Version 1.32.0): Tabelle `klicks`, Funktion `klick_zaehlen()`,
  jeder liest nur seine eigenen Zahlen. Eingespielt am 27.11.2026.

## Einstellungen im Dashboard für die Registrierung (ab Version 1.31.0)

- Authentication → Emails → SMTP Settings: eigener Mailversand über Strato (kontakt@manna-games.de, smtp.strato.de, Port 465). Eingerichtet am 26.11.2026.
- Authentication → Emails → Templates: In „Confirm signup“ und „Reset password“ muss neben dem Link `{{ .ConfirmationURL }}`
  auch der Code `{{ .Token }}` stehen. Den Code tippt man in Manna ein, falls ein Virenscanner den Link schon geöffnet hat.
- Authentication → Sign In / Providers: „Allow new users to sign up“ und „Confirm email“ eingeschaltet.
- Authentication → Sign In / Providers → Email: Mindestlänge fürs Passwort auf 8 stellen (die App verlangt 8, Supabase
  erlaubt ohne Einstellung schon 6, wenn jemand die App umgeht). Noch zu prüfen.
- „Leaked password protection“ (Abgleich mit bekannten, geleakten Passwörtern) gibt es erst im Pro-Tarif. Beim Wechsel einschalten.

## Hinweis zur Liste der Migrationen

`registrierung.sql` wurde direkt per SQL eingespielt und steht deshalb nicht in der Migrationsliste im Dashboard.
Das ist nur Kosmetik, die Funktion ist da.

