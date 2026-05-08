'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type AdminLoginFormProps = {
  next: string | null;
};

export function AdminLoginForm({ next }: AdminLoginFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message || 'Sign-in failed');
      }

      // `typedRoutes: true` expects a literal Route; the `next` redirect target
      // is dynamic (comes from a query string), so we cast to Route.
      router.push((next || '/admin/listings') as Route);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm font-medium">
          Username
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={submitting}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={submitting}
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          <IconAlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting} className="w-full gap-2">
        {submitting ? (
          <>
            <IconLoader2 size={16} className="animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
