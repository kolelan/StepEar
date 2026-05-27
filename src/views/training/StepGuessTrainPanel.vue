<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import StepButtons from '@/components/StepButtons.vue'
import { useTrainingSession } from '@/composables/useTrainingSession'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import { describeOctaveConfig, getScaleLabel } from '@/music/scale'

const exercise = useExerciseStore()
const settings = useSettingsStore()
const {
  phase,
  progressLabel,
  hintStep,
  isPlaying,
  highlightedPlaybackStep,
  correctQuestions,
  completedQuestions,
  failedQuestions,
  questionHadWrongAttempt,
  stepStats,
  guessedStepGroups,
  missedStepGroups,
  percent,
  start,
  repeatQuestion,
  repeatWithCadence,
  submitAnswer,
  skipQuestion,
  abort,
} = useTrainingSession()

const instrumentLabel = computed(() =>
  exercise.config.instrument === 'guitar' ? 'Гитара' : 'Фортепиано',
)

onMounted(() => {
  if (phase.value === 'idle') {
    exercise.config.showHintAfterError =
      exercise.config.showHintAfterError || settings.showHintAfterError
    void start()
  }
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
        <p class="muted">{{ progressLabel }}</p>
        <p>
          <strong>{{ getScaleLabel(exercise.currentRoot) }}</strong>
          · {{ instrumentLabel }}
        </p>
        <p class="muted octave-line">
          {{ describeOctaveConfig(exercise.config.octaves, exercise.currentRoot) }}
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

    <div v-if="guessedStepGroups.length || missedStepGroups.length" class="step-track">
      <p v-if="guessedStepGroups.length" class="step-track__row">
        <span class="stat-ok">Без ошибок:</span>
        <span class="step-groups">
          <span
            v-for="g in guessedStepGroups"
            :key="`ok-${g.step}`"
            class="step-chip step-chip--ok"
          >
            {{ g.step }}<span v-if="g.count > 1" class="step-chip__count">×{{ g.count }}</span>
          </span>
        </span>
      </p>
      <p v-if="missedStepGroups.length" class="step-track__row">
        <span class="stat-bad">С ошибкой или пропуск:</span>
        <span class="step-groups">
          <span
            v-for="g in missedStepGroups"
            :key="`bad-${g.step}`"
            class="step-chip step-chip--bad"
          >
            {{ g.step }}<span v-if="g.count > 1" class="step-chip__count">×{{ g.count }}</span>
          </span>
        </span>
      </p>
    </div>

    <p v-if="isPlaying" class="muted">Слушайте…</p>
    <p v-else-if="phase === 'answering'" class="muted">Выберите ступень</p>
    <p v-if="questionHadWrongAttempt && phase === 'answering'" class="stat-bad">
      На этом вопросе уже была ошибка — в зачёт не пойдёт
    </p>
    <p v-if="hintStep" class="muted">Подсказка: правильная ступень — {{ hintStep }}</p>

      <StepButtons
        :scale="exercise.scale"
        :notation-mode="settings.notationMode"
        :question-note-count="exercise.config.questionNoteCount"
        :question-chord-inversion="exercise.config.questionChordInversion"
        :visible-steps="exercise.displaySteps"
      :question-steps="exercise.trainingSteps"
      :can-answer="phase === 'answering' && !isPlaying"
      :playback-step="highlightedPlaybackStep"
      :hint-step="hintStep"
      @select="(s) => submitAnswer(s)"
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
        @click="repeatQuestion()"
      >
        Только вопрос
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
    <h2>Упражнение завершено</h2>
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

    <div class="step-track">
      <p v-if="guessedStepGroups.length" class="step-track__row">
        <span class="stat-ok">Без ошибок:</span>
        <span class="step-groups">
          <span
            v-for="g in guessedStepGroups"
            :key="`ok-f-${g.step}`"
            class="step-chip step-chip--ok"
          >
            {{ g.step }}<span v-if="g.count > 1" class="step-chip__count">×{{ g.count }}</span>
          </span>
        </span>
      </p>
      <p v-if="missedStepGroups.length" class="step-track__row">
        <span class="stat-bad">С ошибкой или пропуск:</span>
        <span class="step-groups">
          <span
            v-for="g in missedStepGroups"
            :key="`bad-f-${g.step}`"
            class="step-chip step-chip--bad"
          >
            {{ g.step }}<span v-if="g.count > 1" class="step-chip__count">×{{ g.count }}</span>
          </span>
        </span>
      </p>
    </div>

    <h3>По ступеням</h3>
    <ul class="step-stats">
      <li v-for="(stat, step) in stepStats" :key="step" v-show="stat.asked >= 1">
        Ступень {{ step }}: {{ stat.correct }}/{{ stat.asked }}
        <template v-if="stat.asked >= 2">
          ({{ Math.round((stat.correct / stat.asked) * 100) }}%)
        </template>
      </li>
    </ul>

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
.step-track {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}
.step-track__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.5rem;
  margin: 0.35rem 0;
}
.step-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.step-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.1rem;
  padding: 0.1rem 0.45rem;
  border-radius: 6px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.step-chip--ok {
  color: var(--color-ok);
  background: color-mix(in srgb, var(--color-ok) 12%, transparent);
}
.step-chip--bad {
  color: var(--color-bad);
  background: color-mix(in srgb, var(--color-bad) 12%, transparent);
}
.step-chip__count {
  font-size: 0.8em;
  font-weight: 500;
  opacity: 0.85;
}
.step-stats {
  margin: 0;
  padding-left: 1.2rem;
}
</style>
