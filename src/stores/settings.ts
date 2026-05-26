import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, ensureDefaultSettings } from '@/db/database'
import type { NotationMode } from '@/music/types'
import { playback } from '@/audio/playback'

export const useSettingsStore = defineStore('settings', () => {
  const notationMode = ref<NotationMode>('letters')
  const volume = ref(0.7)
  const showHintAfterError = ref(false)
  const loaded = ref(false)

  async function load(): Promise<void> {
    const s = await ensureDefaultSettings()
    notationMode.value = s.notationMode
    volume.value = s.volume
    showHintAfterError.value = s.showHintAfterError
    playback.setVolume(s.volume)
    loaded.value = true
  }

  async function save(): Promise<void> {
    await db.settings.put({
      id: 1,
      notationMode: notationMode.value,
      volume: volume.value,
      showHintAfterError: showHintAfterError.value,
    })
    playback.setVolume(volume.value)
  }

  return { notationMode, volume, showHintAfterError, loaded, load, save }
})
