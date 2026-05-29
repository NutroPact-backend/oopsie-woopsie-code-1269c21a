-- ──────────────────────────────────────────────────────────────────────────
-- Phase 3: Backend automation
--   1. pg_cron jobs: abandoned-cart reminders, daily digest, low-stock alerts
--   2. Realtime publication for live admin toasts
--   3. Audit-log helper RPC (callable from client)
-- ──────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ─── 1a. ABANDONED CART REMINDER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cron_queue_abandoned_cart_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  queued integer := 0;
  c      record;
BEGIN
  FOR c IN
    SELECT id, user_id, customer_email, customer_phone, customer_name,
           recovery_token, subtotal, item_count, notify_count
    FROM public.abandoned_carts
    WHERE status = 'active'
      AND recovered_at IS NULL
      AND notify_count < 2
      AND last_activity_at < now() - interval '1 hour'
      AND last_activity_at > now() - interval '7 days'
      AND (customer_email <> '' OR customer_phone <> '')
  LOOP
    IF c.customer_email <> '' THEN
      INSERT INTO public.notification_queue
        (user_id, channel, template, recipient, payload)
      VALUES
        (c.user_id, 'email', 'abandoned_cart', c.customer_email,
         jsonb_build_object(
           'name', c.customer_name,
           'subtotal', c.subtotal,
           'item_count', c.item_count,
           'recovery_token', c.recovery_token));
      queued := queued + 1;
    END IF;

    IF c.customer_phone <> '' THEN
      INSERT INTO public.notification_queue
        (user_id, channel, template, recipient, payload)
      VALUES
        (c.user_id, 'whatsapp', 'abandoned_cart', c.customer_phone,
         jsonb_build_object(
           'name', c.customer_name,
           'subtotal', c.subtotal,
           'recovery_token', c.recovery_token));
      queued := queued + 1;
    END IF;

    UPDATE public.abandoned_carts
    SET notify_count = notify_count + 1,
        notified_at  = now()
    WHERE id = c.id;
  END LOOP;

  RETURN queued;
END $fn$;

-- ─── 1b. DAILY SALES DIGEST ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cron_daily_sales_digest()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  rev      numeric := 0;
  orders   integer := 0;
  aov      numeric := 0;
  visitors integer := 0;
  queued   integer := 0;
  admin_id uuid;
BEGIN
  SELECT COALESCE(SUM(value), 0), COUNT(*)
  INTO rev, orders
  FROM public.site_events
  WHERE event_type IN ('purchase', 'order_placed')
    AND created_at >= date_trunc('day', now() - interval '1 day')
    AND created_at <  date_trunc('day', now());

  SELECT COUNT(DISTINCT session_id)
  INTO visitors
  FROM public.site_events
  WHERE created_at >= date_trunc('day', now() - interval '1 day')
    AND created_at <  date_trunc('day', now());

  IF orders > 0 THEN aov := rev / orders; END IF;

  FOR admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notification_queue
      (user_id, channel, template, recipient, payload)
    VALUES
      (admin_id, 'inapp', 'daily_sales_digest', '',
       jsonb_build_object(
         'date', (now() - interval '1 day')::date,
         'revenue', rev,
         'orders', orders,
         'aov', round(aov, 2),
         'visitors', visitors,
         'conversion_pct',
           CASE WHEN visitors > 0
                THEN round((orders::numeric / visitors) * 100, 2)
                ELSE 0 END));
    queued := queued + 1;
  END LOOP;

  RETURN queued;
END $fn$;

-- ─── 1c. LOW STOCK ALERT ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cron_low_stock_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  queued   integer := 0;
  r        record;
  admin_id uuid;
BEGIN
  FOR r IN
    SELECT product_id, SUM(delta) AS stock
    FROM public.stock_movements
    GROUP BY product_id
    HAVING SUM(delta) <= 10 AND SUM(delta) > 0
  LOOP
    FOR admin_id IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notification_queue
        (user_id, channel, template, recipient, payload)
      VALUES
        (admin_id, 'inapp', 'low_stock_alert', '',
         jsonb_build_object('product_id', r.product_id, 'stock', r.stock));
      queued := queued + 1;
    END LOOP;
  END LOOP;

  RETURN queued;
END $fn$;

-- ─── 1d. SCHEDULE JOBS (idempotent) ───────────────────────────────────────
DO $sched$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('abandoned_cart_reminders', 'daily_sales_digest', 'low_stock_alerts');

  PERFORM cron.schedule(
    'abandoned_cart_reminders',
    '*/30 * * * *',
    'SELECT public.cron_queue_abandoned_cart_reminders();'
  );

  PERFORM cron.schedule(
    'daily_sales_digest',
    '0 9 * * *',
    'SELECT public.cron_daily_sales_digest();'
  );

  PERFORM cron.schedule(
    'low_stock_alerts',
    '0 */6 * * *',
    'SELECT public.cron_low_stock_alerts();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $sched$;

-- ─── 2. REALTIME PUBLICATION ──────────────────────────────────────────────
DO $rt$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_events;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $rt$;

-- ─── 3. AUDIT LOG HELPER RPC ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action       text,
  p_target_user  uuid    DEFAULT NULL,
  p_target_email text    DEFAULT '',
  p_details      jsonb   DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  new_id      uuid;
  actor_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'log_admin_action requires authentication';
  END IF;

  SELECT email INTO actor_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.admin_audit_log
    (actor_user_id, actor_email, target_user_id, target_email, action, details)
  VALUES
    (auth.uid(), COALESCE(actor_email, ''),
     p_target_user, COALESCE(p_target_email, ''),
     p_action, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO new_id;

  RETURN new_id;
END $fn$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(text, uuid, text, jsonb) TO authenticated;
