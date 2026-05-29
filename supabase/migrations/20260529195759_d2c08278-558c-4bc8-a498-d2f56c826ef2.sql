-- Foundation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','manager','staff','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager'))
$$;

-- Helper macro replaced by inlined per-table blocks below.
-- The generated script in /tmp/schema/m1.sql is the source of truth; here we
-- submit a compact equivalent that PostgREST can introspect. Each table:
-- id uuid PK, domain cols, data jsonb, created_at/updated_at + RLS.

DO $mig$
DECLARE
  t text;
  public_read text[] := ARRAY['blog_posts','brands','categories','chat_kb_articles','chat_settings','combo_rules','content_translations','dimensions','faqs','feature_flags','global_reviews','homepage_config'];
  user_owned text[] := ARRAY['abandoned_carts','chat_conversations','chat_messages','contact_submissions','email_otp_challenges','gift_cards','guardian_points','invoices'];
  admin_only text[] := ARRAY['admin_audit_log','admin_ip_allowlist','admin_login_attempts','admin_secrets','analytics_report_runs','analytics_report_subscriptions','analytics_saved_views','app_secrets','bulk_campaigns','coupons','customer_segments','gst_purchase_register','gst_sales_register','login_lockouts','loyalty_status'];
BEGIN
  NULL; -- table creation handled by explicit statements below
END $mig$;

