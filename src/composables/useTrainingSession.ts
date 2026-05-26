import { computed, ref } from 'vue'
import { playback } from '@/audio/playback'
import { useExerciseStore } from '@/stores/exercise'
import { db, type SessionRecord } from '@/db/database'
import type { NoteName } from '@/music/types'

export type Phase = 'idle' | 'playing' | 'answering' | 'reinforcing' | 'finished'

export function useTrainingSession() {
  const exerciseStore = useExerciseStore()

  const phase = ref<Phase>('idle')
  const questionIndex = ref(0)
  const currentStep = ref(1)
  const hintStep = ref<number | null>(null)
  const isPlaying = ref(false)

  const completedQuestions = ref(0)
  const correctQuestions = ref(0)
  const stepStats = ref<Record<number, { asked: number; correct: number }>>({})
  const attempts = ref<SessionRecord['attempts']>([])

  const currentAttemptAnswers = ref<number[]>([])

  const totalQuestions = computed(() => exerciseStore.config.questionCount)
  const percent = computed(() => {
    if (completedQuestions.value === 0) return 0
    return Math.round((correctQuestions.value / completedQuestions.value) * 100)
  })

  const progressLabel = computed(() => {
    if (phase.value === 'finished') return 'Готово'
    return `Вопрос ${Math.min(questionIndex.value + 1, totalQuestions.value)} из ${totalQuestions.value}`
  })

  function recordStepStat(step: number, correct: boolean): void {
    if (!stepStats.value[step]) stepStats.value[step] = { asked: 0, correct: 0 }
    stepStats.value[step].asked++
    if (correct) stepStats.value[step].correct++
  }

  function finalizeQuestion(eventuallyCorrect: boolean, skipped: boolean): void {
    completedQuestions.value++
    if (eventuallyCorrect) correctQuestions.value++
    recordStepStat(currentStep.value, eventuallyCorrect)
    attempts.value.push({
      questionStep: currentStep.value,
      answers: [...currentAttemptAnswers.value],
      skipped,
      eventuallyCorrect,
    })
    currentAttemptAnswers.value = []
    hintStep.value = null
    questionIndex.value++
  }

  async function start(): Promise<void> {
    phase.value = 'playing'
    questionIndex.value = 0
    completedQuestions.value = 0
    correctQuestions.value = 0
    stepStats.value = {}
    attempts.value = []
    playback.resetVoicing()
    await playback.unlock()
    await nextQuestion()
  }

  async function nextQuestion(): Promise<void> {
    if (questionIndex.value >= totalQuestions.value) {
      phase.value = 'finished'
      await saveSession()
      return
    }
    exerciseStore.resolveRootForQuestion()
    currentStep.value = exerciseStore.pickQuestionStep()
    currentAttemptAnswers.value = []
    hintStep.value = null
    phase.value = 'playing'
    isPlaying.value = true
    await playback.playCadenceAndQuestion(
      exerciseStore.scale,
      currentStep.value,
      exerciseStore.config.bpm,
    )
    isPlaying.value = false
    phase.value = 'answering'
  }

  async function repeatQuestion(): Promise<void> {
    if (phase.value !== 'answering') return
    isPlaying.value = true
    await playback.playQuestionOnly(
      exerciseStore.scale,
      currentStep.value,
      exerciseStore.config.bpm,
    )
    isPlaying.value = false
  }

  async function repeatWithCadence(): Promise<void> {
    if (phase.value !== 'answering') return
    isPlaying.value = true
    await playback.playCadenceAndQuestion(
      exerciseStore.scale,
      currentStep.value,
      exerciseStore.config.bpm,
    )
    isPlaying.value = false
  }

  async function submitAnswer(step: number): Promise<void> {
    if (phase.value !== 'answering' || isPlaying.value) return
    currentAttemptAnswers.value.push(step)

    if (step === currentStep.value) {
      finalizeQuestion(true, false)
      phase.value = 'reinforcing'
      isPlaying.value = true
      await playback.playReinforcement(
        exerciseStore.scale,
        currentStep.value,
        exerciseStore.config.bpm,
      )
      isPlaying.value = false
      if (questionIndex.value >= totalQuestions.value) {
        phase.value = 'finished'
        await saveSession()
      } else {
        await nextQuestion()
      }
      return
    }

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
      root: root as NoteName,
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
    completedQuestions,
    correctQuestions,
    stepStats,
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
