import { DEFAULT_BPM, PAUSE_SEC, REINFORCEMENT_PAUSE_SEC } from './constants'

export const BPM_MIN = 40
export const BPM_MAX = 160

/** Задержка перед стартом семпла относительно AudioContext. */
export const PLAYBACK_SCHEDULE_LEAD_SEC = 0.05

export type PauseContext = 'cadence' | 'reinforcement'

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_BPM
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)))
}

/** Длительность одного аккорда: одна доля при заданном BPM (60/bpm с). */
export function chordDurationSec(bpm: number): number {
  return 60 / clampBpm(bpm)
}

export function pauseDurationSec(context: PauseContext = 'cadence', bpm?: number): number {
  if (context === 'reinforcement') {
    const beat = bpm != null ? chordDurationSec(bpm) : 60 / DEFAULT_BPM
    return Math.min(REINFORCEMENT_PAUSE_SEC, beat * 0.15)
  }
  return PAUSE_SEC
}

/** Сколько ждать после schedule, чтобы аккорд успел отзвучать. */
export function chordPlaybackWaitSec(bpm: number): number {
  return PLAYBACK_SCHEDULE_LEAD_SEC + chordDurationSec(bpm)
}
