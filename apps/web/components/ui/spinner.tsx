import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full animate-spin',
          'border-teal-200 border-t-teal-600',
          'dark:border-teal-800 dark:border-t-teal-400',
          sizeMap[size],
        )}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  )
}

export function PageSpinner({ label = 'Memuat...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" label={label} />
    </div>
  )
}

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-4 w-4 rounded-full animate-spin border-2',
        'border-teal-200 border-t-teal-600',
        'dark:border-teal-800 dark:border-t-teal-400',
        className,
      )}
    />
  )
}
