import type { Person, AssignmentStatus } from '../types';

export function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Difficulty ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= level ? 'bg-primary-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </span>
  );
}

export function LevelBar({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Level ${level}/5`}>
      <span className="text-xs font-medium text-slate-500">L{level}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-3 w-1.5 rounded-sm ${
              i <= level ? 'bg-accent-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </span>
  );
}

export function AvailabilityBadge({ status }: { status: Person['availability'] }) {
  const config = {
    available: { label: 'Available', className: 'bg-accent-100 text-accent-700' },
    partially: { label: 'Partially', className: 'bg-warning-100 text-warning-700' },
    unavailable: { label: 'Unavailable', className: 'bg-slate-100 text-slate-500' },
  };
  const c = config[status];
  return <span className={`badge ${c.className}`}>{c.label}</span>;
}

export function RoleBadge({ role }: { role: Person['role'] }) {
  const labels: Record<Person['role'], string> = {
    employee: 'Employee',
    contractor: 'Contractor',
    freelancer: 'Freelancer',
  };
  return <span className="badge bg-slate-100 text-slate-600">{labels[role]}</span>;
}

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const config = {
    proposed: { label: 'Proposed', className: 'bg-primary-100 text-primary-700' },
    approved: { label: 'Approved', className: 'bg-accent-100 text-accent-700' },
    overridden: { label: 'Overridden', className: 'bg-warning-100 text-warning-700' },
  };
  const c = config[status];
  return <span className={`badge ${c.className}`}>{c.label}</span>;
}

export function SkillTag({ skill, matched }: { skill: string; matched?: boolean }) {
  return (
    <span
      className={`badge ${
        matched
          ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {skill}
    </span>
  );
}
