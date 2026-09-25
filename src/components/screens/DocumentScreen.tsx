import { useState } from 'react';
import { Upload, FileText, Sparkles, Info, Loader2, AlertCircle } from 'lucide-react';
import type { SeedRequirement, SeedWorkItem } from '../../types';
import { extractRequirements, extractWithLLM, generateWorkItems } from '../../utils/extractor';

interface DocumentScreenProps {
  sourceName: string;
  requirements: SeedRequirement[];
  workItems: SeedWorkItem[];
  onLoadDocument: (
    sourceName: string,
    requirements: SeedRequirement[],
    workItems: SeedWorkItem[]
  ) => void;
  onProceedToTraceability: () => void;
  hasData: boolean;
  selectedProjectName: string | null;
}

export default function DocumentScreen({
  sourceName,
  requirements,
  workItems,
  onLoadDocument,
  onProceedToTraceability,
  hasData,
  selectedProjectName,
}: DocumentScreenProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [extracted, setExtracted] = useState<{
    reqs: SeedRequirement[];
    items: SeedWorkItem[];
    source: string;
    usedLLM: boolean;
  } | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const handleExtract = async () => {
    const source = fileName || 'Pasted document';
    setExtracting(true);
    setExtractError(null);
    setUsedFallback(false);

    try {
      const llmResult = await extractWithLLM(text, source);

      if (llmResult && llmResult.requirements.length > 0) {
        setExtracted({
          reqs: llmResult.requirements,
          items: llmResult.workItems,
          source,
          usedLLM: true,
        });
      } else {
        // Fall back to local parser
        const reqs = extractRequirements(text, source);
        if (reqs.length === 0) {
          setExtractError(
            'No requirements found. Make sure your document has numbered lines (e.g. "1. The system must...") or clearly delimited items.'
          );
          setExtracted(null);
          return;
        }
        setUsedFallback(true);
        setExtracted({ reqs, items: generateWorkItems(reqs), source, usedLLM: false });
      }
    } catch (err) {
      // Fall back to local parser on LLM error
      const reqs = extractRequirements(text, source);
      if (reqs.length > 0) {
        setUsedFallback(true);
        setExtracted({ reqs, items: generateWorkItems(reqs), source, usedLLM: false });
      } else {
        setExtractError(
          err instanceof Error
            ? `AI extraction failed: ${err.message}. The fallback parser also found no numbered requirements — try pasting text with numbered lines (e.g. "1. The system must...").`
            : 'Extraction failed. Try pasting text with numbered lines (e.g. "1. The system must...").'
        );
        setExtracted(null);
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleLoadExtracted = () => {
    if (extracted) {
      onLoadDocument(
        extracted.source,
        extracted.reqs,
        extracted.items
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setText(content);
      }
    };
    reader.readAsText(file);
  };

  const currentReqs = extracted?.reqs ?? requirements;
  const currentSource = extracted?.source ?? sourceName;
  const currentItems = extracted?.items.length ? extracted.items : workItems;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {!selectedProjectName && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-sm text-warning-300">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            No project selected. Create or select a project from the header
            before loading a document.
          </span>
        </div>
      )}

      {/* Hero */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Document to Work Items</h2>
        <p className="mt-1 text-sm text-slate-400">
          Paste a requirements document or upload a .txt file. The AI
          extracts requirements and generates work items tagged with difficulty,
          required skills, and source requirement IDs.
        </p>
        {selectedProjectName && (
          <p className="mt-2 text-sm font-medium text-primary-400">
            Loading into project: {selectedProjectName}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input panel */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary-400" />
            <h3 className="font-semibold text-white">Input Document</h3>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your numbered requirements here, e.g.&#10;1. The system must...&#10;2. Users should be able to...&#10;3. ..."
            className="h-64 w-full resize-none rounded-lg border border-ink-200 bg-ink-500 p-3 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleExtract}
              disabled={!text.trim() || extracting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-medium text-ink-700 transition-all hover:from-primary-400 hover:to-primary-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50"
            >
              {extracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Extracting with AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Extract with AI
                </>
              )}
            </button>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-ink-300 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-ink-200">
              <Upload size={16} />
              Upload .txt
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

          </div>

          {fileName && (
            <p className="mt-2 text-xs text-slate-500">
              Uploaded file: <span className="font-medium text-slate-400">{fileName}</span>
            </p>
          )}

          {usedFallback && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 px-3 py-2 text-sm text-warning-300">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                AI extraction unavailable — used the built-in text parser instead.
                A default work item was generated for each requirement. Add a Groq
                API key to enable AI-powered extraction with smarter work item grouping.
              </span>
            </div>
          )}

          {extractError && (
            <div className="mt-3 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm text-danger-300">
              {extractError}
            </div>
          )}
        </div>

        {/* Extraction info */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Info size={18} className="text-slate-500" />
            <h3 className="font-semibold text-white">How It Works</h3>
          </div>
          <ol className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-400">
                1
              </span>
              <span>
                Paste or upload a plain-text document with numbered or delimited
                requirements.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-400">
                2
              </span>
              <span>
                An open-source AI model extracts each requirement as a
                traceable line (R1, R2, ...) with its source document name.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-400">
                3
              </span>
              <span>
                The AI generates work items from requirements, each tagged with
                difficulty (1-5), required skills, and a theme grouping.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-semibold text-primary-400">
                4
              </span>
              <span>
                The matching engine proposes an assignee for each work item
                using transparent rules with visible reasoning.
              </span>
            </li>
          </ol>

        </div>
      </div>

      {/* Extracted preview */}
      {currentReqs.length > 0 && (
        <div className="mt-6 card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              Extracted Requirements
              <span className="ml-2 text-sm font-normal text-slate-500">
                from "{currentSource}"
              </span>
              {extracted?.usedLLM && (
                <span className="ml-2 badge bg-primary-500/15 text-primary-300">
                  AI-extracted
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <span className="badge bg-primary-500/15 text-primary-300">
                {currentReqs.length} requirements
              </span>
              <span className="badge bg-accent-500/15 text-accent-300">
                {currentItems.length} work items
              </span>
            </div>
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {currentReqs.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 rounded-lg bg-ink-300/60 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs font-semibold text-primary-400">
                  {req.id}
                </span>
                <span className="text-slate-300">{req.text}</span>
              </div>
            ))}
          </div>

          {extracted && extracted.items.length > 0 && (
            <div className="mt-4 border-t border-ink-200 pt-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-300">
                Generated Work Items
              </h4>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {extracted.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg bg-primary-500/10 px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs font-semibold text-primary-400">
                      {item.id}
                    </span>
                    <div className="flex-1">
                      <span className="text-slate-300">{item.title}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        Difficulty {item.difficulty} · {item.theme}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {extracted ? (
            <button
              onClick={handleLoadExtracted}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-400"
            >
              Load {extracted.reqs.length} requirements into tool
              <span aria-hidden>→</span>
            </button>
          ) : (
            <button
              onClick={onProceedToTraceability}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-400"
            >
              Continue to Traceability
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
