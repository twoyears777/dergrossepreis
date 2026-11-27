-- Manna – Liste der registrierten Nutzer für den Admin (Migration „nutzerliste“, ab Version 1.34.0)
-- Eingespielt am 27.11.2026
--
-- Reihenfolge: egal. Ohne diese Funktion zeigt die App beim Klick auf „Registrierte Nutzer“ nur
-- „konnte nicht geladen werden“, sonst läuft alles weiter. Die alte App ruft sie gar nicht auf.
--
-- Was es macht:
--   - Funktion admin_nutzer(): pro Konto Username (oder leer), wann registriert und wann zuletzt online.
--     „Zuletzt online“ = das Spätere aus „zuletzt aktiv“ (Tabelle aktiv, ab 1.33.0) und dem letzten Login.
--   - Prüft in der Datenbank selbst, ob das angemeldete Konto Admin ist (privat.ist_admin()).
--     Alle anderen bekommen den Fehler „kein_admin“ und nichts.
--   - Bewusst KEINE E-Mail-Adressen und keine Konto-IDs, nur das, was für die Liste nötig ist.

create or replace function public.admin_nutzer() returns table (username text, registriert timestamptz, zuletzt timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privat.ist_admin() then raise exception 'kein_admin' using errcode = '42501'; end if;
  return query
    select p.username,
           u.created_at,
           nullif(greatest(coalesce(a.zuletzt, '-infinity'), coalesce(u.last_sign_in_at, '-infinity')), '-infinity'::timestamptz)
    from auth.users u
    left join public.profile p on p.user_id = u.id
    left join public.aktiv a on a.user_id = u.id
    order by 3 desc nulls last, u.created_at desc
    limit 5000;
end $$;
revoke all on function public.admin_nutzer() from public, anon;
grant execute on function public.admin_nutzer() to authenticated;
