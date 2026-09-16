import React from 'react';
import { Shield, Server, Users, Layers, Activity, Cpu, DollarSign } from 'lucide-react';

export const Admin: React.FC = () => {
  const telemetry = [
    {
      id: 'ai-1',
      feature: 'Tutor Query',
      model: 'gpt-4o-mini',
      promptTokens: 412,
      completionTokens: 185,
      latency: '820 ms',
      cost: '$0.00012',
      status: 'success',
      timestamp: '2 mins ago',
    },
    {
      id: 'ai-2',
      feature: 'Adaptive Quiz Gen',
      model: 'gpt-4o-mini',
      promptTokens: 620,
      completionTokens: 340,
      latency: '1,120 ms',
      cost: '$0.00021',
      status: 'success',
      timestamp: '15 mins ago',
    },
    {
      id: 'ai-3',
      feature: 'Document Chunk Embedding',
      model: 'text-embedding-3-small',
      promptTokens: 1420,
      completionTokens: 0,
      latency: '240 ms',
      cost: '$0.00003',
      status: 'success',
      timestamp: '1 hour ago',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Operational Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin & Telemetry Dashboard</h1>
          <p className="text-xs text-slate-400">Platform health, system metrics, and AI observability</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          System Healthy
        </span>
      </div>

      {/* Platform Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registered Users', val: '42', icon: Users, color: 'text-indigo-400' },
          { label: 'Active Spaces', val: '18', icon: Layers, color: 'text-cyan-400' },
          { label: 'Learning Projects', val: '31', icon: Activity, color: 'text-emerald-400' },
          { label: 'AI Invocations', val: '1,248', icon: Cpu, color: 'text-purple-400' },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{m.label}</span>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="text-2xl font-extrabold text-white">{m.val}</div>
          </div>
        ))}
      </div>

      {/* AI Usage & Observability Telemetry Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Observability & Cost Tracking</h2>
          <span className="text-xs text-slate-400">PRD Section 14 Spec</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 rounded-l-lg">Feature</th>
                <th className="p-3">Model</th>
                <th className="p-3">Tokens (P / C)</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Est. Cost</th>
                <th className="p-3">Status</th>
                <th className="p-3 rounded-r-lg">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {telemetry.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-white">{t.feature}</td>
                  <td className="p-3 font-mono text-slate-400">{t.model}</td>
                  <td className="p-3 font-mono">{t.promptTokens} / {t.completionTokens}</td>
                  <td className="p-3 font-mono text-indigo-400">{t.latency}</td>
                  <td className="p-3 font-mono text-emerald-400">{t.cost}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{t.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
