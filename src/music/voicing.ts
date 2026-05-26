import { getEnabledRanges } from './octaves'
import { getChordMidis } from './scale'
import { getStep8RootMidi } from './step8'
import type { ScaleDefinition } from './types'

const MAX_SPREAD = 12

function chordDistance(prev: number[], next: number[]): number {
  const sortedPrev = [...prev].sort((a, b) => a - b)
  const sortedNext = [...next].sort((a, b) => a - b)
  let cost = 0
  for (let i = 0; i < 3; i++) {
    cost += Math.abs(sortedPrev[i]! - sortedNext[i]!)
  }
  const spread = sortedNext[2]! - sortedNext[0]!
  if (spread > MAX_SPREAD) cost += (spread - MAX_SPREAD) * 2
  return cost
}

function isVoicingInRanges(notes: number[], ranges: ReturnType<typeof getEnabledRanges>): boolean {
  return notes.every((n) => ranges.some((r) => n >= r.min && n <= r.max))
}

function generateVoicings(
  rootMidis: number[],
  ranges: ReturnType<typeof getEnabledRanges>,
): number[][] {
  const voicings: number[][] = []
  for (let inv = 0; inv < 3; inv++) {
    for (let shift = -12; shift <= 12; shift += 12) {
      const notes = rootMidis.map((n, i) => {
        let note = n + shift
        if (i < inv) note += 12
        return note
      })
      notes.sort((a, b) => a - b)
      if (
        notes[2]! - notes[0]! <= MAX_SPREAD + 6 &&
        isVoicingInRanges(notes, ranges)
      ) {
        voicings.push(notes)
      }
    }
  }
  return voicings
}

export type VoicingMotion = 'free' | 'ascend' | 'descend'

export class VoicingEngine {
  private lastVoicing: number[] | null = null

  reset(): void {
    this.lastVoicing = null
  }

  voiceStep(scale: ScaleDefinition, step: number, motion: VoicingMotion = 'free'): number[] {
    const ranges = getEnabledRanges(scale.octaveConfig)
    const placed = getChordMidis(scale, step)
    let candidates = generateVoicings(placed, ranges)
    if (step === 8) {
      const minBass = getStep8RootMidi(scale)
      const filtered = candidates.filter((c) => Math.min(...c) >= minBass)
      if (filtered.length > 0) candidates = filtered
    }
    if (candidates.length === 0) {
      const fallback = [...placed].sort((a, b) => a - b)
      this.lastVoicing = fallback
      return fallback
    }

    if (!this.lastVoicing) {
      const defaultVoicing = pickClosestToPlaced(candidates, placed)
      this.lastVoicing = defaultVoicing
      return defaultVoicing
    }

    const prev = [...this.lastVoicing].sort((a, b) => a - b)
    let best = candidates[0]!
    let bestCost = Infinity
    for (const c of candidates) {
      const cost = scoreVoicing(prev, c, motion)
      if (cost < bestCost) {
        bestCost = cost
        best = c
      }
    }
    this.lastVoicing = best
    return best
  }
}

function pickClosestToPlaced(candidates: number[][], placed: number[]): number[] {
  const sorted = [...placed].sort((a, b) => a - b)
  let best = candidates[0]!
  let bestCost = Infinity
  for (const c of candidates) {
    const cost = chordDistance(sorted, c)
    if (cost < bestCost) {
      bestCost = cost
      best = c
    }
  }
  return best
}

function scoreVoicing(prev: number[], next: number[], motion: VoicingMotion): number {
  let cost = chordDistance(prev, next)
  const prevBass = prev[0]!
  const nextBass = [...next].sort((a, b) => a - b)[0]!
  const bassDelta = nextBass - prevBass

  if (motion === 'ascend') {
    if (bassDelta < 0) cost += 48
    if (bassDelta === 0) cost += 8
    if (bassDelta > 3) cost += (bassDelta - 3) * 10
    if (bassDelta >= 12) cost += 80
  }

  if (motion === 'descend') {
    if (bassDelta > 0) cost += 48
    if (bassDelta === 0) cost += 8
    if (bassDelta < -3) cost += (-bassDelta - 3) * 10
    if (bassDelta <= -12) cost += 80
  }

  return cost
}
