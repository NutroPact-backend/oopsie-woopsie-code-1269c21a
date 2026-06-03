UPDATE public.site_settings
SET settings = jsonb_set(
  settings,
  '{navLinks}',
  '[
    {"label": "All Products", "href": "/products"},
    {"label": "Protein", "href": "/products?category=Protein"},
    {"label": "Track Order", "href": "/track-order"},
    {"label": "Our Story", "href": "/about"},
    {"label": "Contact", "href": "/contact"}
  ]'::jsonb
)
WHERE key = 'default';