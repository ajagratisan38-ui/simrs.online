'use client'

import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════
// NATIVE SELECT (used by most pages)
// Usage: <Select value={v} onChange={e => ...}><option>...</option></Select>
// ═══════════════════════════════════════════

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  },
)
Select.displayName = 'Select'

// ═══════════════════════════════════════════
// COMPOUND SELECT (Radix-style API)
// Usage: <SelectRoot><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem/></SelectContent></SelectRoot>
// Exported as SelectTrigger, SelectContent, SelectItem, SelectValue
// ═══════════════════════════════════════════

interface CompoundCtxValue {
  open: boolean
  setOpen: (o: boolean) => void
  value: string
  onValueChange: (v: string) => void
}

const CompoundCtx = React.createContext<CompoundCtxValue | null>(null)
function useCompound() {
  const c = React.useContext(CompoundCtx)
  if (!c) throw new Error('SelectTrigger/Content/Item must be inside compound Select')
  return c
}

function CompoundSelect({ value: ctrl, defaultValue = '', onValueChange, children }: {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultValue)
  const val = ctrl !== undefined ? ctrl : internal
  const change = React.useCallback((v: string) => {
    if (ctrl === undefined) setInternal(v)
    onValueChange?.(v)
  }, [ctrl, onValueChange])

  return (
    <CompoundCtx.Provider value={{ open, setOpen, value: val, onValueChange: change }}>
      <div className="relative">{children}</div>
    </CompoundCtx.Provider>
  )
}

// ── Trigger ──

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(CompoundCtx)
    if (!ctx) {
      return (
        <button type="button" ref={ref} className={className} {...props}>
          {children}
        </button>
      )
    }
    const { open, setOpen } = ctx
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>
    )
  },
)
SelectTrigger.displayName = 'SelectTrigger'

// ── Value ──

function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(CompoundCtx)
  const [label, setLabel] = React.useState('')
  const value = ctx?.value || ''

  React.useEffect(() => {
    if (!value) { setLabel(''); return }
    const t = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-sel-val="${CSS.escape(value)}"]`)
      setLabel(el?.textContent || value)
    })
    return () => cancelAnimationFrame(t)
  }, [value])

  if (!value || !label) return <span className="text-muted-foreground">{placeholder}</span>
  return <span className="truncate">{label}</span>
}

// ── Content ──

function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(CompoundCtx)
  const ref = React.useRef<HTMLDivElement>(null)
  const open = ctx?.open ?? false
  const setOpen = ctx?.setOpen

  React.useEffect(() => {
    if (!open || !setOpen) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [open, setOpen])

  if (!open) return null
  return (
    <div ref={ref} className={cn(
      'absolute left-0 top-full z-50 mt-1 w-full min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md',
      className,
    )}>
      <div className="max-h-60 overflow-y-auto p-1">{children}</div>
    </div>
  )
}

// ── Item ──

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value: itemVal, children, disabled, ...props }, ref) => {
    const ctx = React.useContext(CompoundCtx)
    const selected = ctx?.value === itemVal
    return (
      <div
        ref={ref}
        data-sel-val={itemVal}
        onClick={() => {
          if (!disabled && ctx) {
            ctx.onValueChange(itemVal)
            ctx.setOpen(false)
          }
        }}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
          'hover:bg-accent hover:text-accent-foreground',
          selected && 'bg-accent/50',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {selected && <Check className="h-4 w-4" />}
        </span>
        <span className="truncate">{children}</span>
      </div>
    )
  },
)
SelectItem.displayName = 'SelectItem'

// ═══════════════════════════════════════════
// SMART SELECT — auto-detect: if onValueChange prop → compound, else native
// Pages importing { Select } get native <select>
// Pages importing { Select, SelectTrigger, ... } use compound
// ═══════════════════════════════════════════

export {
  Select,
  CompoundSelect as SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}
