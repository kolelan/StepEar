import type { ReinforcementNoteCount } from './types'

export function clampReinforcementNoteCount(value: number): ReinforcementNoteCount {
  if (value <= 1) return 1
  if (value === 2) return 2
  return 3
}

/** Оставляет корень (бас), при 2 — корень и терцию, при 3 — полное трезвучие. */
export function sliceChordToReinforcementCount(
  notes: number[],
  noteCount: ReinforcementNoteCount,
): number[] {
  const sorted = [...notes].sort((a, b) => a - b)
  if (noteCount === 1) return [sorted[0]!]
  if (noteCount === 2) return sorted.slice(0, 2)
  return sorted
}
