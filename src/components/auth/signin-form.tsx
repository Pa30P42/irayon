'use client';
// Client component: kicks off the OAuth redirect and owns the dev-form state.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export type SignInFormProps = {
  /** Google credentials are present on the server. */
  googleEnabled: boolean;
  /** Dev-only credential provider is registered (never true in production). */
  devLoginEnabled: boolean;
  /** Where to land after a successful sign-in. Already validated server-side. */
  callbackUrl: string;
};

export function SignInForm({ googleEnabled, devLoginEnabled, callbackUrl }: SignInFormProps) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onGoogle = () => {
    startTransition(async () => {
      await signIn('google', { callbackUrl });
    });
  };

  const onDevSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn('dev-login', { email, name, redirect: false });
      if (result?.error) {
        setError(t('devFailed'));
        return;
      }
      // Full reload rather than a client-side push: the header, and every
      // server component that reads the session, must re-render against the
      // new cookie.
      window.location.href = callbackUrl;
    });
  };

  if (!googleEnabled && !devLoginEnabled) {
    return (
      <p className="text-foreground-muted rounded-md border border-[var(--color-border)] p-4 text-sm">
        {t('noProviders')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {googleEnabled ? (
        <Button onClick={onGoogle} disabled={isPending} className="w-full" size="lg">
          {t('continueWithGoogle')}
        </Button>
      ) : (
        <p className="text-foreground-muted text-sm">{t('googleUnavailable')}</p>
      )}

      {devLoginEnabled ? (
        <form
          onSubmit={onDevSubmit}
          className="space-y-3 rounded-md border border-dashed border-[var(--color-border)] p-4"
        >
          <div>
            <p className="text-sm font-semibold">{t('devTitle')}</p>
            <p className="text-foreground-muted text-xs">{t('devHint')}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-email">{t('devEmail')}</Label>
            <Input
              id="dev-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-name">{t('devName')}</Label>
            <Input
              id="dev-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-[var(--color-danger,#b3261e)]">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="outline" disabled={isPending} className="w-full">
            {t('devSubmit')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
