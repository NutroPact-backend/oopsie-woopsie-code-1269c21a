
CREATE TABLE public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_groups TO authenticated;
GRANT ALL ON public.product_groups TO service_role;

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active product groups"
  ON public.product_groups FOR SELECT
  USING (active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage product groups"
  ON public.product_groups FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER product_groups_updated_at
  BEFORE UPDATE ON public.product_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products
  ADD COLUMN group_id uuid REFERENCES public.product_groups(id) ON DELETE SET NULL;

CREATE INDEX products_group_id_idx ON public.products(group_id) WHERE group_id IS NOT NULL;
