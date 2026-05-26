import { CADENCE_T_S_D_T } from '@/music/constants'
import { getReinforcementMotion, getReinforcementSequence } from '@/music/reinforcement'
import type { VoicingMotion } from '@/music/voicing'
import { getReinforcementChordMidis } from '@/music/reinforcement-chords'
import { getChordMidis } from '@/music/scale'
import { getStep8ChordMidis } from '@/music/step8'
import { chordDurationSec, pauseDurationSec } from '@/music/timing'
import type { InstrumentId, ScaleDefinition } from '@/music/types'
import { VoicingEngine } from '@/music/voicing'
import { InstrumentSampler } from './instrument-sampler'

export interface PlaybackStepCallbacks {
  onStepStart?: (step: number, index?: number) => void
  onStepEnd?: (step: number, index?: number) => void
}

export interface PlaybackHighlightOptions {
  highlightQuestion?: boolean
  /** Подсветка ступеней цепочки диктанта (каденция подсвечивается отдельно, если переданы callbacks). */
  highlightSequence?: boolean
}

export class PlaybackService {
  private sampler = new InstrumentSampler()
  private voicing = new VoicingEngine()
  private abortFlag = false

  async unlock(instrument?: InstrumentId): Promise<void> {
    if (instrument) this.sampler.setInstrument(instrument)
    await this.sampler.ensureContext()
  }

  setInstrument(id: InstrumentId): void {
    this.sampler.setInstrument(id)
  }

  setVolume(v: number): void {
    this.sampler.setVolume(v)
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

  private async playChordNotes(notes: number[], bpm: number): Promise<void> {
    await this.sampler.ensureContext()
    const ctx = await this.sampler.ensureContext()
    const dur = chordDurationSec(bpm)
    const start = ctx.currentTime + 0.05
    this.sampler.playChord(notes, start, dur)
    await this.wait(dur)
  }

  /** Каденция — фиксированный регистр (корневые положения по тонике), без переноса с прошлого вопроса. */
  private async playCadenceStep(
    scale: ScaleDefinition,
    step: number,
    bpm: number,
  ): Promise<void> {
    const notes = getChordMidis(scale, step)
    await this.playChordNotes(notes, bpm)
  }

  private async playVoicedStep(
    scale: ScaleDefinition,
    step: number,
    bpm: number,
    motion: VoicingMotion = 'free',
  ): Promise<number> {
    const notes =
      step === 8
        ? getStep8ChordMidis(scale)
        : this.voicing.voiceStep(scale, step, motion)
    if (step === 8) this.voicing.reset()
    await this.playChordNotes(notes, bpm)
    return chordDurationSec(bpm)
  }

  private async playStepWithCallbacks(
    step: number,
    play: () => Promise<void>,
    callbacks?: PlaybackStepCallbacks,
    index?: number,
  ): Promise<void> {
    callbacks?.onStepStart?.(step, index)
    try {
      await play()
    } finally {
      callbacks?.onStepEnd?.(step, index)
    }
  }

  private async playCadence(
    scale: ScaleDefinition,
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
  ): Promise<void> {
    this.voicing.reset()
    for (const step of CADENCE_T_S_D_T) {
      if (this.abortFlag) return
      await this.playStepWithCallbacks(step, () => this.playCadenceStep(scale, step, bpm), callbacks)
      if (this.abortFlag) return
      await this.wait(pauseDurationSec())
    }
    if (this.abortFlag) return
    await this.wait(pauseDurationSec())
  }

  private async playVoicedSequence(
    scale: ScaleDefinition,
    sequence: number[],
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
  ): Promise<void> {
    this.voicing.reset()
    for (let i = 0; i < sequence.length; i++) {
      if (this.abortFlag) return
      const step = sequence[i]!
      await this.playStepWithCallbacks(
        step,
        async () => {
          await this.playVoicedStep(scale, step, bpm)
        },
        callbacks,
        i,
      )
      if (i < sequence.length - 1 && !this.abortFlag) {
        await this.wait(pauseDurationSec())
      }
    }
  }

  /** Каденция (с подсветкой при callbacks) и цепочка диктанта. */
  async playCadenceAndSequence(
    scale: ScaleDefinition,
    sequence: number[],
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
    options?: PlaybackHighlightOptions,
  ): Promise<void> {
    this.abortFlag = false
    await this.playCadence(scale, bpm, callbacks)
    if (this.abortFlag) return
    const sequenceCallbacks = options?.highlightSequence ? callbacks : undefined
    await this.playVoicedSequence(scale, sequence, bpm, sequenceCallbacks)
  }

  async playSequenceOnly(
    scale: ScaleDefinition,
    sequence: number[],
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
  ): Promise<void> {
    this.abortFlag = false
    this.voicing.reset()
    await this.playVoicedSequence(scale, sequence, bpm, callbacks)
  }

  private async playQuestionChord(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
    highlightQuestion = false,
  ): Promise<void> {
    if (highlightQuestion && callbacks) {
      await this.playStepWithCallbacks(
        questionStep,
        async () => {
          await this.playVoicedStep(scale, questionStep, bpm)
        },
        callbacks,
      )
      return
    }
    await this.playVoicedStep(scale, questionStep, bpm)
  }

  async playCadenceAndQuestion(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
    options?: PlaybackHighlightOptions,
  ): Promise<void> {
    this.abortFlag = false
    await this.playCadence(scale, bpm, callbacks)
    if (this.abortFlag) return
    await this.playQuestionChord(
      scale,
      questionStep,
      bpm,
      callbacks,
      options?.highlightQuestion,
    )
  }

  async playQuestionOnly(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
    options?: PlaybackHighlightOptions,
  ): Promise<void> {
    this.abortFlag = false
    await this.playQuestionChord(
      scale,
      questionStep,
      bpm,
      callbacks,
      options?.highlightQuestion,
    )
  }

  async playReinforcement(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
  ): Promise<void> {
    const seq = getReinforcementSequence(questionStep)
    const motion = getReinforcementMotion(questionStep)
    let prev: number[] | null = null
    for (let i = 0; i < seq.length; i++) {
      if (this.abortFlag) return
      const step = seq[i]!
      await this.playStepWithCallbacks(
        step,
        async () => {
          const notes = getReinforcementChordMidis(scale, step, prev, motion)
          await this.playChordNotes(notes, bpm)
          prev = notes
        },
        callbacks,
      )
      if (i < seq.length - 1 && !this.abortFlag) {
        await this.wait(pauseDurationSec())
      }
    }
  }
}

export const playback = new PlaybackService()
