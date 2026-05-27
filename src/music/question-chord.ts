import {
  CHORD_INTERVALS,
  DEGREE_QUALITIES,
  MAJOR_KEY_SEVENTH_INTERVALS,
} from './constants'
import {
  normalizeQuestionChordInversion,
  placeQuestionChordFromIntervals,
} from './chord-inversion'
import { getStep8RootMidi } from './step8'
import type { QuestionChordInversion, ScaleDefinition } from './types'

export type QuestionNoteCount = 1 | 2 | 3 | 4

export function clampQuestionNoteCount(value: number): QuestionNoteCount {
  if (value <= 1) return 1
  if (value === 2) return 2
  if (value >= 4) return 4
  return 3
}

function degreeIndexForStep(step: number): number {
  return ((step - 1) % 7 + 7) % 7
}

export function getQuestionIntervals(step: number, noteCount: QuestionNoteCount): number[] {
  const degreeIndex = degreeIndexForStep(step)
  const quality = DEGREE_QUALITIES[degreeIndex]!

  if (noteCount === 4) {
    if (step === 8) return [0, 4, 7, 11]
    return [...MAJOR_KEY_SEVENTH_INTERVALS[degreeIndex]!]
  }

  return CHORD_INTERVALS[quality].slice(0, noteCount)
}

/** Ноты вопроса (не каденция и не закрепление). */
export function getQuestionChordMidis(
  scale: ScaleDefinition,
  step: number,
  noteCount: QuestionNoteCount,
  inversion: QuestionChordInversion = 'root',
): number[] {
  const count = clampQuestionNoteCount(noteCount)
  const degreeIndex = degreeIndexForStep(step)
  const root = step === 8 ? getStep8RootMidi(scale) : scale.degrees[degreeIndex]!
  const intervals = getQuestionIntervals(step, count)
  return placeQuestionChordFromIntervals(
    root,
    intervals,
    normalizeQuestionChordInversion(inversion),
    scale.octaveConfig,
  )
}
