'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children, size }: DialogProps & { size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' }) {
  // Close on escape
  React.useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onOpenChange])

  if (!open) return null

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[90vw]',
  }[size || 'md']

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Overlay + Content wrapper combined so clicks outside content close the dialog */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in-0 flex items-center justify-center p-4"
        onClick={() => onOpenChange(false)}
      >
        <div
          className={cn('relative w-full max-h-[90vh] flex flex-col bg-background rounded-lg shadow-lg border overflow-hidden animate-in fade-in-0 zoom-in-95', sizeClass)}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function DialogHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6 pb-0 shrink-0', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 flex-1 overflow-y-auto', className)} {...props} />
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 p-6 pt-0 shrink-0', className)}
      {...props}
    />
  )
}

function DialogClose({
  onClose,
  className,
}: {
  onClose: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity',
        className,
      )}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
}
