import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { num: 1, label: 'Dados' },
  { num: 2, label: 'Contratação' },
  { num: 3, label: 'Itens' },
  { num: 4, label: 'Revisão' },
]

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8 select-none">
      {STEPS.map((s, i) => {
        const done = s.num < current
        const active = s.num === current
        return (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  done && 'bg-primary border-primary text-primary-foreground',
                  active && 'border-primary text-primary bg-background',
                  !done && !active && 'border-muted-foreground/30 text-muted-foreground/40 bg-background',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 mb-5 mx-1 transition-colors',
                  done ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
