-- Manna – Konten & Sync (Migration „konten_und_sync“, eingespielt am 26.11.2026)
-- Daten pro Nutzer. Jeder sieht nur seine eigenen Zeilen.

create table public.sync_eintraege (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schluessel text not null check (schluessel ~ '^(brett|favoriten|ausgeblendet|vorlage:[A-Za-z0-9_-]{1,60}|spiel:[A-Za-z0-9_-]{1,60})$'),
  daten jsonb check (daten is null or octet_length(daten::text) <= 1000000),
  geloescht boolean not null default false,
  geaendert_am timestamptz not null default now(),
  primary key (user_id, schluessel),
  check (geloescht or daten is not null)
);

create table public.sync_bilder (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bild_id text not null check (bild_id ~ '^img-[a-z0-9]{1,40}$'),
  daten text not null check (length(daten) <= 3000000 and daten ~ '^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$'),
  erstellt_am timestamptz not null default now(),
  primary key (user_id, bild_id)
);

alter table public.sync_eintraege enable row level security;
alter table public.sync_bilder enable row level security;

revoke all on public.sync_eintraege, public.sync_bilder from anon, public;
grant select, insert, update, delete on public.sync_eintraege, public.sync_bilder to authenticated;

create policy "Eigene Einträge lesen" on public.sync_eintraege for select to authenticated using (user_id = (select auth.uid()));
create policy "Eigene Einträge anlegen" on public.sync_eintraege for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Eigene Einträge ändern" on public.sync_eintraege for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Eigene Einträge löschen" on public.sync_eintraege for delete to authenticated using (user_id = (select auth.uid()));

create policy "Eigene Bilder lesen" on public.sync_bilder for select to authenticated using (user_id = (select auth.uid()));
create policy "Eigene Bilder anlegen" on public.sync_bilder for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Eigene Bilder löschen" on public.sync_bilder for delete to authenticated using (user_id = (select auth.uid()));

-- Zeitstempel setzt immer der Server (Grundlage für den Abgleich), dazu Obergrenzen gegen Missbrauch
create or replace function privat.sync_eintrag_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.geaendert_am := clock_timestamp();
  if new.geloescht then new.daten := null; end if;
  if tg_op = 'INSERT' and (select count(*) from public.sync_eintraege where user_id = new.user_id) >= 2000 then
    raise exception 'Zu viele Einträge in diesem Konto.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger sync_eintrag_pruefen before insert or update on public.sync_eintraege
  for each row execute function privat.sync_eintrag_pruefen();

create or replace function privat.sync_bild_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.sync_bilder where user_id = new.user_id) >= 500
     or (select coalesce(sum(length(daten)), 0) from public.sync_bilder where user_id = new.user_id) + length(new.daten) > 100000000 then
    raise exception 'Der Bilderspeicher dieses Kontos ist voll.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger sync_bild_pruefen before insert on public.sync_bilder
  for each row execute function privat.sync_bild_pruefen();

revoke all on function privat.sync_eintrag_pruefen(), privat.sync_bild_pruefen() from public, anon, authenticated;

-- Konto löschen: entfernt den Login und über "on delete cascade" alle Daten. Das Admin-Konto ist geschützt.
create or replace function public.konto_loeschen() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.' using errcode = '28000'; end if;
  if exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Das Admin-Konto kann hier nicht gelöscht werden.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.konto_loeschen() from public, anon;
grant execute on function public.konto_loeschen() to authenticated;

-- Wach-Halter (Migration „wach_halten“, 26.11.2026): wird alle 3 Tage von .github/workflows/wach-halten.yml aufgerufen,
-- damit das Projekt im kostenlosen Tarif nicht pausiert. Liest nichts, gibt nur true zurück.
create or replace function public.wach() returns boolean
language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.wach() from public;
grant execute on function public.wach() to anon, authenticated;

-- Härtung der Rechte (Migration „konten_rechte_haerten“, 26.11.2026):
-- authenticated hatte aus den Supabase-Standardrechten noch TRUNCATE/TRIGGER/REFERENCES. TRUNCATE umgeht die
-- Zugriffsregeln. Deshalb zurücksetzen auf genau das Nötige (Bilder werden nie geändert, nur angelegt/gelöscht).
revoke all on public.sync_eintraege from authenticated;
revoke all on public.sync_bilder from authenticated;
grant select, insert, update, delete on public.sync_eintraege to authenticated;
grant select, insert, delete on public.sync_bilder to authenticated;
