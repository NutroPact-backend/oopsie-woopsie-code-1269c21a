// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listRoadmapTasks, toggleRoadmapTask, addRoadmapTask, deleteRoadmapTask } from '@/lib/aiSeoCenter.functions';
import { Plus, Trash2, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const PHASES = [
  { id: 'phase1', label: 'Phase 1', subtitle: 'Days 1–30', desc: 'Technical Foundation & Bot Access', color: 'border-blue-300 bg-blue-50' },
  { id: 'phase2', label: 'Phase 2', subtitle: 'Days 31–60', desc: 'Semantic Content & Authority', color: 'border-purple-300 bg-purple-50' },
  { id: 'phase3', label: 'Phase 3', subtitle: 'Days 61–90', desc: 'Conversational Scaling & Reputation', color: 'border-emerald-300 bg-emerald-50' },
];

export default function RoadmapPanel() {
  const fetchTasks = useServerFn(listRoadmapTasks);
  const toggle = useServerFn(toggleRoadmapTask);
  const add = useServerFn(addRoadmapTask);
  const del = useServerFn(deleteRoadmapTask);

  const [tasks, setTasks] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = async () => { try { const r = await fetchTasks({ data: {} }); setTasks(r.tasks); } catch {} };
  useEffect(() => { load(); }, []);

  const onToggle = async (t: any) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, is_completed: !x.is_completed } : x));
    try { await toggle({ data: { taskId: t.id, isCompleted: !t.is_completed } }); }
    catch (e: any) { alert(e.message); load(); }
  };

  const onAdd = async (phase: string) => {
    if (!newTitle.trim()) return;
    try {
      await add({ data: { phase: phase as any, title: newTitle.trim(), description: newDesc.trim() || undefined, category: 'Custom' } });
      setNewTitle(''); setNewDesc(''); setAdding(null); load();
    } catch (e: any) { alert(e.message); }
  };

  const onDel = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try { await del({ data: { taskId: id } }); load(); } catch (e: any) { alert(e.message); }
  };

  const total = tasks.length;
  const done = tasks.filter(t => t.is_completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-black flex items-center gap-2"><Zap size={16} className="text-orange-500" /> 90-Day AI SEO Roadmap</h2>
          <span className="text-xs font-bold text-gray-500">{done}/{total} complete · {pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {PHASES.map(phase => {
          const phaseTasks = tasks.filter(t => t.phase === phase.id);
          return (
            <div key={phase.id} className={`rounded-2xl border-2 ${phase.color} p-4`}>
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{phase.subtitle}</div>
                <div className="text-base font-black">{phase.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{phase.desc}</div>
              </div>
              <div className="space-y-2">
                {phaseTasks.map(t => {
                  const isExp = expanded[t.id];
                  return (
                    <div key={t.id} className={`bg-white rounded-xl p-3 border ${t.severity === 'critical' ? 'border-red-300' : t.severity === 'warning' ? 'border-yellow-300' : 'border-gray-200'} hover:shadow-sm transition`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={t.is_completed} onChange={() => onToggle(t)}
                          className="w-4 h-4 mt-0.5 accent-orange-500 cursor-pointer" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            {t.severity === 'critical' && <AlertTriangle size={12} className="text-red-500" />}
                            {t.is_auto_injected && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase">Auto</span>}
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">{t.category}</span>
                          </div>
                          <button onClick={() => setExpanded(p => ({ ...p, [t.id]: !p[t.id] }))}
                            className={`text-left text-sm font-bold mt-1 hover:text-orange-600 transition ${t.is_completed ? 'line-through text-gray-400' : ''}`}>
                            {t.title}
                          </button>
                          {t.description && (
                            <div className="mt-1">
                              <button onClick={() => setExpanded(p => ({ ...p, [t.id]: !p[t.id] }))} className="text-[10px] text-orange-500 flex items-center gap-0.5">
                                {isExp ? <><ChevronUp size={10} /> Hide</> : <><ChevronDown size={10} /> Steps</>}
                              </button>
                              {isExp && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.description}</p>}
                            </div>
                          )}
                        </div>
                        {!t.is_auto_injected && (
                          <button onClick={() => onDel(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {adding === phase.id ? (
                  <div className="bg-white rounded-xl p-3 border-2 border-orange-300">
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title"
                      className="w-full border rounded-lg px-2 py-1.5 text-sm mb-2" autoFocus />
                    <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                      className="w-full border rounded-lg px-2 py-1.5 text-xs mb-2 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => onAdd(phase.id)} className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold">Add</button>
                      <button onClick={() => { setAdding(null); setNewTitle(''); setNewDesc(''); }} className="px-3 py-1.5 rounded-lg text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAdding(phase.id)}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-orange-400 hover:text-orange-600 flex items-center justify-center gap-1">
                    <Plus size={12} /> Add custom task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
