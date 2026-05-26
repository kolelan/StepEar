<script setup lang="ts">
import { computed } from 'vue'
import { formatChordForStep } from '@/music/notation'
import type { ScaleDefinition, NotationMode } from '@/music/types'

const props = defineProps<{
  scale: ScaleDefinition
  notationMode: NotationMode
  activeSteps: number[]
  disabled?: boolean
  highlightStep?: number | null
  hintStep?: number | null
}>()

const emit = defineEmits<{
  select: [step: number]
}>()

const steps = computed(() => props.activeSteps.filter((s) => s >= 1 && s <= 7))

function label(step: number): string {
  return formatChordForStep(step, props.scale, props.notationMode)
}

function btnClass(step: number): Record<string, boolean> {
  return {
    'step-btn': true,
    'step-btn--hint': props.hintStep === step,
    'step-btn--highlight': props.highlightStep === step,
  }
}
</script>

<template>
  <div class="step-grid">
    <button
      v-for="step in steps"
      :key="step"
      type="button"
      :class="btnClass(step)"
      :disabled="disabled"
      @click="emit('select', step)"
    >
      <span class="step-num">{{ step }}</span>
      <span class="step-notes">{{ label(step) }}</span>
    </button>
  </div>
</template>

<style scoped>
.step-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: 0.6rem;
}

.step-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 4.5rem;
  padding: 0.5rem;
  border: 2px solid var(--surface2);
  border-radius: var(--radius);
  background: var(--surface2);
  color: var(--text);
  cursor: pointer;
}

.step-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.step-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.step-btn--hint {
  border-color: var(--color-warn);
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35);
}

.step-btn--highlight {
  border-color: var(--color-ok);
}

.step-num {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.step-notes {
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 0.2rem;
  text-align: center;
}
</style>
