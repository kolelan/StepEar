import { CHORD_INTERVALS, DEGREE_QUALITIES } from './constants'
import {
  createDefaultOctaveConfig,
  getEnabledRanges as getRanges,
  normalizeOctaveConfig,
  type MidiRange,
} from './piano-octaves'
import { ROOT_NAMES, type ChordQuality, type NoteName, type OctaveConfig } from './types'

export {
  createDefaultOctaveConfig,
  migrateOctaveConfig,
  normalizeOctaveConfig,
  PIANO_OCTAVE_DEFS,
  PIANO_OCTAVE_IDS,
} from './piano-octaves'
export type { MidiRange } from './piano-octaves'

export const DEFAULT_OCTAVE_CONFIG = createDefaultOctaveConfig()

export function getEnabledRanges(config: OctaveConfig): MidiRange[] {
  return getRanges(config)
}

export function tonicBaseMidi(root: NoteName, config: OctaveConfig): number {
  const c = normalizeOctaveConfig(config)
  const ranges = getEnabledRanges(c)
  const base = ranges[0]!.min
  return base + ROOT_NAMES.indexOf(root)
}

export function isMidiInRanges(midi: number, ranges: MidiRange[]): boolean {
  return ranges.some((r) => midi >= r.min && midi <= r.max)
}

function rangeContaining(midi: number, ranges: MidiRange[]): MidiRange | undefined {
  return ranges.find((r) => midi >= r.min && midi <= r.max)
}

function placeUpperVoice(
  pitchClassMidi: number,
  belowMidi: number,
  ranges: MidiRange[],
): number | null {
  let n = pitchClassMidi
  while (n <= belowMidi) n += 12

  if (isMidiInRanges(n, ranges)) {
    const belowRange = rangeContaining(belowMidi, ranges)
    const noteRange = rangeContaining(n, ranges)
    if (
      belowRange &&
      noteRange &&
      belowRange.id === noteRange.id &&
      n - belowMidi < 4
    ) {
      const bumped = n + 12
      if (isMidiInRanges(bumped, ranges)) return bumped
    }
    return n
  }

  for (let k = 0; k < 4; k++) {
    const tryMidi = n + 12 * k
    if (isMidiInRanges(tryMidi, ranges) && tryMidi > belowMidi) return tryMidi
  }
  return null
}

export function placeChordFromDegree(
  degreeRootMidi: number,
  quality: ChordQuality,
  ranges: MidiRange[],
): number[] | null {
  const bassInRange = isMidiInRanges(degreeRootMidi, ranges)
  if (!bassInRange) {
    const intervals = CHORD_INTERVALS[quality]
    return intervals.map((i) => degreeRootMidi + i)
  }

  const intervals = CHORD_INTERVALS[quality]
  const bass = degreeRootMidi
  const notes: number[] = [bass]

  for (let i = 1; i < intervals.length; i++) {
    const raw = bass + intervals[i]!
    const placed = placeUpperVoice(raw, notes[notes.length - 1]!, ranges)
    if (placed === null) return null
    notes.push(placed)
  }

  if (notes[2]! - notes[0]! > 24) return null
  return notes
}

export function getDegreeQuality(step: number): ChordQuality {
  const degreeIndex = ((step - 1) % 7 + 7) % 7
  return DEGREE_QUALITIES[degreeIndex]!
}

/** MIDI корня ступени в гамме (для 8-й — тоника на октаву выше). */
export function getStepRootMidi(degrees: number[], step: number): number {
  if (step === 8) return degrees[0]! + 12
  const degreeIndex = ((step - 1) % 7 + 7) % 7
  return degrees[degreeIndex]!
}

/**
 * Доступность ступени: в выбранных октавах должна быть первая нота ступени (корень),
 * не все звуки аккорда. 8-я доступна, если в диапазоне тоника (1-я ступень).
 */
export function isStepPlayable(
  degrees: number[],
  step: number,
  config: OctaveConfig,
): boolean {
  const ranges = getEnabledRanges(normalizeOctaveConfig(config))
  if (ranges.length === 0) return false

  if (step === 8) {
    return isMidiInRanges(degrees[0]!, ranges)
  }

  const degreeIndex = ((step - 1) % 7 + 7) % 7
  return isMidiInRanges(degrees[degreeIndex]!, ranges)
}

export function filterPlayableSteps(
  degrees: number[],
  steps: number[],
  config: OctaveConfig,
): number[] {
  return steps.filter((s) => isStepPlayable(degrees, s, config))
}

export function describeOctaveConfig(config: OctaveConfig, root: NoteName): string {
  const c = normalizeOctaveConfig(config)
  const ranges = getEnabledRanges(c)
  const names = ranges.map((r) => r.label).join('; ')
  const tonic = tonicBaseMidi(root, c)
  const tonicOct = rangeContaining(tonic, ranges)?.label ?? '?'
  return `Тоника ${root} (${tonicOct}, MIDI ${tonic}). Октавы: ${names || 'не выбраны'}.`
}
