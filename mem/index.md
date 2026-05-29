# Project Memory

## Core
Admin gate: `np_admin_token` header. Any new admin tab in `src/pages/admin/AdminPage.tsx` auto-inherits this gate.
i18n RULE — every new customer-facing string MUST be translatable. Three options: `<T>English</T>` (auto-AI, easiest), `useT("key")` (curated dict), or `useContentTBatch(...)` for admin DB content. NEVER ship a hardcoded English JSX string. See mem://features/i18n.
Translation fallback chain: locale cache → en dict / source → literal. Safe to ship with only source set.
Never add a Lovable runtime dependency.

## Memories
- [i18n workflow](mem://features/i18n) — `<T>`, useT, useContentT — which to use, how to wire admin DB content
