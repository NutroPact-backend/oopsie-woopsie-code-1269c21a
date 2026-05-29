
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS value numeric,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.coupons DROP COLUMN IF EXISTS active;
ALTER TABLE public.coupons ADD COLUMN active boolean GENERATED ALWAYS AS (is_active) STORED;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_product_name text,
  ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS scope_values jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS min_order_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_order_value numeric,
  ADD COLUMN IF NOT EXISTS applies_to_flavors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applies_to_sizes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms text;

ALTER TABLE public.payment_offers
  ADD COLUMN IF NOT EXISTS max_cashback numeric,
  ADD COLUMN IF NOT EXISTS logo text,
  ADD COLUMN IF NOT EXISTS link text;

ALTER TABLE public.urgency_widgets
  ADD COLUMN IF NOT EXISTS window_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS exclude_product_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS include_product_ids text[] DEFAULT '{}';

ALTER TABLE public.orders DROP COLUMN IF EXISTS order_status;
ALTER TABLE public.orders ADD COLUMN order_status text GENERATED ALWAYS AS (status) STORED;

ALTER TABLE public.order_tracking
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS courier text,
  ADD COLUMN IF NOT EXISTS awb_number text,
  ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS order_number text;

ALTER TABLE public.marketing_events
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_number text;

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS recovery_token text,
  ADD COLUMN IF NOT EXISTS notify_count integer DEFAULT 0;

ALTER TABLE public.homepage_config
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.homepage_config DROP COLUMN IF EXISTS key;
ALTER TABLE public.homepage_config ADD COLUMN key text GENERATED ALWAYS AS (section_key) STORED;

ALTER TABLE public.blog_posts DROP COLUMN IF EXISTS published;
ALTER TABLE public.blog_posts ADD COLUMN published boolean GENERATED ALWAYS AS (is_published) STORED;

ALTER TABLE public.faqs DROP COLUMN IF EXISTS enabled;
ALTER TABLE public.faqs ADD COLUMN enabled boolean GENERATED ALWAYS AS (is_active) STORED;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS purchase_number text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS supplier_gstin text,
  ADD COLUMN IF NOT EXISTS supplier_state_code text,
  ADD COLUMN IF NOT EXISTS taxable_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text,
  user_avatar text,
  title text,
  comment text,
  rating integer DEFAULT 5,
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  show_on_home boolean DEFAULT false,
  show_on_testimonials boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testimonials_public_read" ON public.testimonials;
CREATE POLICY "testimonials_public_read" ON public.testimonials FOR SELECT USING (is_approved = true);
DROP POLICY IF EXISTS "testimonials_admin" ON public.testimonials;
CREATE POLICY "testimonials_admin" ON public.testimonials FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  event_name text NOT NULL,
  event_type text,
  channel text,
  url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  properties jsonb DEFAULT '{}'::jsonb,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_insert_all" ON public.analytics_events;
CREATE POLICY "analytics_insert_all" ON public.analytics_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "analytics_admin_read" ON public.analytics_events;
CREATE POLICY "analytics_admin_read" ON public.analytics_events FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text,
  description text,
  variants jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experiments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiments TO authenticated;
GRANT ALL ON public.experiments TO service_role;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "experiments_public_read" ON public.experiments;
CREATE POLICY "experiments_public_read" ON public.experiments FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "experiments_admin" ON public.experiments;
CREATE POLICY "experiments_admin" ON public.experiments FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid,
  experiment_key text,
  variant text,
  user_id uuid,
  session_id text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.experiment_assignments TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.experiment_assignments TO authenticated;
GRANT ALL ON public.experiment_assignments TO service_role;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exp_assign_insert" ON public.experiment_assignments;
CREATE POLICY "exp_assign_insert" ON public.experiment_assignments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "exp_assign_admin" ON public.experiment_assignments;
CREATE POLICY "exp_assign_admin" ON public.experiment_assignments FOR SELECT TO authenticated USING (is_admin(auth.uid()));
