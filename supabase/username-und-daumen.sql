-- Manna – Username & Daumen hoch (Migration „username_und_daumen“, eingespielt am 26.11.2026, ab Version 1.30.0)
--
-- Username: einer pro Konto, eindeutig (Groß-/Kleinschreibung zählt nicht: „Lukas“ und „lukas“ sind derselbe).
--   Vorerst sieht jeder nur seinen eigenen. Sollen später bei Rezensionen Namen anderer erscheinen,
--   wird das gezielt freigegeben (nur der Username, nie die E-Mail).
-- Daumen hoch: höchstens einer pro Konto und Spiel, nur mit Username. Wer welches Spiel mag, sieht
--   niemand außer dem Nutzer selbst. Für alle sichtbar ist nur die Anzahl pro Spiel (Funktion daumen_zahlen()).

create table public.profile (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_.-]{1,18}[A-Za-z0-9ÄÖÜäöüß]$'),
  geaendert_am timestamptz not null default now()
);
create unique index profile_username_eindeutig on public.profile (lower(username));

create table public.daumen (
  user_id uuid not null default auth.uid() references public.profile(user_id) on delete cascade,
  spiel_id text not null check (spiel_id ~ '^[a-z0-9-]{1,60}$'),
  erstellt_am timestamptz not null default now(),
  primary key (user_id, spiel_id)
);
create index daumen_spiel on public.daumen (spiel_id);

alter table public.profile enable row level security;
alter table public.daumen enable row level security;

revoke all on public.profile, public.daumen from anon, public, authenticated;
grant select, insert, update on public.profile to authenticated;
grant select, insert, delete on public.daumen to authenticated;

create policy "Eigenes Profil lesen" on public.profile for select to authenticated using (user_id = (select auth.uid()));
create policy "Eigenes Profil anlegen" on public.profile for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Eigenes Profil ändern" on public.profile for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Daumen nur mit Username: das sichert schon der Fremdschlüssel auf profile ab
create policy "Eigene Daumen lesen" on public.daumen for select to authenticated using (user_id = (select auth.uid()));
create policy "Eigene Daumen setzen" on public.daumen for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Eigene Daumen zurücknehmen" on public.daumen for delete to authenticated using (user_id = (select auth.uid()));

-- Server setzt die Zeit; Username ohne Leerzeichen am Rand; reservierte Namen gesperrt
create or replace function privat.profil_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.username := btrim(new.username);
  new.geaendert_am := clock_timestamp();
  if lower(new.username) in ('admin','administrator','manna','support','kontakt','moderator','system','gast') then
    raise exception 'Dieser Username ist leider nicht möglich.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger profil_pruefen before insert or update on public.profile
  for each row execute function privat.profil_pruefen();

-- Obergrenze gegen Missbrauch (es gibt nie annähernd so viele Spiele)
create or replace function privat.daumen_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.erstellt_am := clock_timestamp();
  if (select count(*) from public.daumen where user_id = new.user_id) >= 3000 then
    raise exception 'Zu viele Daumen in diesem Konto.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger daumen_pruefen before insert on public.daumen
  for each row execute function privat.daumen_pruefen();

revoke all on function privat.profil_pruefen(), privat.daumen_pruefen() from public, anon, authenticated;

-- Anzahl Daumen pro Spiel, für alle lesbar (auch ohne Konto). Gibt keine Nutzer preis.
create or replace function public.daumen_zahlen() returns table (spiel_id text, anzahl bigint)
language sql stable security definer set search_path = '' as $$
  select d.spiel_id, count(*) from public.daumen d group by d.spiel_id
$$;
revoke all on function public.daumen_zahlen() from public;
grant execute on function public.daumen_zahlen() to anon, authenticated;
