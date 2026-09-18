import React, { useEffect, useState } from 'react';
import { NavLink, useParams, Link } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Bot,
  CheckSquare,
  TrendingUp,
  Sparkles,
  FileText,
  Brain,
  BarChart3,
  Compass,
  Layers,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();

  const [storedProjectId, setStoredProjectId] = useState<string | null>(() => {
    return localStorage.getItem('last_active_project_id');
  });

  const [storedTopicName, setStoredTopicName] = useState<string | null>(() => {
    return localStorage.getItem('last_active_project_name');
  });

  useEffect(() => {
    if (projectId && projectId !== 'default') {
      localStorage.setItem('last_active_project_id', projectId);
      setStoredProjectId(projectId);
      const name = localStorage.getItem('last_active_project_name');
      if (name) setStoredTopicName(name);
    }
  }, [projectId]);

  // Sync if stored project changes in other components
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredProjectId(localStorage.getItem('last_active_project_id'));
      setStoredTopicName(localStorage.getItem('last_active_project_name'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const activeProjectId = projectId || storedProjectId;

  const mainNav = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/spaces', label: 'My Learning', icon: BookOpen },
    { to: '/analytics', label: 'Global Analytics', icon: BarChart3, end: true },
  ];

  const projectNav = activeProjectId
    ? [
        {
          category: 'LEARN',
          items: [
            { to: `/projects/${activeProjectId}/materials`, label: 'Materials', icon: FileText },
            { to: `/projects/${activeProjectId}/knowledge`, label: 'Knowledge', icon: Brain },
            { to: `/projects/${activeProjectId}/tutor`, label: 'AI Tutor', icon: Bot },
          ],
        },
        {
          category: 'PRACTICE',
          items: [
            { to: `/projects/${activeProjectId}/quiz`, label: 'Adaptive Quiz', icon: CheckSquare },
          ],
        },
        {
          category: 'PROGRESS',
          items: [
            { to: `/projects/${activeProjectId}/growth`, label: 'Mastery & Growth', icon: TrendingUp },
            { to: `/projects/${activeProjectId}/analytics`, label: 'Project Analytics', icon: BarChart3 },
          ],
        },
      ]
    : [
        {
          category: 'LEARN',
          items: [
            { to: '/materials', label: 'Materials', icon: FileText },
            { to: '/knowledge', label: 'Knowledge', icon: Brain },
            { to: '/tutor', label: 'AI Tutor', icon: Bot },
          ],
        },
        {
          category: 'PRACTICE',
          items: [{ to: '/quiz', label: 'Adaptive Quiz', icon: CheckSquare }],
        },
        {
          category: 'PROGRESS',
          items: [{ to: '/growth', label: 'Mastery & Growth', icon: TrendingUp }],
        },
      ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between hidden md:flex overflow-y-auto">
      <div className="space-y-6">
        {/* MAIN NAVIGATION */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            OVERVIEW
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* PROJECT WORKSPACE MODULES */}
        <div className="space-y-5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between px-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {activeProjectId ? 'PROJECT WORKSPACE' : 'WORKSPACE'}
            </span>
            {activeProjectId && (
              <Link
                to={`/projects/${activeProjectId}`}
                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                title="Open Project Hub"
              >
                Hub →
              </Link>
            )}
          </div>

          {projectNav.map((group) => (
            <div key={group.category} className="space-y-1">
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider px-3 mb-1">
                {group.category}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVE TOPIC WIDGET */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Project</span>
            {activeProjectId && <Sparkles className="w-3 h-3 text-indigo-400" />}
          </div>
          {activeProjectId ? (
            <Link
              to={`/projects/${activeProjectId}`}
              className="block group"
              title="Click to open project dashboard"
            >
              <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                {storedTopicName || 'Current Project'}
              </div>
              <div className="text-[10px] text-slate-500 group-hover:text-slate-400 mt-0.5 flex items-center gap-1">
                <span>View workspace</span>
                <span>→</span>
              </div>
            </Link>
          ) : (
            <Link to="/spaces" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              Select or create a topic →
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
};
