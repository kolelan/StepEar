<script setup lang="ts">
import { computed } from 'vue'
import { formatChordForStep } from '@/music/notation'
import type { NotationMode, QuestionChordInversion, ScaleDefinition } from '@/music/types'

const props = defineProps<{
  scale: ScaleDefinition
  notationMode: NotationMode
  questionNoteCount?: number
  questionChordInversion?: QuestionChordInversion
  /** Все ступени, видимые в сетке (выбраны в упражнении). */
  visibleSteps: number[]
  /** Ступени, на которые можно отвечать в вопросах. */
  questionSteps: number[]
  /** Разрешить нажатия (фаза ответа). */
  canAnswer?: boolean
  playbackStep?: number | null
  hintStep?: number | null
}>()

const emit = defineEmits<{
  select: [step: number]
}>()

const steps = computed(() => props.visibleSteps.filter((s) => s >= 1 && s <= 8))

const questionSet = computed(() => new Set(props.questionSteps))

function label(step: number): string {
  return formatChordForStep(
    step,
    props.scale,
    props.notationMode,
    props.questionNoteCount,
    props.questionChordInversion,
  )
}

function isQuestionStep(step: number): boolean {
  return questionSet.value.has(step)
}

function isPlaybackStep(step: number): boolean {
  return props.playbackStep === step
}

function btnClass(step: number): Record<string, boolean> {
  const forQuestions = isQuestionStep(step)
  return {
    'step-btn': true,
    'step-btn--inactive': !forQuestions,
    'step-btn--hint': props.hintStep === step && forQuestions,
    'step-btn--playback': isPlaybackStep(step),
  }
}

function isDisabled(step: number): boolean {
  return !props.canAnswer || !isQuestionStep(step)
}

function onClick(step: number): void {
  if (isDisabled(step)) return
  emit('select', step)
}
</script>

<template>
  <div
    class="step-grid"
    :style="{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="step in steps"
      :key="step"
      type="button"
      :class="btnClass(step)"
      :disabled="isDisabled(step)"
      :aria-disabled="isDisabled(step)"
      @click="onClick(step)"
    >
      <span class="step-num">{{ step }}</span>
      <span class="step-notes">{{ label(step) }}</span>
    </button>
  </div>
</template>

<style scoped>
.step-grid {
  display: grid;
  gap: 0.35rem;
  width: 100%;
}

.step-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 3.25rem;
  padding: 0.35rem 0.15rem;
  border: 2px solid var(--surface2);
  border-radius: var(--radius);
  background: var(--surface2);
  color: var(--text);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.step-btn:hover:not(:disabled):not(.step-btn--inactive) {
  border-color: var(--accent);
}

.step-btn:disabled {
  cursor: not-allowed;
}

.step-btn--inactive {
  opacity: 0.42;
  background: var(--surface);
  border-color: var(--surface);
  color: var(--muted);
}

.step-btn--inactive .step-num {
  color: var(--muted);
}

.step-btn--inactive:disabled {
  opacity: 0.42;
}

.step-btn--playback {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 18%, var(--surface2));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
  opacity: 1;
}

.step-btn--playback.step-btn--inactive {
  opacity: 0.72;
}

.step-btn--hint {
  border-color: var(--color-warn);
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35);
}

.step-num {
  font-size: clamp(0.95rem, 3.2vw, 1.5rem);
  font-weight: 700;
  line-height: 1.1;
}

.step-notes {
  font-size: clamp(0.5rem, 1.8vw, 0.7rem);
  color: var(--muted);
  margin-top: 0.15rem;
  text-align: center;
  line-height: 1.1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-btn--inactive .step-notes {
  opacity: 0.85;
}
</style>
