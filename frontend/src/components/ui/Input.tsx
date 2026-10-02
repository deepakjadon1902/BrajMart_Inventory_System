import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixText?: string;
  suffixText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefixText, suffixText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-neutral-700 select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex rounded-lg shadow-sm">
          {prefixText && (
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm select-none">
              {prefixText}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`block w-full rounded-lg border text-sm text-neutral-900 bg-white placeholder-neutral-400 py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-neutral-50 disabled:text-neutral-500 ${
              prefixText ? 'rounded-l-none' : ''
            } ${suffixText ? 'rounded-r-none' : ''} ${
              error ? 'border-rose-400 focus:ring-rose-400' : 'border-neutral-300'
            } ${className}`}
            {...props}
          />
          {suffixText && (
            <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-sm select-none">
              {suffixText}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
