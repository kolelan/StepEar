import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DEFAULT_BPM, DEFAULT_COLOR_THRESHOLDS } from '@/music/constants'
import { createDefaultOctaveConfig, filterPlayableSteps, migrateOctaveConfig } from '@/music/octaves'
import {
  buildBalancedQuestionPlan,
  pickRandomQuestionStep,
} from '@/music/question-plan'
import { buildMajorScale, pickRandomRoot } from '@/music/scale'
import type { SavedExercise } from '@/db/database'
import type { InstrumentId, NoteName, NotationMode, OctaveConfig } from '@/music/types'

export type ExerciseMode = 'stepGuess' | 'dictation'

export interface ExerciseConfig {
  mode: ExerciseMode
  root: NoteName | 'random'
  steps: number[]
  /** Число звуков ступеней в одном вопросе диктанта. */
  dictationSoundCount: number
  questionCount: number
  bpm: number
  showHintAfterError: boolean
  /** Подсвечивать кнопку ступени при проигрывании вопроса (каденция и закрепление всегда). */
  highlightQuestionOnPlay: boolean
  octaves: OctaveConfig
  instrument: InstrumentId
  balancedSteps: boolean
}

const ALL_STEP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export const useExerciseStore = defineStore('exercise', () => {
  const config = ref<ExerciseConfig>({
    mode: 'stepGuess',
    root: 'C',
    steps: [1, 2, 3, 4, 5, 6, 7],
    dictationSoundCount: 4,
    questionCount: 20,
    bpm: DEFAULT_BPM,
    showHintAfterError: false,
    highlightQuestionOnPlay: false,
    octaves: createDefaultOctaveConfig(),
    instrument: 'piano',
    balancedSteps: true,
  })

  const questionPlan = ref<number[]>([])

  const allRoots: NoteName[] = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ]

  const currentRoot = ref<NoteName>('C')
  const scale = computed(() =>
    buildMajorScale(currentRoot.value, config.value.octaves),
  )

  /** Ступени 1–7, помещающиеся в выбранные октавы (для чекбоксов). */
  const playableSteps = computed(() => {
    const root = config.value.root === 'random' ? currentRoot.value : config.value.root
    const s = buildMajorScale(root, config.value.octaves)
    return filterPlayableSteps(s.degrees, [...ALL_STEP_OPTIONS], config.value.octaves)
  })

  /** Все 8 ступеней в сетке тренировки (закрепление и каденция используют любые). */
  const displaySteps = computed(() => [...ALL_STEP_OPTIONS])

  /** Выбранные пользователем ступени, допустимые в текущей тональности и октавах — только из них задаются вопросы. */
  const trainingSteps = computed(() => {
    const root = config.value.root === 'random' ? currentRoot.value : config.value.root
    const s = buildMajorScale(root, config.value.octaves)
    return filterPlayableSteps(s.degrees, config.value.steps, config.value.octaves)
  })

  function syncStepsToOctaves(): void {
    const root = config.value.root === 'random' ? 'C' : config.value.root
    const s = buildMajorScale(root, config.value.octaves)
    const valid = filterPlayableSteps(s.degrees, config.value.steps, config.value.octaves)
    if (valid.length > 0) config.value.steps = valid
  }

  function buildQuestionPlan(): void {
    const steps = [...config.value.steps].sort((a, b) => a - b)
    if (steps.length === 0) {
      questionPlan.value = []
      return
    }
    if (config.value.balancedSteps) {
      questionPlan.value = buildBalancedQuestionPlan(steps, config.value.questionCount)
    } else {
      questionPlan.value = []
    }
  }

  function getQuestionStepAt(index: number): number {
    const pool = trainingSteps.value
    if (pool.length === 0) {
      return config.value.steps[0] ?? 1
    }

    if (config.value.balancedSteps && questionPlan.value.length > index) {
      const planned = questionPlan.value[index]!
      if (pool.includes(planned)) return planned
    }

    return pickRandomQuestionStep(pool)
  }

  function resolveRootForQuestion(): NoteName {
    if (config.value.root === 'random') {
      currentRoot.value = pickRandomRoot()
    } else {
      currentRoot.value = config.value.root
    }
    return currentRoot.value
  }

  function loadFromSaved(p: SavedExercise): void {
    config.value.mode = p.mode ?? 'stepGuess'
    config.value.dictationSoundCount = p.dictationSoundCount ?? 4
    config.value.root = p.root
    config.value.steps = [...p.steps]
    config.value.questionCount = p.questionCount
    config.value.bpm = p.bpm
    config.value.showHintAfterError = p.showHintAfterError
    config.value.highlightQuestionOnPlay = p.highlightQuestionOnPlay ?? false
    config.value.octaves = migrateOctaveConfig(p.octaves)
    config.value.instrument = p.instrument ?? 'piano'
    config.value.balancedSteps = p.balancedSteps ?? true
    syncStepsToOctaves()
  }

  function buildSavedExercise(name: string, notationMode: NotationMode): Omit<SavedExercise, 'id'> {
    return {
      name: name.trim(),
      mode: config.value.mode,
      dictationSoundCount: config.value.dictationSoundCount,
      root: config.value.root,
      steps: [...config.value.steps],
      questionCount: config.value.questionCount,
      bpm: config.value.bpm,
      showHintAfterError: config.value.showHintAfterError,
      highlightQuestionOnPlay: config.value.highlightQuestionOnPlay,
      notationMode,
      octaves: { ...config.value.octaves },
      instrument: config.value.instrument,
      balancedSteps: config.value.balancedSteps,
      createdAt: Date.now(),
    }
  }

  function percentColor(pct: number): string {
    const t = DEFAULT_COLOR_THRESHOLDS
    if (pct >= t.green) return 'var(--color-ok)'
    if (pct >= t.yellow) return 'var(--color-warn)'
    if (pct >= t.orange) return 'var(--color-mid)'
    return 'var(--color-bad)'
  }

  return {
    config,
    questionPlan,
    allRoots,
    currentRoot,
    scale,
    resolveRootForQuestion,
    buildQuestionPlan,
    getQuestionStepAt,
    playableSteps,
    displaySteps,
    trainingSteps,
    syncStepsToOctaves,
    migrateOctaveConfig,
    loadFromSaved,
    buildSavedExercise,
    percentColor,
  }
})
