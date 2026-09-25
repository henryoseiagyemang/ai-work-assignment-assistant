import { AlertTriangle, CheckCircle2, Link2, ArrowRight } from 'lucide-react';
import type { Requirement, WorkItem } from '../../types';
import { DifficultyDots } from '../Badges';

interface TraceabilityScreenProps {
  requirements: Requirement[];
  workItems: WorkItem[];
  onProceedToReview: () => void;
}

export default function TraceabilityScreen({
  requirements,
  workItems,
  onProceedToReview,
}: TraceabilityScreenProps) {
  const uncovered = requirements.filter(
    (req) => !workItems.some((wi) => wi.requirementIds.includes(req.id))
  );
  const covered = requirements.filter((req) =>
    workItems.some((wi) => wi.requirementIds.includes(req.id))
  );
  const coveragePct =
    requirements.length > 0
      ? Math.round((covered.length / requirements.length) * 100)
      : 0;

  const itemsForReq = (reqId: string) =>
    workItems.filter((wi) => wi.requirementIds.includes(reqId));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Traceability Report</h2>
        <p className="mt-1 text-sm text-slate-400">
          See which requirements have work items generated against them — and
          which don't.
        </p>
      </div>

      {/* Uncovered requirements — prominent */}
      <div className="mb-6 overflow-hidden rounded-xl border border-danger-500/30 bg-danger-500/10">
        <div className="flex items-center gap-3 border-b border-danger-500/20 bg-danger-500/15 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-500/80 text-white">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-danger-300">
              Uncovered Requirements
            </h3>
            <p className="text-sm text-danger-300/80">
              {uncovered.length === 0
                ? 'All requirements have at least one work item.'
                : `${uncovered.length} requirement${uncovered.length > 1 ? 's' : ''} have no work items generated against them. This should not happen — try re-extracting the document.`}
            </p>
          </div>
        </div>

        {uncovered.length > 0 ? (
          <div className="divide-y divide-danger-500/10">
            {uncovered.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-danger-500/5"
              >
                <span className="font-mono text-sm font-semibold text-danger-300">
                  {req.id}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{req.text}</p>
                  <p className="mt-1 text-xs text-danger-400">
                    No work items generated for this requirement. Try re-extracting the document.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-accent-400" />
            <p className="text-sm text-slate-400">
              Full coverage — every requirement has at least one work item.
            </p>
          </div>
        )}
      </div>

      {/* Coverage summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card-sm p-4 card-hover">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total Requirements
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {requirements.length}
          </p>
        </div>
        <div className="card-sm p-4 card-hover">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Covered
          </p>
          <p className="mt-1 text-2xl font-bold text-accent-400">
            {covered.length}
          </p>
        </div>
        <div className="card-sm p-4 card-hover">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Coverage
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-300">
              {coveragePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Full traceability matrix */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3">
          <h3 className="font-semibold text-white">
            Requirement → Work Item Mapping
          </h3>
        </div>
        <div className="divide-y divide-ink-100">
          {requirements.map((req) => {
            const items = itemsForReq(req.id);
            const isCovered = items.length > 0;
            return (
              <div
                key={req.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="flex items-start gap-2 sm:w-1/2">
                  <span
                    className={`font-mono text-sm font-semibold ${
                      isCovered ? 'text-primary-400' : 'text-danger-400'
                    }`}
                  >
                    {req.id}
                  </span>
                  <p className="text-sm text-slate-300">{req.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:w-1/2">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg bg-primary-500/10 px-3 py-1.5 text-xs"
                      >
                        <Link2 size={12} className="text-primary-400" />
                        <span className="font-mono font-semibold text-primary-300">
                          {item.id}
                        </span>
                        <span className="text-slate-400">{item.title}</span>
                        <DifficultyDots level={item.difficulty} />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs font-medium text-danger-400">
                      No work items
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onProceedToReview}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-ink-700 transition-all hover:bg-primary-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          Review & Assign Work Items
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
