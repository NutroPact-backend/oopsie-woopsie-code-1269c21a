DROP POLICY IF EXISTS blog_posts_read ON public.blog_posts;
CREATE POLICY blog_posts_read ON public.blog_posts FOR SELECT TO public USING (published = true OR is_published = true);

DROP POLICY IF EXISTS ms_read ON public.marketing_settings;
CREATE POLICY ms_read ON public.marketing_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS pad_read ON public.product_auth_distributors;
CREATE POLICY pad_read ON public.product_auth_distributors FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));