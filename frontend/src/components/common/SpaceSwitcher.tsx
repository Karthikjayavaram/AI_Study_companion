import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, FolderKanban, Plus, Check } from 'lucide-react';
import { api } from '../../api/client';
import { CreateSpaceModal } from './CreateSpaceModal';

interface SpaceItem {
  id: string;
  name: string;
  color_code?: string;
}

interface SpaceSwitcherProps {
  currentSpaceId?: string;
  onSpaceSelect?: (space: SpaceItem) => void;
}

export const SpaceSwitcher: React.FC<SpaceSwitcherProps> = ({ currentSpaceId, onSpaceSelect }) => {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSpaces = async () => {
    try {
      const res = await api.getSpaces();
      setSpaces(res.data || []);
    } catch {
      // Fallback gracefully
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

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

  const activeSpace = spaces.find((s) => s.id === currentSpaceId);

  const handleSelect = (space: SpaceItem) => {
    setIsOpen(false);
    if (onSpaceSelect) {
      onSpaceSelect(space);
    } else {
      navigate(`/spaces/${space.id}`);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          fetchSpaces();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 transition-all max-w-[200px]"
        title="Switch Learning Space"
      >
        <FolderKanban
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: activeSpace?.color_code || '#818cf8' }}
        />
        <span className="truncate">{activeSpace?.name || 'Spaces'}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Learning Spaces
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 px-1">
            {spaces.map((space) => {
              const isSelected = space.id === currentSpaceId;
              return (
                <button
                  key={space.id}
                  onClick={() => handleSelect(space)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: space.color_code || '#4f46e5' }}
                    />
                    <span className="truncate">{space.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
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
              <span>Create New Space</span>
            </button>
          </div>
        </div>
      )}

      <CreateSpaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSpaceCreated={(newSpace) => {
          fetchSpaces();
          navigate(`/spaces/${newSpace.id}`);
        }}
      />
    </div>
  );
};
