// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';

const SubscribeSchema = z.object({
  productId: z.string().min(1).max(255),
  productName: z.string().min(1).max(255),
  channels: z.array(z.enum(['email', 'whatsapp', 'sms', 'onsite'])).min(1).max(4),
});

/**
 * Subscribe the logged-in user to a back-in-stock waitlist for a product.
 * Pulls name / email / phone from the user's profile — no form needed.
 * Stores selected channels. On-site bell is delivered immediately as a confirmation.
 * WhatsApp / SMS sending happens later by a worker once Twilio/Gupshup keys are added.
 */
export const subscribeNotifyMe = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubscribeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Pull profile via admin client to bypass RLS reliably
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name,email,phone')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.email) {
      return { ok: false, error: 'profile_incomplete' as const };
    }

    const name = (profile.name || '').trim();
    const email = profile.email.trim();
    const phone = (profile.phone || '').trim();

    // Avoid duplicate waitlist rows for same user+product
    const { data: existing } = await supabaseAdmin
      .from('product_waitlist')
      .select('id')
      .eq('product_id', data.productId)
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('product_waitlist').insert({
        id: crypto.randomUUID(),
        product_id: data.productId,
        product_name: data.productName,
        name,
        email,
        phone,
        user_id: userId,
        channels: data.channels,
        notified: false,
      });
    }

    // Drop an immediate confirmation in the on-site bell
    if (data.channels.includes('onsite')) {
      await supabaseAdmin.from('user_notifications').insert({
        user_id: userId,
        type: 'notify_me_subscribed',
        title: `You're on the list`,
        body: `We'll alert you the moment "${data.productName}" is back in stock.`,
        link: '',
      });
    }

    return { ok: true as const };
  });
