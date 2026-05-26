import { PAUSE_SEC } from './constants'

export function chordDurationSec(bpm: number): number {
  return 60 / bpm
}

export function pauseDurationSec(): number {
  return PAUSE_SEC
}
