-- Remove public read on product_auth_codes; verification is server-side via supabaseAdmin
DROP POLICY IF EXISTS pac_read ON public.product_auth_codes;

-- Restrict order_tracking reads to admins and owners of the related order
DROP POLICY IF EXISTS ot_read ON public.order_tracking;
CREATE POLICY ot_read ON public.order_tracking
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_tracking.order_id
        AND o.user_id = auth.uid()
    )
  );