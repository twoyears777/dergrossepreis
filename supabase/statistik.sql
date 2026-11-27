-- Manna – „zuletzt aktiv“ und Statistik für den Admin (Migration „statistik“, ab Version 1.33.0)
-- NOCH NICHT EINGESPIELT. Direkt nach dem Veröffentlichen von 1.33.0 im Supabase-Projekt „manna“ ausführen.
--
-- Reihenfolge: egal. Die App 1.33.0 kommt ohne diese Datenbank-Teile klar (Aktiv-Meldung scheitert still,
-- die Statistik zeigt „konnte nicht geladen werden“). Die alte App ruft beides gar nicht auf.
--
-- Was es macht:
--   - Tabelle aktiv: pro Konto genau EIN Zeitpunkt „zuletzt aktiv“. Keine Liste, kein Verlauf, nichts darüber, was man tut.
--     Gesetzt wird nur über bin_aktiv(): Konto kommt aus dem Login, Zeit setzt die Datenbank. Die App ruft das
--     höchstens einmal pro Stunde auf, die Datenbank schreibt höchstens alle 30 Minuten (spart Schreibzugriffe).
--     Niemand kann die Tabelle über die App lesen (keine Rechte, keine Zugriffsregel).
--   - Funktion admin_statistik(): Zahlen für die Statistik auf der Konto-Seite. Prüft in der Datenbank selbst,
--     ob das angemeldete Konto in der Tabelle admins steht (privat.ist_admin()). Alle anderen bekommen den Fehler
--     „kein_admin“ und keine Zahlen. Es kommen nur Summen heraus, keine E-Mail-Adressen, keine Usernames.
--   - Wird das Konto gelöscht, verschwindet auch sein „zuletzt aktiv“.

create table if not exists public.aktiv (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zuletzt timestamptz not null default now()
);
create index if not exists aktiv_zuletzt on public.aktiv (zuletzt);

alter table public.aktiv enable row level security;
revoke all on public.aktiv from anon, public, authenticated;

create or replace function public.bin_aktiv() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'nicht_angemeldet' using errcode = 'P0001'; end if;
  insert into public.aktiv as a (user_id) values (auth.uid())
    on conflict (user_id) do update set zuletzt = now()
    where a.zuletzt < now() - interval '30 minutes';
end $$;
revoke all on function public.bin_aktiv() from public, anon;
grant execute on function public.bin_aktiv() to authenticated;

create or replace function public.admin_statistik() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privat.ist_admin() then raise exception 'kein_admin' using errcode = '42501'; end if;
  return jsonb_build_object(
    'stand', now(),
    'nutzer', (select count(*) from auth.users),
    'bestaetigt', (select count(*) from auth.users where email_confirmed_at is not null),
    'mit_username', (select count(*) from public.profile),
    'neu_7_tage', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'aktiv_24h', (select count(*) from public.aktiv where zuletzt > now() - interval '24 hours'),
    'aktiv_7_tage', (select count(*) from public.aktiv where zuletzt > now() - interval '7 days'),
    'daumen', (select count(*) from public.daumen),
    'aufrufe', (select coalesce(sum(anzahl), 0) from public.klicks),
    'einreichungen_offen', (select count(*) from public.einreichungen where status = 'neu'),
    'top_daumen', (select coalesce(jsonb_agg(jsonb_build_object('spiel_id', t.spiel_id, 'anzahl', t.n)), '[]'::jsonb) from
      (select d.spiel_id, count(*) n from public.daumen d group by d.spiel_id order by n desc, d.spiel_id limit 5) t),
    'top_aufrufe', (select coalesce(jsonb_agg(jsonb_build_object('spiel_id', t.spiel_id, 'anzahl', t.n)), '[]'::jsonb) from
      (select k.spiel_id, sum(k.anzahl) n from public.klicks k group by k.spiel_id order by n desc, k.spiel_id limit 5) t)
  );
end $$;
revoke all on function public.admin_statistik() from public, anon;
grant execute on function public.admin_statistik() to authenticated;
