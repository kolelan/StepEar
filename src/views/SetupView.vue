<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import { buildMajorScale, describeOctaveConfig, getScaleLabel } from '@/music/scale'
import { filterPlayableSteps, PIANO_OCTAVE_DEFS } from '@/music/octaves'
import type { PianoOctaveId } from '@/music/types'
import { db } from '@/db/database'
import type { NoteName } from '@/music/types'

const router = useRouter()
const route = useRoute()
const exercise = useExerciseStore()
const settings = useSettingsStore()

const presetName = ref('')
const saveMessage = ref('')
const editingId = ref<number | null>(null)
const editingCreatedAt = ref<number | null>(null)

const isEditing = computed(() => editingId.value != null)

const stepOptions = [1, 2, 3, 4, 5, 6, 7, 8]
const pianoOctaves = PIANO_OCTAVE_DEFS

const previewRoot = computed<NoteName>(() =>
  exercise.config.root === 'random' ? 'C' : exercise.config.root,
)

const octaveHint = computed(() =>
  describeOctaveConfig(exercise.config.octaves, previewRoot.value),
)

const trainingStepsPreview = computed(() => {
  const scale = buildMajorScale(previewRoot.value, exercise.config.octaves)
  return filterPlayableSteps(scale.degrees, exercise.config.steps, exercise.config.octaves)
})

const excludedSteps = computed(() =>
  exercise.config.steps.filter((s) => !trainingStepsPreview.value.includes(s)),
)

function toggleStep(step: number, checked: boolean): void {
  const set = new Set(exercise.config.steps)
  if (checked) set.add(step)
  else set.delete(step)
  if (set.size === 0) return
  exercise.config.steps = [...set].sort((a, b) => a - b)
}

function toggleOctave(id: PianoOctaveId, checked: boolean): void {
  const o = { ...exercise.config.octaves, [id]: checked }
  const any = pianoOctaves.some((def) => o[def.id])
  if (!any) return
  exercise.config.octaves = o
  exercise.syncStepsToOctaves()
}

watch(
  () => exercise.config.root,
  () => exercise.syncStepsToOctaves(),
)

async function loadEditingPreset(id: number): Promise<void> {
  const p = await db.exercises.get(id)
  if (!p?.id) {
    saveMessage.value = 'Пресет не найден'
    return
  }
  editingId.value = p.id
  editingCreatedAt.value = p.createdAt
  presetName.value = p.name
  exercise.loadFromSaved(p)
  settings.notationMode = p.notationMode
  saveMessage.value = ''
}

async function savePreset(): Promise<void> {
  if (!presetName.value.trim()) {
    saveMessage.value = 'Введите название'
    return
  }
  const data = exercise.buildSavedExercise(presetName.value, settings.notationMode)
  if (editingId.value != null) {
    await db.exercises.put({
      ...data,
      id: editingId.value,
      createdAt: editingCreatedAt.value ?? data.createdAt,
    })
    saveMessage.value = 'Изменения сохранены'
  } else {
    await db.exercises.add(data)
    saveMessage.value = 'Сохранено'
    presetName.value = ''
  }
}

function cancelEditing(): void {
  editingId.value = null
  editingCreatedAt.value = null
  presetName.value = ''
  saveMessage.value = ''
  router.replace({ path: '/setup' })
}

onMounted(async () => {
  const raw = route.query.edit
  const id = typeof raw === 'string' ? Number(raw) : NaN
  if (Number.isFinite(id) && id > 0) {
    await loadEditingPreset(id)
  }
})

watch(
  () => route.query.edit,
  async (raw) => {
    const id = typeof raw === 'string' ? Number(raw) : NaN
    if (Number.isFinite(id) && id > 0) {
      await loadEditingPreset(id)
    } else if (!raw) {
      editingId.value = null
      editingCreatedAt.value = null
    }
  },
)

function start(): void {
  if (trainingStepsPreview.value.length === 0) {
    saveMessage.value = 'Нет выбранных ступеней, подходящих под октавы и тональность'
    return
  }
  if (exercise.config.mode === 'dictation') {
    const n = exercise.config.dictationSoundCount
    if (n < 2 || n > 12) {
      saveMessage.value = 'Число звуков в вопросе: от 2 до 12'
      return
    }
  }
  router.push('/train')
}
</script>

