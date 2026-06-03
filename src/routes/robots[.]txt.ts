// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const DEFAULT_ROBOTS = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /admin/
Disallow: /checkout
Disallow: /cart
Disallow: /account
Disallow: /account/
Disallow: /login
Disallow: /auth/
Disallow: /invoice/
Disallow: /modify/
Disallow: /return/

# AI crawlers — explicitly allow (ChatGPT, Perplexity, Claude, Gemini, etc.)
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: GoogleOther
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bytespider
Allow: /
User-agent: CCBot
Allow: /
User-agent: cohere-ai
Allow: /
User-agent: Meta-ExternalAgent
Allow: /
User-agent: DuckAssistBot
Allow: /
User-agent: YouBot
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: MistralAI-User
Allow: /

Sitemap: /sitemap.xml

# AI-friendly discovery
# LLM summary:  /llms.txt
# Full LLM doc: /llms-full.txt
# AI policy:    /ai.txt
# JSON context: /api/public/ai-context
`;

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        let body = DEFAULT_ROBOTS;
        try {
          const { data } = await supabaseAdmin
            .from('marketing_settings').select('robots_txt').eq('key', 'default').maybeSingle();
          if (data?.robots_txt && data.robots_txt.trim().length > 10) body = data.robots_txt;
        } catch {}
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
        });
      },
    },
  },
});
