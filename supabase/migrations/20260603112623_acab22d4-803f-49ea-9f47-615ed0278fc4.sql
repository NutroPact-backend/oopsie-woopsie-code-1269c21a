UPDATE public.site_settings
SET settings = jsonb_set(
  settings,
  '{navLinks}',
  '[
    {"label": "All Products", "href": "/products"},
    {"label": "Our Story", "href": "/about"},
    {"label": "Track Order", "href": "/track-order"},
    {"label": "Contact", "href": "/contact"}
  ]'::jsonb
)
WHERE key = 'default';