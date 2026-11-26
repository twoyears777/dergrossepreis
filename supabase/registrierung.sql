-- Manna – Registrierung für alle (Migration „registrierung“, ab Version 1.31.0)
-- NOCH NICHT EINGESPIELT. Wird erst beim Veröffentlichen von 1.31.0 eingespielt.
--
-- Funktion username_frei(): Prüft beim Registrieren, ob ein Username noch frei ist, bevor das Konto angelegt wird.
--   Für alle aufrufbar (auch ohne Konto), gibt aber nur 'frei', 'vergeben', 'gesperrt' oder 'ungueltig' zurück,
--   nie E-Mail-Adressen oder andere Daten. Regeln wie bei der Tabelle profile (username-und-daumen.sql).
--   Fehlt die Funktion, registriert die App trotzdem und prüft den Namen beim ersten Login.

create or replace function public.username_frei(wunsch text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when wunsch is null
      or btrim(wunsch) !~ '^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_.-]{1,18}[A-Za-z0-9ÄÖÜäöüß]$' then 'ungueltig'
    when lower(btrim(wunsch)) in ('admin','administrator','manna','support','kontakt','moderator','system','gast') then 'gesperrt'
    when exists (select 1 from public.profile p where lower(p.username) = lower(btrim(wunsch))) then 'vergeben'
    else 'frei'
  end
$$;
revoke all on function public.username_frei(text) from public;
grant execute on function public.username_frei(text) to anon, authenticated;