-- abandoned_carts
CREATE TABLE IF NOT EXISTS public.abandoned_carts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, customer_email text, customer_phone text, customer_name text, items jsonb DEFAULT '[]', subtotal numeric DEFAULT 0, item_count integer DEFAULT 0, status text DEFAULT 'active', last_activity_at timestamptz DEFAULT now(), recovered_at timestamptz, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.abandoned_carts TO authenticated; GRANT ALL ON public.abandoned_carts TO service_role;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abandoned_carts_own" ON public.abandoned_carts FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid, action text, target_type text, target_id uuid, payload jsonb, ip text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.admin_audit_log TO authenticated; GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_log_admin" ON public.admin_audit_log FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- admin_ip_allowlist
CREATE TABLE IF NOT EXISTS public.admin_ip_allowlist (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ip_cidr text NOT NULL, label text, is_active boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.admin_ip_allowlist TO authenticated; GRANT ALL ON public.admin_ip_allowlist TO service_role;
ALTER TABLE public.admin_ip_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_ip_allowlist_admin" ON public.admin_ip_allowlist FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- admin_login_attempts
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, ip text, success boolean, user_agent text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.admin_login_attempts TO authenticated; GRANT ALL ON public.admin_login_attempts TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_login_attempts_admin" ON public.admin_login_attempts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- admin_secrets
CREATE TABLE IF NOT EXISTS public.admin_secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, value text, description text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.admin_secrets TO authenticated; GRANT ALL ON public.admin_secrets TO service_role;
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_secrets_admin" ON public.admin_secrets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- analytics_report_runs
CREATE TABLE IF NOT EXISTS public.analytics_report_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_key text, status text, payload jsonb, started_at timestamptz DEFAULT now(), finished_at timestamptz, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.analytics_report_runs TO authenticated; GRANT ALL ON public.analytics_report_runs TO service_role;
ALTER TABLE public.analytics_report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_report_runs_admin" ON public.analytics_report_runs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- analytics_report_subscriptions
CREATE TABLE IF NOT EXISTS public.analytics_report_subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, report_key text, channel text, schedule text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.analytics_report_subscriptions TO authenticated; GRANT ALL ON public.analytics_report_subscriptions TO service_role;
ALTER TABLE public.analytics_report_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_report_subscriptions_admin" ON public.analytics_report_subscriptions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- analytics_saved_views
CREATE TABLE IF NOT EXISTS public.analytics_saved_views (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, name text, config jsonb DEFAULT '{}', data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.analytics_saved_views TO authenticated; GRANT ALL ON public.analytics_saved_views TO service_role;
ALTER TABLE public.analytics_saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_saved_views_admin" ON public.analytics_saved_views FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- app_secrets
CREATE TABLE IF NOT EXISTS public.app_secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, value text, description text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.app_secrets TO authenticated; GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_secrets_admin" ON public.app_secrets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- blog_posts (public)
CREATE TABLE IF NOT EXISTS public.blog_posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text, slug text UNIQUE, excerpt text, content text, cover_image text, author_id uuid, tags text[], category text, is_published boolean DEFAULT false, published_at timestamptz, meta_title text, meta_description text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.blog_posts TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.blog_posts TO authenticated; GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_read" ON public.blog_posts FOR SELECT USING (true);
CREATE POLICY "blog_posts_admin" ON public.blog_posts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- brands (public)
CREATE TABLE IF NOT EXISTS public.brands (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text UNIQUE, description text, logo_url text, sort_order integer DEFAULT 0, is_active boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.brands TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.brands TO authenticated; GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands_admin" ON public.brands FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- bulk_campaigns
CREATE TABLE IF NOT EXISTS public.bulk_campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, channel text, audience jsonb, content jsonb, status text DEFAULT 'draft', scheduled_at timestamptz, sent_at timestamptz, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bulk_campaigns TO authenticated; GRANT ALL ON public.bulk_campaigns TO service_role;
ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_campaigns_admin" ON public.bulk_campaigns FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- categories (public)
CREATE TABLE IF NOT EXISTS public.categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text UNIQUE, description text, parent_id uuid, image_url text, icon text, sort_order integer DEFAULT 0, is_active boolean DEFAULT true, meta_title text, meta_description text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.categories TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.categories TO authenticated; GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- chat_conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, customer_name text, customer_email text, customer_phone text, assigned_admin_id uuid, status text DEFAULT 'open', last_message_at timestamptz DEFAULT now(), data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.chat_conversations TO authenticated; GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_conversations_own" ON public.chat_conversations FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- chat_kb_articles (public)
CREATE TABLE IF NOT EXISTS public.chat_kb_articles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text, slug text UNIQUE, content text, tags text[], is_published boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.chat_kb_articles TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.chat_kb_articles TO authenticated; GRANT ALL ON public.chat_kb_articles TO service_role;
ALTER TABLE public.chat_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_kb_articles_read" ON public.chat_kb_articles FOR SELECT USING (true);
CREATE POLICY "chat_kb_articles_admin" ON public.chat_kb_articles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, conversation_id uuid NOT NULL, sender_type text, sender_id uuid, content text, attachments jsonb DEFAULT '[]', data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.chat_messages TO authenticated; GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_own" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- chat_settings (public read)
CREATE TABLE IF NOT EXISTS public.chat_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE, value jsonb DEFAULT '{}', data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.chat_settings TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.chat_settings TO authenticated; GRANT ALL ON public.chat_settings TO service_role;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_settings_read" ON public.chat_settings FOR SELECT USING (true);
CREATE POLICY "chat_settings_admin" ON public.chat_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- combo_rules (public)
CREATE TABLE IF NOT EXISTS public.combo_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, description text, product_ids uuid[], min_quantity integer DEFAULT 2, discount_type text, discount_value numeric, is_active boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.combo_rules TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.combo_rules TO authenticated; GRANT ALL ON public.combo_rules TO service_role;
ALTER TABLE public.combo_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combo_rules_read" ON public.combo_rules FOR SELECT USING (true);
CREATE POLICY "combo_rules_admin" ON public.combo_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- contact_submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, name text, email text, phone text, subject text, message text, status text DEFAULT 'new', data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT INSERT ON public.contact_submissions TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.contact_submissions TO authenticated; GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_anon_insert" ON public.contact_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "contact_own" ON public.contact_submissions FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- content_translations (public)
CREATE TABLE IF NOT EXISTS public.content_translations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_type text NOT NULL, content_key text NOT NULL, language text NOT NULL, value text, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.content_translations TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.content_translations TO authenticated; GRANT ALL ON public.content_translations TO service_role;
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_translations_read" ON public.content_translations FOR SELECT USING (true);
CREATE POLICY "content_translations_admin" ON public.content_translations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, description text, discount_type text DEFAULT 'percent', discount_value numeric DEFAULT 0, min_order_value numeric DEFAULT 0, max_discount numeric, usage_limit integer, used_count integer DEFAULT 0, valid_from timestamptz, valid_until timestamptz, is_active boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.coupons TO authenticated; GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_authed_read" ON public.coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "coupons_admin" ON public.coupons FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- customer_segments
CREATE TABLE IF NOT EXISTS public.customer_segments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, description text, rules jsonb DEFAULT '{}', estimated_count integer DEFAULT 0, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.customer_segments TO authenticated; GRANT ALL ON public.customer_segments TO service_role;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_segments_admin" ON public.customer_segments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- dimensions (public)
CREATE TABLE IF NOT EXISTS public.dimensions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, length numeric, width numeric, height numeric, weight numeric, unit text DEFAULT 'cm', data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.dimensions TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.dimensions TO authenticated; GRANT ALL ON public.dimensions TO service_role;
ALTER TABLE public.dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dimensions_read" ON public.dimensions FOR SELECT USING (true);
CREATE POLICY "dimensions_admin" ON public.dimensions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- email_otp_challenges
CREATE TABLE IF NOT EXISTS public.email_otp_challenges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, email text NOT NULL, code_hash text NOT NULL, purpose text, attempts integer DEFAULT 0, verified boolean DEFAULT false, expires_at timestamptz NOT NULL, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.email_otp_challenges TO authenticated; GRANT ALL ON public.email_otp_challenges TO service_role;
ALTER TABLE public.email_otp_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_otp_own" ON public.email_otp_challenges FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- faqs (public)
CREATE TABLE IF NOT EXISTS public.faqs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text, answer text, category text, sort_order integer DEFAULT 0, is_active boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.faqs TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.faqs TO authenticated; GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_read" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "faqs_admin" ON public.faqs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- feature_flags (public)
CREATE TABLE IF NOT EXISTS public.feature_flags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, enabled boolean DEFAULT false, description text, rollout_percent integer DEFAULT 100, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.feature_flags TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.feature_flags TO authenticated; GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags_read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "feature_flags_admin" ON public.feature_flags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- gift_cards
CREATE TABLE IF NOT EXISTS public.gift_cards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, code text UNIQUE NOT NULL, amount numeric, balance numeric, purchased_by uuid, recipient_email text, recipient_name text, message text, expires_at timestamptz, is_active boolean DEFAULT true, redeemed_at timestamptz, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gift_cards TO authenticated; GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift_cards_own" ON public.gift_cards FOR ALL TO authenticated USING (auth.uid()=user_id OR auth.uid()=purchased_by OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR auth.uid()=purchased_by OR public.is_admin(auth.uid()));

-- global_reviews (public)
CREATE TABLE IF NOT EXISTS public.global_reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_name text, user_avatar text, rating integer, title text, comment text, is_featured boolean DEFAULT false, is_approved boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.global_reviews TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.global_reviews TO authenticated; GRANT ALL ON public.global_reviews TO service_role;
ALTER TABLE public.global_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_reviews_read" ON public.global_reviews FOR SELECT USING (true);
CREATE POLICY "global_reviews_admin" ON public.global_reviews FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- gst_purchase_register
CREATE TABLE IF NOT EXISTS public.gst_purchase_register (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number text, vendor_name text, vendor_gstin text, invoice_date date, taxable_amount numeric, cgst numeric, sgst numeric, igst numeric, total numeric, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gst_purchase_register TO authenticated; GRANT ALL ON public.gst_purchase_register TO service_role;
ALTER TABLE public.gst_purchase_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gst_purchase_admin" ON public.gst_purchase_register FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- gst_sales_register
CREATE TABLE IF NOT EXISTS public.gst_sales_register (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number text, customer_name text, customer_gstin text, invoice_date date, taxable_amount numeric, cgst numeric, sgst numeric, igst numeric, total numeric, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gst_sales_register TO authenticated; GRANT ALL ON public.gst_sales_register TO service_role;
ALTER TABLE public.gst_sales_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gst_sales_admin" ON public.gst_sales_register FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- guardian_points
CREATE TABLE IF NOT EXISTS public.guardian_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, points integer, reason text, reference_id uuid, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.guardian_points TO authenticated; GRANT ALL ON public.guardian_points TO service_role;
ALTER TABLE public.guardian_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardian_points_own" ON public.guardian_points FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- homepage_config (public)
CREATE TABLE IF NOT EXISTS public.homepage_config (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), section_key text UNIQUE, title text, subtitle text, payload jsonb DEFAULT '{}', sort_order integer DEFAULT 0, is_active boolean DEFAULT true, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.homepage_config TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.homepage_config TO authenticated; GRANT ALL ON public.homepage_config TO service_role;
ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homepage_config_read" ON public.homepage_config FOR SELECT USING (true);
CREATE POLICY "homepage_config_admin" ON public.homepage_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- invoices
CREATE TABLE IF NOT EXISTS public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, user_id uuid, invoice_number text UNIQUE, amount numeric, tax numeric, file_url text, issued_at timestamptz DEFAULT now(), data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.invoices TO authenticated; GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_own" ON public.invoices FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- login_lockouts
CREATE TABLE IF NOT EXISTS public.login_lockouts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identifier text UNIQUE, attempts integer DEFAULT 0, locked_until timestamptz, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.login_lockouts TO authenticated; GRANT ALL ON public.login_lockouts TO service_role;
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_lockouts_admin" ON public.login_lockouts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- loyalty_status
CREATE TABLE IF NOT EXISTS public.loyalty_status (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL, tier_id uuid, points integer DEFAULT 0, lifetime_points integer DEFAULT 0, data jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.loyalty_status TO authenticated; GRANT ALL ON public.loyalty_status TO service_role;
ALTER TABLE public.loyalty_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_status_own" ON public.loyalty_status FOR ALL TO authenticated USING (auth.uid()=user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid()=user_id OR public.is_admin(auth.uid()));

-- updated_at triggers for all tables in this batch
DO $tg$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['abandoned_carts','admin_audit_log','admin_ip_allowlist','admin_login_attempts','admin_secrets','analytics_report_runs','analytics_report_subscriptions','analytics_saved_views','app_secrets','blog_posts','brands','bulk_campaigns','categories','chat_conversations','chat_kb_articles','chat_messages','chat_settings','combo_rules','contact_submissions','content_translations','coupons','customer_segments','dimensions','email_otp_challenges','faqs','feature_flags','gift_cards','global_reviews','gst_purchase_register','gst_sales_register','guardian_points','homepage_config','invoices','login_lockouts','loyalty_status']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $tg$;
