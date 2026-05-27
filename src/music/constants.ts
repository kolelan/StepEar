import type { ChordQuality, KeyPreference, NoteName } from './types'

export const DEFAULT_BPM = 90
/** Пауза между аккордами каденции и вопроса. */
export const PAUSE_SEC = 0.5
/** Пауза между аккордами закрепления (короче, чтобы темп ощущался ровнее). */
export const REINFORCEMENT_PAUSE_SEC = 0.12
export const FIRST_OCTAVE_BASE_MIDI = 60

export const MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11]

export const DEGREE_QUALITIES: ChordQuality[] = [
  'major',
  'minor',
  'minor',
  'major',
  'major',
  'minor',
  'diminished',
]

export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
}

/** Септаккорды ступеней в мажорной тональности (от корня ступени). */
export const MAJOR_KEY_SEVENTH_INTERVALS: number[][] = [
  [0, 4, 7, 11],
  [0, 3, 7, 10],
  [0, 3, 7, 10],
  [0, 4, 7, 11],
  [0, 4, 7, 10],
  [0, 3, 7, 10],
  [0, 3, 6, 10],
]

export const KEY_PREFERENCE_BY_ROOT: Record<NoteName, KeyPreference> = {
  C: 'natural',
  'C#': 'sharps',
  D: 'sharps',
  'D#': 'sharps',
  E: 'sharps',
  F: 'flats',
  'F#': 'sharps',
  G: 'sharps',
  'G#': 'sharps',
  A: 'flats',
  'A#': 'flats',
  B: 'flats',
}

export const REINFORCEMENT_SEQUENCES: Record<number, number[]> = {
  1: [1],
  2: [2, 1],
  3: [3, 2, 1],
  4: [4, 3, 2, 1],
  5: [5, 6, 7, 8],
  6: [6, 7, 8],
  7: [7, 8],
  8: [8],
}

/**
 * Каденция по умолчанию T–S–D–T (строка нотации).
 * @see DEFAULT_CADENCE_NOTATION в cadence-notation.ts
 */
export { DEFAULT_CADENCE_NOTATION as CADENCE_DEFAULT_NOTATION } from './cadence-notation'

export const DEFAULT_COLOR_THRESHOLDS = {
  green: 90,
  yellow: 80,
  orange: 70,
}
