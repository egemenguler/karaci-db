-- ODTU-SAT dive log -- ONE-TIME cleanup of the dummy development data
--
-- ============================================================
-- READ THIS BEFORE RUNNING. THIS IS A HARD DELETE.
-- ============================================================
-- Run this ONCE, in the Supabase SQL editor, to clear the fabricated
-- data the app was built against, before loading the real member list.
--
-- It removes EVERY camp and EVERY dive. That is correct only because
-- nothing in this database is real yet: every row was either seeded from
-- the old seed.sql or typed in while testing. Once the club starts
-- keeping actual records, DO NOT RUN THIS FILE AGAIN.
--
-- It must run in the SQL editor: the API cannot delete at all. RLS has
-- no delete policy and the DELETE privilege was revoked from anon and
-- authenticated (see schema.sql), so soft delete via deleted_at is the
-- only removal the app itself can do. That protection is the reason a
-- hard delete needs a deliberate, separate file like this one.
--
-- Order matters: dive references camp and member, so dives go first.

begin;

-- ------------------------------------------------------------
-- 1. Every dive. All of them are fabricated or test entries.
-- ------------------------------------------------------------
delete from dive;

-- ------------------------------------------------------------
-- 2. Every camp. Same reason -- 'Kas Yaz Kampi' came from seed.sql and
--    'Kis Egitim Kampi' was typed in while testing.
-- ------------------------------------------------------------
delete from camp;

-- ------------------------------------------------------------
-- 3. The made-up members -- but NOT the real ones.
--
--    Real members come from members.sql and always carry a bare numeric
--    sat_no ('1', '1105'). The six invented members had 'SAT-1042' and
--    friends, and members typed in during testing have no sat_no at all,
--    so this predicate catches exactly the fabricated rows.
--
--    For the record, the six from the old seed.sql were
--    11111111-0000-4000-8000-00000000000{1..6}:
--    Ahmet Yilmaz, Deniz Kaya, Ece Demir, Burak Sahin, Selin Arslan,
--    Mert Dogan. None of them are real people.
-- ------------------------------------------------------------
delete from member
where sat_no is null
   or sat_no !~ '^[0-9]+$';

commit;

-- ------------------------------------------------------------
-- Check: this should report 0 camps, 0 dives, and only members whose
-- sat_no is a bare number.
-- ------------------------------------------------------------
select
  (select count(*) from camp)                                     as camps,
  (select count(*) from dive)                                     as dives,
  (select count(*) from member)                                   as members,
  (select count(*) from member where sat_no !~ '^[0-9]+$'
                                  or sat_no is null)              as members_without_number;
