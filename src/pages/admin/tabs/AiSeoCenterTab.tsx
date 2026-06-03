// @ts-nocheck
import { useState } from 'react';
import OverviewPanel from './ai-seo/OverviewPanel';
import AuditEnginePanel from './ai-seo/AuditEnginePanel';
import RoadmapPanel from './ai-seo/RoadmapPanel';
import { TabHelp } from './_TabHelp';
import { Activity, Search, ListChecks } from 'lucide-react';

const SUB = [
  { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
  { id: 'audit', label: 'Audit Engine', icon: <Search size={14} /> },
  { id: 'roadmap', label: '90-Day Roadmap', icon: <ListChecks size={14} /> },
];

export default function AiSeoCenterTab() {
  const [sub, setSub] = useState('overview');
  return (
    <div className="space-y-4">
      <TabHelp topic="aiseo" />
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {SUB.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-b-2 transition whitespace-nowrap ${sub === s.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>
      {sub === 'overview' && <OverviewPanel />}
      {sub === 'audit' && <AuditEnginePanel />}
      {sub === 'roadmap' && <RoadmapPanel />}
    </div>
  );
}
