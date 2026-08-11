'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  initial: { name: string; email: string; phone: string; preferredLocale: string };
};

export function AccountSettingsForm({ initial }: Props) {
  const t = useTranslations('account');
  const tLang = useTranslations('language');
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [preferredLocale, setPreferredLocale] = useState(initial.preferredLocale);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('saving');
    setError(null);
    try {
      const res = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, phone, preferredLocale }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string; fields?: Record<string, string[]> };
        } | null;
        const field = body?.error?.fields ? Object.values(body.error.fields)[0]?.[0] : undefined;
        throw new Error(field ?? body?.error?.message ?? `Save failed (${res.status})`);
      }
      setState('saved');
      router.refresh();
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t('email')}</Label>
        {/* Read-only: this is the identity Google authenticated, and the key the
            suspension check looks up by. */}
        <Input id="email" value={initial.email} readOnly disabled />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">{t('phone')}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="preferredLocale">{t('language')}</Label>
        <select
          id="preferredLocale"
          value={preferredLocale}
          onChange={(e) => setPreferredLocale(e.target.value)}
          className="border-border bg-background h-10 w-full rounded-md border px-3 text-sm"
        >
          {['az', 'ru', 'en'].map((l) => (
            <option key={l} value={l}>
              {tLang(l)}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state === 'saving'}>
          {t('save')}
        </Button>
        {state === 'saved' ? (
          <span role="status" className="text-foreground-muted text-sm">
            {t('saved')}
          </span>
        ) : null}
      </div>
    </form>
  );
}
