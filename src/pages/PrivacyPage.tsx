// @ts-nocheck
import { useSettings } from '@/lib/useSettings';
import { T, useContentT } from '@/lib/useContentT';

export default function PrivacyPage() {
  const { settings } = useSettings();
  const page = settings?.privacyPage;
  const title = page?.title || 'PRIVACY POLICY';
  const content = page?.content || 'Privacy policy content will be added soon.';
  const tContent = useContentT('page_block', 'privacy', 'content', content);
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8"><T>{title}</T></h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
        {tContent}
      </div>
    </div>
  );
}
