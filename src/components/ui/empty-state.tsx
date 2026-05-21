// Empty-state primitive. Replaces ad-hoc dashed-border placeholders across
// the public listings page and admin lists.

import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-16 text-center">
      {icon ? (
        <div className="bg-accent grid h-12 w-12 place-items-center rounded-full">{icon}</div>
      ) : null}
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-foreground-muted text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export type { EmptyStateProps };
