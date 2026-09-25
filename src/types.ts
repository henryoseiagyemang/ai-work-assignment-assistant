export type Role = 'employee' | 'contractor' | 'freelancer';
export type Availability = 'available' | 'partially' | 'unavailable';
export type AssignmentStatus = 'proposed' | 'approved' | 'overridden';

export interface Project {
  id: string;
  name: string;
}

export interface Requirement {
  id: string;
  text: string;
  source: string;
  projectId: string;
}

export type SeedRequirement = Omit<Requirement, 'projectId'>;

export interface Person {
  id: string;
  name: string;
  role: Role;
  skills: string[];
  level: number; // 1-5
  availability: Availability;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  difficulty: number; // 1-5
  requiredSkills: string[];
  requirementIds: string[];
  theme: string;
  projectId: string;
}

export type SeedWorkItem = Omit<WorkItem, 'projectId'>;

export interface Assignment {
  workItemId: string;
  projectId: string;
  proposedPersonId: string | null;
  reason: string;
  status: AssignmentStatus;
  finalPersonId: string | null;
  overriddenReason?: string;
}

export function assignmentKey(projectId: string, workItemId: string): string {
  return `${projectId}:${workItemId}`;
}
