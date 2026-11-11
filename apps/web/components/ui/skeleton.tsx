import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-teal-100/60 dark:bg-teal-900/20',
        'relative overflow-hidden',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-teal-200/40 before:to-transparent',
        'dark:before:via-teal-400/10',
        'before:animate-shimmer',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
