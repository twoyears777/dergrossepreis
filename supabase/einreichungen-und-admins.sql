-- Manna – Spiel einreichen und Editor-Login (ab Version 1.28.0)
-- Eingespielt am 25.11.2026. NICHT nochmal ausführen.
-- Nachträglich aufgeschrieben am 26.11.2026, genau nach dem Stand in der Datenbank. Vorher stand das nur im
-- Supabase-Projekt selbst. Damit liegt jetzt alles, was in der Datenbank eingerichtet ist, auch hier zum Nachlesen.
-- Änderungen ab Version 1.32.0 (nur mit Konto, Limit pro Konto) stehen in einreichen-mit-konto.sql.
--
-- Was es macht:
--   - Tabelle einreichungen: eingereichte Spiele. Besucher dürfen nur einreichen (nur bestimmte Spalten), nie lesen.
--   - Tabelle admins: wer im Editor die Einreichungen sehen, bearbeiten und löschen darf (nur Lukas).
--     Keine Zugriffsregel für Nutzer: Niemand kann über die App in diese Tabelle schauen.
--   - Obergrenze gegen Spam (Trigger einreichung_limit).
--   - Aufräumen jede Nacht (pg_cron): Erledigtes und alles, was älter als 6 Monate ist, wird gelöscht
--     (so steht es auch in der Datenschutzerklärung).

create schema if not exists privat;
grant usage on schema privat to authenticated;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated, public;

create table public.einreichungen (
  id uuid primary key default gen_random_uuid(),
  erstellt_am timestamptz not null default now(),
  titel text not null check (char_length(titel) >= 1 and char_length(titel) <= 120),
  spiel jsonb not null check (jsonb_typeof(spiel) = 'object' and octet_length(spiel::text) <= 20000),
  name text check (char_length(name) <= 80),
  email text check (char_length(email) <= 200),
  rechte_bestaetigt boolean not null check (rechte_bestaetigt),
  status text not null default 'neu' check (status in ('neu', 'uebernommen', 'abgelehnt'))
);
alter table public.einreichungen enable row level security;

-- Einreichen: nur diese Spalten (id, Datum und Status setzt die Datenbank). Lesen/Ändern/Löschen nur über die Regeln unten.
revoke all on public.einreichungen from anon, authenticated, public;
grant insert (titel, spiel, name, email, rechte_bestaetigt) on public.einreichungen to anon, authenticated;
grant select, update, delete on public.einreichungen to authenticated;

create or replace function privat.ist_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function privat.ist_admin() from public, anon;
grant execute on function privat.ist_admin() to authenticated;

create policy "Jeder darf einreichen" on public.einreichungen
  for insert to anon, authenticated with check (status = 'neu');
create policy "Admin liest" on public.einreichungen
  for select to authenticated using (privat.ist_admin());
create policy "Admin bearbeitet" on public.einreichungen
  for update to authenticated using (privat.ist_admin()) with check (privat.ist_admin());
create policy "Admin löscht" on public.einreichungen
  for delete to authenticated using (privat.ist_admin());

-- Spam-Bremse: höchstens 30 Einreichungen pro Stunde für alle zusammen
-- (ab 1.32.0 ersetzt: 5 pro Konto und Tag, 200 pro Stunde als Notbremse, siehe einreichen-mit-konto.sql)
create or replace function privat.einreichung_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.einreichungen
      where erstellt_am > now() - interval '1 hour') >= 30 then
    raise exception 'limit_erreicht';
  end if;
  return new;
end $$;
revoke all on function privat.einreichung_limit() from public, anon, authenticated;
create trigger einreichung_limit before insert on public.einreichungen
  for each row execute function privat.einreichung_limit();

-- Nächtliches Aufräumen um 3:17 Uhr (UTC)
create extension if not exists pg_cron;
select cron.schedule('einreichungen-aufraeumen', '17 3 * * *',
  $$delete from public.einreichungen where status <> 'neu' or erstellt_am < now() - interval '6 months'$$);

-- Lukas als Admin eintragen (seine Nutzer-ID aus Authentication → Users):
-- insert into public.admins (user_id) values ('<nutzer-id>');
