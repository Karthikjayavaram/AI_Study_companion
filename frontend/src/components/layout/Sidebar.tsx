import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Bot,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Compass,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const activeProjectId = projectId || 'default';

  const baseNav = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/spaces', label: 'Spaces', icon: FolderKanban },
  ];

  const projectNav = [
    { to: `/projects/${activeProjectId}`, label: 'Project Hub', icon: Compass, end: true },
    { to: `/projects/${activeProjectId}/materials`, label: 'Materials', icon: FileText },
    { to: `/projects/${activeProjectId}/tutor`, label: 'AI Tutor', icon: Bot },
    { to: `/projects/${activeProjectId}/quiz`, label: 'Adaptive Quiz', icon: CheckSquare },
    { to: `/projects/${activeProjectId}/growth`, label: 'Growth & Mastery', icon: TrendingUp },
    { to: `/projects/${activeProjectId}/analytics`, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Workspace
          </div>
          <nav className="space-y-1">
            {baseNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Learning Loop</span>
            <span className="text-[10px] text-indigo-400 font-mono">PRD v3</span>
          </div>
          <nav className="space-y-1">
            {projectNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl">
        <div className="text-xs text-slate-400 mb-1">Active Study Loop</div>
        <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Context Preserved
        </div>
      </div>
    </aside>
  );
};
