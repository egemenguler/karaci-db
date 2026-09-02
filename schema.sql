-- ODTU-SAT dive log
-- Postgres / Supabase
--
-- v1: no auth. RLS is ON with permissive read/insert/update policies,
-- so the anon key can do everything a person with the paper logbook could.
-- There is deliberately NO delete policy: hard delete is impossible
-- through the API, only soft delete via deleted_at.
--
-- account + invite_code tables are commented out at the bottom, enable later.

create extension if not exists pgcrypto;

-- ============================================================
-- CAMP
-- ============================================================
create table camp (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  year        smallint not null,
  starts_on   date,
  ends_on     date,
  is_active   boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- More than one camp can be active at the same time. It is rare -- two
-- club camps overlapping -- but it happens, so there is deliberately NO
-- unique index here. A device works on one camp at a time; which one is
-- chosen on the device, not in the database (see README).
create index camp_active_idx
  on camp (is_active)
  where is_active and deleted_at is null;

create index camp_year_idx on camp (year desc) where deleted_at is null;

-- ============================================================
-- MEMBER  (logbook record. does not require an account.)
-- ============================================================
create table member (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sat_no      text,
  joined_year smallint,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create unique index member_sat_no_uniq
  on member (sat_no)
  where sat_no is not null and deleted_at is null;

create index member_name_idx on member (name) where deleted_at is null;

-- ============================================================
-- DIVE
-- ============================================================
create type tank_material as enum ('aluminum', 'steel');

create table dive (
  id             uuid primary key default gen_random_uuid(),
  camp_id        uuid not null references camp(id),
  member_id      uuid not null references member(id),

  -- filled on entry. these are the fields the surface marshal
  -- writes on paper, so they are all required.
  entry_time     timestamptz   not null,
  start_pressure smallint      not null,
  weight         numeric(4,1)  not null,
  tank_size      numeric(4,1)  not null,
  tank_material  tank_material not null,
  twin           boolean       not null default false,

  -- filled on exit
  exit_time      timestamptz,
  end_pressure   smallint,

  -- undirected: A's row names B, B's row need not name A
  buddy_id       uuid references member(id),
  leader_id      uuid references member(id),

  -- optional log fields, filled in later by the diver
  max_depth      numeric(4,1),
  dive_type      text,
  site           text,
  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint dive_time_order     check (exit_time is null or exit_time >= entry_time),
  constraint dive_pressure_order check (end_pressure is null or end_pressure <= start_pressure),
  constraint dive_buddy_not_self check (buddy_id is null or buddy_id <> member_id)
);

-- backs the "who's in the water" query
create index dive_active_idx
  on dive (camp_id, entry_time)
  where exit_time is null and deleted_at is null;

create index dive_member_idx on dive (member_id, entry_time desc) where deleted_at is null;
create index dive_camp_idx   on dive (camp_id, entry_time desc)   where deleted_at is null;
create index dive_buddy_idx  on dive (buddy_id) where buddy_id is not null and deleted_at is null;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger camp_updated_at   before update on camp   for each row execute function set_updated_at();
create trigger member_updated_at before update on member for each row execute function set_updated_at();
create trigger dive_updated_at   before update on dive   for each row execute function set_updated_at();

-- ============================================================
-- RLS
-- v1: no auth. anyone may read and write.
--
-- There is deliberately NO delete policy. Hard delete is impossible
-- through the API; the only way to remove a row is soft delete via
-- deleted_at, which is reversible.
--
-- When auth arrives, TIGHTEN these policies. Do not turn RLS off.
-- ============================================================
alter table camp   enable row level security;
alter table member enable row level security;
alter table dive   enable row level security;

create policy camp_read   on camp for select using (true);
create policy camp_insert on camp for insert with check (true);
create policy camp_update on camp for update using (true) with check (true);

create policy member_read   on member for select using (true);
create policy member_insert on member for insert with check (true);
create policy member_update on member for update using (true) with check (true);

create policy dive_read   on dive for select using (true);
create policy dive_insert on dive for insert with check (true);
create policy dive_update on dive for update using (true) with check (true);

-- Belt and braces: the privilege is missing too, not just the policy.
-- postgres / service_role can still delete from the SQL editor.
revoke delete on table camp, member, dive from anon, authenticated;

-- ============================================================
-- VIEW: who's in the water
--
-- No elapsed-time column on purpose: now() would be evaluated once
-- on the server and then freeze. The counter is computed in the
-- browser from entry_time.
-- ============================================================
create view active_dive with (security_invoker = on) as
select
  d.id,
  d.camp_id,
  d.member_id,
  m.name as member_name,
  d.entry_time,
  d.start_pressure,
  d.tank_size,
  d.tank_material,
  d.twin,
  d.weight,
  d.buddy_id,
  b.name as buddy_name,
  d.leader_id,
  l.name as leader_name
from dive d
join member m on m.id = d.member_id
left join member b on b.id = d.buddy_id
left join member l on l.id = d.leader_id
where d.exit_time is null
  and d.deleted_at is null;

-- ============================================================
-- VIEW: completed dives + consumption
-- max_depth is optional, so SAC is not always computable.
--   bar_per_min    : always available
--   liters_per_min : needs tank volume
--   sac_rate       : needs volume + depth (surface equivalent)
-- twin doubles effective volume.
-- ============================================================
create view dive_detail with (security_invoker = on) as
select
  d.*,
  m.name as member_name,
  c.name as camp_name,
  c.year as camp_year,
  extract(epoch from (d.exit_time - d.entry_time)) / 60 as duration_min,
  (d.start_pressure - d.end_pressure) as pressure_used,
  case when d.exit_time > d.entry_time
    then (d.start_pressure - d.end_pressure)
       / (extract(epoch from (d.exit_time - d.entry_time)) / 60)
  end as bar_per_min,
  case when d.exit_time > d.entry_time
    then (d.start_pressure - d.end_pressure) * d.tank_size * (case when d.twin then 2 else 1 end)
       / (extract(epoch from (d.exit_time - d.entry_time)) / 60)
  end as liters_per_min,
  case when d.exit_time > d.entry_time and d.max_depth is not null
    then (d.start_pressure - d.end_pressure) * d.tank_size * (case when d.twin then 2 else 1 end)
       / (extract(epoch from (d.exit_time - d.entry_time)) / 60)
       / ((d.max_depth / 2 / 10) + 1)
  end as sac_rate
from dive d
join member m on m.id = d.member_id
join camp c   on c.id = d.camp_id
where d.exit_time is not null
  and d.deleted_at is null;

-- ============================================================
-- FUNCTION: suggested weight
-- last weight this member used with the same tank setup
-- ============================================================
create or replace function suggested_weight(
  p_member_id uuid,
  p_tank_material tank_material,
  p_tank_size numeric,
  p_twin boolean
) returns numeric as $$
  select d.weight
  from dive d
  where d.member_id = p_member_id
    and d.deleted_at is null
    and d.tank_material = p_tank_material
    and d.tank_size = p_tank_size
    and d.twin = p_twin
  order by d.entry_time desc
  limit 1;
$$ language sql stable;

-- ============================================================
-- LATER: account + invite code
-- unused in v1. enable when auth is added.
-- roles are just member | admin. there is no "karaci" role:
-- surface duty is an ad-hoc task, not a permission level.
--
-- created_by_id belongs here too: add it to camp/member/dive
-- referencing account(id) once accounts exist.
-- ============================================================

-- create table account (
--   id           uuid primary key default gen_random_uuid(),
--   auth_user_id uuid not null unique,              -- supabase auth.users.id
--   member_id    uuid unique references member(id), -- nullable: account may not be linked
--   role         text not null default 'member',    -- member | admin
--   created_at   timestamptz not null default now()
-- );

-- one shared code, rotated when it expires
-- create table invite_code (
--   code       text primary key,
--   expires_at timestamptz not null,
--   created_by uuid references account(id),
--   created_at timestamptz not null default now()
-- );
