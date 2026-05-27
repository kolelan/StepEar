<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useExerciseStore } from '@/stores/exercise'
import { useSettingsStore } from '@/stores/settings'
import {
  DEFAULT_CADENCE_NOTATION,
  parseCadenceNotation,
} from '@/music/cadence-notation'
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

const cadenceParse = computed(() => parseCadenceNotation(exercise.config.cadenceNotation))
const cadenceError = computed(() => (cadenceParse.value.ok ? '' : cadenceParse.value.error))

function resetCadenceToDefault(): void {
  exercise.config.cadenceNotation = DEFAULT_CADENCE_NOTATION
}

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
        <label for="setup-cadence">Вступительная каденция</label>
        <input
          id="setup-cadence"
          v-model="exercise.config.cadenceNotation"
          type="text"
          class="cadence-input"
          spellcheck="false"
          :placeholder="DEFAULT_CADENCE_NOTATION"
        />
        <p v-if="cadenceError" class="warn cadence-warn">
          {{ cadenceError }}
          При тренировке будет
          <button type="button" class="link-btn" @click="resetCadenceToDefault">
            {{ DEFAULT_CADENCE_NOTATION }}
          </button>
        </p>
        <p class="muted cadence-hint">
          Ступени через пробел:
          <code>1 4 5 1</code>
          или с обращением (вторая цифра 0–2):
          <code>1 42 51 1</code>
          (42 — IV в 2-м обращении, 51 — V в 1-м).
          Явные ноты в скобках, 1–10 нот:
          <code>[C4 E4 G4]</code>
          или
          <code>[C4 E4] [F4 A4] [G4 B4 D5] [C4 E4 G4]</code>
        </p>
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

      <div v-if="exercise.config.mode === 'stepGuess'" class="field field-one-line">
        <label class="field-one-line__check">
          <input v-model="exercise.config.balancedSteps" type="checkbox" />
          Равномерное распределение ступеней по вопросам
        </label>
        <span class="muted field-one-line__hint">
          — каждая выбранная ступень встречается примерно одинаково часто (без перекоса в случайную
          1-ю ступень)
        </span>
      </div>

      <div class="field field-pair">
        <div>
          <label>Нот в вопросе</label>
          <select v-model.number="exercise.config.questionNoteCount">
            <option :value="1">1 — главная нота аккорда (корень)</option>
            <option :value="2">2 — корень и терция (большая или малая)</option>
            <option :value="3">3 — трезвучие ступени</option>
            <option :value="4">4 — септаккорд в тональности</option>
          </select>
        </div>
        <div>
          <label>Обращение в вопросе</label>
          <select v-model="exercise.config.questionChordInversion">
            <option value="root">Корень внизу (до мажор: C–E–G)</option>
            <option value="first">Первое обращение (E–G–C)</option>
            <option value="second">Второе обращение (G–C–E)</option>
          </select>
        </div>
        <p class="muted field-pair__hint">
          Только вопрос и диктант. Каденция и закрепление — корень внизу, все ноты в выбранных
          октавах. Главная нота ступени всегда в разрешённом диапазоне.
        </p>
      </div>

      <div v-if="exercise.config.mode === 'stepGuess'" class="field field-pair">
        <div>
          <label>Нот в закреплении</label>
          <select v-model.number="exercise.config.reinforcementNoteCount">
            <option :value="1">1 — главная нота (корень)</option>
            <option :value="2">2 — корень и терция (большая или малая)</option>
            <option :value="3">3 — трезвучие ступени</option>
          </select>
        </div>
        <p class="muted field-pair__hint">
          После верного ответа. Корень внизу, терция по гармонии ступени в тональности.
        </p>
      </div>

      <div class="field field-tempos">
        <div class="field-tempos__item">
          <label for="setup-bpm">Темп вопроса (BPM)</label>
          <input
            id="setup-bpm"
            v-model.number="exercise.config.bpm"
            type="number"
            min="40"
            max="160"
          />
        </div>
        <div class="field-tempos__item">
          <label for="setup-cadence-bpm">Темп каденции (BPM)</label>
          <input
            id="setup-cadence-bpm"
            v-model.number="exercise.config.cadenceBpm"
            type="number"
            min="40"
            max="160"
          />
        </div>
        <div v-if="exercise.config.mode === 'stepGuess'" class="field-tempos__item">
          <label for="setup-reinforcement-bpm">Темп закрепления (BPM)</label>
          <input
            id="setup-reinforcement-bpm"
            v-model.number="exercise.config.reinforcementBpm"
            type="number"
            min="40"
            max="160"
          />
        </div>
        <p class="muted field-tempos__hint">
          Длительность аккорда: 60/темп с (одна доля). Пауза: каденция 0,5 с, закрепление ~0,12 с
          (ещё короче при высоком темпе).
        </p>
      </div>

      <div class="settings-row">
        <div class="settings-row__item">
          <label for="setup-question-count">Количество вопросов</label>
          <input
            id="setup-question-count"
            v-model.number="exercise.config.questionCount"
            type="number"
            min="1"
            max="200"
          />
        </div>

        <template v-if="exercise.config.mode === 'stepGuess'">
          <label class="settings-row__check">
            <input v-model="exercise.config.showHintAfterError" type="checkbox" />
            Показывать правильную ступень после ошибки
          </label>

          <label class="settings-row__check">
            <input v-model="exercise.config.highlightQuestionOnPlay" type="checkbox" />
            Подсвечивать ступень при проигрывании вопроса
          </label>
        </template>

        <template v-else>
          <label class="settings-row__check">
            <input v-model="exercise.config.highlightQuestionOnPlay" type="checkbox" />
            Подсвечивать цепочку при первом проигрывании
          </label>
        </template>

        <div class="settings-row__item settings-row__item--notation">
          <label for="setup-notation">Обозначение нот</label>
          <select id="setup-notation" v-model="settings.notationMode" @change="settings.save()">
            <option value="letters">Буквы (C, D, E…)</option>
            <option value="degrees">Ступенные цифры</option>
          </select>
        </div>
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
.field-one-line {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
}
.field-one-line__check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
}
.field-one-line__hint {
  font-size: 0.85rem;
  line-height: 1.35;
}
.field-pair {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem 1.5rem;
}
.field-pair > div {
  flex: 1 1 12rem;
  min-width: 0;
}
.field-pair__hint {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.35;
}
.field-tempos {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem 1.5rem;
  margin-bottom: 1rem;
}
.field-tempos__item {
  flex: 0 1 auto;
}
.field-tempos__item label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  white-space: nowrap;
}
.field-tempos__item input {
  width: 5.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--surface2);
  background: var(--bg);
  color: var(--text);
}
.field-tempos__hint {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.35;
}
.settings-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  margin-bottom: 1rem;
}
.settings-row__item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.settings-row__item label {
  margin: 0;
  font-size: 0.9rem;
  white-space: nowrap;
}
.settings-row__item input[type='number'],
.settings-row__item select {
  width: auto;
  min-width: 4.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--surface2);
  background: var(--bg);
  color: var(--text);
}
.settings-row__item--notation select {
  min-width: 11rem;
}
.settings-row__check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1.35;
}
.cadence-input {
  width: 100%;
  font-family: ui-monospace, monospace;
  font-size: 0.95rem;
}
.cadence-hint {
  margin: 0.5rem 0 0;
  line-height: 1.45;
}
.cadence-hint code {
  font-size: 0.85em;
}
.cadence-warn {
  margin: 0.5rem 0 0;
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
