<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="container">
    <h1>Слуховой тренажёр</h1>
    <p class="muted">
      Угадай ступень или запиши цепочку ступеней после каденции. Каденция T–S–D–T (1–4–5–1), мажорные
      тональности.
    </p>
    <div class="card">
      <div class="row">
        <RouterLink class="btn" to="/setup">Настроить упражнение</RouterLink>
        <RouterLink class="btn btn-secondary" to="/train">Быстрый старт</RouterLink>
      </div>
    </div>
    <p class="muted">
      Фаза 1: фортепиано, ступени 1–7, статистика сессии, сохранение упражнений, локальный вход.
    </p>
  </div>
</template>
