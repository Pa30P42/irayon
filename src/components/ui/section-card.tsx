import { Heading } from '@/components/ui/typography';
import type { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="border-border bg-background rounded-2xl border p-5 shadow-sm sm:p-6">
      <header className="mb-4">
        <Heading level="adminSubsection">{title}</Heading>
        {description ? <p className="text-foreground-muted mt-1 text-sm">{description}</p> : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export type { SectionCardProps };
