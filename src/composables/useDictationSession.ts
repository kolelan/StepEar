import { computed, ref } from 'vue'
import {
  playback,
  type PlaybackHighlightOptions,
  type PlaybackStepCallbacks,
} from '@/audio/playback'
import {
  buildRandomDictationSequence,
  dictationSequencesMatch,
  dictationSlotResults,
} from '@/music/dictation'
import { useExerciseStore } from '@/stores/exercise'
import { db, type SessionRecord } from '@/db/database'

export type DictationPhase =
  | 'idle'
  | 'playing'
  | 'answering'
  | 'reviewing'
  | 'finished'

export function useDictationSession() {
  const exerciseStore = useExerciseStore()

  const phase = ref<DictationPhase>('idle')
  const questionIndex = ref(0)
  const isPlaying = ref(false)
  const playbackStep = ref<number | null>(null)
  const activeSlotIndex = ref<number | null>(null)

  const expectedSequence = ref<number[]>([])
  const userAnswer = ref<number[]>([])
  const slotResults = ref<Array<'correct' | 'wrong'>>([])

  const completedQuestions = ref(0)
  const correctQuestions = ref(0)

  const soundCount = computed(() => exerciseStore.config.dictationSoundCount)
  const totalQuestions = computed(() => exerciseStore.config.questionCount)

  const percent = computed(() => {
    if (completedQuestions.value === 0) return 0
    return Math.round((correctQuestions.value / completedQuestions.value) * 100)
  })

  const failedQuestions = computed(
    () => completedQuestions.value - correctQuestions.value,
  )

  const progressLabel = computed(() => {
    if (phase.value === 'finished') return 'Готово'
    return `Вопрос ${Math.min(questionIndex.value + 1, totalQuestions.value)} из ${totalQuestions.value}`
  })

  const playbackCallbacks: PlaybackStepCallbacks = {
    onStepStart: (step, index) => {
      playbackStep.value = step
      activeSlotIndex.value = index ?? null
    },
    onStepEnd: () => {
      playbackStep.value = null
      activeSlotIndex.value = null
    },
  }

  const highlightedPlaybackStep = computed(() =>
    isPlaying.value ? playbackStep.value : null,
  )

  function clearPlaybackHighlight(): void {
    playbackStep.value = null
    activeSlotIndex.value = null
  }

  function dictationPlaybackOptions(): PlaybackHighlightOptions {
    return { highlightSequence: exerciseStore.config.highlightQuestionOnPlay }
  }

  async function start(): Promise<void> {
    phase.value = 'playing'
    questionIndex.value = 0
    completedQuestions.value = 0
    correctQuestions.value = 0
    playback.setInstrument(exerciseStore.config.instrument)
    playback.setQuestionNoteCount(exerciseStore.config.questionNoteCount)
    playback.setQuestionChordInversion(exerciseStore.config.questionChordInversion)
    playback.setCadenceNotation(exerciseStore.config.cadenceNotation)
    playback.resetVoicing()
    await playback.unlock(exerciseStore.config.instrument)
    await nextQuestion()
  }

  async function nextQuestion(): Promise<void> {
    if (questionIndex.value >= totalQuestions.value) {
      phase.value = 'finished'
      await saveSession()
      return
    }

    exerciseStore.resolveRootForQuestion()
    const pool = exerciseStore.trainingSteps
    if (pool.length === 0) {
      phase.value = 'finished'
      return
    }

    expectedSequence.value = buildRandomDictationSequence(pool, soundCount.value)
    userAnswer.value = []
    slotResults.value = []

    clearPlaybackHighlight()
    phase.value = 'playing'
    isPlaying.value = true
    await playback.playCadenceAndSequence(
      exerciseStore.scale,
      expectedSequence.value,
      exerciseStore.config.cadenceBpm,
      exerciseStore.config.bpm,
      playbackCallbacks,
      dictationPlaybackOptions(),
    )
    isPlaying.value = false
    clearPlaybackHighlight()

    if (phase.value !== 'playing') return

    phase.value = 'answering'
  }

  function submitStep(step: number): void {
    if (phase.value !== 'answering' || isPlaying.value) return
    if (!exerciseStore.trainingSteps.includes(step)) return
    if (userAnswer.value.length >= soundCount.value) return

    userAnswer.value.push(step)

    if (userAnswer.value.length >= soundCount.value) {
      void finishAnswering()
    }
  }

  async function finishAnswering(): Promise<void> {
    const expected = expectedSequence.value
    const user = [...userAnswer.value]
    const allCorrect = dictationSequencesMatch(expected, user)
    slotResults.value = dictationSlotResults(expected, user)

    completedQuestions.value++
    if (allCorrect) correctQuestions.value++

    phase.value = 'reviewing'
    await new Promise((r) => setTimeout(r, 500))

    isPlaying.value = true
    await playback.playSequenceOnly(
      exerciseStore.scale,
      expected,
      exerciseStore.config.bpm,
      playbackCallbacks,
    )
    isPlaying.value = false
    clearPlaybackHighlight()

    questionIndex.value++

    if (questionIndex.value >= totalQuestions.value) {
      phase.value = 'finished'
      await saveSession()
    } else {
      await nextQuestion()
    }
  }

  async function repeatWithCadence(): Promise<void> {
    if (phase.value !== 'answering' || isPlaying.value) return
    userAnswer.value = []
    isPlaying.value = true
    await playback.playCadenceAndSequence(
      exerciseStore.scale,
      expectedSequence.value,
      exerciseStore.config.cadenceBpm,
      exerciseStore.config.bpm,
      playbackCallbacks,
      dictationPlaybackOptions(),
    )
    isPlaying.value = false
    clearPlaybackHighlight()
  }

  async function repeatSequenceOnly(): Promise<void> {
    if (phase.value !== 'answering' || isPlaying.value) return
    userAnswer.value = []
    isPlaying.value = true
    const seqCallbacks = exerciseStore.config.highlightQuestionOnPlay
      ? playbackCallbacks
      : undefined
    await playback.playSequenceOnly(
      exerciseStore.scale,
      expectedSequence.value,
      exerciseStore.config.bpm,
      seqCallbacks,
    )
    isPlaying.value = false
    clearPlaybackHighlight()
  }

  function undoLastStep(): void {
    if (phase.value !== 'answering' || isPlaying.value) return
    userAnswer.value.pop()
  }

  async function skipQuestion(): Promise<void> {
    if (phase.value !== 'answering' || isPlaying.value) return
    completedQuestions.value++
    userAnswer.value = []
    slotResults.value = []
    questionIndex.value++
    if (questionIndex.value >= totalQuestions.value) {
      phase.value = 'finished'
      await saveSession()
      return
    }
    await nextQuestion()
  }

  function abort(): void {
    playback.abort()
    clearPlaybackHighlight()
    phase.value = 'idle'
    questionIndex.value = 0
  }

  async function saveSession(): Promise<void> {
    const root =
      exerciseStore.config.root === 'random'
        ? exerciseStore.currentRoot
        : exerciseStore.config.root
    const record: SessionRecord = {
      finishedAt: Date.now(),
      root,
      mode: 'dictation',
      totalQuestions: completedQuestions.value,
      correctQuestions: correctQuestions.value,
      stepStats: {},
      attempts: [],
    }
    await db.sessions.add(record)
  }

  return {
    phase,
    progressLabel,
    isPlaying,
    highlightedPlaybackStep,
    activeSlotIndex,
    expectedSequence,
    userAnswer,
    slotResults,
    soundCount,
    completedQuestions,
    correctQuestions,
    failedQuestions,
    percent,
    start,
    submitStep,
    repeatWithCadence,
    repeatSequenceOnly,
    undoLastStep,
    skipQuestion,
    abort,
  }
}
