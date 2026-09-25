import { supabase } from '../lib/supabase';
import type { Person, Requirement, WorkItem, Assignment, Project } from '../types';
import { assignmentKey } from '../types';
import { computeAllProposals } from '../utils/matchingEngine';
import { seedPeople } from '../data/people';
import { defaultSourceName } from '../data/sampleData';

interface DatabasePerson {
  id: string;
  name: string;
  role: Person['role'];
  skills: string[];
  level: number;
  availability: Person['availability'];
}

interface DatabaseRequirement {
  id: string;
  text: string;
  source: string;
  project_id: string;
}

interface DatabaseWorkItem {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  required_skills: string[];
  requirement_ids: string[];
  theme: string;
  project_id: string;
}

interface DatabaseAssignment {
  id: string;
  work_item_id: string;
  project_id: string;
  proposed_person_id: string | null;
  reason: string;
  status: Assignment['status'];
  final_person_id: string | null;
  overridden_reason: string | null;
}

interface DatabaseProject {
  id: string;
  name: string;
}

export interface AppData {
  people: Person[];
  projects: Project[];
  requirements: Requirement[];
  workItems: WorkItem[];
  assignments: Map<string, Assignment>;
  sourceName: string;
}

export async function loadAppData(): Promise<AppData> {
  const [peopleRes, projectsRes, reqRes, workItemsRes, assignmentsRes] = await Promise.all([
    supabase.from('people').select('*').order('id'),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('requirements').select('*').order('id'),
    supabase.from('work_items').select('*').order('id'),
    supabase.from('assignments').select('*').order('work_item_id'),
  ]);

  const errors = [peopleRes.error, projectsRes.error, reqRes.error, workItemsRes.error, assignmentsRes.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(`Failed to load data: ${errors.map((e) => e!.message).join(', ')}`);
  }

  let people: Person[] = (peopleRes.data as DatabasePerson[] ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    skills: p.skills,
    level: p.level,
    availability: p.availability,
  }));

  if (people.length === 0) {
    const seedRows = seedPeople.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      skills: p.skills,
      level: p.level,
      availability: p.availability,
    }));
    const { error: seedErr } = await supabase.from('people').insert(seedRows);
    if (seedErr) throw new Error(`Failed to seed people: ${seedErr.message}`);
    people = seedPeople;
  }

  const projects: Project[] = (projectsRes.data as DatabaseProject[] ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const requirements: Requirement[] = (reqRes.data as DatabaseRequirement[] ?? []).map((r) => ({
    id: r.id,
    text: r.text,
    source: r.source,
    projectId: r.project_id,
  }));

  const workItems: WorkItem[] = (workItemsRes.data as DatabaseWorkItem[] ?? []).map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    difficulty: w.difficulty,
    requiredSkills: w.required_skills,
    requirementIds: w.requirement_ids,
    theme: w.theme,
    projectId: w.project_id,
  }));

  const assignments = new Map<string, Assignment>();
  for (const a of (assignmentsRes.data as DatabaseAssignment[] ?? [])) {
    assignments.set(assignmentKey(a.project_id, a.work_item_id), {
      workItemId: a.work_item_id,
      projectId: a.project_id,
      proposedPersonId: a.proposed_person_id,
      reason: a.reason,
      status: a.status,
      finalPersonId: a.final_person_id,
      overriddenReason: a.overridden_reason ?? undefined,
    });
  }

  const sourceName = requirements.length > 0 ? requirements[0].source : defaultSourceName;

  return { people, projects, requirements, workItems, assignments, sourceName };
}

export async function createProject(name: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(`Failed to create project: ${error.message}`);

  const p = data as DatabaseProject;
  return { id: p.id, name: p.name };
}

