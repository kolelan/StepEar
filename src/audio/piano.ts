export class PianoSynth {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  volume = 0.7

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
    return this.ctx
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.masterGain) this.masterGain.gain.value = this.volume
  }

  playNote(midi: number, startTime: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return
    const freq = 440 * Math.pow(2, (midi - 69) / 12)

    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    osc1.type = 'triangle'
    osc2.type = 'sine'
    osc1.frequency.value = freq
    osc2.frequency.value = freq

    const gain = this.ctx.createGain()
    const attack = 0.02
    const release = Math.min(0.15, duration * 0.3)
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.35, startTime + attack)
    gain.gain.setValueAtTime(0.28, startTime + duration - release)
    gain.gain.linearRampToValueAtTime(0.001, startTime + duration)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.masterGain)

    osc1.start(startTime)
    osc2.start(startTime)
    osc1.stop(startTime + duration + 0.05)
    osc2.stop(startTime + duration + 0.05)
  }

  playChord(midiNotes: number[], startTime: number, duration: number): void {
    for (const n of midiNotes) {
      this.playNote(n, startTime, duration)
    }
  }
}
