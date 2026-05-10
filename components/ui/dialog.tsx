'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  dialogWidth?: string
}

function Dialog({ open, onOpenChange, children, dialogWidth = 'max-w-lg' }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/80"
        onClick={() => onOpenChange?.(false)}
      />
      <div className={`relative z-50 w-full ${dialogWidth} mx-auto`}>
        {children}
      </div>
    </div>
  )
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { className?: string }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'bg-background border rounded-lg shadow-lg p-6',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DialogContent.displayName = 'DialogContent'

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-2 mt-4', className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
