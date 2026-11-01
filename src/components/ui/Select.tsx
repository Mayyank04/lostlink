import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, options, children, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 pr-9 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brandTeal-600 focus:border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none text-slate-400" />
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

