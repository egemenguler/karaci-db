-- ODTU-SAT dive log -- development seed data
--
-- Fixed UUIDs and "on conflict do update", so this file is re-runnable.
-- Running it again resets the test state: the three open dives become open
-- again with fresh entry times, and anything soft-deleted comes back.
--
-- NOT for production.

-- ============================================================
-- CAMP  (one active camp; camp_single_active allows only one)
-- ============================================================
insert into camp (id, name, year, starts_on, ends_on, is_active) values
  ('c0000000-0000-4000-8000-000000000001', 'Kaş Yaz Kampı', 2026, '2026-08-20', '2026-08-30', true)
on conflict (id) do update set
  name       = excluded.name,
  year       = excluded.year,
  starts_on  = excluded.starts_on,
  ends_on    = excluded.ends_on,
  is_active  = excluded.is_active,
  deleted_at = null;

-- ============================================================
-- MEMBERS
-- ============================================================
insert into member (id, name, sat_no, joined_year) values
  ('11111111-0000-4000-8000-000000000001', 'Ahmet Yılmaz',  'SAT-1042', 2021),
  ('11111111-0000-4000-8000-000000000002', 'Deniz Kaya',    'SAT-1103', 2022),
  ('11111111-0000-4000-8000-000000000003', 'Ece Demir',     'SAT-1188', 2023),
  ('11111111-0000-4000-8000-000000000004', 'Burak Şahin',   'SAT-0917', 2019),
  ('11111111-0000-4000-8000-000000000005', 'Selin Arslan',  'SAT-1204', 2024),
  ('11111111-0000-4000-8000-000000000006', 'Mert Doğan',    'SAT-0863', 2018)
on conflict (id) do update set
  name        = excluded.name,
  sat_no      = excluded.sat_no,
  joined_year = excluded.joined_year,
  deleted_at  = null;

-- ============================================================
-- OPEN DIVES  (exit_time is null -- these are "who's in the water")
--
-- Entry times are relative to now() so the timer and the --dive-*
-- colour bands can both be seen at a glance:
--   12 min -> --dive-fresh (0-20)
--   38 min -> --dive-long  (35-50)
--   62 min -> --dive-deep  (50+)
-- ============================================================
insert into dive (
  id, camp_id, member_id,
  entry_time, start_pressure, weight, tank_size, tank_material, twin,
  buddy_id, leader_id
) values
  ('d0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000001',           -- Ahmet
   now() - interval '12 minutes', 200, 6.0, 12, 'steel', false,
   '11111111-0000-4000-8000-000000000002', null),    -- buddy: Deniz

  ('d0000000-0000-4000-8000-000000000002',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000002',           -- Deniz
   now() - interval '38 minutes', 220, 8.0, 10, 'aluminum', false,
   null, null),                                      -- undirected: Ahmet's row
                                                     -- already names Deniz

  ('d0000000-0000-4000-8000-000000000003',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000003',           -- Ece
   now() - interval '62 minutes', 190, 5.5, 12, 'steel', false,
   null, '11111111-0000-4000-8000-000000000006')     -- leader: Mert
on conflict (id) do update set
  camp_id        = excluded.camp_id,
  member_id      = excluded.member_id,
  entry_time     = excluded.entry_time,
  start_pressure = excluded.start_pressure,
  weight         = excluded.weight,
  tank_size      = excluded.tank_size,
  tank_material  = excluded.tank_material,
  twin           = excluded.twin,
  buddy_id       = excluded.buddy_id,
  leader_id      = excluded.leader_id,
  exit_time      = null,     -- re-open, so the exit flow can be tested again
  end_pressure   = null,
  deleted_at     = null;

-- ============================================================
-- CLOSED DIVES
--
-- Not strictly needed for the "who's in the water" screen, but they let
-- the member profile, the charts and the camp summary be built without
-- entering data by hand. Ahmet has two so his trend has more than one point.
--
-- Only Burak's row names a buddy; Selin's does not. Buddy is undirected --
-- one side naming the other is enough.
-- ============================================================
insert into dive (
  id, camp_id, member_id,
  entry_time, start_pressure, weight, tank_size, tank_material, twin,
  exit_time, end_pressure,
  buddy_id, leader_id,
  max_depth, dive_type, site, notes
) values
  ('d0000000-0000-4000-8000-000000000011',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000001',           -- Ahmet
   '2026-08-22 10:15:00+03', 200, 6.0, 12, 'steel', false,
   '2026-08-22 11:02:00+03', 60,
   null, null,
   18.5, 'Eğitim', 'Sıçan Adası', null),

  ('d0000000-0000-4000-8000-000000000012',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000001',           -- Ahmet, ikinci dalış
   '2026-08-24 09:40:00+03', 205, 6.0, 12, 'steel', false,
   '2026-08-24 10:31:00+03', 70,
   null, null,
   24.0, 'Gezi', 'Uçak Batığı', 'Akıntı vardı, dönüşte biraz zorladık.'),

  ('d0000000-0000-4000-8000-000000000013',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000004',           -- Burak
   '2026-08-22 10:20:00+03', 210, 5.0, 15, 'steel', false,
   '2026-08-22 11:10:00+03', 55,
   '11111111-0000-4000-8000-000000000005', null,     -- buddy: Selin
   22.5, 'Gezi', 'Büyük Mağara', null),

  ('d0000000-0000-4000-8000-000000000014',
   'c0000000-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000005',           -- Selin
   '2026-08-22 10:20:00+03', 200, 7.0, 12, 'aluminum', false,
   '2026-08-22 11:08:00+03', 75,
   null, null,
   null, null, null, null)                           -- optional fields empty
on conflict (id) do update set
  camp_id        = excluded.camp_id,
  member_id      = excluded.member_id,
  entry_time     = excluded.entry_time,
  start_pressure = excluded.start_pressure,
  weight         = excluded.weight,
  tank_size      = excluded.tank_size,
  tank_material  = excluded.tank_material,
  twin           = excluded.twin,
  exit_time      = excluded.exit_time,
  end_pressure   = excluded.end_pressure,
  buddy_id       = excluded.buddy_id,
  leader_id      = excluded.leader_id,
  max_depth      = excluded.max_depth,
  dive_type      = excluded.dive_type,
  site           = excluded.site,
  notes          = excluded.notes,
  deleted_at     = null;
