'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSessionUser } from '@/hooks/use-session-user';
import { REPORT_REASONS } from '@/lib/api/messaging-validator';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Props = {
  targetType: 'listing' | 'user' | 'message';
  targetId: string;
};

/**
 * Report entry point.
 *
 * Hidden from signed-out visitors — a report needs an author, both so the queue
 * can weigh it and so abuse of the reporting system itself is attributable.
 */
export function ReportButton({ targetType, targetId }: Props) {
  const t = useTranslations('reports');
  const { data: user } = useSessionUser();
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const submit = async () => {
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message === 'already_reported' ? t('already') : t('submit'));
        setState('idle');
        return;
      }
      setState('sent');
    } catch {
      setState('idle');
      setError(t('submit'));
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-foreground-muted text-xs">
          {t('report')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {state === 'sent' ? (
          <p className="text-sm">{t('sent')}</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">{t('reason')}</Label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border-border bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                {REPORT_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`reasons.${value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-note">{t('note')}</Label>
              <Textarea
                id="report-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            ) : null}

            <Button onClick={submit} disabled={state === 'sending'} className="w-full">
              {t('submit')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
