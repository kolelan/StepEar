import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db, hashPassword } from '@/db/database'

export const useAuthStore = defineStore('auth', () => {
  const email = ref<string | null>(null)

  const isLoggedIn = computed(() => email.value !== null)

  async function loadSession(): Promise<void> {
    const stored = localStorage.getItem('stepEarSessionEmail')
    if (stored) {
      const user = await db.users.where('email').equals(stored).first()
      if (user) email.value = user.email
      else localStorage.removeItem('stepEarSessionEmail')
    }
  }

  async function register(userEmail: string, password: string): Promise<string | null> {
    const existing = await db.users.where('email').equals(userEmail.toLowerCase()).first()
    if (existing) return 'Аккаунт с таким email уже существует'
    const passwordHash = await hashPassword(password)
    await db.users.add({ email: userEmail.toLowerCase(), passwordHash })
    email.value = userEmail.toLowerCase()
    localStorage.setItem('stepEarSessionEmail', email.value)
    return null
  }

  async function login(userEmail: string, password: string): Promise<string | null> {
    const user = await db.users.where('email').equals(userEmail.toLowerCase()).first()
    if (!user) return 'Неверный email или пароль'
    const passwordHash = await hashPassword(password)
    if (user.passwordHash !== passwordHash) return 'Неверный email или пароль'
    email.value = user.email
    localStorage.setItem('stepEarSessionEmail', email.value)
    return null
  }

  function logout(): void {
    email.value = null
    localStorage.removeItem('stepEarSessionEmail')
  }

  return { email, isLoggedIn, loadSession, register, login, logout }
})
