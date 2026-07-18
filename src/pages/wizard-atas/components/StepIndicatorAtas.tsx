import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { num: 1, label: 'Seleção' },
  { num: 2, label: 'Extração PDF' },
  { num: 3, label: 'Quantitativos' },
  { num: 4, label: 'Descrições' },
  { num: 5, label: 'Gerar Atas' },
  { num: 6, label: 'Documentos' },
]

export function StepIndicatorAtas({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8 select-none overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const done = s.num < current
        const active = s.num === current
        return (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                done && 'bg-primary border-primary text-primary-foreground',
                active && 'border-primary text-primary bg-background',
                !done && !active && 'border-muted-foreground/30 text-muted-foreground/40 bg-background',
              )}>
                {done ? <Check className="w-3 h-3" /> : s.num}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium whitespace-nowrap',
                active ? 'text-primary' : 'text-muted-foreground',
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 w-10 mb-5 mx-1 transition-colors', done ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
