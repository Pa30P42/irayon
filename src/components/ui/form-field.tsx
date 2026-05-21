'use client';

import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  required?: boolean | undefined;
  hint?: ReactNode | undefined;
  error?: string | undefined;
  htmlFor?: string | undefined;
  children: ReactNode;
};

export function Field({ label, required, hint, error, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-foreground-muted text-xs">{hint}</p> : null}
    </div>
  );
}

export type { FieldProps };
