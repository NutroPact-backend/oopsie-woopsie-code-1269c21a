#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-shot self-host bootstrap for NutroPact on your own Supabase project.
#
# Usage:
#   1. Create a free Supabase project at https://supabase.com (note Project Ref)
#   2. Copy .env.example → .env.local and fill keys
#   3. chmod +x scripts/setup-own-supabase.sh && ./scripts/setup-own-supabase.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✔${NC} $*"; }
warn(){ echo -e "${YELLOW}!${NC} $*"; }
err() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

echo "═══════════════════════════════════════════════════════════════"
echo "  NutroPact — Own-Supabase Setup"
echo "═══════════════════════════════════════════════════════════════"

command -v supabase >/dev/null 2>&1 || err "supabase CLI missing. Install: npm i -g supabase"
command -v node     >/dev/null 2>&1 || err "node missing"

if [ ! -f .env.local ]; then
  warn ".env.local not found — copying from .env.example"
  cp .env.example .env.local
  echo
  echo "→ Open .env.local, fill in your Supabase keys, then re-run this script."
  exit 0
fi

# shellcheck disable=SC1091
set -a; . ./.env.local; set +a

PROJECT_REF="${SUPABASE_PROJECT_ID:-}"
[ -n "$PROJECT_REF" ] || err "SUPABASE_PROJECT_ID missing in .env.local"

echo
echo "▶ Logging into Supabase (browser will open if needed)"
supabase login || err "supabase login failed"
ok "Logged in"

echo
echo "▶ Linking to project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" || err "link failed"
ok "Linked"

echo
echo "▶ Pushing $(ls supabase/migrations/*.sql | wc -l) migrations…"
supabase db push || err "db push failed"
ok "Schema, RLS, policies, indexes — applied"

echo
echo "▶ Creating storage buckets (idempotent)"
for bucket in products avatars reviews invoices uploads; do
  supabase storage create "$bucket" --public 2>/dev/null && ok "Bucket: $bucket" || warn "Bucket $bucket already exists"
done

echo
echo "═══════════════════════════════════════════════════════════════"
ok  "DONE. Your Supabase is ready."
echo "═══════════════════════════════════════════════════════════════"
echo
echo "Next steps:"
echo "  1. supabase.com → SQL editor → run: select * from public.permissions;"
echo "     (should show 80+ rows = admin tabs)"
echo "  2. Create an admin user: supabase.com → Auth → Users → Invite"
echo "  3. Assign admin role:"
echo "       insert into public.user_roles (user_id, role)"
echo "       values ('<your-user-id>', 'admin');"
echo "  4. bun install && bun dev"
echo