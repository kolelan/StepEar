import {
  type CadenceChord,
  cadenceChordLabel,
  DEFAULT_CADENCE_NOTATION,
  getCadenceChordMidis,
  resolveCadenceChords,
} from '@/music/cadence-notation'
import { getReinforcementMotion, getReinforcementSequence } from '@/music/reinforcement'
import { clampReinforcementNoteCount } from '@/music/reinforcement-notes'
import { getReinforcementChordMidis } from '@/music/reinforcement-chords'
import {
  clampQuestionNoteCount,
  getQuestionChordMidis,
  type QuestionNoteCount,
} from '@/music/question-chord'
import {
  chordDurationSec,
  chordPlaybackWaitSec,
  pauseDurationSec,
  PLAYBACK_SCHEDULE_LEAD_SEC,
} from '@/music/timing'
import type {
  InstrumentId,
  QuestionChordInversion,
  ReinforcementNoteCount,
  ScaleDefinition,
} from '@/music/types'
import { normalizeQuestionChordInversion } from '@/music/chord-inversion'
import { logAudio, logInfo } from '@/utils/log-info'
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
  private abortFlag = false
  private questionNoteCount: QuestionNoteCount = 3
  private questionChordInversion: QuestionChordInversion = 'root'
  private reinforcementNoteCount: ReinforcementNoteCount = 3
  private cadenceChords: CadenceChord[] = resolveCadenceChords(
    DEFAULT_CADENCE_NOTATION,
  ).chords

  setQuestionNoteCount(count: number): void {
    this.questionNoteCount = clampQuestionNoteCount(count)
  }

  setQuestionChordInversion(inversion: QuestionChordInversion): void {
    this.questionChordInversion = normalizeQuestionChordInversion(inversion)
  }

  setReinforcementNoteCount(count: number): void {
    this.reinforcementNoteCount = clampReinforcementNoteCount(count)
  }

  setCadenceNotation(notation: string): void {
    const resolved = resolveCadenceChords(notation)
    this.cadenceChords = resolved.chords
    if (resolved.usedDefault && resolved.error) {
      logInfo('Каденция: неверная нотация, используется по умолчанию', {
        input: notation,
        error: resolved.error,
        default: DEFAULT_CADENCE_NOTATION,
      })
    }
  }

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
    this.abortFlag = false
  }

  private async wait(sec: number): Promise<void> {
    if (this.abortFlag) return
    await new Promise((r) => setTimeout(r, sec * 1000))
  }

  private async playChordNotes(
    notes: number[],
    bpm: number,
    logContext?: string,
  ): Promise<void> {
    if (logContext) logAudio(logContext, notes)
    await this.sampler.ensureContext()
    const ctx = await this.sampler.ensureContext()
    const dur = chordDurationSec(bpm)
    const start = ctx.currentTime + PLAYBACK_SCHEDULE_LEAD_SEC
    this.sampler.playChord(notes, start, dur)
    await this.wait(chordPlaybackWaitSec(bpm))
  }

  private async playCadenceChord(
    scale: ScaleDefinition,
    chord: CadenceChord,
    index: number,
    bpm: number,
  ): Promise<void> {
    const notes = getCadenceChordMidis(scale, chord)
    await this.playChordNotes(notes, bpm, cadenceChordLabel(chord, index))
  }

  private resolveQuestionNotes(scale: ScaleDefinition, step: number): number[] {
    return getQuestionChordMidis(
      scale,
      step,
      this.questionNoteCount,
      this.questionChordInversion,
    )
  }

  private async playVoicedStep(
    scale: ScaleDefinition,
    step: number,
    bpm: number,
    logContext?: string,
  ): Promise<number> {
    const notes = this.resolveQuestionNotes(scale, step)
    await this.playChordNotes(notes, bpm, logContext ?? `Ступень ${step}`)
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
    for (let i = 0; i < this.cadenceChords.length; i++) {
      if (this.abortFlag) return
      const chord = this.cadenceChords[i]!
      const highlightStep = chord.kind === 'step' ? chord.step : 0
      await this.playStepWithCallbacks(
        highlightStep,
        () => this.playCadenceChord(scale, chord, i, bpm),
        callbacks,
        i,
      )
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
    for (let i = 0; i < sequence.length; i++) {
      if (this.abortFlag) return
      const step = sequence[i]!
      const seqLabel =
        sequence.length > 1
          ? `Цепочка ${i + 1}/${sequence.length}, ступень ${step}`
          : `Ступень ${step}`
      await this.playStepWithCallbacks(
        step,
        async () => {
          await this.playVoicedStep(scale, step, bpm, seqLabel)
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
    cadenceBpm: number,
    questionBpm: number,
    callbacks?: PlaybackStepCallbacks,
    options?: PlaybackHighlightOptions,
  ): Promise<void> {
    this.abortFlag = false
    logInfo('Воспроизведение: каденция + диктант', {
      sequence,
      cadenceBpm,
      questionBpm,
    })
    await this.playCadence(scale, cadenceBpm, callbacks)
    if (this.abortFlag) return
    const sequenceCallbacks = options?.highlightSequence ? callbacks : undefined
    await this.playVoicedSequence(scale, sequence, questionBpm, sequenceCallbacks)
  }

  async playSequenceOnly(
    scale: ScaleDefinition,
    sequence: number[],
    questionBpm: number,
    callbacks?: PlaybackStepCallbacks,
  ): Promise<void> {
    this.abortFlag = false
    await this.playVoicedSequence(scale, sequence, questionBpm, callbacks)
  }

  private async playQuestionChord(
    scale: ScaleDefinition,
    questionStep: number,
    bpm: number,
    callbacks?: PlaybackStepCallbacks,
    highlightQuestion = false,
  ): Promise<void> {
    const questionLabel = `Вопрос, ступень ${questionStep}`
    if (highlightQuestion && callbacks) {
      await this.playStepWithCallbacks(
        questionStep,
        async () => {
          await this.playVoicedStep(scale, questionStep, bpm, questionLabel)
        },
        callbacks,
      )
      return
    }
    await this.playVoicedStep(scale, questionStep, bpm, questionLabel)
  }

  async playCadenceAndQuestion(
    scale: ScaleDefinition,
    questionStep: number,
    cadenceBpm: number,
    questionBpm: number,
    callbacks?: PlaybackStepCallbacks,
    options?: PlaybackHighlightOptions,
  ): Promise<void> {
    this.abortFlag = false
    logInfo('Воспроизведение: каденция + вопрос', {
      step: questionStep,
      cadenceBpm,
      questionBpm,
    })
    await this.playCadence(scale, cadenceBpm, callbacks)
    if (this.abortFlag) return
    await this.playQuestionChord(
      scale,
      questionStep,
      questionBpm,
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
    reinforcementBpm: number,
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
          const notes = getReinforcementChordMidis(
            scale,
            step,
            prev,
            motion,
            this.reinforcementNoteCount,
          )
          await this.playChordNotes(notes, reinforcementBpm, `Закрепление, ступень ${step}`)
          prev = notes
        },
        callbacks,
      )
      if (i < seq.length - 1 && !this.abortFlag) {
        await this.wait(pauseDurationSec('reinforcement', reinforcementBpm))
      }
    }
  }
}

export const playback = new PlaybackService()
