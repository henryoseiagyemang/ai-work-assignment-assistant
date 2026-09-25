import type { Person, WorkItem, Assignment } from '../types';

interface CandidateScore {
  person: Person;
  skillMatches: string[];
  meetsLevel: boolean;
  availabilityRank: number; // 0 = available, 1 = partially, 2 = unavailable
}

/**
 * Compute a proposed assignment for a single work item.
 *
 * Transparent rule:
 * 1. Filter people who have AT LEAST ONE required skill.
 * 2. Prefer people whose level >= item difficulty.
 * 3. Prefer fully available over partially available.
 * 4. Exclude unavailable people.
 *
 * If nobody has the skill, return "No suitable match".
 * If only available people are below difficulty, return "No suitable match" with explanation.
 * If two candidates are equally good, pick the first and note the tie.
 */
export function computeProposal(
  item: WorkItem,
  people: Person[]
): Assignment {
  const requiredSkills = item.requiredSkills;
  const projectId = item.projectId;

  // Step 1: filter by skill overlap
  const candidates: CandidateScore[] = people
    .map((person) => {
      const skillMatches = requiredSkills.filter((s) =>
        person.skills.includes(s)
      );
      return {
        person,
        skillMatches,
        meetsLevel: person.level >= item.difficulty,
        availabilityRank:
          person.availability === 'available'
            ? 0
            : person.availability === 'partially'
              ? 1
              : 2,
      };
    })
    .filter((c) => c.skillMatches.length > 0);

  if (candidates.length === 0) {
    return {
      workItemId: item.id,
      projectId,
      proposedPersonId: null,
      reason: `No one in the directory has the required skill${requiredSkills.length > 1 ? 's' : ''} (${requiredSkills.join(', ')}).`,
      status: 'proposed',
      finalPersonId: null,
    };
  }

  // Step 2: exclude unavailable people
  const availableCandidates = candidates.filter(
    (c) => c.availabilityRank < 2
  );

  if (availableCandidates.length === 0) {
    const skilledNames = candidates.map((c) => c.person.name).join(', ');
    return {
      workItemId: item.id,
      projectId,
      proposedPersonId: null,
      reason: `${skilledNames} ${candidates.length === 1 ? 'has' : 'have'} the required skill${requiredSkills.length > 1 ? 's' : ''} (${requiredSkills.join(', ')}) but ${candidates.length === 1 ? 'is' : 'are all'} currently unavailable.`,
      status: 'proposed',
      finalPersonId: null,
    };
  }

  // Step 3: prefer people who meet the difficulty level
  const meetsLevel = availableCandidates.filter((c) => c.meetsLevel);

  const pool = meetsLevel.length > 0 ? meetsLevel : availableCandidates;

  // Step 4: prefer fully available over partially available
  const fullyAvailable = pool.filter(
    (c) => c.availabilityRank === 0
  );

  const finalPool = fullyAvailable.length > 0 ? fullyAvailable : pool;

  // Check if we fell back to below-level candidates
  const fellBackToBelowLevel = meetsLevel.length === 0;

  // Pick the first candidate (stable order from seed data)
  const best = finalPool[0];

  // Check for ties: same skill match count, same level, same availability
  const ties = finalPool.filter(
    (c) =>
      c.person.id !== best.person.id &&
      c.skillMatches.length === best.skillMatches.length &&
      c.person.level === best.person.level &&
      c.availabilityRank === best.availabilityRank
  );

  const availLabel =
    best.person.availability === 'available'
      ? 'fully available'
      : 'partially available';

  const skillPhrase = `has required skill${best.skillMatches.length > 1 ? 's' : ''} '${best.skillMatches.join("', '")}'`;

  let reason: string;

  if (fellBackToBelowLevel) {
    reason = `Proposed ${best.person.name} — ${skillPhrase}, but level ${best.person.level} is below difficulty ${item.difficulty}. ${best.person.availability === 'available' ? 'Fully' : 'Partially'} available; this is the closest available match.`;
  } else {
    reason = `Proposed ${best.person.name} — ${skillPhrase}, level ${best.person.level} vs difficulty ${item.difficulty}, ${availLabel}.`;

    if (ties.length > 0) {
      const tieNames = ties.map((t) => t.person.name).join(', ');
      reason += ` ${tieNames} ${ties.length === 1 ? 'is' : 'are'} an equally good fit (same skill match, same level).`;
    }
  }

  return {
    workItemId: item.id,
    projectId,
    proposedPersonId: best.person.id,
    reason,
    status: 'proposed',
    finalPersonId: best.person.id,
  };
}

export function computeAllProposals(
  items: WorkItem[],
  people: Person[]
): Map<string, Assignment> {
  const map = new Map<string, Assignment>();
  for (const item of items) {
    map.set(item.id, computeProposal(item, people));
  }
  return map;
}
