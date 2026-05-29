-- =================== PRODUCTS & CATALOG ===================
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  short_description text,
  sku text,
  brand_id uuid,
  category_id uuid,
  price numeric DEFAULT 0,
  compare_price numeric,
  cost_price numeric,
  stock integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  weight numeric,
  images jsonb DEFAULT '[]'::jsonb,
  tags text[],
  features jsonb DEFAULT '[]'::jsonb,
  ingredients text,
  benefits jsonb DEFAULT '[]'::jsonb,
  usage_instructions text,
  warnings text,
  meta_title text,
  meta_description text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_bestseller boolean DEFAULT false,
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  hsn_code text,
  gst_rate numeric DEFAULT 18,
  video_url text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_read ON public.products FOR SELECT USING (true);
CREATE POLICY products_admin ON public.products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text,
  sku text,
  price numeric,
  compare_price numeric,
  stock integer DEFAULT 0,
  image_url text,
  attributes jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY pv_read ON public.product_variants FOR SELECT USING (true);
CREATE POLICY pv_admin ON public.product_variants FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  stock integer DEFAULT 0,
  price_adjustment numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_flavors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_flavors TO authenticated;
GRANT ALL ON public.product_flavors TO service_role;
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;
CREATE POLICY pf_read ON public.product_flavors FOR SELECT USING (true);
CREATE POLICY pf_admin ON public.product_flavors FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL,
  size_value text,
  price numeric,
  compare_price numeric,
  stock integer DEFAULT 0,
  weight numeric,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_sizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_read ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY ps_admin ON public.product_sizes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid,
  order_id uuid,
  user_name text,
  user_avatar text,
  rating integer NOT NULL,
  title text,
  comment text,
  images jsonb DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  is_approved boolean DEFAULT true,
  helpful_count integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_read ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY pr_insert ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY pr_update_own ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY pr_admin ON public.product_reviews FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid,
  user_name text,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  is_approved boolean DEFAULT true,
  helpful_count integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_questions TO authenticated;
GRANT ALL ON public.product_questions TO service_role;
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pq_read ON public.product_questions FOR SELECT USING (true);
CREATE POLICY pq_own ON public.product_questions FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE TABLE public.product_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  language text NOT NULL,
  name text,
  description text,
  short_description text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_translations TO authenticated;
GRANT ALL ON public.product_translations TO service_role;
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY pt_read ON public.product_translations FOR SELECT USING (true);
CREATE POLICY pt_admin ON public.product_translations FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.product_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid,
  email text,
  phone text,
  notified_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_waitlist TO authenticated;
GRANT ALL ON public.product_waitlist TO service_role;
ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY pw_own ON public.product_waitlist FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE TABLE public.product_cooccurrence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  related_product_id uuid NOT NULL,
  score numeric DEFAULT 0,
  count integer DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_cooccurrence TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cooccurrence TO authenticated;
GRANT ALL ON public.product_cooccurrence TO service_role;
ALTER TABLE public.product_cooccurrence ENABLE ROW LEVEL SECURITY;
CREATE POLICY pco_read ON public.product_cooccurrence FOR SELECT USING (true);
CREATE POLICY pco_admin ON public.product_cooccurrence FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  display_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  date_of_birth date,
  gender text,
  bio text,
  preferences jsonb DEFAULT '{}'::jsonb,
  marketing_opt_in boolean DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_self ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE TABLE public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text,
  full_name text,
  phone text,
  alternate_phone text,
  email text,
  address_line1 text,
  address_line2 text,
  landmark text,
  city text,
  state text,
  pincode text,
  country text DEFAULT 'India',
  address_type text DEFAULT 'home',
  is_default boolean DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY ua_own ON public.user_addresses FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  payment_method text,
  payment_id text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  shipping_charge numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  coupon_code text,
  shipping_address jsonb,
  billing_address jsonb,
  tracking_number text,
  courier_name text,
  notes text,
  cancelled_at timestamptz,
  delivered_at timestamptz,
  shipped_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_own ON public.orders FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text,
  location text,
  message text,
  tracked_at timestamptz DEFAULT now(),
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking TO authenticated;
GRANT ALL ON public.order_tracking TO service_role;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY ot_read ON public.order_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY ot_admin ON public.order_tracking FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.order_modify_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid,
  request_type text,
  status text DEFAULT 'pending',
  reason text,
  payload jsonb DEFAULT '{}'::jsonb,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_modify_requests TO authenticated;
GRANT ALL ON public.order_modify_requests TO service_role;
ALTER TABLE public.order_modify_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY omr_own ON public.order_modify_requests FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid,
  reason text,
  status text DEFAULT 'pending',
  items jsonb DEFAULT '[]'::jsonb,
  refund_amount numeric,
  refund_status text,
  pickup_address jsonb,
  pickup_date date,
  notes text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_own ON public.return_requests FOR ALL TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));