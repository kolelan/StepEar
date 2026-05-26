<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DictationAnswerBar from '@/components/DictationAnswerBar.vue'
import StepButtons from '@/components/StepButtons.vue'
import { useDictationSession } from '@/composables/useDictationSession'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import { describeOctaveConfig, getScaleLabel } from '@/music/scale'

const exercise = useExerciseStore()
const settings = useSettingsStore()
const {
  phase,
  progressLabel,
  isPlaying,
  playbackStep,
  activeSlotIndex,
  userAnswer,
  expectedSequence,
  slotResults,
  soundCount,
  correctQuestions,
  completedQuestions,
  failedQuestions,
  percent,
  start,
  submitStep,
  repeatWithCadence,
  repeatSequenceOnly,
  undoLastStep,
  skipQuestion,
  abort,
} = useDictationSession()

const instrumentLabel = computed(() =>
  exercise.config.instrument === 'guitar' ? 'Гитара' : 'Фортепиано',
)

const showExpected = computed(
  () => phase.value === 'reviewing' && slotResults.value.some((r) => r === 'wrong'),
)

onMounted(() => {
  if (phase.value === 'idle') void start()
})

watch(
  () => settings.volume,
  () => settings.save(),
)
</script>

<template>
  <div v-if="phase === 'idle'" class="card">
    <p class="muted">Упражнение прервано или ещё не начато</p>
    <button type="button" class="btn" @click="start()">Начать</button>
  </div>

  <div v-else-if="phase !== 'finished'" class="card">
    <div class="row" style="justify-content: space-between; align-items: flex-start">
      <div>
        <p class="muted">{{ progressLabel }} · Гармонический диктант</p>
        <p>
          <strong>{{ getScaleLabel(exercise.currentRoot) }}</strong>
          · {{ instrumentLabel }}
        </p>
        <p class="muted octave-line">
          {{ describeOctaveConfig(exercise.config.octaves, exercise.currentRoot) }}
          · {{ soundCount }} звуков в вопросе
        </p>
      </div>
      <div>
        <span class="stat-pct" :style="{ color: exercise.percentColor(percent) }">
          {{ percent }}%
        </span>
      </div>
    </div>

    <div class="live-stats">
      <span class="stat-ok">Верных: {{ correctQuestions }} / {{ completedQuestions }}</span>
      <span v-if="failedQuestions > 0" class="stat-bad">С ошибкой: {{ failedQuestions }}</span>
    </div>

    <p v-if="isPlaying" class="muted">Слушайте…</p>
    <p v-else-if="phase === 'answering'" class="muted">
      Введите {{ soundCount }} ступеней подряд ({{ userAnswer.length }} / {{ soundCount }})
    </p>
    <p v-else-if="phase === 'reviewing' && !isPlaying" class="muted">Разбор ответа…</p>
    <p v-else-if="phase === 'reviewing' && isPlaying" class="muted">Повтор с подсветкой…</p>

    <DictationAnswerBar
      :length="soundCount"
      :user-steps="userAnswer"
      :expected-steps="showExpected ? expectedSequence : undefined"
      :slot-results="phase === 'reviewing' ? slotResults : undefined"
      :active-slot-index="activeSlotIndex"
    />

    <StepButtons
      :scale="exercise.scale"
      :notation-mode="settings.notationMode"
      :visible-steps="exercise.displaySteps"
      :question-steps="exercise.trainingSteps"
      :can-answer="phase === 'answering' && !isPlaying"
      :playback-step="playbackStep"
      @select="(s) => submitStep(s)"
    />

    <div class="row" style="margin-top: 1rem">
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="phase !== 'answering' || isPlaying"
        @click="repeatWithCadence()"
      >
        Повторить с каденцией
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="phase !== 'answering' || isPlaying"
        @click="repeatSequenceOnly()"
      >
        Только последовательность
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="phase !== 'answering' || isPlaying || userAnswer.length === 0"
        @click="undoLastStep()"
      >
        Отменить
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="phase !== 'answering' || isPlaying"
        @click="skipQuestion()"
      >
        Пропустить
      </button>
      <button type="button" class="btn btn-danger" @click="abort()">Прервать</button>
    </div>
  </div>

  <div v-else class="card">
    <h2>Диктант завершён</h2>
    <p>
      Результат:
      <span class="stat-pct" :style="{ color: exercise.percentColor(percent) }">
        {{ percent }}%
      </span>
      ({{ correctQuestions }} / {{ completedQuestions }} вопросов)
    </p>
    <p class="live-stats">
      <span class="stat-ok">Верных: {{ correctQuestions }} / {{ completedQuestions }}</span>
      <span v-if="failedQuestions > 0" class="stat-bad">С ошибкой: {{ failedQuestions }}</span>
    </p>
    <div class="row" style="margin-top: 1rem">
      <RouterLink class="btn" to="/setup">Новое упражнение</RouterLink>
      <button type="button" class="btn btn-secondary" @click="start()">Повторить</button>
    </div>
  </div>
</template>

<style scoped>
.octave-line {
  font-size: 0.8rem;
  margin: 0.25rem 0 0;
  max-width: 22rem;
}
.live-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  margin: 0.75rem 0;
  font-size: 0.95rem;
}
.stat-ok {
  color: var(--color-ok);
  font-weight: 600;
}
.stat-bad {
  color: var(--color-bad);
  font-weight: 600;
}
</style>
