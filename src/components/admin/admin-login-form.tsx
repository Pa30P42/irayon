'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminLogin } from '@/hooks/use-admin-login';
import { IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type FormEvent } from 'react';

type AdminLoginFormProps = {
  next: string | null;
};

export function AdminLoginForm({ next }: AdminLoginFormProps) {
  const router = useRouter();
  const login = useAdminLogin();
  const t = useTranslations('admin.login');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login.isPending) return;

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');

    login.mutate(
      { username, password },
      {
        onSuccess: () => {
          // `typedRoutes: true` expects a literal Route; the `next` redirect target
          // is dynamic (comes from a query string), so we cast to Route.
          router.push((next || '/admin/listings') as Route);
          router.refresh();
        },
      },
    );
  };

  const errorMessage = login.error instanceof Error ? login.error.message : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm font-medium">
          {t('username')}
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={login.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          {t('password')}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={login.isPending}
        />
      </div>

      {errorMessage ? (
        <Alert variant="error" size="sm" className="text-rose-700">
          <IconAlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={login.isPending} className="w-full gap-2">
        {login.isPending ? (
          <>
            <IconLoader2 size={16} className="animate-spin" aria-hidden />
            {t('submitting')}
          </>
        ) : (
          t('submit')
        )}
      </Button>
    </form>
  );
}
