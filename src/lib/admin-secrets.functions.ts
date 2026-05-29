// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { invalidateSecretCache } from './product-auth.functions';

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (!data) throw new Error('Not authorized');
}

function mask(secret: string | undefined | null): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  return secret.slice(0, 4) + '••••' + secret.slice(-4);
}

/** Status: shows masked current/previous + whether env fallback is in use */
export const getProductAuthSecretStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from('admin_secrets')
      .select('value, updated_at')
      .eq('key', 'product_auth_hmac')
      .maybeSingle();
    const v = (data?.value as { current?: string; previous?: string }) || {};
    const envSet = !!process.env.PRODUCT_AUTH_HMAC_SECRET;
    const dbHasCurrent = !!(v.current && v.current.length >= 16);
    return {
      source: dbHasCurrent ? 'database' : (envSet ? 'environment' : 'none'),
      currentMasked: mask(dbHasCurrent ? v.current : process.env.PRODUCT_AUTH_HMAC_SECRET),
      previousMasked: mask(v.previous),
      hasPrevious: !!(v.previous && v.previous.length >= 16),
      updatedAt: data?.updated_at || null,
      envSet,
    };
  });

/** Rotate: generate new secret, move old to "previous" (for grace period), purge previous, or set custom */
export const rotateProductAuthSecret = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    action: z.enum(['rotate', 'set_custom', 'clear_previous']),
    customSecret: z.string().min(32).max(256).regex(/^[A-Za-z0-9_\-]+$/).optional(),
    keepPrevious: z.boolean().default(true),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: existing } = await supabaseAdmin
      .from('admin_secrets')
      .select('value')
      .eq('key', 'product_auth_hmac')
      .maybeSingle();
    const cur = (existing?.value as { current?: string; previous?: string }) || {};
    const currentNow = cur.current || process.env.PRODUCT_AUTH_HMAC_SECRET || '';

    let newValue: { current?: string; previous?: string } = { ...cur };

    if (data.action === 'clear_previous') {
      delete newValue.previous;
    } else {
      const next = data.action === 'set_custom'
        ? (data.customSecret || '')
        : randomBytes(32).toString('hex');
      if (next.length < 32) throw new Error('Secret must be at least 32 chars');
      newValue = {
        current: next,
        previous: data.keepPrevious && currentNow && currentNow.length >= 16 ? currentNow : undefined,
      };
    }

    const { error } = await supabaseAdmin
      .from('admin_secrets')
      .upsert({
        key: 'product_auth_hmac',
        value: newValue,
        updated_by: context.userId,
      }, { onConflict: 'key' });
    if (error) throw new Error(error.message);

    invalidateSecretCache();
    return { ok: true };
  });
