import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DEFAULT_BPM } from '@/music/constants'
import { buildMajorScale, pickRandomRoot } from '@/music/scale'
import type { NoteName } from '@/music/types'
import { DEFAULT_COLOR_THRESHOLDS } from '@/music/constants'

export interface ExerciseConfig {
  root: NoteName | 'random'
  steps: number[]
  questionCount: number
  bpm: number
  showHintAfterError: boolean
}

export const useExerciseStore = defineStore('exercise', () => {
  const config = ref<ExerciseConfig>({
    root: 'C',
    steps: [1, 2, 3, 4, 5, 6, 7],
    questionCount: 20,
    bpm: DEFAULT_BPM,
    showHintAfterError: false,
  })

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
  const scale = computed(() => buildMajorScale(currentRoot.value))

  function resolveRootForQuestion(): NoteName {
    if (config.value.root === 'random') {
      currentRoot.value = pickRandomRoot()
    } else {
      currentRoot.value = config.value.root
    }
    return currentRoot.value
  }

  function pickQuestionStep(): number {
    const pool = config.value.steps
    return pool[Math.floor(Math.random() * pool.length)]!
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
    allRoots,
    currentRoot,
    scale,
    resolveRootForQuestion,
    pickQuestionStep,
    percentColor,
  }
})
