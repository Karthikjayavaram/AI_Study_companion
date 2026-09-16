import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { FolderKanban, Plus, Compass, ArrowRight, BookOpen, Layers } from 'lucide-react';

export const SpaceDashboard: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();

  const projects = [
    {
      id: 'proj-ml-basics',
      name: 'Machine Learning Foundations',
      description: 'Supervised and unsupervised learning, cost functions, gradient descent.',
      learning_goal: 'Master gradient descent and neural network optimization math.',
      materialsCount: 4,
      masteryScore: 78,
    },
    {
      id: 'proj-transformers',
      name: 'Transformers & Attention Mechanisms',
      description: 'Self-attention, multi-head attention, encoders/decoders, and LLM scaling.',
      learning_goal: 'Build intuition for self-attention matrix math from scratch.',
      materialsCount: 2,
      masteryScore: 62,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Space View</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Artificial Intelligence & ML</h1>
          <p className="text-xs text-slate-400">Space ID: {spaceId}</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Projects in this Space</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all space-y-4 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {p.masteryScore}% Mastery
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{p.description}</p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300">Goal:</span>{' '}
                <span className="text-slate-400">{p.learning_goal}</span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                <span>Enter Project Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
