import { Users } from 'lucide-react';
import type { Person } from '../types';
import {
  LevelBar,
  AvailabilityBadge,
  RoleBadge,
  SkillTag,
} from './Badges';

interface PeopleDirectoryProps {
  people: Person[];
  onManageClick?: () => void;
}

export default function PeopleDirectory({ people, onManageClick }: PeopleDirectoryProps) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users size={18} className="text-primary-400" />
        <h3 className="font-semibold text-white">People Directory</h3>
        <span className="badge bg-ink-100 text-slate-300">
          {people.length}
        </span>
      </div>
      <div className="space-y-2">
        {people.map((person) => (
          <div
            key={person.id}
            className="card-hover rounded-lg border border-ink-200 bg-ink-300/60 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                {person.name}
              </span>
              <RoleBadge role={person.role} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <LevelBar level={person.level} />
              <AvailabilityBadge status={person.availability} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {person.skills.map((skill) => (
                <SkillTag key={skill} skill={skill} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {onManageClick && (
        <button
          onClick={onManageClick}
          className="mt-3 w-full rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-2 text-sm font-medium text-primary-300 transition-all hover:bg-primary-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          Manage People
        </button>
      )}
    </div>
  );
}
