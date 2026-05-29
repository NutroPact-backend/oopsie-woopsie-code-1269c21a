// @ts-nocheck
import { useSettings } from '@/lib/useSettings';
import { T } from '@/lib/useContentT';
import { useContentT } from '@/lib/useContentT';

export default function TermsPage() {
  const { settings } = useSettings();
  const page = settings?.termsPage;
  const title = page?.title || 'TERMS OF SERVICE';
  const content = page?.content || 'Terms of service content will be added soon.';
  const tContent = useContentT('page_block', 'terms', 'content', content);
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8"><T>{title}</T></h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
        {tContent}
      </div>
    </div>
  );
}
