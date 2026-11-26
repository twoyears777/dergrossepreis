# Supabase (Projekt „manna“, Frankfurt)

Hier liegt zum Nachlesen, was in der Datenbank eingerichtet ist. Ausgeführt wird es im Supabase-Projekt selbst,
nicht von hier aus.

- `konten-und-sync.sql` – Konten & Sync (ab Version 1.29.0): Tabellen `sync_eintraege` und `sync_bilder`,
  Zugriffsregeln (jeder sieht nur seine eigenen Daten), Obergrenzen gegen Missbrauch, Funktion `konto_loeschen()`, dazu `wach()` für den Wach-Halter (`.github/workflows/wach-halten.yml`).
- Die Tabellen `einreichungen` (Spiel einreichen) und `admins` (Editor-Login) gibt es seit Version 1.28.0.
- `username-und-daumen.sql` – Username & Daumen hoch (ab Version 1.30.0): Tabellen `profile` und `daumen`, Zugriffsregeln
  (nur eigene Zeilen), Funktion `daumen_zahlen()` (Anzahl pro Spiel, für alle). Eingespielt am 26.11.2026.
