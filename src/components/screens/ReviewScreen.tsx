import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  UserCog,
  AlertCircle,
  User,
  Lightbulb,
} from 'lucide-react';
import type {
  Person,
  WorkItem,
  Assignment,
  Requirement,
} from '../../types';
import { assignmentKey } from '../../types';
import {
  DifficultyDots,
  LevelBar,
  AvailabilityBadge,
  RoleBadge,
  StatusBadge,
  SkillTag,
} from '../Badges';

interface ReviewScreenProps {
  workItems: WorkItem[];
  requirements: Requirement[];
  people: Person[];
  assignments: Map<string, Assignment>;
  projectId: string;
  onApprove: (workItemId: string) => void;
  onOverride: (
    workItemId: string,
    newPersonId: string,
    reason: string
  ) => void;
}

export default function ReviewScreen({
  workItems,
  requirements,
  people,
  assignments,
  projectId,
  onApprove,
  onOverride,
}: ReviewScreenProps) {
  const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(
    new Set()
  );
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);

  const themes = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const item of workItems) {
      const list = map.get(item.theme) ?? [];
      list.push(item);
      map.set(item.theme, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [workItems]);

  const toggleTheme = (theme: string) => {
    setCollapsedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(theme)) next.delete(theme);
      else next.add(theme);
      return next;
    });
  };

  const reqText = (id: string) =>
    requirements.find((r) => r.id === id)?.text ?? '';
  const personById = (id: string | null) =>
    id ? people.find((p) => p.id === id) ?? null : null;

  const approvedCount = Array.from(assignments.values()).filter(
    (a) => a.status === 'approved'
  ).length;
  const overriddenCount = Array.from(assignments.values()).filter(
    (a) => a.status === 'overridden'
  ).length;
  const pendingCount = workItems.length - approvedCount - overriddenCount;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Review & Assign</h2>
          <p className="mt-1 text-sm text-slate-400">
            Work items grouped by theme. Approve the proposed assignment or
            override with someone else from the directory.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="badge bg-primary-500/15 text-primary-300">
            {pendingCount} pending
          </span>
          <span className="badge bg-accent-500/15 text-accent-300">
            {approvedCount} approved
          </span>
          <span className="badge bg-warning-500/15 text-warning-300">
            {overriddenCount} overridden
          </span>
        </div>
      </div>

      {/* Theme groups */}
      <div className="space-y-4">
        {themes.map(([theme, items]) => {
          const collapsed = collapsedThemes.has(theme);
          return (
            <div key={theme} className="card overflow-hidden">
              <button
                onClick={() => toggleTheme(theme)}
                className="flex w-full items-center justify-between border-b border-ink-200 bg-ink-300/60 px-5 py-3 text-left transition-colors hover:bg-ink-300"
              >
                <div className="flex items-center gap-2">
                  {collapsed ? (
                    <ChevronRight size={18} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-500" />
                  )}
                  <h3 className="font-semibold text-white">{theme}</h3>
                </div>
                <span className="badge bg-ink-100 text-slate-400">
                  {items.length} item{items.length > 1 ? 's' : ''}
                </span>
              </button>

              {!collapsed && (
                <div className="divide-y divide-ink-200">
                  {items.map((item) => {
                    const assignment = assignments.get(assignmentKey(projectId, item.id));
                    if (!assignment) return null;
                    const final = personById(assignment.finalPersonId);
                    const isOverrideOpen = overrideTarget === item.id;

                    return (
                      <div key={item.id} className="px-5 py-4">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-primary-400">
                                {item.id}
                              </span>
                              <h4 className="text-sm font-semibold text-white">
                                {item.title}
                              </h4>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-3">
                            <DifficultyDots level={item.difficulty} />
                            <StatusBadge status={assignment.status} />
                          </div>
                        </div>

                        {/* Skills row */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">
                            Required skills:
                          </span>
                          {item.requiredSkills.map((skill) => (
                            <SkillTag key={skill} skill={skill} />
                          ))}
                        </div>

                        {/* Requirement links */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">
                            From:
                          </span>
                          {item.requirementIds.map((rid) => (
                            <span
                              key={rid}
                              title={reqText(rid)}
                              className="cursor-help border-b border-dashed border-ink-200 font-mono text-xs text-slate-500"
                            >
                              {rid}
                            </span>
                          ))}
                        </div>

                        {/* Assignment + reasoning */}
                        <div className="mt-3 rounded-lg bg-ink-300/60 p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb
                              size={16}
                              className="mt-0.5 flex-shrink-0 text-primary-400"
                            />
                            <p className="text-sm text-slate-300">
                              {assignment.reason}
                            </p>
                          </div>

                          {/* Assigned person card */}
                          {final && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                              <User size={14} className="text-slate-500" />
                              <span className="font-medium text-slate-200">
                                {final.name}
                              </span>
                              <RoleBadge role={final.role} />
                              <LevelBar level={final.level} />
                              <AvailabilityBadge status={final.availability} />
                            </div>
                          )}

                          {assignment.status === 'overridden' &&
                            assignment.overriddenReason && (
                              <p className="mt-2 border-t border-ink-200 pt-2 text-xs text-warning-300">
                                Override reason: {assignment.overriddenReason}
                              </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex items-center gap-3">
                          {assignment.status === 'proposed' && (
                            <>
                              {assignment.proposedPersonId && (
                                <button
                                  onClick={() => onApprove(item.id)}
                                  className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                                >
                                  <Check size={14} />
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setOverrideTarget(isOverrideOpen ? null : item.id)
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-300 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-200"
                              >
                                <UserCog size={14} />
                                Reassign
                              </button>
                            </>
                          )}

                          {assignment.status !== 'proposed' && (
                            <button
                              onClick={() =>
                                setOverrideTarget(isOverrideOpen ? null : item.id)
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-300 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-200"
                            >
                              <UserCog size={14} />
                              Change
                            </button>
                          )}

                          {!assignment.proposedPersonId &&
                            assignment.status === 'proposed' && (
                              <span className="flex items-center gap-1.5 text-sm text-danger-400">
                                <AlertCircle size={14} />
                                No suitable match — needs manual assignment
                              </span>
                            )}
                        </div>

                        {/* Override panel */}
                        {isOverrideOpen && (
                          <OverridePanel
                            item={item}
                            people={people}
                            currentPersonId={assignment.finalPersonId}
                            onConfirm={(personId, reason) => {
                              onOverride(item.id, personId, reason);
                              setOverrideTarget(null);
                            }}
                            onCancel={() => setOverrideTarget(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverridePanel({
  item,
  people,
  currentPersonId,
  onConfirm,
  onCancel,
}: {
  item: WorkItem;
  people: Person[];
  currentPersonId: string | null;
  onConfirm: (personId: string, reason: string) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState(currentPersonId ?? '');
  const [reason, setReason] = useState('');

  const selected = people.find((p) => p.id === selectedId);
  const hasMatchedSkills =
    selected &&
    item.requiredSkills.filter((s) => selected.skills.includes(s));

  return (
    <div className="mt-3 rounded-lg border border-primary-500/30 bg-primary-500/10 p-4">
      <h5 className="text-sm font-semibold text-white">
        Reassign work item
      </h5>

      <div className="mt-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-400">
            Select person
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-ink-400 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">— Select a person —</option>
            {people.map((p) => {
              const matched = item.requiredSkills.filter((s) =>
                p.skills.includes(s)
              );
              return (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.role} | L{p.level} | {p.availability} | skills: [
                  {matched.length > 0 ? matched.join(', ') : 'no direct match'}]
                </option>
              );
            })}
          </select>
        </div>

        {selected && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-400 p-2 text-sm">
            <span className="font-medium text-slate-200">{selected.name}</span>
            <RoleBadge role={selected.role} />
            <LevelBar level={selected.level} />
            <AvailabilityBadge status={selected.availability} />
            <div className="flex flex-wrap gap-1">
              {item.requiredSkills.map((skill) => (
                <SkillTag
                  key={skill}
                  skill={skill}
                  matched={selected.skills.includes(skill)}
                />
              ))}
            </div>
            {hasMatchedSkills && hasMatchedSkills.length === 0 && (
              <span className="text-xs font-medium text-danger-400">
                No direct skill match
              </span>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-400">
            Reason for reassignment
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Better domain knowledge, team balance, etc."
            className="mt-1 w-full rounded-lg border border-ink-200 bg-ink-400 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-ink-200 bg-ink-300 px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-ink-200"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              selectedId && onConfirm(selectedId, reason || 'Manual override')
            }
            disabled={!selectedId}
            className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-400 disabled:opacity-50"
          >
            Confirm Reassignment
          </button>
        </div>
      </div>
    </div>
  );
}
