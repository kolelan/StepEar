/** Случайная последовательность ступеней из пула (повторы разрешены). */
export function buildRandomDictationSequence(pool: number[], length: number): number[] {
  if (pool.length === 0 || length < 1) return []
  const seq: number[] = []
  for (let i = 0; i < length; i++) {
    seq.push(pool[Math.floor(Math.random() * pool.length)]!)
  }
  return seq
}

export function dictationSequencesMatch(expected: number[], user: number[]): boolean {
  if (expected.length !== user.length) return false
  return expected.every((step, i) => step === user[i])
}

export function dictationSlotResults(
  expected: number[],
  user: number[],
): Array<'correct' | 'wrong'> {
  return expected.map((step, i) => (step === user[i] ? 'correct' : 'wrong'))
}
