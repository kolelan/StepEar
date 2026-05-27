export interface StepGroup {
  step: number
  count: number
}

export function groupSteps(steps: number[]): StepGroup[] {
  const counts = new Map<number, number>()
  for (const step of steps) {
    counts.set(step, (counts.get(step) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([step, count]) => ({ step, count }))
}

/** «3 (5), 4 (7)» — ступень и число вопросов. */
export function formatGroupedSteps(steps: number[]): string {
  const groups = groupSteps(steps)
  if (groups.length === 0) return ''
  return groups
    .map(({ step, count }) => (count > 1 ? `${step} (${count})` : String(step)))
    .join(', ')
}
