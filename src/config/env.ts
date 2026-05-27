function parseEnvBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  const v = value.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

/**
 * Информационные сообщения в console.log (анализ работы приложения).
 * Dev по умолчанию true, production — false (см. .env.development / .env.production).
 */
export const CONSOLE_LOG_INFO = parseEnvBool(
  import.meta.env.VITE_CONSOLE_LOG_INFO,
  import.meta.env.DEV,
)
