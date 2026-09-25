import { useState, useRef, useEffect } from 'react';
import { FileText, AlertTriangle, ClipboardCheck, Users, FolderKanban, Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import type { Project } from '../types';

export type Screen = 'document' | 'traceability' | 'review' | 'people';

interface HeaderProps {
  active: Screen;
  onNavigate: (s: Screen) => void;
  requirementCount: number;
  workItemCount: number;
  uncoveredCount: number;
  pendingReviewCount: number;
  peopleCount: number;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
}

const navItems: {
  screen: Screen;
  label: string;
  icon: typeof FileText;
}[] = [
  { screen: 'document', label: 'Document', icon: FileText },
  { screen: 'traceability', label: 'Traceability', icon: AlertTriangle },
  { screen: 'review', label: 'Review & Assign', icon: ClipboardCheck },
  { screen: 'people', label: 'People', icon: Users },
];

export default function Header({
  active,
  onNavigate,
  requirementCount,
  workItemCount,
  uncoveredCount,
  pendingReviewCount,
  peopleCount,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setShowCreateInput(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const handleCreate = () => {
    const name = newProjectName.trim();
    if (!name) return;
    onCreateProject(name);
    setNewProjectName('');
    setShowCreateInput(false);
    setDropdownOpen(false);
  };

  const handleDelete = () => {
    if (selectedProjectId) {
      onDeleteProject(selectedProjectId);
      setConfirmDelete(false);
      setDropdownOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
              Work Assignment Assistant
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Requirement-driven work decomposition & assignment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project selector */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FolderKanban size={16} className="text-primary-600" />
              <span className="hidden sm:inline max-w-[140px] truncate">
                {selectedProject ? selectedProject.name : 'Select project'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
                {/* Project list */}
                {!showCreateInput && !confirmDelete && (
                  <div className="max-h-64 overflow-y-auto p-1">
                    {projects.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">
                        No projects yet. Create one below.
                      </p>
                    )}
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p.id);
                          setDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        {p.id === selectedProjectId ? (
                          <Check size={14} className="text-primary-600" />
                        ) : (
                          <span className="w-[14px]" />
                        )}
                        <span className="flex-1 truncate text-left">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Create new project */}
                {showCreateInput && (
                  <div className="p-3">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                        if (e.key === 'Escape') {
                          setShowCreateInput(false);
                          setNewProjectName('');
                        }
                      }}
                      placeholder="Project name"
                      autoFocus
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowCreateInput(false);
                          setNewProjectName('');
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreate}
                        disabled={!newProjectName.trim()}
                        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete confirmation */}
                {confirmDelete && selectedProject && (
                  <div className="p-3">
                    <p className="text-sm text-slate-700">
                      Delete <span className="font-semibold">{selectedProject.name}</span>?
                      This removes all its requirements, work items, and assignments.
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        className="rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                {!showCreateInput && !confirmDelete && (
                  <div className="border-t border-slate-100 p-1">
                    <button
                      onClick={() => setShowCreateInput(true)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      <Plus size={14} />
                      New Project
                    </button>
                    {selectedProject && (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50"
                      >
                        <Trash2 size={14} />
                        Delete Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ screen, label, icon: Icon }) => {
              const isActive = active === screen;
              const badge =
                screen === 'traceability'
                  ? uncoveredCount
                  : screen === 'review'
                    ? pendingReviewCount
                    : screen === 'people'
                      ? peopleCount
                      : undefined;

              return (
                <button
                  key={screen}
                  onClick={() => onNavigate(screen)}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                        screen === 'traceability'
                          ? 'bg-danger-100 text-danger-700'
                          : screen === 'review'
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-slate-100 bg-slate-50/80">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-1.5 text-xs text-slate-500 sm:px-6">
          {selectedProject && (
            <span className="font-medium text-primary-700">
              {selectedProject.name}
            </span>
          )}
          <span>{requirementCount} requirements</span>
          <span>{workItemCount} work items</span>
          <span>{peopleCount} people</span>
          {uncoveredCount > 0 && (
            <span className="font-medium text-danger-600">
              {uncoveredCount} uncovered
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
