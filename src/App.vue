<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <header class="nav">
    <RouterLink to="/">StepEar</RouterLink>
    <RouterLink to="/setup">Настройка</RouterLink>
    <RouterLink to="/train">Тренировка</RouterLink>
    <RouterLink to="/saved">Сохранённые</RouterLink>
    <RouterLink to="/auth">{{ auth.isLoggedIn ? 'Аккаунт' : 'Вход' }}</RouterLink>
  </header>
  <main>
    <RouterView />
  </main>
</template>
