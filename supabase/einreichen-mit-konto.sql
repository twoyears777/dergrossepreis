-- Manna – Spiel einreichen nur mit Konto (Migration „einreichen_mit_konto“, ab Version 1.32.0)
-- Eingespielt am 27.11.2026 (direkt nach dem Veröffentlichen von 1.32.0).
--
-- Reihenfolge: Die App 1.32.0 schickt Einreichungen schon mit Anmeldung und ohne Name/E-Mail. Das klappt auch mit der
-- alten Datenbank. Umgekehrt nicht: Wird dieses SQL vor der App eingespielt, scheitern Einreichungen aus der alten App
-- (ohne Anmeldung). Also: erst App veröffentlichen, dann dieses SQL.
--
-- Was sich ändert:
--   - Neue Spalten user_id (Konto) und username („eingereicht von …“, Stand beim Einreichen).
--   - Einreichen dürfen nur noch Angemeldete mit Username. Konto und Username setzt die Datenbank selbst
--     (aus dem Login und der Tabelle profile), die App kann sie nicht fälschen.
--   - Name und E-Mail werden nicht mehr gespeichert (das Konto reicht für Rückfragen).
--   - Wird das Konto gelöscht, verschwinden auch seine noch offenen Einreichungen.
--   - Obergrenze pro Konto: höchstens 5 Einreichungen in 24 Stunden. Die alte Grenze (30 pro Stunde für ALLE zusammen)
--     konnte ein einzelner Störer ausreizen und damit alle anderen aussperren. Sie bleibt nur als Notbremse,
--     hochgesetzt auf 200 pro Stunde. Beide Grenzen melden „limit_erreicht“ (die App zeigt dann „zu viele Einsendungen“).

alter table public.einreichungen
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists username text check (char_length(username) <= 20);

create or replace function privat.einreichung_von() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'nicht_angemeldet' using errcode = 'P0001'; end if;
  new.user_id := auth.uid();
  new.username := (select p.username from public.profile p where p.user_id = auth.uid());
  if new.username is null then raise exception 'kein_username' using errcode = 'P0001'; end if;
  -- Obergrenze pro Konto. Die Sperre sorgt dafür, dass gleichzeitige Anfragen desselben Kontos nacheinander gezählt werden.
  perform pg_advisory_xact_lock(hashtext('einreichung:' || auth.uid()::text));
  if (select count(*) from public.einreichungen e
      where e.user_id = auth.uid() and e.erstellt_am > now() - interval '24 hours') >= 5 then
    raise exception 'limit_erreicht' using errcode = 'P0001';
  end if;
  new.name := null;
  new.email := null;
  return new;
end $$;
revoke all on function privat.einreichung_von() from public, anon, authenticated;

-- Notbremse für alle zusammen (vorher 30 pro Stunde, siehe oben)
create or replace function privat.einreichung_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.einreichungen where erstellt_am > now() - interval '1 hour') >= 200 then
    raise exception 'limit_erreicht' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function privat.einreichung_limit() from public, anon, authenticated;

-- läuft nach einreichung_limit (Trigger laufen in alphabetischer Reihenfolge)
drop trigger if exists einreichung_von on public.einreichungen;
create trigger einreichung_von before insert on public.einreichungen
  for each row execute function privat.einreichung_von();

drop policy if exists "Jeder darf einreichen" on public.einreichungen;
drop policy if exists "Angemeldete dürfen einreichen" on public.einreichungen;
create policy "Angemeldete dürfen einreichen" on public.einreichungen
  for insert to authenticated with check (status = 'neu' and user_id = (select auth.uid()));
revoke insert on public.einreichungen from anon;
