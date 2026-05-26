<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const error = ref('')

async function submit(): Promise<void> {
  error.value = ''
  if (!email.value || password.value.length < 4) {
    error.value = 'Email и пароль (мин. 4 символа) обязательны'
    return
  }
  const err =
    mode.value === 'register'
      ? await auth.register(email.value, password.value)
      : await auth.login(email.value, password.value)
  if (err) error.value = err
  else {
    email.value = ''
    password.value = ''
  }
}
</script>

<template>
  <div class="container">
    <h1>Аккаунт</h1>
    <p v-if="auth.isLoggedIn" class="card">
      Вы вошли как <strong>{{ auth.email }}</strong>
      <button type="button" class="btn btn-secondary" style="margin-top: 0.75rem" @click="auth.logout()">
        Выйти
      </button>
      <p class="muted" style="margin-top: 0.75rem">
        Данные хранятся локально в браузере. Синхронизация с сервером — в фазе 2.
      </p>
    </p>

    <div v-else class="card">
      <div class="row" style="margin-bottom: 1rem">
        <button
          type="button"
          :class="['btn', mode === 'login' ? '' : 'btn-secondary']"
          @click="mode = 'login'"
        >
          Вход
        </button>
        <button
          type="button"
          :class="['btn', mode === 'register' ? '' : 'btn-secondary']"
          @click="mode = 'register'"
        >
          Регистрация
        </button>
      </div>
      <div class="field">
        <label>Email</label>
        <input v-model="email" type="email" autocomplete="username" />
      </div>
      <div class="field">
        <label>Пароль</label>
        <input v-model="password" type="password" autocomplete="current-password" />
      </div>
      <p v-if="error" style="color: var(--color-bad)">{{ error }}</p>
      <button type="button" class="btn" @click="submit">
        {{ mode === 'register' ? 'Зарегистрироваться' : 'Войти' }}
      </button>
    </div>
  </div>
</template>
