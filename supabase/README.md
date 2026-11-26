# Supabase (Projekt „manna“, Frankfurt)

Hier liegt zum Nachlesen, was in der Datenbank eingerichtet ist. Ausgeführt wird es im Supabase-Projekt selbst,
nicht von hier aus.

- `konten-und-sync.sql` – Konten & Sync (ab Version 1.29.0): Tabellen `sync_eintraege` und `sync_bilder`,
  Zugriffsregeln (jeder sieht nur seine eigenen Daten), Obergrenzen gegen Missbrauch, Funktion `konto_loeschen()`.
- Die Tabellen `einreichungen` (Spiel einreichen) und `admins` (Editor-Login) gibt es seit Version 1.28.0.
