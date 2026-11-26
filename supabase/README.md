# Supabase (Projekt „manna“, Frankfurt)

Hier liegt zum Nachlesen, was in der Datenbank eingerichtet ist. Ausgeführt wird es im Supabase-Projekt selbst,
nicht von hier aus.

- `konten-und-sync.sql` – Konten & Sync (ab Version 1.29.0): Tabellen `sync_eintraege` und `sync_bilder`,
  Zugriffsregeln (jeder sieht nur seine eigenen Daten), Obergrenzen gegen Missbrauch, Funktion `konto_loeschen()`, dazu `wach()` für den Wach-Halter (`.github/workflows/wach-halten.yml`).
- Die Tabellen `einreichungen` (Spiel einreichen) und `admins` (Editor-Login) gibt es seit Version 1.28.0.
- `username-und-daumen.sql` – Username & Daumen hoch (ab Version 1.30.0): Tabellen `profile` und `daumen`, Zugriffsregeln
  (nur eigene Zeilen), Funktion `daumen_zahlen()` (Anzahl pro Spiel, für alle). Eingespielt am 26.11.2026.
- `registrierung.sql` – Registrierung für alle (ab Version 1.31.0): Funktion `username_frei()` (ist ein Username noch frei?).
  Eingespielt am 26.11.2026.

## Einstellungen im Dashboard für die Registrierung (ab Version 1.31.0)

- Authentication → Emails → SMTP Settings: eigener Mailversand über Strato (kontakt@manna-games.de, smtp.strato.de, Port 465). Eingerichtet am 26.11.2026.
- Authentication → Emails → Templates: In „Confirm signup“ und „Reset password“ muss neben dem Link `{{ .ConfirmationURL }}`
  auch der Code `{{ .Token }}` stehen. Den Code tippt man in Manna ein, falls ein Virenscanner den Link schon geöffnet hat.
- Authentication → Sign In / Providers: „Allow new users to sign up“ und „Confirm email“ eingeschaltet.
