/** 1-я и 8-я — одна тоника (нижняя и верхняя октава). */
export const LOWER_TONIC_STEP = 1
export const UPPER_TONIC_STEP = 8

export function stepsAreEquivalent(a: number, b: number): boolean {
  return (
    a === b ||
    (a === LOWER_TONIC_STEP && b === UPPER_TONIC_STEP) ||
    (a === UPPER_TONIC_STEP && b === LOWER_TONIC_STEP)
  )
}

/**
 * Верный ответ: точное совпадение ступени.
 * 1 и 8 считаются одним ответом только если в упражнении выбрана одна из тоник.
 */
export function isAnswerCorrect(
  questionStep: number,
  answerStep: number,
  trainingSteps: readonly number[],
): boolean {
  if (questionStep === answerStep) return true
  const bothTonicsInTraining =
    trainingSteps.includes(LOWER_TONIC_STEP) &&
    trainingSteps.includes(UPPER_TONIC_STEP)
  if (bothTonicsInTraining) return false
  return stepsAreEquivalent(questionStep, answerStep)
}

export function isTonicStep(step: number): boolean {
  return step === LOWER_TONIC_STEP || step === UPPER_TONIC_STEP
}

/** После 1-й или 8-й закрепляющую последовательность не проигрываем. */
export function shouldPlayReinforcement(questionStep: number): boolean {
  return !isTonicStep(questionStep)
}
