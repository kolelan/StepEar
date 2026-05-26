import Dexie, { type Table } from 'dexie'
import type { ExerciseMode } from '@/stores/exercise'
import type { InstrumentId, NoteName, NotationMode, OctaveConfig } from '@/music/types'

export interface SavedExercise {
  id?: number
  name: string
  mode?: ExerciseMode
  root: NoteName | 'random'
  steps: number[]
  dictationSoundCount?: number
  questionCount: number
  bpm: number
  showHintAfterError: boolean
  highlightQuestionOnPlay?: boolean
  notationMode: NotationMode
  octaves?: OctaveConfig
  instrument?: InstrumentId
  balancedSteps?: boolean
  createdAt: number
}

export interface SessionRecord {
  id?: number
  finishedAt: number
  root: NoteName
  mode?: ExerciseMode
  totalQuestions: number
  correctQuestions: number
  stepStats: Record<string, { asked: number; correct: number }>
  attempts: Array<{
    questionStep: number
    answers: number[]
    skipped: boolean
    eventuallyCorrect: boolean
  }>
}

export interface LocalUser {
  id?: number
  email: string
  passwordHash: string
}

export interface AppSettings {
  id: number
  notationMode: NotationMode
  volume: number
  showHintAfterError: boolean
}

class StepEarDB extends Dexie {
  exercises!: Table<SavedExercise, number>
  sessions!: Table<SessionRecord, number>
  users!: Table<LocalUser, number>
  settings!: Table<AppSettings, number>

  constructor() {
    super('StepEarDB')
    this.version(1).stores({
      exercises: '++id, name, createdAt',
      sessions: '++id, finishedAt',
      users: '++id, &email',
      settings: 'id',
    })
  }
}

export const db = new StepEarDB()

export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1)
  if (existing) return existing
  const defaults: AppSettings = {
    id: 1,
    notationMode: 'letters',
    volume: 0.7,
    showHintAfterError: false,
  }
  await db.settings.put(defaults)
  return defaults
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
