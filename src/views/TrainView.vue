<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import StepButtons from '@/components/StepButtons.vue'
import { useTrainingSession } from '@/composables/useTrainingSession'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import { getScaleLabel } from '@/music/scale'

const exercise = useExerciseStore()
const settings = useSettingsStore()
const {
  phase,
  progressLabel,
  hintStep,
  isPlaying,
  correctQuestions,
  completedQuestions,
  stepStats,
  percent,
  start,
  repeatQuestion,
  repeatWithCadence,
  submitAnswer,
  skipQuestion,
  abort,
} = useTrainingSession()

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
  <div class="container">
    <div v-if="phase === 'idle'" class="card">
      <p class="muted">Упражнение прервано или ещё не начато</p>
      <button type="button" class="btn" @click="start()">Начать</button>
    </div>

    <div v-else-if="phase !== 'finished'" class="card">
      <div class="row" style="justify-content: space-between">
        <div>
          <p class="muted">{{ progressLabel }}</p>
          <p>
            <strong>{{ getScaleLabel(exercise.currentRoot) }}</strong>
          </p>
        </div>
        <div>
          <span class="stat-pct" :style="{ color: exercise.percentColor(percent) }">
            {{ percent }}%
          </span>
        </div>
      </div>

      <p v-if="isPlaying" class="muted">Слушайте…</p>
      <p v-else-if="phase === 'answering'" class="muted">Выберите ступень</p>
      <p v-if="hintStep" class="muted">Подсказка: правильная ступень — {{ hintStep }}</p>

      <StepButtons
        :scale="exercise.scale"
        :notation-mode="settings.notationMode"
        :active-steps="exercise.config.steps"
        :disabled="phase !== 'answering' || isPlaying"
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
        ({{ correctQuestions }} / {{ completedQuestions }})
      </p>

      <h3>По ступеням</h3>
      <ul class="step-stats">
        <li v-for="(stat, step) in stepStats" :key="step" v-show="stat.asked >= 2">
          Ступень {{ step }}: {{ Math.round((stat.correct / stat.asked) * 100) }}%
          ({{ stat.correct }}/{{ stat.asked }})
        </li>
      </ul>
      <p v-if="Object.keys(stepStats).length === 0" class="muted">
        Недостаточно данных по отдельным ступеням
      </p>

      <div class="row" style="margin-top: 1rem">
        <RouterLink class="btn" to="/setup">Новое упражнение</RouterLink>
        <button type="button" class="btn btn-secondary" @click="start()">Повторить</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-stats {
  margin: 0;
  padding-left: 1.2rem;
}
</style>
