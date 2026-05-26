import { CADENCE_T_D_S_T, REINFORCEMENT_SEQUENCES } from '@/music/constants'
import { chordDurationSec, pauseDurationSec } from '@/music/timing'
import type { ScaleDefinition } from '@/music/types'
import { VoicingEngine } from '@/music/voicing'
import { PianoSynth } from './piano'

export class PlaybackService {
  private piano = new PianoSynth()
  private voicing = new VoicingEngine()
  private abortFlag = false

  async unlock(): Promise<void> {
    await this.piano.ensureContext()
  }

  setVolume(v: number): void {
    this.piano.setVolume(v)
  }

  abort(): void {
    this.abortFlag = true
  }

  resetVoicing(): void {
    this.voicing.reset()
    this.abortFlag = false
  }

  private async wait(sec: number): Promise<void> {
    if (this.abortFlag) return
    await new Promise((r) => setTimeout(r, sec * 1000))
  }

  private async playVoicedStep(
    scale: ScaleDefinition,
    step: number,
    bpm: number,
  ): Promise<number> {
    await this.piano.ensureContext()
    const ctx = await this.piano.ensureContext()
    const notes = this.voicing.voiceStep(scale, step)
    const dur = chordDurationSec(bpm)
    const start = ctx.currentTime + 0.05
    this.piano.playChord(notes, start, dur)
    await this.wait(dur)
    return dur
  }

  async playCadenceAndQuestion(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
  ): Promise<void> {
    this.abortFlag = false
    for (const step of CADENCE_T_D_S_T) {
      if (this.abortFlag) return
      await this.playVoicedStep(scale, step, bpm)
      if (this.abortFlag) return
      await this.wait(pauseDurationSec())
    }
    if (this.abortFlag) return
    await this.wait(pauseDurationSec())
    if (this.abortFlag) return
    await this.playVoicedStep(scale, questionStep, bpm)
  }

  async playQuestionOnly(scale: ScaleDefinition, questionStep: number, bpm: number): Promise<void> {
    this.abortFlag = false
    await this.playVoicedStep(scale, questionStep, bpm)
  }

  async playReinforcement(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
  ): Promise<void> {
    const seq = REINFORCEMENT_SEQUENCES[questionStep] ?? [questionStep]
    const filtered = seq.filter((s) => s <= 8)
    for (let i = 0; i < filtered.length; i++) {
      if (this.abortFlag) return
      await this.playVoicedStep(scale, filtered[i]!, bpm)
      if (i < filtered.length - 1 && !this.abortFlag) {
        await this.wait(pauseDurationSec())
      }
    }
  }
}

export const playback = new PlaybackService()
