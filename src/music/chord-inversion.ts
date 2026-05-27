import {
  getEnabledRanges,
  isMidiInRanges,
  placeBelowVoice,
  placeChordFromIntervals,
  placeUpperVoice,
  type MidiRange,
} from './octaves'
import type { OctaveConfig, QuestionChordInversion } from './types'

export function normalizeQuestionChordInversion(
  value: unknown,
): QuestionChordInversion {
  if (value === 'first' || value === 'second') return value
  return 'root'
}

export function inversionIndexToMode(
  inversion: 0 | 1 | 2,
): QuestionChordInversion {
  if (inversion === 1) return 'first'
  if (inversion === 2) return 'second'
  return 'root'
}

/** Порядок интервалов от баса к верху: 1-е обращение — главная (0) сверху. */
export function intervalOrderForInversion(
  intervalCount: number,
  inversion: QuestionChordInversion,
): number[] {
  const base = Array.from({ length: intervalCount }, (_, i) => i)
  if (inversion === 'root' || intervalCount <= 1) return base
  if (inversion === 'first') {
    return base.slice(1).concat(base[0]!)
  }
  if (intervalCount === 2) {
    return [1, 0]
  }
  return base.slice(2).concat(base.slice(0, 2))
}

function placeMainAnchorDown(
  degreeRootMidi: number,
  orderedIntervals: number[],
  ranges: MidiRange[],
): number[] | null {
  const mainIndex = orderedIntervals.indexOf(0)
  if (mainIndex < 0) return null
  if (!isMidiInRanges(degreeRootMidi, ranges)) return null

  const notes: number[] = new Array(orderedIntervals.length)
  notes[mainIndex] = degreeRootMidi

  for (let i = mainIndex - 1; i >= 0; i--) {
    const raw = degreeRootMidi + orderedIntervals[i]!
    const placed = placeBelowVoice(raw, notes[i + 1]!, ranges)
    if (placed === null) return null
    notes[i] = placed
  }

  if (notes[notes.length - 1]! - notes[0]! > 24) return null
  return notes
}

function placeMainAnchorMiddle(
  degreeRootMidi: number,
  orderedIntervals: number[],
  ranges: MidiRange[],
): number[] | null {
  const mainIndex = orderedIntervals.indexOf(0)
  if (mainIndex < 0) return null
  if (!isMidiInRanges(degreeRootMidi, ranges)) return null

  const notes: number[] = new Array(orderedIntervals.length)
  notes[mainIndex] = degreeRootMidi

  for (let i = mainIndex - 1; i >= 0; i--) {
    const raw = degreeRootMidi + orderedIntervals[i]!
    const placed = placeBelowVoice(raw, notes[i + 1]!, ranges)
    if (placed === null) return null
    notes[i] = placed
  }

  for (let i = mainIndex + 1; i < orderedIntervals.length; i++) {
    const raw = degreeRootMidi + orderedIntervals[i]!
    const placed = placeUpperVoice(raw, notes[i - 1]!, ranges)
    if (placed === null) return null
    notes[i] = placed
  }

  if (notes[notes.length - 1]! - notes[0]! > 24) return null
  return notes
}

/**
 * Раскладка аккорда вопроса по обращению.
 * Главная нота ступени (корень) всегда на degreeRootMidi; остальные — вниз/вверх от неё.
 */
export function placeChordFromInversion(
  degreeRootMidi: number,
  intervals: number[],
  inversion: QuestionChordInversion,
  ranges: MidiRange[],
): number[] | null {
  if (intervals.length === 0) return null
  if (inversion === 'root') {
    return placeChordFromIntervals(degreeRootMidi, intervals, ranges)
  }

  const order = intervalOrderForInversion(intervals.length, inversion)
  const ordered = order.map((i) => intervals[i]!)

  if (inversion === 'first') {
    return placeMainAnchorDown(degreeRootMidi, ordered, ranges)
  }
  return placeMainAnchorMiddle(degreeRootMidi, ordered, ranges)
}

export function placeQuestionChordFromIntervals(
  degreeRootMidi: number,
  intervals: number[],
  inversion: QuestionChordInversion,
  octaveConfig: OctaveConfig,
): number[] {
  const ranges = getEnabledRanges(octaveConfig)
  const placed = placeChordFromInversion(degreeRootMidi, intervals, inversion, ranges)
  if (placed) return placed
  return intervals.map((i) => degreeRootMidi + i)
}
