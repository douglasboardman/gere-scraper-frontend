import zxcvbn from 'zxcvbn'
import { z } from 'zod'

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
  suggestion: string | null
}

const LABELS = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Muito forte']
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

export function getPasswordStrength(password: string): PasswordStrength {
  const result = zxcvbn(password)
  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    label: LABELS[result.score],
    color: COLORS[result.score],
    suggestion: result.feedback.suggestions[0] ?? null,
  }
}

/**
 * Schema para campos de senha obrigatórios:
 * criação de usuário pelo admin, reset e ativação via token.
 */
export const strongPasswordSchema = z
  .string()
  .min(10, 'Senha deve ter pelo menos 10 caracteres')
  .refine(
    (val) => getPasswordStrength(val).score >= 2,
    'Senha muito fraca. Tente uma frase longa ou palavras aleatórias.'
  )

/**
 * Schema para campo de senha opcional (perfil do usuário).
 * Quando preenchido, aplica as mesmas regras do strongPasswordSchema.
 * Vazio ('') ou undefined são válidos (usuário não quer alterar a senha).
 */
export const optionalStrongPasswordSchema = z.union([
  z.literal(''),
  z.undefined(),
  z
    .string()
    .min(10, 'Nova senha deve ter pelo menos 10 caracteres')
    .refine(
      (val) => getPasswordStrength(val).score >= 2,
      'Senha muito fraca. Tente uma frase longa ou palavras aleatórias.'
    ),
])
