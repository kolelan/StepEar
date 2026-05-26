<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  length: number
  userSteps: number[]
  expectedSteps?: number[]
  slotResults?: Array<'correct' | 'wrong'>
  activeSlotIndex?: number | null
}>()

const slots = computed(() =>
  Array.from({ length: props.length }, (_, i) => ({
    index: i,
    user: props.userSteps[i] ?? null,
    expected: props.expectedSteps?.[i] ?? null,
    result: props.slotResults?.[i] ?? null,
    active: props.activeSlotIndex === i,
  })),
)
</script>

<template>
  <div class="answer-bar">
    <div
      v-for="slot in slots"
      :key="slot.index"
      class="answer-slot"
      :class="{
        'answer-slot--filled': slot.user != null,
        'answer-slot--correct': slot.result === 'correct',
        'answer-slot--wrong': slot.result === 'wrong',
        'answer-slot--active': slot.active,
      }"
    >
      <span class="answer-slot__num">{{ slot.index + 1 }}</span>
      <span class="answer-slot__step">{{ slot.user ?? '—' }}</span>
      <span
        v-if="slot.result === 'correct'"
        class="answer-slot__mark answer-slot__mark--ok"
        aria-hidden="true"
      >
        ✓
      </span>
      <span
        v-else-if="slot.result === 'wrong'"
        class="answer-slot__mark answer-slot__mark--bad"
        aria-hidden="true"
      >
        ✗
      </span>
    </div>
  </div>
  <p v-if="expectedSteps?.length && slotResults?.some((r) => r === 'wrong')" class="expected-line muted">
    Верно: {{ expectedSteps.join(' ') }}
  </p>
</template>

<style scoped>
.answer-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.35rem;
  margin: 0.75rem 0;
  width: 100%;
}

.answer-slot {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.2rem;
  border: 2px solid var(--surface2);
  border-radius: var(--radius);
  background: var(--surface2);
  min-height: 3rem;
}

.answer-slot--filled {
  border-color: var(--accent);
}

.answer-slot--correct {
  border-color: var(--color-ok);
  background: color-mix(in srgb, var(--color-ok) 15%, var(--surface2));
}

.answer-slot--wrong {
  border-color: var(--color-bad);
  background: color-mix(in srgb, var(--color-bad) 15%, var(--surface2));
}

.answer-slot--active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
}

.answer-slot__num {
  font-size: 0.6rem;
  color: var(--muted);
}

.answer-slot__step {
  font-size: clamp(1rem, 4vw, 1.4rem);
  font-weight: 700;
  line-height: 1.2;
}

.answer-slot__mark {
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 0.1rem;
}

.answer-slot__mark--ok {
  color: var(--color-ok);
}

.answer-slot__mark--bad {
  color: var(--color-bad);
}

.expected-line {
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
}
</style>
