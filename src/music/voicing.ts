import { getChordMidis } from './scale'
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

function generateVoicings(rootMidis: number[]): number[][] {
  const voicings: number[][] = []
  for (let inv = 0; inv < 3; inv++) {
    for (let shift = -12; shift <= 12; shift += 12) {
      const notes = rootMidis.map((n, i) => {
        let note = n + shift
        if (i < inv) note += 12
        return note
      })
      notes.sort((a, b) => a - b)
      if (notes[2]! - notes[0]! <= MAX_SPREAD + 6) {
        voicings.push(notes)
      }
    }
  }
  return voicings
}

export class VoicingEngine {
  private lastVoicing: number[] | null = null

  reset(): void {
    this.lastVoicing = null
  }

  voiceStep(scale: ScaleDefinition, step: number): number[] {
    const rootMidis = getChordMidis(scale, step)
    const candidates = generateVoicings(rootMidis)

    if (!this.lastVoicing || candidates.length === 0) {
      const defaultVoicing = [...rootMidis].sort((a, b) => a - b)
      this.lastVoicing = defaultVoicing
      return defaultVoicing
    }

    let best = candidates[0]!
    let bestCost = Infinity
    for (const c of candidates) {
      const cost = chordDistance(this.lastVoicing, c)
      if (cost < bestCost) {
        bestCost = cost
        best = c
      }
    }
    this.lastVoicing = best
    return best
  }
}
