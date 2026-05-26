import { getChordMidis } from './scale'
import { getStep8ChordMidis, getStep8RootMidi } from './step8'
import type { ScaleDefinition } from './types'

/** Аккорды закрепления: полная цепочка, настройки ступеней вопросов не ограничивают. */
export function getReinforcementChordMidis(
  scale: ScaleDefinition,
  step: number,
  prevChord: number[] | null,
  motion: 'ascend' | 'descend' | 'free',
): number[] {
  const base = step === 8 ? getStep8ChordMidis(scale) : getChordMidis(scale, step)

  if (!prevChord || motion === 'free') {
    return [...base].sort((a, b) => a - b)
  }

  const prevBass = Math.min(...prevChord)
  const sorted = [...base].sort((a, b) => a - b)
  const baseRoot = sorted[0]!
  const targetRoot = step === 8 ? getStep8RootMidi(scale) : baseRoot
  const intervals = sorted.map((n) => n - baseRoot)

  let newRoot = targetRoot
  if (motion === 'ascend') {
    if (newRoot <= prevBass) newRoot = prevBass + 2
    if (step === 8) newRoot = Math.max(newRoot, getStep8RootMidi(scale))
  } else if (motion === 'descend') {
    if (newRoot >= prevBass) newRoot = prevBass - 2
  }

  return intervals.map((i) => newRoot + i)
}
