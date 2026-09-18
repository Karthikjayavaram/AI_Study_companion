import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Compass, Plus, Check } from 'lucide-react';
import { api } from '../../api/client';
import { CreateProjectModal } from './CreateProjectModal';

interface ProjectItem {
  id: string;
  space_id: string;
  name: string;
}

interface ProjectSwitcherProps {
  currentProjectId?: string;
  currentSpaceId?: string;
  onProjectSelect?: (project: ProjectItem) => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  currentProjectId,
  currentSpaceId,
  onProjectSelect,
}) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.getProjects(currentSpaceId);
      setProjects(res.data || []);
    } catch {
      // Fallback gracefully
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentSpaceId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeProject = projects.find((p) => p.id === currentProjectId);

  const handleSelect = (project: ProjectItem) => {
    setIsOpen(false);
    localStorage.setItem('last_active_project_id', project.id);
    localStorage.setItem('last_active_project_name', project.name);
    if (onProjectSelect) {
      onProjectSelect(project);
    } else {
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          fetchProjects();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-all max-w-[220px]"
        title="Switch Learning Project"
      >
        <Compass className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
        <span className="truncate">{activeProject?.name || 'Projects'}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Learning Projects
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 px-1">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No projects found in this space</div>
            ) : (
              projects.map((proj) => {
                const isSelected = proj.id === currentProjectId;
                return (
                  <button
                    key={proj.id}
                    onClick={() => handleSelect(proj)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{proj.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800/80 mt-1.5 pt-1.5 px-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultSpaceId={currentSpaceId || activeProject?.space_id}
        onProjectCreated={(newProject) => {
          fetchProjects();
          localStorage.setItem('last_active_project_id', newProject.id);
          localStorage.setItem('last_active_project_name', newProject.name);
          navigate(`/projects/${newProject.id}`);
        }}
      />
    </div>
  );
};
