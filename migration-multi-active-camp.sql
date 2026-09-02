-- ODTU-SAT dive log -- allow more than one active camp
--
-- Run this ONCE on a database created before this change. A fresh
-- install gets the new shape from schema.sql and does not need it.
--
-- camp_single_active was a UNIQUE index on is_active, so the database
-- refused a second active camp. Two club camps can overlap, so the
-- constraint is replaced by a plain index that still makes "which camps
-- are active" cheap.
--
-- Nothing else changes: is_active keeps its meaning, and no row is
-- touched. Which camp a phone is working on is chosen on the device, not
-- here.

begin;

drop index if exists camp_single_active;

create index if not exists camp_active_idx
  on camp (is_active)
  where is_active and deleted_at is null;

commit;

-- Check: camp_active_idx present, camp_single_active gone.
select indexname, indexdef
from pg_indexes
where tablename = 'camp'
order by indexname;
