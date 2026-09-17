import React, { useEffect, useState } from 'react';
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
  const [storedProjectId, setStoredProjectId] = useState<string | null>(() => {
    return localStorage.getItem('last_active_project_id');
  });

  useEffect(() => {
    if (projectId && projectId !== 'default') {
      localStorage.setItem('last_active_project_id', projectId);
      setStoredProjectId(projectId);
    }
  }, [projectId]);

  const activeProjectId = projectId || storedProjectId;

  const baseNav = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/spaces', label: 'Spaces', icon: FolderKanban },
  ];

  const projectNav = [
    {
      to: activeProjectId ? `/projects/${activeProjectId}` : '/spaces',
      label: 'Project Hub',
      icon: Compass,
      end: true,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/materials` : '/spaces',
      label: 'Materials',
      icon: FileText,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/tutor` : '/spaces',
      label: 'AI Tutor',
      icon: Bot,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/quiz` : '/spaces',
      label: 'Adaptive Quiz',
      icon: CheckSquare,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/growth` : '/spaces',
      label: 'Growth & Mastery',
      icon: TrendingUp,
    },
    {
      to: activeProjectId ? `/projects/${activeProjectId}/analytics` : '/spaces',
      label: 'Analytics',
      icon: BarChart3,
    },
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
            <span>Learning Tools</span>
          </div>
          <nav className="space-y-1">
            {projectNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive && activeProjectId
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

      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="text-xs text-slate-400 mb-1">
          {activeProjectId ? 'Current Workspace' : 'No Project Selected'}
        </div>
        <div
          className={`text-xs flex items-center gap-1.5 font-medium ${
            activeProjectId ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeProjectId ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          ></span>
          {activeProjectId ? 'Ready to Learn' : 'Select a Project'}
        </div>
      </div>
    </aside>
  );
};