export async function renameProject(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ name }).eq('id', id);
  if (error) throw new Error(`Failed to rename project: ${error.message}`);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete project: ${error.message}`);
}

export async function loadDocument(
  sourceName: string,
  requirements: Requirement[],
  workItems: WorkItem[],
  people: Person[],
  projectId: string
): Promise<Map<string, Assignment>> {
  // Delete existing work items for this project (cascades to assignments),
  // then delete requirements, then insert new ones.
  const { error: delWorkItems } = await supabase
    .from('work_items')
    .delete()
    .eq('project_id', projectId);
  if (delWorkItems) throw new Error(`Failed to clear work items: ${delWorkItems.message}`);

  const { error: delReqs } = await supabase
    .from('requirements')
    .delete()
    .eq('project_id', projectId);
  if (delReqs) throw new Error(`Failed to clear requirements: ${delReqs.message}`);

  // Insert new requirements
  if (requirements.length > 0) {
    const { error: insReqs } = await supabase.from('requirements').insert(
      requirements.map((r) => ({
        id: r.id,
        text: r.text,
        source: r.source,
        project_id: projectId,
      }))
    );
    if (insReqs) throw new Error(`Failed to insert requirements: ${insReqs.message}`);
  }

  // Insert new work items
  if (workItems.length > 0) {
    const { error: insItems } = await supabase.from('work_items').insert(
      workItems.map((w) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        difficulty: w.difficulty,
        required_skills: w.requiredSkills,
        requirement_ids: w.requirementIds,
        theme: w.theme,
        project_id: projectId,
      }))
    );
    if (insItems) throw new Error(`Failed to insert work items: ${insItems.message}`);
  }

  // Compute and insert assignments
  const proposals = computeAllProposals(workItems, people);
  const assignmentRows = Array.from(proposals.values()).map((a) => ({
    work_item_id: a.workItemId,
    project_id: projectId,
    proposed_person_id: a.proposedPersonId,
    reason: a.reason,
    status: a.status,
    final_person_id: a.finalPersonId,
  }));

  if (assignmentRows.length > 0) {
    const { error: insAssignments } = await supabase.from('assignments').insert(assignmentRows);
    if (insAssignments) throw new Error(`Failed to insert assignments: ${insAssignments.message}`);
  }

  return proposals;
}

export async function updateAssignmentStatus(
  projectId: string,
  workItemId: string,
  status: Assignment['status'],
  finalPersonId: string | null,
  overriddenReason?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    final_person_id: finalPersonId,
    updated_at: new Date().toISOString(),
  };
  if (overriddenReason !== undefined) {
    update.overridden_reason = overriddenReason;
  }

  const { error } = await supabase
    .from('assignments')
    .update(update)
    .eq('project_id', projectId)
    .eq('work_item_id', workItemId);

  if (error) throw new Error(`Failed to update assignment: ${error.message}`);
}

export async function createPerson(person: Omit<Person, 'id'> & { id?: string }): Promise<Person> {
  const id = person.id ?? `P${Date.now()}`;
  const row = {
    id,
    name: person.name,
    role: person.role,
    skills: person.skills,
    level: person.level,
    availability: person.availability,
  };

  const { data, error } = await supabase.from('people').insert(row).select().single();
  if (error) throw new Error(`Failed to create person: ${error.message}`);

  const dbPerson = data as DatabasePerson;
  return {
    id: dbPerson.id,
    name: dbPerson.name,
    role: dbPerson.role,
    skills: dbPerson.skills,
    level: dbPerson.level,
    availability: dbPerson.availability,
  };
}

export async function updatePerson(id: string, updates: Partial<Omit<Person, 'id'>>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.role !== undefined) row.role = updates.role;
  if (updates.skills !== undefined) row.skills = updates.skills;
  if (updates.level !== undefined) row.level = updates.level;
  if (updates.availability !== undefined) row.availability = updates.availability;

  const { error } = await supabase.from('people').update(row).eq('id', id);
  if (error) throw new Error(`Failed to update person: ${error.message}`);
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete person: ${error.message}`);
}

export { seedPeople };
