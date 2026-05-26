import { CHORD_INTERVALS, DEGREE_QUALITIES } from './constants'
import { getEnabledRanges, placeChordFromDegree } from './octaves'
import type { ScaleDefinition } from './types'

/** Корень 8-й ступени — тоника на октаву выше (не путать с 1-й). */
export function getStep8RootMidi(scale: ScaleDefinition): number {
  return scale.degrees[0]! + 12
}

export function getStep8ChordMidis(scale: ScaleDefinition): number[] {
  const root = getStep8RootMidi(scale)
  const quality = DEGREE_QUALITIES[0]!
  const ranges = getEnabledRanges(scale.octaveConfig)
  const placed = placeChordFromDegree(root, quality, ranges)
  if (placed) return placed
  return CHORD_INTERVALS[quality].map((i) => root + i)
}
