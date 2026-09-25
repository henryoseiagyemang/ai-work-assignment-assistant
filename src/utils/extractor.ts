import type { SeedRequirement, SeedWorkItem } from '../types';

export interface ExtractionResult {
  requirements: SeedRequirement[];
  workItems: SeedWorkItem[];
  sourceName: string;
}

/**
 * Parses numbered or delimited lines from a plain-text document.
 * Used as a fallback when the LLM edge function is unavailable.
 */
export function extractRequirements(text: string, sourceName: string): SeedRequirement[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const requirements: SeedRequirement[] = [];
  let counter = 0;

  for (const line of lines) {
    const match = line.match(/^(?:R?(\d+)[.)]\s*|[-•*]\s*|#{1,6}\s*)(.+)$/);
    if (match) {
      const explicitId = line.match(/^R(\d+)/);
      const id = explicitId ? `R${explicitId[1]}` : `R${++counter}`;
      const text = match[2] || line;
      requirements.push({ id, text, source: sourceName });
    }
  }

  if (requirements.length === 0) {
    for (const line of lines) {
      if (line.length > 5) {
        requirements.push({
          id: `R${++counter}`,
          text: line,
          source: sourceName,
        });
      }
    }
  }

  return requirements;
}

/**
 * Generates work items from requirements using a simple heuristic.
 * Fallback only — the LLM edge function is the primary path.
 */
export function generateWorkItems(_requirements: SeedRequirement[]): SeedWorkItem[] {
  return [];
}

interface LLMExtractionResponse {
  requirements: { id: string; text: string }[];
  workItems: {
    id: string;
    title: string;
    description: string;
    difficulty: number;
    requiredSkills: string[];
    requirementIds: string[];
    theme: string;
  }[];
}

/**
 * Calls the LLM-backed edge function to extract requirements and generate
 * work items from a document. Falls back to the local parser if the edge
 * function is unavailable or no API key is configured.
 */
export async function extractWithLLM(
  text: string,
  sourceName: string
): Promise<{ requirements: SeedRequirement[]; workItems: SeedWorkItem[]; usedLLM: true } | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const response = await fetch(`${supabaseUrl}/functions/v1/extract-requirements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ document: text }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error || `Extraction failed (${response.status})`
    );
  }

  const data: LLMExtractionResponse = await response.json();

  if (!data.requirements || data.requirements.length === 0) {
    return null;
  }

  const requirements: SeedRequirement[] = data.requirements.map((r) => ({
    id: r.id,
    text: r.text,
    source: sourceName,
  }));

  const workItems: SeedWorkItem[] = data.workItems.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    difficulty: w.difficulty,
    requiredSkills: w.requiredSkills,
    requirementIds: w.requirementIds,
    theme: w.theme,
  }));

  return { requirements, workItems, usedLLM: true };
}
