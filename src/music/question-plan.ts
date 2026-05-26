/** План вопросов: примерно равное число каждой ступени, порядок перемешан. */
export function buildBalancedQuestionPlan(steps: number[], total: number): number[] {
  if (steps.length === 0 || total <= 0) return []
  const counts = new Map<number, number>()
  for (const s of steps) counts.set(s, 0)

  const plan: number[] = []
  for (let i = 0; i < total; i++) {
    let minCount = Infinity
    for (const s of steps) {
      minCount = Math.min(minCount, counts.get(s)!)
    }
    const pool = steps.filter((s) => counts.get(s) === minCount)
    const pick = pool[Math.floor(Math.random() * pool.length)]!
    plan.push(pick)
    counts.set(pick, counts.get(pick)! + 1)
  }

  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[plan[i], plan[j]] = [plan[j]!, plan[i]!]
  }
  return plan
}

export function pickRandomQuestionStep(steps: number[]): number {
  return steps[Math.floor(Math.random() * steps.length)]!
}
