<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, type SavedExercise } from '@/db/database'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import { getScaleLabel } from '@/music/scale'
import type { NoteName } from '@/music/types'

const router = useRouter()
const exercise = useExerciseStore()
const settings = useSettingsStore()
const list = ref<SavedExercise[]>([])

async function load(): Promise<void> {
  list.value = await db.exercises.orderBy('createdAt').reverse().toArray()
}

function apply(p: SavedExercise): void {
  exercise.loadFromSaved(p)
  settings.notationMode = p.notationMode
  void settings.save()
  router.push('/train')
}

function editPreset(p: SavedExercise): void {
  router.push({ path: '/setup', query: { edit: String(p.id) } })
}

function modeLabel(mode?: SavedExercise['mode']): string {
  return mode === 'dictation' ? 'Гармонический диктант' : 'Угадай ступень'
}

async function remove(id: number): Promise<void> {
  await db.exercises.delete(id)
  await load()
}

function rootLabel(root: NoteName | 'random'): string {
  if (root === 'random') return 'Случайная'
  return getScaleLabel(root)
}

onMounted(load)
</script>

<template>
  <div class="container">
    <h1>Сохранённые упражнения</h1>
    <p v-if="list.length === 0" class="muted">Пока нет сохранённых пресетов</p>
    <div v-for="item in list" :key="item.id" class="card">
      <h2>{{ item.name }}</h2>
      <p class="muted">
        {{ modeLabel(item.mode) }} · {{ rootLabel(item.root) }} · ступени
        {{ item.steps.join(', ') }} · {{ item.questionCount }} вопросов · {{ item.bpm }} BPM
        <template v-if="item.mode === 'dictation'">
          · {{ item.dictationSoundCount ?? 4 }} звуков
        </template>
      </p>
      <div class="row preset-actions">
        <button type="button" class="btn" @click="apply(item)">Начать</button>
        <button type="button" class="btn btn-secondary" @click="editPreset(item)">
          Изменить
        </button>
        <button type="button" class="btn btn-danger" @click="remove(item.id!)">
          Удалить
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preset-actions {
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