<template>
  <div class="container">
    <h1>{{ isEditing ? 'Редактирование упражнения' : 'Настройка упражнения' }}</h1>
    <p v-if="isEditing" class="muted edit-banner">
      Редактируется пресет «{{ presetName }}».
      <button type="button" class="link-btn" @click="cancelEditing">Отменить</button>
      или
      <RouterLink to="/saved">вернуться к списку</RouterLink>.
    </p>

    <div class="card">
      <div class="field">
        <label>Тип упражнения</label>
        <div class="mode-options">
          <label class="mode-option">
            <input v-model="exercise.config.mode" type="radio" value="stepGuess" />
            Угадай ступень
          </label>
          <label class="mode-option">
            <input v-model="exercise.config.mode" type="radio" value="dictation" />
            Гармонический диктант
          </label>
        </div>
        <p v-if="exercise.config.mode === 'dictation'" class="muted">
          После каденции звучит цепочка ступеней — нужно ввести их подряд в том же порядке.
        </p>
      </div>

      <div v-if="exercise.config.mode === 'dictation'" class="field">
        <label>Звуков в одном вопросе</label>
        <input
          v-model.number="exercise.config.dictationSoundCount"
          type="number"
          min="2"
          max="12"
        />
        <p class="muted">Случайные ступени из разрешённых ниже (повторы возможны).</p>
      </div>

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
        <label>Инструмент</label>
        <select v-model="exercise.config.instrument">
          <option value="piano">Фортепиано</option>
          <option value="guitar">Классическая гитара (нейлон)</option>
        </select>
      </div>

      <div class="field">
        <label>Октавы (диапазон фортепиано A0–C8)</label>
        <p class="muted octave-note">
          Тоника — в <strong>нижней</strong> выбранной октаве. Корень ступени — в её октаве;
          верхние звуки аккорда — в следующих выбранных октавах при необходимости.
        </p>
        <div class="octave-grid">
          <label v-for="def in pianoOctaves" :key="def.id" class="octave-label">
            <input
              type="checkbox"
              :checked="exercise.config.octaves[def.id]"
              @change="toggleOctave(def.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ def.label }}</span>
          </label>
        </div>
        <p class="muted preview">{{ octaveHint }}</p>
        <p v-if="excludedSteps.length" class="warn">
          Не помещаются в октавы: ступени {{ excludedSteps.join(', ') }}
        </p>
      </div>

      <div class="field">
        <label>
          {{
            exercise.config.mode === 'dictation'
              ? 'Ступени в последовательности (1–8)'
              : 'Ступени для тренировки (1–8)'
          }}
        </label>
        <p class="muted octave-note">
          Доступность: по <strong>первой ноте</strong> ступени (корню) в выбранных октавах.
          <template v-if="exercise.config.mode === 'stepGuess'">
            Верхние звуки аккорда могут звучать выше. <strong>1-я и 8-я</strong> — одна тоника при
            ответе (если выбрана только одна); закрепление после них не играется.
          </template>
          <template v-else>
            В диктанте из отмеченных ступеней случайно выбирается каждый звук цепочки.
          </template>
        </p>
        <div class="check-grid">
          <label v-for="s in stepOptions" :key="s">
            <input
              type="checkbox"
              :checked="exercise.config.steps.includes(s)"
              :disabled="!exercise.playableSteps.includes(s)"
              @change="toggleStep(s, ($event.target as HTMLInputElement).checked)"
            />
            {{ s }}
          </label>
        </div>
        <p class="muted">
          {{
            exercise.config.mode === 'dictation' ? 'В цепочке могут звучать:' : 'В вопросах будут:'
          }}
          {{ trainingStepsPreview.join(', ') || '—' }}
          (из выбранных {{ exercise.config.steps.join(', ') }})
        </p>
      </div>

      <div v-if="exercise.config.mode === 'stepGuess'" class="field">
        <label>
          <input v-model="exercise.config.balancedSteps" type="checkbox" />
          Равномерное распределение ступеней по вопросам
        </label>
        <p class="muted">
          Каждая выбранная ступень встречается примерно одинаково часто (без перекоса в случайную
          1-ю ступень).
        </p>
      </div>

      <div class="field">
        <label>Количество вопросов</label>
        <input v-model.number="exercise.config.questionCount" type="number" min="1" max="200" />
      </div>

      <div class="field">
        <label>Темп (BPM)</label>
        <input v-model.number="exercise.config.bpm" type="number" min="40" max="160" />
      </div>

      <template v-if="exercise.config.mode === 'stepGuess'">
        <div class="field">
          <label>
            <input v-model="exercise.config.showHintAfterError" type="checkbox" />
            Показывать правильную ступень после ошибки
          </label>
        </div>

        <div class="field">
          <label>
            <input v-model="exercise.config.highlightQuestionOnPlay" type="checkbox" />
            Подсвечивать ступень при проигрывании вопроса
          </label>
          <p class="muted">
            Каденция и закрепление подсвечиваются всегда. По умолчанию вопрос не подсвечивается.
          </p>
        </div>
      </template>

      <template v-else>
        <div class="field">
          <label>
            <input v-model="exercise.config.highlightQuestionOnPlay" type="checkbox" />
            Подсвечивать цепочку при первом проигрывании
          </label>
          <p class="muted">
            Каденция и повтор после ответа подсвечиваются всегда. По умолчанию цепочка вопроса не
            подсвечивается.
          </p>
        </div>
      </template>

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
      <h2>{{ isEditing ? 'Сохранить изменения' : 'Сохранить пресет' }}</h2>
      <div class="row">
        <input v-model="presetName" type="text" placeholder="Название упражнения" />
        <button type="button" class="btn btn-secondary" @click="savePreset">
          {{ isEditing ? 'Обновить пресет' : 'Сохранить' }}
        </button>
      </div>
      <p v-if="saveMessage" class="muted">{{ saveMessage }}</p>
    </div>

    <button type="button" class="btn" :disabled="trainingStepsPreview.length === 0" @click="start">
      {{
        exercise.config.mode === 'dictation' ? 'Начать диктант' : 'Начать тренировку'
      }}
    </button>
  </div>
</template>

<style scoped>
.octave-note {
  margin: 0 0 0.5rem;
  line-height: 1.45;
}
.octave-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.octave-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.preview {
  margin-top: 0.5rem;
  font-size: 0.85rem;
}
.warn {
  color: var(--color-warn);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
.mode-options {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  margin-top: 0.35rem;
}
.mode-option {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
}
.edit-banner {
  margin: 0 0 1rem;
}
.link-btn {
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
.link-btn:hover {
  color: var(--accent-hover);
}
</style>
