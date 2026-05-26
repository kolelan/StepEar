import { computed, ref } from 'vue'
import {
  playback,
  type PlaybackHighlightOptions,
  type PlaybackStepCallbacks,
} from '@/audio/playback'
import { isAnswerCorrect, shouldPlayReinforcement } from '@/music/tonic-steps'
import { useExerciseStore } from '@/stores/exercise'
import { db, type SessionRecord } from '@/db/database'

export type Phase = 'idle' | 'playing' | 'answering' | 'reinforcing' | 'finished'

export interface StepResult {
  step: number
  success: boolean
}

export function useTrainingSession() {
  const exerciseStore = useExerciseStore()

  const phase = ref<Phase>('idle')
  const questionIndex = ref(0)
  const currentStep = ref(1)
  const hintStep = ref<number | null>(null)
  const isPlaying = ref(false)
  const playbackStep = ref<number | null>(null)

  const completedQuestions = ref(0)
  const correctQuestions = ref(0)
  const questionHadWrongAttempt = ref(false)
  const stepStats = ref<Record<number, { asked: number; correct: number }>>({})
  const stepResults = ref<StepResult[]>([])
  const attempts = ref<SessionRecord['attempts']>([])

  const currentAttemptAnswers = ref<number[]>([])

  const totalQuestions = computed(() => exerciseStore.config.questionCount)
  const percent = computed(() => {
    if (completedQuestions.value === 0) return 0
    return Math.round((correctQuestions.value / completedQuestions.value) * 100)
  })

  const guessedSteps = computed(() =>
    stepResults.value.filter((r) => r.success).map((r) => r.step),
  )
  const missedSteps = computed(() =>
    stepResults.value.filter((r) => !r.success).map((r) => r.step),
  )

  /** Завершённые вопросы, на которых была хотя бы одна ошибка или пропуск. */
  const failedQuestions = computed(
    () => completedQuestions.value - correctQuestions.value,
  )

  const progressLabel = computed(() => {
    if (phase.value === 'finished') return 'Готово'
    return `Вопрос ${Math.min(questionIndex.value + 1, totalQuestions.value)} из ${totalQuestions.value}`
  })

  function recordStepStat(step: number, correct: boolean): void {
    if (!stepStats.value[step]) stepStats.value[step] = { asked: 0, correct: 0 }
    stepStats.value[step].asked++
    if (correct) stepStats.value[step].correct++
  }

  /** Вопрос засчитан верным только без ошибочных попыток до финального ответа. */
  function finalizeQuestion(correctWithoutErrors: boolean, skipped: boolean): void {
    completedQuestions.value++
    if (correctWithoutErrors) correctQuestions.value++
    recordStepStat(currentStep.value, correctWithoutErrors)
    stepResults.value.push({ step: currentStep.value, success: correctWithoutErrors })
    attempts.value.push({
      questionStep: currentStep.value,
      answers: [...currentAttemptAnswers.value],
      skipped,
      eventuallyCorrect: correctWithoutErrors,
    })
    currentAttemptAnswers.value = []
    hintStep.value = null
    questionHadWrongAttempt.value = false
    questionIndex.value++
  }

  const playbackCallbacks: PlaybackStepCallbacks = {
    onStepStart: (step) => {
      playbackStep.value = step
    },
    onStepEnd: () => {
      playbackStep.value = null
    },
  }

  function playbackHighlightOptions(): PlaybackHighlightOptions {
    return { highlightQuestion: exerciseStore.config.highlightQuestionOnPlay }
  }

  async function start(): Promise<void> {
    phase.value = 'playing'
    questionIndex.value = 0
    completedQuestions.value = 0
    correctQuestions.value = 0
    questionHadWrongAttempt.value = false
    stepStats.value = {}
    stepResults.value = []
    attempts.value = []
    playback.setInstrument(exerciseStore.config.instrument)
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
    if (questionIndex.value === 0) {
      exerciseStore.buildQuestionPlan()
    }
    currentStep.value = exerciseStore.getQuestionStepAt(questionIndex.value)
    if (!exerciseStore.trainingSteps.includes(currentStep.value)) {
      const pool = exerciseStore.trainingSteps
      currentStep.value = pool[0] ?? exerciseStore.config.steps[0] ?? 1
    }
    currentAttemptAnswers.value = []
    hintStep.value = null
    questionHadWrongAttempt.value = false
    phase.value = 'playing'
    isPlaying.value = true
    await playback.playCadenceAndQuestion(
      exerciseStore.scale,
      currentStep.value,
      exerciseStore.config.bpm,
      playbackCallbacks,
      playbackHighlightOptions(),
    )
    isPlaying.value = false
    playbackStep.value = null
    phase.value = 'answering'
  }

  async function repeatQuestion(): Promise<void> {
    if (phase.value !== 'answering') return
    isPlaying.value = true
    await playback.playQuestionOnly(
      exerciseStore.scale,
      currentStep.value,
      exerciseStore.config.bpm,
      playbackCallbacks,
      playbackHighlightOptions(),
    )
    isPlaying.value = false
    playbackStep.value = null
  }

  async function repeatWithCadence(): Promise<void> {
    if (phase.value !== 'answering') return
    isPlaying.value = true
    await playback.playCadenceAndQuestion(
      exerciseStore.scale,
      currentStep.value,
      exerciseStore.config.bpm,
      playbackCallbacks,
      playbackHighlightOptions(),
    )
    isPlaying.value = false
    playbackStep.value = null
  }

  async function submitAnswer(step: number): Promise<void> {
    if (phase.value !== 'answering' || isPlaying.value) return
    if (!exerciseStore.trainingSteps.includes(step)) return
    currentAttemptAnswers.value.push(step)

    if (
      isAnswerCorrect(
        currentStep.value,
        step,
        exerciseStore.trainingSteps,
      )
    ) {
      finalizeQuestion(!questionHadWrongAttempt.value, false)
      if (shouldPlayReinforcement(currentStep.value)) {
        phase.value = 'reinforcing'
        isPlaying.value = true
        await playback.playReinforcement(
          exerciseStore.scale,
          currentStep.value,
          exerciseStore.config.bpm,
          playbackCallbacks,
        )
        isPlaying.value = false
        playbackStep.value = null
      }
      if (questionIndex.value >= totalQuestions.value) {
        phase.value = 'finished'
        await saveSession()
      } else {
        await nextQuestion()
      }
      return
    }

    questionHadWrongAttempt.value = true
    if (exerciseStore.config.showHintAfterError) {
      hintStep.value = currentStep.value
    }
  }

  async function skipQuestion(): Promise<void> {
    if (phase.value !== 'answering') return
    finalizeQuestion(false, true)
    if (exerciseStore.config.showHintAfterError) {
      hintStep.value = currentStep.value
    }
    if (questionIndex.value >= totalQuestions.value) {
      phase.value = 'finished'
      await saveSession()
      return
    }
    await nextQuestion()
  }

  function abort(): void {
    playback.abort()
    playbackStep.value = null
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
      mode: 'stepGuess',
      totalQuestions: completedQuestions.value,
      correctQuestions: correctQuestions.value,
      stepStats: Object.fromEntries(
        Object.entries(stepStats.value).map(([k, v]) => [k, v]),
      ),
      attempts: attempts.value,
    }
    await db.sessions.add(record)
  }

  return {
    phase,
    questionIndex,
    currentStep,
    hintStep,
    isPlaying,
    playbackStep,
    completedQuestions,
    correctQuestions,
    failedQuestions,
    questionHadWrongAttempt,
    stepStats,
    stepResults,
    guessedSteps,
    missedSteps,
    percent,
    progressLabel,
    start,
    nextQuestion,
    repeatQuestion,
    repeatWithCadence,
    submitAnswer,
    skipQuestion,
    abort,
  }
}
