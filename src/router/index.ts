import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/setup', name: 'setup', component: () => import('@/views/SetupView.vue') },
    { path: '/train', name: 'train', component: () => import('@/views/TrainView.vue') },
    { path: '/saved', name: 'saved', component: () => import('@/views/SavedView.vue') },
    { path: '/auth', name: 'auth', component: () => import('@/views/AuthView.vue') },
  ],
})

export default router
