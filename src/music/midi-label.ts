const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1
}

export function midiToPitchName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12
  return NOTE_NAMES[pc]!
}

/** Подпись для лога: «C#, октава 4 (MIDI 61)». */
export function formatNoteForLog(midi: number): string {
  const name = midiToPitchName(midi)
  const octave = midiToOctave(midi)
  return `${name}, октава ${octave} (MIDI ${midi})`
}

export function formatChordForLog(midiNotes: number[]): string {
  const unique = [...new Set(midiNotes)].sort((a, b) => a - b)
  return unique.map(formatNoteForLog).join(' · ')
}
