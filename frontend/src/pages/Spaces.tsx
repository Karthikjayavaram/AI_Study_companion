import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, ArrowRight, BookOpen, Layers } from 'lucide-react';

export const Spaces: React.FC = () => {
  const [spaces] = useState([
    {
      id: 'space-ai',
      name: 'Artificial Intelligence & ML',
      description: 'Core machine learning theory, deep learning architectures, and mathematical foundations.',
      color_code: '#4f46e5',
      projectCount: 3,
    },
    {
      id: 'space-cloud',
      name: 'Distributed Systems & Cloud',
      description: 'Cloud architecture, distributed data stores, microservices, and containerization.',
      color_code: '#06b6d4',
      projectCount: 2,
    },
    {
      id: 'space-algo',
      name: 'Algorithms & Data Structures',
      description: 'Advanced dynamic programming, graph algorithms, and algorithmic complexity.',
      color_code: '#10b981',
      projectCount: 1,
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Learning Spaces</h1>
          <p className="text-xs text-slate-400">Broad knowledge domains containing your focused learning journeys</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Space
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <Link
            key={space.id}
            to={`/spaces/${space.id}`}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: `${space.color_code}25`, color: space.color_code }}
                >
                  <FolderKanban className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                  {space.projectCount} Projects
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                {space.name}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {space.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
              <span>View Space Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
