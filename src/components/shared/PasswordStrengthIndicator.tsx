import { getPasswordStrength } from '@/lib/password'

interface Props {
  password: string
}

export function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null

  const { score, label, color, suggestion } = getPasswordStrength(password)

  // Segments filled: minimum 1 to give immediate visual feedback,
  // maximum 4 (score 4 = all filled).
  const filled = Math.max(1, score)

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < filled ? color : '#e5e7eb' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium" style={{ color }}>
          {label}
        </p>
        {score < 2 && suggestion && (
          <p className="text-xs text-muted-foreground text-right">{suggestion}</p>
        )}
      </div>
    </div>
  )
}
