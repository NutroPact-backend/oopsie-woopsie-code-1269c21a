ALTER TABLE public.product_flavors ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.product_sizes ALTER COLUMN product_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_flavors_master_slug_uniq ON public.product_flavors (slug) WHERE product_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_sizes_master_slug_uniq ON public.product_sizes (slug) WHERE product_id IS NULL;