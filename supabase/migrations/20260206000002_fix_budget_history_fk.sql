-- Fix budget_history foreign key to reference profiles instead of auth.users
-- This allows PostgREST to join the tables

ALTER TABLE budget_history
  DROP CONSTRAINT IF EXISTS budget_history_changed_by_fkey;

ALTER TABLE budget_history
  ADD CONSTRAINT budget_history_changed_by_fkey
  FOREIGN KEY (changed_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
