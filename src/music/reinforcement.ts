import { REINFORCEMENT_SEQUENCES } from './constants'

/**
 * Закрепление после верного ответа (всегда полная цепочка, включая 8-ю при 5–7).
 * 4→3→2→1 | 5→6→7→8 | 6→7→8 | 7→8 | 8
 */
export function getReinforcementSequence(questionStep: number): number[] {
  return [...(REINFORCEMENT_SEQUENCES[questionStep] ?? [questionStep])]
}

export function getReinforcementMotion(
  questionStep: number,
): 'ascend' | 'descend' | 'free' {
  if (questionStep >= 5 && questionStep <= 7) return 'ascend'
  if (questionStep >= 2 && questionStep <= 4) return 'descend'
  return 'free'
}
