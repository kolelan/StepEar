import {
  CHORD_INTERVALS,
  DEGREE_QUALITIES,
  MAJOR_SEMITONES,
} from './constants'
import {
  createDefaultOctaveConfig,
  getEnabledRanges,
  placeChordFromDegree,
  tonicBaseMidi,
} from './octaves'
import { KEY_PREFERENCE_BY_ROOT } from './constants'
import { getStep8ChordMidis } from './step8'
import { ROOT_NAMES, type NoteName, type OctaveConfig, type ScaleDefinition } from './types'

export function buildMajorScale(
  root: NoteName,
  octaveConfig: OctaveConfig = createDefaultOctaveConfig(),
): ScaleDefinition {
  const rootMidi = tonicBaseMidi(root, octaveConfig)
  const degrees = MAJOR_SEMITONES.map((s) => rootMidi + s)
  return {
    root,
    rootMidi,
    degrees,
    keyPreference: KEY_PREFERENCE_BY_ROOT[root],
    octaveConfig,
  }
}

export function getChordMidis(scale: ScaleDefinition, step: number): number[] {
  const ranges = getEnabledRanges(scale.octaveConfig)
  const degreeIndex = ((step - 1) % 7 + 7) % 7
  const quality = DEGREE_QUALITIES[degreeIndex]!

  if (step === 8) {
    return getStep8ChordMidis(scale)
  }

  const root = scale.degrees[degreeIndex]!
  const placed = placeChordFromDegree(root, quality, ranges)
  if (placed) return placed

  return CHORD_INTERVALS[quality].map((i) => root + i)
}

export { isStepPlayable, filterPlayableSteps } from './octaves'
export { createDefaultOctaveConfig, describeOctaveConfig, migrateOctaveConfig } from './octaves'
export type { OctaveConfig } from './types'

export function getScaleLabel(root: NoteName): string {
  const names: Record<NoteName, string> = {
    C: 'До мажор',
    'C#': 'До♯ мажор',
    D: 'Ре мажор',
    'D#': 'Ре♯ мажор',
    E: 'Ми мажор',
    F: 'Фа мажор',
    'F#': 'Фа♯ мажор',
    G: 'Соль мажор',
    'G#': 'Соль♯ мажор',
    A: 'Ля мажор',
    'A#': 'Ля♯ мажор',
    B: 'Си мажор',
  }
  return names[root]
}

export function pickRandomRoot(): NoteName {
  return ROOT_NAMES[Math.floor(Math.random() * ROOT_NAMES.length)]!
}
