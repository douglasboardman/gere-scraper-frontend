import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-slate-300 bg-slate-50 text-slate-700',
        destructive: 'border-red-300 bg-red-50 text-red-800',
        outline: 'text-foreground',
        success: 'border-green-300 bg-green-50 text-green-800',
        warning: 'border-yellow-300 bg-yellow-50 text-yellow-800',
        info: 'border-blue-300 bg-blue-50 text-blue-800',
        purple: 'border-purple-300 bg-purple-50 text-purple-800',
        orange: 'border-orange-300 bg-orange-50 text-orange-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
