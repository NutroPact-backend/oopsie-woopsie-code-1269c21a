// @ts-nocheck
/**
 * Daily personal-occasion rewards: credits wallet for users whose
 * birthday/anniversary is today, but only once per calendar year.
 * Uses the existing `wallet_rules` row (trigger='birthday' or 'anniversary')
 * and `wallet_credit()` RPC, so admin can tune amount/expiry from UI.
 *
 * Idempotency: relies on profiles.birthday_credited_year / anniversary_credited_year.
 */
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

type Rule = { trigger: string; amount: number; name: string; expiry_days: number | null; code: string; enabled: boolean };

async function loadRule(trigger: string): Promise<Rule | null> {
  const { data } = await supabaseAdmin
    .from('wallet_rules')
    .select('trigger,amount,name,expiry_days,code,enabled,reward_value')
    .eq('trigger', trigger).eq('enabled', true).maybeSingle();
  if (!data) return null;
  // some installs use reward_value, others amount
  const amount = Number((data as any).amount ?? (data as any).reward_value ?? 0);
  if (amount <= 0) return null;
  return { ...(data as any), amount } as Rule;
}

async function processOccasion(field: 'birthday' | 'anniversary', yearField: string, trigger: string) {
  const rule = await loadRule(trigger);
  if (!rule) return { skipped: 'no_rule', credited: 0 };

  const year = new Date().getUTCFullYear();
  // Match profiles where MM-DD equals today and not yet credited this year.
  const today = new Date();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');

  const { data: rows } = await supabaseAdmin
    .from('profiles')
    .select(`id,name,email,${field},${yearField}`)
    .not(field, 'is', null)
    .limit(1000);

  let credited = 0;
  for (const r of (rows as any[]) || []) {
    const d: string = r[field];
    if (!d) continue;
    const m = d.slice(5, 7), day = d.slice(8, 10);
    if (m !== mm || day !== dd) continue;
    if (Number(r[yearField]) === year) continue;

    const { data: out } = await supabaseAdmin.rpc('wallet_credit', {
      _user_id: r.id,
      _amount: rule.amount,
      _source: trigger,
      _note: rule.name || (trigger === 'birthday' ? 'Birthday gift 🎂' : 'Anniversary gift 💝'),
      _order_id: null,
      _expiry_days: rule.expiry_days ?? null,
      _rule_code: rule.code,
    } as any);

    if (Number(out ?? 0) > 0) {
      credited++;
      await supabaseAdmin.from('profiles').update({ [yearField]: year } as any).eq('id', r.id);
    }
  }
  return { credited };
}

export const runOccasionRewards = createServerFn({ method: 'POST' })
  .handler(async () => {
    const { requireCronSecret } = await import('./cron-auth');
    await requireCronSecret();
    const [bday, anniv] = await Promise.all([
      processOccasion('birthday', 'birthday_credited_year', 'birthday').catch((e) => ({ error: String(e?.message || e) })),
      processOccasion('anniversary', 'anniversary_credited_year', 'anniversary').catch((e) => ({ error: String(e?.message || e) })),
    ]);
    return { birthday: bday, anniversary: anniv };
  });

export const refreshRecommendationsCache = createServerFn({ method: 'POST' })
  .handler(async () => {
    const { requireCronSecret } = await import('./cron-auth');
    await requireCronSecret();
    const { data, error } = await supabaseAdmin.rpc('refresh_product_cooccurrence' as any);
    if (error) throw new Error(error.message);
    return { rows: Number(data ?? 0) };
  });
