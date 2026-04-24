import type { ReactNode } from 'react'
import type { EntityConfig } from '@/lib/entity-config'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  entity?: EntityConfig
}

export function PageHeader({ title, subtitle, actions, entity }: PageHeaderProps) {
  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {entity && (
            <span className={`inline-flex items-center justify-center h-10 w-10 shrink-0 rounded-lg ${entity.bg}`}>
              <entity.icon className="h-5 w-5 text-gray-600" />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 ml-4">{actions}</div>
        )}
      </div>
      <div className="h-px bg-border mt-4" />
    </div>
  )
}
