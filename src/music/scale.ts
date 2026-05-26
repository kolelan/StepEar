import {
  CHORD_INTERVALS,
  DEGREE_QUALITIES,
  FIRST_OCTAVE_BASE_MIDI,
  KEY_PREFERENCE_BY_ROOT,
  MAJOR_SEMITONES,
} from './constants'
import { ROOT_NAMES, type NoteName, type ScaleDefinition } from './types'

export function noteNameToMidi(name: NoteName, octaveBase = FIRST_OCTAVE_BASE_MIDI): number {
  const idx = ROOT_NAMES.indexOf(name)
  return octaveBase + idx
}

export function buildMajorScale(root: NoteName): ScaleDefinition {
  const rootMidi = noteNameToMidi(root)
  const degrees = MAJOR_SEMITONES.map((s) => rootMidi + s)
  return {
    root,
    rootMidi,
    degrees,
    keyPreference: KEY_PREFERENCE_BY_ROOT[root],
  }
}

export function getChordMidis(scale: ScaleDefinition, step: number): number[] {
  const degreeIndex = ((step - 1) % 7 + 7) % 7
  const quality = DEGREE_QUALITIES[degreeIndex]
  const root = scale.degrees[degreeIndex]
  if (step === 8) {
    return getChordMidis(scale, 1).map((n) => n + 12)
  }
  return CHORD_INTERVALS[quality].map((i) => root + i)
}

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
