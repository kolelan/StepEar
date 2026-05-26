export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B'

export type KeyPreference = 'sharps' | 'flats' | 'natural'

export type NotationMode = 'letters' | 'degrees'

export const ROOT_NAMES: NoteName[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

export const MAJOR_ROOT_LABELS: Record<NoteName, string> = {
  C: 'До',
  'C#': 'До♯',
  D: 'Ре',
  'D#': 'Ре♯',
  E: 'Ми',
  F: 'Фа',
  'F#': 'Фа♯',
  G: 'Соль',
  'G#': 'Соль♯',
  A: 'Ля',
  'A#': 'Ля♯',
  B: 'Си',
}

export type ChordQuality = 'major' | 'minor' | 'diminished'

export type PianoOctaveId =
  | 'subcontra'
  | 'contra'
  | 'great'
  | 'small'
  | 'first'
  | 'second'
  | 'third'
  | 'fourth'
  | 'fifth'

export type OctaveConfig = Record<PianoOctaveId, boolean>

export type InstrumentId = 'piano' | 'guitar'

export interface ScaleDefinition {
  root: NoteName
  rootMidi: number
  degrees: number[]
  keyPreference: KeyPreference
  octaveConfig: OctaveConfig
}

export interface VoicedChord {
  step: number
  midiNotes: number[]
}
