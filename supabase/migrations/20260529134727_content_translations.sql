-- Generic per-row, per-locale translation cache for ANY admin-authored content
-- (video section headings, banner titles, custom page blocks, etc.).

CREATE TABLE IF NOT EXISTS public.content_translations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  field        text NOT NULL,
  locale       text NOT NULL,
  source_hash  text NOT NULL,
  translated   text NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field, locale)
);

CREATE INDEX IF NOT EXISTS content_translations_lookup_idx
  ON public.content_translations (entity_type, entity_id, locale);

GRANT SELECT ON public.content_translations TO anon, authenticated;
GRANT ALL ON public.content_translations TO service_role;

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_translations public read"
  ON public.content_translations FOR SELECT
  TO anon, authenticated
  USING (true);
