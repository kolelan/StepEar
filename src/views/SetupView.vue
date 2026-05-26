<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import { getScaleLabel } from '@/music/scale'
import { db } from '@/db/database'
const router = useRouter()
const exercise = useExerciseStore()
const settings = useSettingsStore()

const presetName = ref('')
const saveMessage = ref('')

const stepOptions = [1, 2, 3, 4, 5, 6, 7]

function toggleStep(step: number, checked: boolean): void {
  const set = new Set(exercise.config.steps)
  if (checked) set.add(step)
  else set.delete(step)
  if (set.size === 0) return
  exercise.config.steps = [...set].sort((a, b) => a - b)
}

async function savePreset(): Promise<void> {
  if (!presetName.value.trim()) {
    saveMessage.value = 'Введите название'
    return
  }
  await db.exercises.add({
    name: presetName.value.trim(),
    root: exercise.config.root,
    steps: [...exercise.config.steps],
    questionCount: exercise.config.questionCount,
    bpm: exercise.config.bpm,
    showHintAfterError: exercise.config.showHintAfterError,
    notationMode: settings.notationMode,
    createdAt: Date.now(),
  })
  saveMessage.value = 'Сохранено'
  presetName.value = ''
}

function start(): void {
  router.push('/train')
}
</script>

<template>
  <div class="container">
    <h1>Настройка упражнения</h1>

    <div class="card">
      <div class="field">
        <label>Тональность</label>
        <select v-model="exercise.config.root">
          <option v-for="r in exercise.allRoots" :key="r" :value="r">
            {{ getScaleLabel(r) }}
          </option>
          <option value="random">Случайная (новая тональность на каждый вопрос)</option>
        </select>
      </div>

      <div class="field">
        <label>Ступени для тренировки (1–7)</label>
        <div class="check-grid">
          <label v-for="s in stepOptions" :key="s">
            <input
              type="checkbox"
              :checked="exercise.config.steps.includes(s)"
              @change="toggleStep(s, ($event.target as HTMLInputElement).checked)"
            />
            {{ s }}
          </label>
        </div>
      </div>

      <div class="field">
        <label>Количество вопросов</label>
        <input v-model.number="exercise.config.questionCount" type="number" min="1" max="200" />
      </div>

      <div class="field">
        <label>Темп (BPM)</label>
        <input v-model.number="exercise.config.bpm" type="number" min="40" max="160" />
      </div>

      <div class="field">
        <label>
          <input v-model="exercise.config.showHintAfterError" type="checkbox" />
          Показывать правильную ступень после ошибки
        </label>
      </div>

      <div class="field">
        <label>Обозначение нот</label>
        <select v-model="settings.notationMode" @change="settings.save()">
          <option value="letters">Буквы (C, D, E…)</option>
          <option value="degrees">Ступенные цифры</option>
        </select>
      </div>

      <div class="field">
        <label>Громкость</label>
        <input
          v-model.number="settings.volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          @change="settings.save()"
        />
      </div>
    </div>

    <div class="card">
      <h2>Сохранить пресет</h2>
      <div class="row">
        <input v-model="presetName" type="text" placeholder="Название упражнения" />
        <button type="button" class="btn btn-secondary" @click="savePreset">Сохранить</button>
      </div>
      <p v-if="saveMessage" class="muted">{{ saveMessage }}</p>
    </div>

    <button type="button" class="btn" @click="start">Начать тренировку</button>
  </div>
</template>
