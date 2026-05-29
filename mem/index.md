# Project Memory

## Core
Admin gate: `np_admin_token` (header `x-admin-token`). Any new admin tab registered in `src/pages/admin/AdminPage.tsx` auto-inherits this gate — no extra role wiring needed.
i18n RULE (mandatory for every new customer-facing UI): import `useT` from `@/lib/i18n` and wrap ALL visible strings via `t("key")`. Add new keys to the `en` dict in `src/lib/i18n.dict.ts`. Reuse existing keys like `cta.add_to_cart`, `cta.buy_now`, `nav.*` before inventing new ones. Admin-only screens may stay English.
Translation fallback chain: current locale → en → literal key. Adding a key only to `en` is safe; run `scripts/gen-i18n-dict.ts` later to auto-fill 12 Indian locales.
Never add a Lovable runtime dependency.

## Memories
- [i18n workflow](mem://features/i18n) — useT hook, dict location, keys to reuse, regen script
