import { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText } from 'lucide-react';
import type { Requirement, WorkItem, Assignment, Person, Project, SeedRequirement, SeedWorkItem } from './types';
import { assignmentKey } from './types';
import { seedPeople } from './data/people';
import Header, { type Screen } from './components/Header';
import DocumentScreen from './components/screens/DocumentScreen';
import TraceabilityScreen from './components/screens/TraceabilityScreen';
import ReviewScreen from './components/screens/ReviewScreen';
import PeopleScreen from './components/screens/PeopleScreen';
import PeopleDirectory from './components/PeopleDirectory';
import {
  loadAppData,
  loadDocument,
  updateAssignmentStatus,
  createPerson,
  updatePerson,
  deletePerson,
  createProject,
  deleteProject,
} from './lib/database';

function App() {
  const [screen, setScreen] = useState<Screen>('document');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [people, setPeople] = useState<Person[]>(seedPeople);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('Untitled Document');
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [allWorkItems, setAllWorkItems] = useState<WorkItem[]>([]);
  const [allAssignments, setAllAssignments] = useState<Map<string, Assignment>>(
    new Map()
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAppData();
        if (cancelled) return;
        setPeople(data.people.length > 0 ? data.people : seedPeople);
        setProjects(data.projects);
        setAllRequirements(data.requirements);
        setAllWorkItems(data.workItems);
        setAllAssignments(data.assignments);
        setSourceName(data.sourceName);
        if (data.projects.length > 0) {
          setSelectedProjectId(data.projects[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter by selected project
  const requirements = useMemo(
    () =>
      selectedProjectId
        ? allRequirements.filter((r) => r.projectId === selectedProjectId)
        : [],
    [allRequirements, selectedProjectId]
  );

  const workItems = useMemo(
    () =>
      selectedProjectId
        ? allWorkItems.filter((w) => w.projectId === selectedProjectId)
        : [],
    [allWorkItems, selectedProjectId]
  );

  const assignments = useMemo(() => {
    const filtered = new Map<string, Assignment>();
    if (!selectedProjectId) return filtered;
    for (const [key, val] of allAssignments) {
      if (val.projectId === selectedProjectId) {
        filtered.set(key, val);
      }
    }
    return filtered;
  }, [allAssignments, selectedProjectId]);

  const hasData = requirements.length > 0 && workItems.length > 0;

  const selectedProjectName = useMemo(
    () => projects.find((p) => p.id === selectedProjectId)?.name ?? null,
    [projects, selectedProjectId]
  );

  const handleLoadDocument = useCallback(
    async (src: string, reqs: SeedRequirement[], items: SeedWorkItem[]) => {
      if (!selectedProjectId) {
        setLoadError('Please create or select a project first.');
        return;
      }
      setSaving(true);
      try {
        const taggedReqs = reqs.map((r) => ({ ...r, projectId: selectedProjectId }));
        const taggedItems = items.map((w) => ({ ...w, projectId: selectedProjectId }));
        const proposals = await loadDocument(src, taggedReqs, taggedItems, people, selectedProjectId);
        setSourceName(src);
        setAllRequirements((prev) => [
          ...prev.filter((r) => r.projectId !== selectedProjectId),
          ...taggedReqs,
        ]);
        setAllWorkItems((prev) => [
          ...prev.filter((w) => w.projectId !== selectedProjectId),
          ...taggedItems,
        ]);
        setAllAssignments((prev) => {
          const next = new Map(prev);
          for (const key of next.keys()) {
            if (key.startsWith(`${selectedProjectId}:`)) {
              next.delete(key);
            }
          }
          for (const [key, val] of proposals) {
            next.set(key, val);
          }
          return next;
        });
        setScreen('traceability');
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setSaving(false);
      }
    },
    [people, selectedProjectId]
  );

  const handleApprove = useCallback(
    async (workItemId: string) => {
      if (!selectedProjectId) return;
      const key = assignmentKey(selectedProjectId, workItemId);
      const current = assignments.get(key);
      if (!current) return;

      setAllAssignments((prev) => {
        const next = new Map(prev);
        next.set(key, {
          ...current,
          status: 'approved',
          finalPersonId: current.proposedPersonId,
        });
        return next;
      });

      try {
        await updateAssignmentStatus(
          selectedProjectId,
          workItemId,
          'approved',
          current.proposedPersonId
        );
      } catch {
        setAllAssignments((prev) => {
          const next = new Map(prev);
          next.set(key, current);
          return next;
        });
      }
    },
    [assignments, selectedProjectId]
  );

  const handleOverride = useCallback(
    async (workItemId: string, newPersonId: string, reason: string) => {
      if (!selectedProjectId) return;
      const key = assignmentKey(selectedProjectId, workItemId);
      const current = assignments.get(key);
      if (!current) return;

      const updated: Assignment = {
        ...current,
        status: 'overridden',
        finalPersonId: newPersonId,
        overriddenReason: reason,
      };

      setAllAssignments((prev) => {
        const next = new Map(prev);
        next.set(key, updated);
        return next;
      });

      try {
        await updateAssignmentStatus(
          selectedProjectId,
          workItemId,
          'overridden',
          newPersonId,
          reason
        );
      } catch {
        setAllAssignments((prev) => {
          const next = new Map(prev);
          next.set(key, current);
          return next;
        });
      }
    },
    [assignments, selectedProjectId]
  );

  const handleAddPerson = useCallback(
    async (person: Omit<Person, 'id'> & { id?: string }) => {
      const created = await createPerson(person);
      setPeople((prev) => [...prev, created]);
    },
    []
  );

  const handleUpdatePerson = useCallback(
    async (id: string, updates: Partial<Omit<Person, 'id'>>) => {
      await updatePerson(id, updates);
      setPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const handleDeletePerson = useCallback(async (id: string) => {
    await deletePerson(id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleCreateProject = useCallback(async (name: string) => {
    try {
      const project = await createProject(name);
      setProjects((prev) => [project, ...prev]);
      setSelectedProjectId(project.id);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to create project');
    }
  }, []);

  const handleDeleteProject = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        await deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setAllRequirements((prev) => prev.filter((r) => r.projectId !== id));
        setAllWorkItems((prev) => prev.filter((w) => w.projectId !== id));
        setAllAssignments((prev) => {
          const next = new Map(prev);
          for (const key of next.keys()) {
            if (key.startsWith(`${id}:`)) {
              next.delete(key);
            }
          }
          return next;
        });
        setSelectedProjectId((prev) => {
          const remaining = projects.filter((p) => p.id !== id);
          return remaining.length > 0 ? remaining[0].id : null;
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to delete project');
      } finally {
        setSaving(false);
      }
    },
    [projects, allWorkItems]
  );

  const uncoveredCount = useMemo(
    () =>
      requirements.filter(
        (req) => !workItems.some((wi) => wi.requirementIds.includes(req.id))
      ).length,
    [requirements, workItems]
  );

  const pendingReviewCount = useMemo(
    () =>
      Array.from(assignments.values()).filter(
        (a) => a.status === 'proposed'
      ).length,
    [assignments]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-500">
        <div className="animate-fade-in text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink-200 border-t-primary-500" />
          <p className="mt-4 text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-500">
      <Header
        active={screen}
        onNavigate={setScreen}
        requirementCount={requirements.length}
        workItemCount={workItems.length}
        uncoveredCount={uncoveredCount}
        pendingReviewCount={pendingReviewCount}
        peopleCount={people.length}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
      />

      {loadError && (
        <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-300">
          {loadError}
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 z-50 flex animate-slide-up items-center gap-2 rounded-lg bg-ink-300 px-4 py-2 text-sm text-white shadow-lg shadow-black/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Saving...
        </div>
      )}

      {screen === 'document' && (
        <div key="screen-document" className="animate-fade-in grid gap-6 lg:grid-cols-[1fr_320px]">
          <DocumentScreen
            sourceName={sourceName}
            requirements={requirements}
            workItems={workItems}
            onLoadDocument={handleLoadDocument}
            onProceedToTraceability={() => setScreen('traceability')}
            hasData={hasData}
            selectedProjectName={selectedProjectName}
          />
          <div className="hidden p-4 pt-8 lg:block">
            <PeopleDirectory people={people} onManageClick={() => setScreen('people')} />
          </div>
        </div>
      )}

      {screen === 'traceability' && hasData && (
        <div key="screen-traceability" className="animate-fade-in">
        <TraceabilityScreen
          requirements={requirements}
          workItems={workItems}
          onProceedToReview={() => setScreen('review')}
        />
        </div>
      )}

      {screen === 'review' && hasData && (
        <div key="screen-review" className="animate-fade-in grid gap-6 lg:grid-cols-[1fr_300px]">
          <ReviewScreen
            workItems={workItems}
            requirements={requirements}
            people={people}
            assignments={assignments}
            projectId={selectedProjectId ?? ''}
            onApprove={handleApprove}
            onOverride={handleOverride}
          />
          <div className="hidden p-4 pt-8 lg:block">
            <PeopleDirectory people={people} onManageClick={() => setScreen('people')} />
          </div>
        </div>
      )}

      {screen === 'people' && (
        <div key="screen-people" className="animate-fade-in">
        <PeopleScreen
          people={people}
          onAdd={handleAddPerson}
          onUpdate={handleUpdatePerson}
          onDelete={handleDeletePerson}
        />
        </div>
      )}

      {/* Empty state for traceability/review when no data */}
      {(screen === 'traceability' || screen === 'review') && !hasData && (
        <div className="animate-fade-in mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-200 bg-ink-400 shadow-lg shadow-black/20">
            <FileText size={32} className="text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-200">
            {selectedProjectId
              ? 'No document loaded for this project yet'
              : 'No project selected'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {selectedProjectId
              ? 'Go to the Document tab to load the sample or paste your own requirements.'
              : 'Create or select a project from the header to get started.'}
          </p>
          <button
            onClick={() => setScreen('document')}
            className="btn-primary mt-5"
          >
            Go to Document
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
