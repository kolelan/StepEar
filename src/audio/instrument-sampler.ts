import type { InstrumentId } from '@/music/types'

const PITCH_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const
const REFERENCE_OCTAVE = 4

const assetBase = import.meta.env.BASE_URL

const INSTRUMENT_PATH: Record<InstrumentId, string> = {
  piano: `${assetBase}samples/piano`,
  guitar: `${assetBase}samples/guitar`,
}

function sampleUrl(instrument: InstrumentId, pitchName: (typeof PITCH_NAMES)[number]): string {
  return `${INSTRUMENT_PATH[instrument]}/${pitchName}${REFERENCE_OCTAVE}.mp3`
}

function midiPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

function referenceMidiForPitchClass(pc: number): number {
  return 60 + pc
}

export class InstrumentSampler {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private buffers = new Map<string, AudioBuffer>()
  private loadPromise: Promise<void> | null = null
  private instrument: InstrumentId = 'piano'
  volume = 0.7

  setInstrument(id: InstrumentId): void {
    if (this.instrument !== id) {
      this.instrument = id
      this.buffers.clear()
      this.loadPromise = null
    }
  }

  getInstrument(): InstrumentId {
    return this.instrument
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
    this.masterGain!.gain.value = this.volume
    await this.ensureSamplesLoaded()
    return this.ctx
  }

  private bufferKey(pc: number): string {
    return `${this.instrument}:${pc}`
  }

  private async ensureSamplesLoaded(): Promise<void> {
    if (this.buffers.size >= PITCH_NAMES.length) return
    if (this.loadPromise) {
      await this.loadPromise
      return
    }
    this.loadPromise = this.loadAllSamples()
    await this.loadPromise
  }

  private async loadAllSamples(): Promise<void> {
    const ctx = this.ctx!
    const inst = this.instrument
    await Promise.all(
      PITCH_NAMES.map(async (name, pc) => {
        const key = this.bufferKey(pc)
        if (this.buffers.has(key)) return
        const res = await fetch(sampleUrl(inst, name))
        if (!res.ok) throw new Error(`Не удалось загрузить семпл ${inst}/${name}`)
        const data = await res.arrayBuffer()
        const buffer = await ctx.decodeAudioData(data)
        this.buffers.set(key, buffer)
      }),
    )
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.masterGain) this.masterGain.gain.value = this.volume
  }

  playNote(midi: number, startTime: number, duration: number, chordSize = 1): void {
    if (!this.ctx || !this.masterGain) return

    const pc = midiPitchClass(midi)
    const refMidi = referenceMidiForPitchClass(pc)
    const buffer = this.buffers.get(this.bufferKey(pc))
    if (!buffer) return

    const playbackRate = Math.pow(2, (midi - refMidi) / 12)
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = playbackRate

    const gain = this.ctx.createGain()
    const chordGain = chordSize > 1 ? 0.92 / Math.sqrt(chordSize) : 1
    const peak =
      (this.instrument === 'guitar' ? 0.75 : 0.85) *
      (chordGain / Math.max(1, Math.sqrt(playbackRate)))
    const release = Math.min(0.15, duration * 0.3)
    const stopAt = startTime + duration + 0.08
    const sampleEnd = startTime + buffer.duration / playbackRate

    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.01)
    gain.gain.setValueAtTime(peak * 0.9, startTime + duration - release)
    gain.gain.linearRampToValueAtTime(0.001, Math.min(stopAt, sampleEnd))

    source.connect(gain)
    gain.connect(this.masterGain)
    source.start(startTime, 0)
    source.stop(Math.min(stopAt + 0.05, sampleEnd + 0.02))
  }

  playChord(midiNotes: number[], startTime: number, duration: number): void {
    const unique = [...new Set(midiNotes)]
    for (const n of unique) {
      this.playNote(n, startTime, duration, unique.length)
    }
  }
}
