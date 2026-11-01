import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-lg',
  {
    variants: {
      variant: {
        primary:
          'bg-brandTeal-700 hover:bg-brandTeal-800 text-white focus-visible:ring-brandTeal-700 shadow-sm active:scale-[0.98]',
        secondary:
          'bg-brandBlue-600 hover:bg-brandBlue-700 text-white focus-visible:ring-brandBlue-600 shadow-sm active:scale-[0.98]',
        navy:
          'bg-navy-900 hover:bg-navy-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white focus-visible:ring-navy-900 shadow-sm active:scale-[0.98]',
        outline:
          'border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-brandTeal-700',
        ghost:
          'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:ring-brandTeal-700',
        destructive:
          'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600 shadow-sm active:scale-[0.98]',
        success:
          'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-600 shadow-sm active:scale-[0.98]',
      },
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-11 px-6 text-base gap-2.5',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

