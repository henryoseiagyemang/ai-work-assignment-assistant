import type { Person, AssignmentStatus } from '../types';
import { Circle, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export function DifficultyDots({ level }: { level: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`Difficulty ${level}/5`}
      role="img"
      aria-label={`Difficulty ${level} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            i <= level ? 'bg-primary-400' : 'bg-ink-100'
          }`}
        />
      ))}
    </span>
  );
}

export function LevelBar({ level }: { level: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`Level ${level}/5`}
      role="img"
      aria-label={`Skill level ${level} out of 5`}
    >
      <span className="text-xs font-medium text-slate-400">L{level}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-3 w-1.5 rounded-sm transition-colors ${
              i <= level ? 'bg-accent-500' : 'bg-ink-100'
            }`}
          />
        ))}
      </div>
    </span>
  );
}

export function AvailabilityBadge({ status }: { status: Person['availability'] }) {
  const config = {
    available: { label: 'Available', className: 'bg-accent-500/15 text-accent-300' },
    partially: { label: 'Partially', className: 'bg-warning-500/15 text-warning-300' },
    unavailable: { label: 'Unavailable', className: 'bg-ink-100 text-slate-400' },
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
  return <span className="badge bg-ink-100 text-slate-300">{labels[role]}</span>;
}

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const config = {
    proposed: {
      label: 'Proposed',
      className: 'bg-primary-500/15 text-primary-300',
      icon: Clock,
    },
    approved: {
      label: 'Approved',
      className: 'bg-accent-500/15 text-accent-300',
      icon: CheckCircle2,
    },
    overridden: {
      label: 'Overridden',
      className: 'bg-warning-500/15 text-warning-300',
      icon: AlertTriangle,
    },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`badge ${c.className}`}>
      <Icon size={11} className="flex-shrink-0" />
      {c.label}
    </span>
  );
}

export function SkillTag({ skill, matched }: { skill: string; matched?: boolean }) {
  return (
    <span
      className={`badge ${
        matched
          ? 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30'
          : 'bg-ink-100 text-slate-300'
      }`}
    >
      {skill}
    </span>
  );
}
