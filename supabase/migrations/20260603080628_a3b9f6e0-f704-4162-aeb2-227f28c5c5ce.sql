
CREATE TABLE public.ai_seo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  target_url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seo_projects TO authenticated;
GRANT ALL ON public.ai_seo_projects TO service_role;
ALTER TABLE public.ai_seo_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_seo_projects_admin" ON public.ai_seo_projects
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_ai_seo_projects_updated
  BEFORE UPDATE ON public.ai_seo_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_seo_projects(id) ON DELETE CASCADE,
  score_aeo integer NOT NULL DEFAULT 0 CHECK (score_aeo BETWEEN 0 AND 100),
  score_geo integer NOT NULL DEFAULT 0 CHECK (score_geo BETWEEN 0 AND 100),
  score_entity integer NOT NULL DEFAULT 0 CHECK (score_entity BETWEEN 0 AND 100),
  score_reputation integer NOT NULL DEFAULT 0 CHECK (score_reputation BETWEEN 0 AND 100),
  score_conversational integer NOT NULL DEFAULT 0 CHECK (score_conversational BETWEEN 0 AND 100),
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_seo_audits_project_scan_idx ON public.ai_seo_audits (project_id, last_scanned_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seo_audits TO authenticated;
GRANT ALL ON public.ai_seo_audits TO service_role;
ALTER TABLE public.ai_seo_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_seo_audits_admin" ON public.ai_seo_audits
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.ai_seo_roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_seo_projects(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('phase1','phase2','phase3')),
  category text NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  is_auto_injected boolean NOT NULL DEFAULT false,
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal','warning','critical')),
  sort_order integer NOT NULL DEFAULT 0,
  injected_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, injected_key)
);
CREATE INDEX ai_seo_roadmap_project_idx ON public.ai_seo_roadmap_tasks (project_id, phase, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seo_roadmap_tasks TO authenticated;
GRANT ALL ON public.ai_seo_roadmap_tasks TO service_role;
ALTER TABLE public.ai_seo_roadmap_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_seo_roadmap_admin" ON public.ai_seo_roadmap_tasks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_ai_seo_roadmap_updated
  BEFORE UPDATE ON public.ai_seo_roadmap_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
