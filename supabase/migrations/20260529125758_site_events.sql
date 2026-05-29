-- Granular event log for live dashboard, funnel, and behaviour insights.
CREATE TABLE IF NOT EXISTS public.site_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL,
  user_id      uuid NULL,
  event_type   text NOT NULL,
  product_id   text NULL,
  product_name text NULL,
  path         text NULL,
  value        numeric NULL,
  quantity     integer NULL,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  country      text NULL,
  device       text NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_events_created_idx       ON public.site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_type_created_idx  ON public.site_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_session_idx       ON public.site_events (session_id, created_at);
CREATE INDEX IF NOT EXISTS site_events_product_idx       ON public.site_events (product_id) WHERE product_id IS NOT NULL;

GRANT INSERT ON public.site_events TO anon, authenticated;
GRANT ALL    ON public.site_events TO service_role;

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_events anon insert" ON public.site_events;
CREATE POLICY "site_events anon insert"
  ON public.site_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
