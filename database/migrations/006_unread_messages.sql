-- UrbanFix 006: unread message dots.
-- Remembers the last message each person has seen on each repair, so the app
-- can show a red dot when someone else writes. Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.message_reads (
  job_id       uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_id bigint NOT NULL DEFAULT 0 CHECK (last_read_id >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, user_id)
);
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_reads FROM anon, authenticated;

-- Speeds up "messages from other people after X" per repair.
CREATE INDEX IF NOT EXISTS messages_job_sender_idx ON public.messages (job_id, id, sender_id);

-- Mark everything up to p_last_id (or everything, when NULL) on a repair as seen.
-- It never moves backwards and can't point past the newest real message.
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_job_id uuid, p_last_id bigint DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  v_max bigint;
BEGIN
  IF p_job_id IS NULL OR NOT public.can_see_job(p_job_id) THEN PERFORM public._fail('Repair not found.'); END IF;
  SELECT coalesce(max(id), 0) INTO v_max FROM public.messages WHERE job_id = p_job_id;
  IF p_last_id IS NOT NULL THEN v_max := least(v_max, greatest(p_last_id, 0)); END IF;
  INSERT INTO public.message_reads (job_id, user_id, last_read_id) VALUES (p_job_id, v_uid, v_max)
  ON CONFLICT (job_id, user_id) DO UPDATE
    SET last_read_id = greatest(public.message_reads.last_read_id, EXCLUDED.last_read_id), updated_at = now();
END $$;

-- Repairs with messages I haven't seen yet, and how many.
-- Customers and technicians: their own repairs. Admins: repairs with recent messages.
CREATE OR REPLACE FUNCTION public.my_unread()
RETURNS TABLE (job_id uuid, unread int, last_message_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := public._uid();
  v_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT m.job_id, count(*)::int, max(m.created_at)
  FROM public.messages m
  JOIN public.jobs j ON j.id = m.job_id
  LEFT JOIN public.message_reads r ON r.job_id = m.job_id AND r.user_id = v_uid
  WHERE m.sender_id <> v_uid
    AND m.id > coalesce(r.last_read_id, 0)
    AND (j.customer_id = v_uid OR j.technician_id = v_uid OR (v_admin AND m.created_at > now() - interval '14 days'))
  GROUP BY m.job_id
  ORDER BY max(m.created_at) DESC
  LIMIT 200;
END $$;

REVOKE ALL ON FUNCTION public.mark_messages_read(uuid, bigint), public.my_unread() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid, bigint), public.my_unread() TO authenticated;

-- Sending a message also means you've read the chat up to it.
CREATE OR REPLACE FUNCTION public._message_seen_by_sender() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.message_reads (job_id, user_id, last_read_id) VALUES (NEW.job_id, NEW.sender_id, NEW.id)
  ON CONFLICT (job_id, user_id) DO UPDATE
    SET last_read_id = greatest(public.message_reads.last_read_id, EXCLUDED.last_read_id), updated_at = now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._message_seen_by_sender() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS messages_seen_by_sender ON public.messages;
CREATE TRIGGER messages_seen_by_sender AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public._message_seen_by_sender();

NOTIFY pgrst, 'reload schema';
