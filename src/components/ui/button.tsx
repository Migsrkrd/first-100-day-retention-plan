import * as React from 'react'
import { cn } from '@/lib/utils'

const variants: Record<string, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

const sizes: Record<string, string> = {
  default: 'h-9 px-3 text-sm',
  sm: 'h-8 px-2.5 text-xs',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:pointer-events-none disabled:opacity-50',
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.default,
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
