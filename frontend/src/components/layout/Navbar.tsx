import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  LogOut,
  User as UserIcon,
  Shield,
  Menu,
  X,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Bot,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Compass,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeProjectId = localStorage.getItem('last_active_project_id');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/spaces', label: 'Spaces', icon: FolderKanban },
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
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        {isAuthenticated && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg text-white tracking-tight">AI Study Companion</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
              Student Workspace
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            {user.is_superuser && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-medium">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <span className="hidden md:inline font-medium">{user.full_name || user.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl transition-colors shadow-sm shadow-indigo-600/30"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 md:hidden bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
          <nav className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
              Navigation
            </div>
            {navLinks.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <item.icon className="w-4 h-4 text-indigo-400" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div>Logged in as {user?.email}</div>
            <button
              onClick={handleLogout}
              className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
