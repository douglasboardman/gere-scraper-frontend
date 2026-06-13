import { Check, X } from 'lucide-react'
import { meetsPasswordRules } from '@/lib/password'

interface Props {
  password: string
}

const RULES = [
  { key: 'hasMinLength' as const, label: 'Pelo menos 10 caracteres' },
  { key: 'hasUppercase' as const, label: 'Uma letra maiúscula (A–Z)' },
  { key: 'hasLowercase' as const, label: 'Uma letra minúscula (a–z)' },
  { key: 'hasNumber' as const, label: 'Um número (0–9)' },
  { key: 'hasSpecial' as const, label: 'Um caractere especial (!@#$%ç-/ etc.)' },
]

export function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null

  const rules = meetsPasswordRules(password)

  return (
    <div className="mt-1.5 space-y-1">
      {RULES.map(({ key, label }) => {
        const met = rules[key]
        return (
          <div key={key} className="flex items-center gap-1.5">
            {met
              ? <Check className="h-3 w-3 text-green-600 shrink-0" />
              : <X className="h-3 w-3 text-muted-foreground shrink-0" />
            }
            <span className={`text-xs ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
