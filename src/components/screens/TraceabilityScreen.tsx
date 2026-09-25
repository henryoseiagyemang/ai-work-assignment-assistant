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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Traceability Report</h2>
        <p className="mt-1 text-sm text-slate-500">
          See which requirements have work items generated against them — and
          which don't.
        </p>
      </div>

      {/* Uncovered requirements — prominent */}
      <div className="mb-6 overflow-hidden rounded-xl border-2 border-danger-200 bg-danger-50">
        <div className="flex items-center gap-3 border-b border-danger-200 bg-danger-100/60 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-500 text-white">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-danger-800">
              Uncovered Requirements
            </h3>
            <p className="text-sm text-danger-700">
              {uncovered.length === 0
                ? 'All requirements have at least one work item.'
                : `${uncovered.length} requirement${uncovered.length > 1 ? 's' : ''} have no work items generated against them. This should not happen — try re-extracting the document.`}
            </p>
          </div>
        </div>

        {uncovered.length > 0 ? (
          <div className="divide-y divide-danger-100">
            {uncovered.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-danger-100/40"
              >
                <span className="font-mono text-sm font-semibold text-danger-700">
                  {req.id}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{req.text}</p>
                  <p className="mt-1 text-xs text-danger-600">
                    No work items generated for this requirement. Try re-extracting the document.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-accent-500" />
            <p className="text-sm text-slate-600">
              Full coverage — every requirement has at least one work item.
            </p>
          </div>
        )}
      </div>

      {/* Coverage summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Requirements
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {requirements.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Covered
          </p>
          <p className="mt-1 text-2xl font-bold text-accent-600">
            {covered.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Coverage
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {coveragePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Full traceability matrix */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-slate-900">
            Requirement → Work Item Mapping
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
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
                      isCovered ? 'text-primary-600' : 'text-danger-600'
                    }`}
                  >
                    {req.id}
                  </span>
                  <p className="text-sm text-slate-700">{req.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:w-1/2">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-xs"
                      >
                        <Link2 size={12} className="text-primary-500" />
                        <span className="font-mono font-semibold text-primary-700">
                          {item.id}
                        </span>
                        <span className="text-slate-600">{item.title}</span>
                        <DifficultyDots level={item.difficulty} />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs font-medium text-danger-500">
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
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Review & Assign Work Items
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
