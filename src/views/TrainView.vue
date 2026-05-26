<script setup lang="ts">
import { computed } from 'vue'
import { useExerciseStore } from '@/stores/exercise'
import DictationTrainPanel from '@/views/training/DictationTrainPanel.vue'
import StepGuessTrainPanel from '@/views/training/StepGuessTrainPanel.vue'

const exercise = useExerciseStore()
const isDictation = computed(() => exercise.config.mode === 'dictation')
</script>

<template>
  <div class="container">
    <DictationTrainPanel v-if="isDictation" />
    <StepGuessTrainPanel v-else />
  </div>
</template>
