import type { OctaveConfig, PianoOctaveId } from './types'

export interface MidiRange {
  id: PianoOctaveId
  label: string
  min: number
  max: number
}

/** Все октавы в диапазоне фортепиано A0–C8 (русские названия). */
export const PIANO_OCTAVE_DEFS: readonly MidiRange[] = [
  { id: 'subcontra', label: 'субконтроктава (A0–B0)', min: 21, max: 23 },
  { id: 'contra', label: 'контроктава (C1–B1)', min: 24, max: 35 },
  { id: 'great', label: 'большая (C2–B2)', min: 36, max: 47 },
  { id: 'small', label: 'малая (C3–B3)', min: 48, max: 59 },
  { id: 'first', label: 'первая (C4–B4)', min: 60, max: 71 },
  { id: 'second', label: 'вторая (C5–B5)', min: 72, max: 83 },
  { id: 'third', label: 'третья (C6–B6)', min: 84, max: 95 },
  { id: 'fourth', label: 'четвёртая (C7–B7)', min: 96, max: 107 },
  { id: 'fifth', label: 'пятая (C8)', min: 108, max: 108 },
] as const

export const PIANO_OCTAVE_IDS = PIANO_OCTAVE_DEFS.map((o) => o.id)

export function createDefaultOctaveConfig(): OctaveConfig {
  return {
    subcontra: false,
    contra: false,
    great: false,
    small: false,
    first: true,
    second: false,
    third: false,
    fourth: false,
    fifth: false,
  }
}

/** Старые пресеты: только small / first / second. */
export function migrateOctaveConfig(raw: unknown): OctaveConfig {
  const base = createDefaultOctaveConfig()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, boolean>
  if (o.subcontra !== undefined || o.great !== undefined) {
    for (const id of PIANO_OCTAVE_IDS) {
      if (typeof o[id] === 'boolean') base[id] = o[id]
    }
    return normalizeOctaveConfig(base)
  }
  if (o.small) base.small = true
  if (o.first) base.first = true
  if (o.second) base.second = true
  return normalizeOctaveConfig(base)
}

export function normalizeOctaveConfig(config: OctaveConfig): OctaveConfig {
  const any = PIANO_OCTAVE_IDS.some((id) => config[id])
  if (any) return config
  return createDefaultOctaveConfig()
}

export function getEnabledRanges(config: OctaveConfig): MidiRange[] {
  const c = normalizeOctaveConfig(config)
  return PIANO_OCTAVE_DEFS.filter((def) => c[def.id])
}
