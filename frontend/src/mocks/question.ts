import type { PublicQuestion } from '../types/contracts'

/** Offline mock used until /api/session/start is wired up (D3). */
export const mockQuestion: PublicQuestion = {
  id: 'mock-hash-001',
  seed: 0,
  skill_tags: ['hashing', 'edge-cases'],
  difficulty: 1,
  title: 'First unique character',
  statement:
    'Given a string s, return the index of the first character that appears exactly once in s. ' +
    'If every character repeats, return -1. Aim for a solution that is linear in the length of s.',
  function_signature: 'def first_unique_index(s: str) -> int:',
  example_tests: [
    { input: 'leetcode', expected: 0 },
    { input: 'aabbcd', expected: 4 },
    { input: 'aabb', expected: -1 },
  ],
  hint_policy: 'lookup-anytime; hint-and-plan-after-first-attempt',
  max_points: 100,
}

export function starterCode(q: PublicQuestion): string {
  return `${q.function_signature}\n    # Your code here\n    pass\n`
}
