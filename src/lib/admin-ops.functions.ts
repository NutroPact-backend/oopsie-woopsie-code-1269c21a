// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!data) throw new Error('Forbidden');
}

// ── Audit log ────────────────────────────────────────────────────────────
export const listAuditLog = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action?: string; limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    let q = supabaseAdmin.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(Math.min(data.limit ?? 200, 500));
    if (data.action) q = q.eq('action', data.action);
    const { data: rows } = await q;
    return { items: rows || [] };
  });

// ── Support inbox ────────────────────────────────────────────────────────
export const listSupportConversations = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: 'open' | 'handoff' | 'closed' | 'all' } = {}) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    let q = supabaseAdmin.from('chat_conversations').select('*').order('last_message_at', { ascending: false }).limit(200);
    if (data.status && data.status !== 'all') q = q.eq('status', data.status);
    const { data: rows } = await q;
    return { items: rows || [] };
  });

export const getSupportThread = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const [{ data: conv }, { data: msgs }] = await Promise.all([
      supabaseAdmin.from('chat_conversations').select('*').eq('id', data.conversationId).maybeSingle(),
      supabaseAdmin.from('chat_messages').select('*').eq('conversation_id', data.conversationId).order('created_at', { ascending: true }),
    ]);
    return { conversation: conv, messages: msgs || [] };
  });

export const replySupportThread = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; content: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const content = (data.content || '').trim().slice(0, 4000);
    if (!content) throw new Error('Empty message');
    const { error } = await supabaseAdmin.from('chat_messages').insert({
      conversation_id: data.conversationId, role: 'admin', content,
    } as any);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from('chat_conversations').update({
      last_message_at: new Date().toISOString(), status: 'handoff', assigned_admin_id: context.userId,
    }).eq('id', data.conversationId);
    return { ok: true };
  });

export const setSupportStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; status: 'open' | 'handoff' | 'closed' }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    await supabaseAdmin.from('chat_conversations').update({ status: data.status }).eq('id', data.conversationId);
    return { ok: true };
  });
