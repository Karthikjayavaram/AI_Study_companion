import React from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Activity, Clock, Award, CheckCircle2, Bot } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const events = [
    {
      id: 'e1',
      type: 'quiz_completed',
      title: 'Adaptive Assessment Completed',
      details: 'Score: 92% • Concepts: Bias, Variance, Optimization',
      time: '15 mins ago',
      icon: Award,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'e2',
      type: 'tutor_interacted',
      title: 'AI Tutor Session',
      details: 'Query: "Intuition behind learning rate in gradient descent" with citations',
      time: '1 hour ago',
      icon: Bot,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'e3',
      type: 'material_uploaded',
      title: 'Document Processed',
      details: 'ML_Lecture_Notes_W1_W2.pdf (34 chunks extracted & embedded)',
      time: '2 hours ago',
      icon: CheckCircle2,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Telemetry & Events</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Learning Analytics</h1>
          <p className="text-xs text-slate-400">Activity stream and learning velocity for Project: {projectId || 'default'}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase">Study Sessions</div>
          <div className="text-2xl font-bold text-white">12</div>
          <div className="text-xs text-slate-400">Total active learning intervals</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase">Questions Answered</div>
          <div className="text-2xl font-bold text-white">48</div>
          <div className="text-xs text-emerald-400 font-medium">85% average accuracy</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase">Grounded AI Invocations</div>
          <div className="text-2xl font-bold text-white">24</div>
          <div className="text-xs text-indigo-400 font-medium">100% citation rate</div>
        </div>
      </div>

      {/* Activity Event Stream */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity Timeline</h2>
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${e.color}`}>
                <e.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">{e.title}</h3>
                  <span className="text-[11px] text-slate-400">{e.time}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{e.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
