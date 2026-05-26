import { getChordMidis } from './scale'
import type { NotationMode, ScaleDefinition } from './types'

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

function midiToPc(midi: number): number {
  return ((midi % 12) + 12) % 12
}

function formatPc(pc: number, useFlats: boolean): string {
  return useFlats ? FLAT_NAMES[pc]! : SHARP_NAMES[pc]!
}

export function formatMidiNote(
  midi: number,
  scale: ScaleDefinition,
  mode: NotationMode,
): string {
  const pc = midiToPc(midi)
  const useFlats = scale.keyPreference === 'flats'
  const degreeIndex = scale.degrees.findIndex((d) => midiToPc(d) === pc)

  if (mode === 'degrees' && degreeIndex >= 0) {
    const base = String(degreeIndex + 1)
    const chromatic =
      !scale.degrees.some((d, i) => i === degreeIndex && midiToPc(d) === pc) ||
      scale.degrees[degreeIndex] === midi
        ? ''
        : useFlats
          ? 'b'
          : '#'
    const octaveMark = midi >= scale.degrees[0]! + 12 ? '′' : ''
    return `${chromatic}${base}${octaveMark}`
  }

  return formatPc(pc, useFlats)
}

export function formatChordForStep(
  step: number,
  scale: ScaleDefinition,
  mode: NotationMode,
): string {
  const midis = getChordMidis(scale, step)
  return midis.map((m) => formatMidiNote(m, scale, mode)).join(' ')
}
