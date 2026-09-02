-- ODTU-SAT dive log -- development seed data
--
-- NOT for production. This file fabricates camps and dives so the
-- screens, the charts and the camp summary can be built and checked
-- without a real camp having happened.
--
-- Run AFTER members.sql. Members are NOT created here: the divers below
-- are looked up by sat_no from the real club list. If members.sql has
-- not been run, the lookups return null and the inserts fail on
-- member_id -- which is the intended way to find out.
--
-- The dives are invented, the names are not. They are attached to real
-- members so the screens read naturally; nothing here is a record of an
-- actual dive by these people. Everything sits inside the one camp
-- below, so it is easy to see and easy to remove.
--
-- Fixed UUIDs and "on conflict do update", so this file is re-runnable
-- and only ever touches its own rows: running it again resets the test
-- state (the three open dives become open again with fresh entry times)
-- without disturbing anything else in the database.
--
-- twin is not set: the club does not use twin sets, the column keeps its
-- default of false, and the entry form no longer asks (see CLAUDE.md).

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
-- OPEN DIVES  (exit_time is null -- these are "who's in the water")
--
-- Entry times are relative to now() so the timer and the --dive-*
-- colour bands can both be seen at a glance:
--   12 min -> --dive-fresh (0-20)
--   38 min -> --dive-long  (35-50)
--   62 min -> --dive-deep  (50+)
--
-- Tank sizes follow the pairings the entry form offers: 11.1 aluminium,
-- 10/12/15 steel.
-- ============================================================
insert into dive (
  id, camp_id, member_id,
  entry_time, start_pressure, weight, tank_size, tank_material,
  buddy_id, leader_id
) values
  ('d0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1101'),      -- Egemen Guler
   now() - interval '12 minutes', 200, 6.0, 12, 'steel',
   (select id from member where sat_no = '1102'),      -- buddy: Ismail Reha Demir
   null),

  ('d0000000-0000-4000-8000-000000000002',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1102'),      -- Ismail Reha Demir
   now() - interval '38 minutes', 220, 8.0, 11.1, 'aluminum',
   null,                                              -- undirected: Egemen's row
   null),                                             -- already names him

  ('d0000000-0000-4000-8000-000000000003',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1103'),      -- M. Selen Erbay
   now() - interval '62 minutes', 190, 5.5, 12, 'steel',
   null,
   (select id from member where sat_no = '917'))       -- leader: Merve Kurt (2019)
on conflict (id) do update set
  camp_id        = excluded.camp_id,
  member_id      = excluded.member_id,
  entry_time     = excluded.entry_time,
  start_pressure = excluded.start_pressure,
  weight         = excluded.weight,
  tank_size      = excluded.tank_size,
  tank_material  = excluded.tank_material,
  buddy_id       = excluded.buddy_id,
  leader_id      = excluded.leader_id,
  exit_time      = null,     -- re-open, so the exit flow can be tested again
  end_pressure   = null,
  deleted_at     = null;

-- ============================================================
-- CLOSED DIVES
--
-- These are what the member profile, the charts and the camp summary
-- read. Egemen has three closed dives, all with max_depth, so both
-- series on the consumption chart (bar/dk and SAC) have more than one
-- point -- a single point draws nothing on a line chart.
--
-- Only Umut's row names a buddy; Feyza's does not. Buddy is undirected --
-- one side naming the other is enough.
--
-- Feyza's row leaves every optional field empty, so the "fill in your
-- log later" screen has something to fill in.
-- ============================================================
insert into dive (
  id, camp_id, member_id,
  entry_time, start_pressure, weight, tank_size, tank_material,
  exit_time, end_pressure,
  buddy_id, leader_id,
  max_depth, dive_type, site, notes
) values
  ('d0000000-0000-4000-8000-000000000011',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1101'),      -- Egemen Guler
   '2026-08-22 10:15:00+03', 200, 6.0, 12, 'steel',
   '2026-08-22 11:02:00+03', 60,
   null, null,
   18.5, 'Eğitim', 'Sıçan Adası', null),

  ('d0000000-0000-4000-8000-000000000012',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1101'),      -- Egemen, ikinci dalış
   '2026-08-24 09:40:00+03', 205, 6.0, 12, 'steel',
   '2026-08-24 10:31:00+03', 70,
   null, null,
   24.0, 'Gezi', 'Uçak Batığı', 'Akıntı vardı, dönüşte biraz zorladık.'),

  ('d0000000-0000-4000-8000-000000000015',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1101'),      -- Egemen, ucuncu dalis
   '2026-08-26 09:55:00+03', 210, 5.5, 12, 'steel',
   '2026-08-26 10:38:00+03', 75,
   null, null,
   16.0, 'Gezi', 'Sıçan Adası', null),

  ('d0000000-0000-4000-8000-000000000013',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1104'),      -- Umut Cinar Ulger
   '2026-08-22 10:20:00+03', 210, 5.0, 15, 'steel',
   '2026-08-22 11:10:00+03', 55,
   (select id from member where sat_no = '1105'),      -- buddy: Feyza Izel Yilmaz
   null,
   22.5, 'Gezi', 'Büyük Mağara', null),

  ('d0000000-0000-4000-8000-000000000014',
   'c0000000-0000-4000-8000-000000000001',
   (select id from member where sat_no = '1105'),      -- Feyza Izel Yilmaz
   '2026-08-22 10:20:00+03', 200, 7.0, 11.1, 'aluminum',
   '2026-08-22 11:08:00+03', 75,
   null, null,
   null, null, null, null)                            -- optional fields empty
on conflict (id) do update set
  camp_id        = excluded.camp_id,
  member_id      = excluded.member_id,
  entry_time     = excluded.entry_time,
  start_pressure = excluded.start_pressure,
  weight         = excluded.weight,
  tank_size      = excluded.tank_size,
  tank_material  = excluded.tank_material,
  exit_time      = excluded.exit_time,
  end_pressure   = excluded.end_pressure,
  buddy_id       = excluded.buddy_id,
  leader_id      = excluded.leader_id,
  max_depth      = excluded.max_depth,
  dive_type      = excluded.dive_type,
  site           = excluded.site,
  notes          = excluded.notes,
  deleted_at     = null;
