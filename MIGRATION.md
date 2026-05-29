# Lovable se Apni Supabase pe Migrate — 5 min Guide

Ye guide tujhe Lovable Cloud se hata kar **apni khud ki free Supabase project**
pe le aayegi. Code wahi rahega, sirf backend tera ho jayega.

---

## ⚡ TL;DR (advanced users)

```bash
# 1. https://supabase.com → New project (free tier)
# 2.
cp .env.example .env.local           # fill SUPABASE_* keys
chmod +x scripts/setup-own-supabase.sh
./scripts/setup-own-supabase.sh      # link + push + buckets
# 3. Create admin user in Supabase dashboard, then:
#    insert into public.user_roles (user_id, role) values ('<uid>', 'admin');
# 4.
bun install && bun dev
```

---

## Step 1 — Supabase project banao (2 min)

1. Open https://supabase.com → **Start your project** → free signup
2. **New project** → naam de (e.g. `nutropact`) + strong DB password (save kar lo)
3. Region: closest to your users (e.g. `Mumbai`)
4. Project ban gaya? **Settings → General** se copy:
   - **Project Reference ID** (e.g. `abcxyz123`)
5. **Settings → API** se copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ ye secret, sirf server

## Step 2 — Local env file

```bash
cp .env.example .env.local
```

`.env.local` me Supabase keys paste karo (Step 1 se).

## Step 3 — Migrations push (auto)

```bash
npm install -g supabase   # ek baar
chmod +x scripts/setup-own-supabase.sh
./scripts/setup-own-supabase.sh
```

Ye script:
- supabase CLI me login karega
- tere project se link karega
- saari 20+ migrations push karega (tables, RLS, policies, indexes)
- storage buckets bana dega (products, avatars, reviews, invoices, uploads)

## Step 4 — Admin user banao

Supabase dashboard → **Authentication → Users → Invite user**.
Email pe link aayega → password set karo.

Phir **SQL editor** me:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'tu@example.com';
```

## Step 5 — Local run

```bash
bun install
bun dev
```

`/admin` open karo → login karo → **70+ tabs** sab work karenge.

---

## Verify

- [ ] `/admin` → Dashboard tab → numbers load ho rahe
- [ ] **Customer 360°** tab → users dikh rahe (ek dummy event fire kar)
- [ ] **Audit Log** tab → admin actions track ho rahe
- [ ] **Health** tab → green checks

## Lovable se kya nahi badlega?

- **Code** — same React + TanStack Start
- **UI** — identical
- **Migrations** — same SQL files
- **Admin tabs** — sab 70+ working

Sirf **backend host** badla. Cost: ₹0 (Supabase free tier — 500MB DB, 1GB storage,
2M edge invocations/month, unlimited auth users).

## Phase 3 — Automation (already shipped)

Migration `20260529191610_phase3_automation.sql` ye sab activate karta hai:

| Job | Schedule | Kaam |
|-----|----------|------|
| `abandoned_cart_reminders` | har 30 min | 1h+ idle carts pe email + WhatsApp queue |
| `daily_sales_digest`       | daily 09:00 UTC | har admin ko kal ka revenue/orders/AOV inapp |
| `low_stock_alerts`         | har 6 ghante | stock ≤ 10 ho to admins ko alert |

**Realtime** (admin dashboard auto-subscribes):
- Live order toast — koi customer purchase kare → admin screen pe ₹amount toast pop ho jaye
- Daily digest toast — auto fire when cron inserts the row

**Audit log helper**: koi bhi admin action `logAdminAction("user.ban", { target_user, details })`
call kar sakta hai (RPC `log_admin_action`) — auto `actor_user_id` + `actor_email` set, RLS-safe.

### Cron jobs check
```sql
select jobname, schedule, active from cron.job;
-- manual run:
select public.cron_queue_abandoned_cart_reminders();
select public.cron_daily_sales_digest();
select public.cron_low_stock_alerts();
```

### Realtime check
Admin dashboard kholo → kisi tab pe `insert into site_events (session_id, event_type, value)
values ('test', 'purchase', 999);` chala → ₹999 ka toast aana chahiye instantly.

## Issues?

- `permission denied for table X` → service_role key wrong, Step 1.5 verify
- `relation does not exist` → `supabase db push` re-run karo
- Login work nahi → user_roles me admin row missing, Step 4 redo