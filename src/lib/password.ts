import { z } from 'zod'

export interface PasswordRules {
  hasMinLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
  allMet: boolean
}

export function meetsPasswordRules(password: string): PasswordRules {
  const hasMinLength = password.length >= 10
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    allMet: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial,
  }
}

export const strongPasswordSchema = z
  .string()
  .min(10, 'Senha deve ter pelo menos 10 caracteres')
  .refine((val) => /[A-Z]/.test(val), 'Deve conter pelo menos uma letra maiúscula')
  .refine((val) => /[a-z]/.test(val), 'Deve conter pelo menos uma letra minúscula')
  .refine((val) => /[0-9]/.test(val), 'Deve conter pelo menos um número')
  .refine((val) => /[^A-Za-z0-9]/.test(val), 'Deve conter pelo menos um caractere especial')

export const optionalStrongPasswordSchema = z.union([
  z.literal(''),
  z.undefined(),
  z
    .string()
    .min(10, 'Nova senha deve ter pelo menos 10 caracteres')
    .refine((val) => /[A-Z]/.test(val), 'Deve conter pelo menos uma letra maiúscula')
    .refine((val) => /[a-z]/.test(val), 'Deve conter pelo menos uma letra minúscula')
    .refine((val) => /[0-9]/.test(val), 'Deve conter pelo menos um número')
    .refine((val) => /[^A-Za-z0-9]/.test(val), 'Deve conter pelo menos um caractere especial'),
])
