import { CHORD_INTERVALS, DEGREE_QUALITIES } from './constants'
import { inversionIndexToMode, placeQuestionChordFromIntervals } from './chord-inversion'
import { getStep8RootMidi } from './step8'
import type { QuestionChordInversion, ScaleDefinition } from './types'

export const DEFAULT_CADENCE_NOTATION = '1 4 5 1'

export type CadenceInversionIndex = 0 | 1 | 2

export type CadenceChord =
  | { kind: 'step'; step: number; inversion: CadenceInversionIndex }
  | { kind: 'notes'; midis: number[] }

export type CadenceParseSuccess = { ok: true; chords: CadenceChord[] }
export type CadenceParseFailure = { ok: false; error: string }
export type CadenceParseResult = CadenceParseSuccess | CadenceParseFailure

const MAX_NOTES_PER_CHORD = 10
const MIN_STEP = 1
const MAX_STEP = 8

const NOTE_BASE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

function fail(error: string): CadenceParseFailure {
  return { ok: false, error }
}

function tokenizeCadence(input: string): string[] | null {
  const tokens: string[] = []
  let i = 0
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i]!)) i++
    if (i >= input.length) break

    if (input[i] === '[') {
      const start = i
      i++
      while (i < input.length && input[i] !== ']') i++
      if (i >= input.length) return null
      tokens.push(input.slice(start, i + 1))
      i++
      continue
    }

    const start = i
    while (i < input.length && !/\s/.test(input[i]!) && input[i] !== '[') i++
    if (start < i) tokens.push(input.slice(start, i))
  }
  return tokens
}

/** Последняя цифра — обращение (0–2), остальное — номер ступени (1–8). */
export function parseStepCadenceToken(
  token: string,
): { step: number; inversion: CadenceInversionIndex } | null {
  if (!/^\d+$/.test(token)) return null

  if (token.length === 1) {
    const step = Number(token)
    if (step < MIN_STEP || step > MAX_STEP) return null
    return { step, inversion: 0 }
  }

  const inversion = Number(token[token.length - 1])
  const step = Number(token.slice(0, -1))
  if (step < MIN_STEP || step > MAX_STEP) return null
  if (inversion < 0 || inversion > 2) return null
  return { step, inversion: inversion as CadenceInversionIndex }
}

function accidentalOffset(raw: string): number | null {
  if (!raw) return 0
  const flat = raw.replace(/♭/g, 'b').replace(/♯/g, '#')
  if (flat === '#') return 1
  if (flat === 'b') return -1
  if (flat === '##') return 2
  if (flat === 'bb') return -2
  return null
}

/** Нота в формате C4, F#4, Bb3. */
export function parseNoteLiteral(token: string): number | null {
  const t = token.trim()
  const m = /^([A-Ga-g])([#b♯♭]{0,2})(-?\d{1,2})$/.exec(t)
  if (!m) return null

  const letter = m[1]!.toUpperCase()
  const base = NOTE_BASE[letter]
  if (base === undefined) return null

  const acc = accidentalOffset(m[2] ?? '')
  if (acc === null) return null

  const octave = Number(m[3])
  if (!Number.isFinite(octave) || octave < 0 || octave > 9) return null

  const pc = ((base + acc) % 12 + 12) % 12
  const midi = (octave + 1) * 12 + pc
  if (midi < 0 || midi > 127) return null
  return midi
}

function parseBracketChord(token: string): number[] | null {
  if (!token.startsWith('[') || !token.endsWith(']')) return null
  const inner = token.slice(1, -1).trim()
  if (!inner) return null

  const parts = inner.split(/\s+/).filter(Boolean)
  if (parts.length < 1 || parts.length > MAX_NOTES_PER_CHORD) return null

  const midis: number[] = []
  for (const part of parts) {
    const midi = parseNoteLiteral(part)
    if (midi === null) return null
    midis.push(midi)
  }
  return midis
}

export function parseCadenceNotation(input: string): CadenceParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return fail('Введите каденцию, например: 1 4 5 1')
  }

  const tokens = tokenizeCadence(trimmed)
  if (tokens === null) {
    return fail('Незакрытая скобка [ — проверьте ноты в квадратных скобках')
  }
  if (tokens.length === 0) {
    return fail('Не найдено ни одного аккорда')
  }

  const chords: CadenceChord[] = []

  for (const token of tokens) {
    if (token.startsWith('[')) {
      const midis = parseBracketChord(token)
      if (midis === null) {
        return fail(
          `Неверный аккорд «${token}»: от 1 до ${MAX_NOTES_PER_CHORD} нот вида C4, F#4, Bb3`,
        )
      }
      chords.push({ kind: 'notes', midis })
      continue
    }

    const step = parseStepCadenceToken(token)
    if (!step) {
      return fail(
        `Неверный код «${token}»: ступень 1–8, обращение 0–2 (например 4, 42, 51)`,
      )
    }
    chords.push({ kind: 'step', ...step })
  }

  return { ok: true, chords }
}

export function resolveCadenceChords(input: string): {
  chords: CadenceChord[]
  usedDefault: boolean
  error?: string
} {
  const parsed = parseCadenceNotation(input)
  if (parsed.ok) {
    return { chords: parsed.chords, usedDefault: false }
  }
  const fallback = parseCadenceNotation(DEFAULT_CADENCE_NOTATION)
  return {
    chords: fallback.ok ? fallback.chords : [],
    usedDefault: true,
    error: parsed.error,
  }
}

function degreeIndexForStep(step: number): number {
  return ((step - 1) % 7 + 7) % 7
}

export function getCadenceStepChordMidis(
  scale: ScaleDefinition,
  step: number,
  inversion: CadenceInversionIndex,
): number[] {
  const degreeIndex = degreeIndexForStep(step)
  const root = step === 8 ? getStep8RootMidi(scale) : scale.degrees[degreeIndex]!
  const quality = DEGREE_QUALITIES[degreeIndex]!
  const intervals = CHORD_INTERVALS[quality]
  const mode: QuestionChordInversion = inversionIndexToMode(inversion)
  return placeQuestionChordFromIntervals(root, intervals, mode, scale.octaveConfig)
}

export function getCadenceChordMidis(
  scale: ScaleDefinition,
  chord: CadenceChord,
): number[] {
  if (chord.kind === 'notes') {
    return [...chord.midis].sort((a, b) => a - b)
  }
  return getCadenceStepChordMidis(scale, chord.step, chord.inversion)
}

export function cadenceChordLabel(chord: CadenceChord, index: number): string {
  if (chord.kind === 'notes') {
    return `Каденция, аккорд ${index + 1}`
  }
  if (chord.inversion === 0) {
    return `Каденция, ступень ${chord.step}`
  }
  return `Каденция, ступень ${chord.step}, обр. ${chord.inversion}`
}
