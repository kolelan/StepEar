import { CONSOLE_LOG_INFO } from '@/config/env'

export { CONSOLE_LOG_INFO }
import { formatChordForLog } from '@/music/midi-label'

const PREFIX = '[StepEar]'

/** Информационное сообщение (только при CONSOLE_LOG_INFO). */
export function logInfo(...args: unknown[]): void {
  if (!CONSOLE_LOG_INFO) return
  console.log(PREFIX, ...args)
}

/** Лог воспроизведения: контекст + ноты с октавами. */
export function logAudio(context: string, midiNotes: number[]): void {
  if (!CONSOLE_LOG_INFO || midiNotes.length === 0) return
  console.log(`${PREFIX} [audio] ${context}: ${formatChordForLog(midiNotes)}`)
}
