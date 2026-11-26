-- Manna – Klicks pro Spiel und Nutzer (Migration „klicks“, ab Version 1.32.0)
-- NOCH NICHT EINGESPIELT. Erst nach Lukas' Okay, zusammen mit dem Veröffentlichen von 1.32.0.
--
-- Reihenfolge: egal. Die App 1.32.0 kommt ohne diese Tabelle klar (Zählen scheitert still, es gibt nur keine
-- Empfehlung). Die alte App fragt die Tabelle gar nicht ab.
--
-- Was es macht:
--   - Pro Konto und Spiel eine Zeile mit einer Zahl, die bei jedem Öffnen des Spiels um 1 hochzählt.
--   - Gezählt wird nur über die Funktion klick_zaehlen(): Konto setzt die Datenbank selbst (aus dem Login),
--     die App kann nicht für andere zählen und keine Zahl direkt setzen.
--   - Lesen darf jeder nur seine eigenen Zahlen (für „Empfehlung für dich“). Lukas sieht alles im Supabase-Dashboard.
--   - Obergrenze 3000 Spiele pro Konto (wie bei den Daumen), damit niemand die Tabelle zumüllt.
--   - Wird das Konto gelöscht, verschwinden auch seine Klicks.

create table if not exists public.klicks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  spiel_id text not null check (spiel_id ~ '^[a-z0-9-]{1,60}$'),
  anzahl integer not null default 1 check (anzahl between 1 and 1000000),
  zuletzt timestamptz not null default now(),
  primary key (user_id, spiel_id)
);
create index if not exists klicks_spiel on public.klicks (spiel_id);

alter table public.klicks enable row level security;
revoke all on public.klicks from anon, public, authenticated;
grant select on public.klicks to authenticated;

drop policy if exists "Eigene Klicks lesen" on public.klicks;
create policy "Eigene Klicks lesen" on public.klicks for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.klick_zaehlen(spiel text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'nicht_angemeldet' using errcode = 'P0001'; end if;
  if spiel is null or spiel !~ '^[a-z0-9-]{1,60}$' then raise exception 'ungueltig' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.klicks k where k.user_id = auth.uid() and k.spiel_id = spiel)
     and (select count(*) from public.klicks k where k.user_id = auth.uid()) >= 3000 then
    raise exception 'zu_viele' using errcode = 'P0001';
  end if;
  insert into public.klicks as k (user_id, spiel_id) values (auth.uid(), spiel)
    on conflict (user_id, spiel_id) do update set anzahl = least(k.anzahl + 1, 1000000), zuletzt = now()
    returning k.anzahl into n;
  return n;
end $$;
revoke all on function public.klick_zaehlen(text) from public, anon;
grant execute on function public.klick_zaehlen(text) to authenticated;
