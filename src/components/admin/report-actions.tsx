'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ThreadMessage = { id: string; body: string; createdAt: string; sender: string };

export function ReportActions({
  reportId,
  canOpenThread,
}: {
  reportId: string;
  canOpenThread: boolean;
}) {
  const t = useTranslations('admin.reports');
  const router = useRouter();
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<ThreadMessage[] | null>(null);
  const [reportedId, setReportedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openThread = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}/thread`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t('missing'));
        return;
      }
      const json = (await res.json()) as {
        data: ThreadMessage[];
        reportedMessageId: string;
      };
      setThread(json.data);
      setReportedId(json.reportedMessageId);
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (!resolution.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolution: resolution.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? 'Failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      {canOpenThread && !thread ? (
        <div className="space-y-1">
          {/* Said before the click, not after: opening this is an auditable act. */}
          <p className="text-foreground-muted text-xs">{t('threadWarning')}</p>
          <Button variant="outline" size="sm" disabled={busy} onClick={openThread}>
            {t('openThread')}
          </Button>
        </div>
      ) : null}

      {thread ? (
        <ul className="border-border max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
          {thread.map((message) => (
            <li
              key={message.id}
              className={message.id === reportedId ? 'bg-accent rounded p-1.5' : 'p-1.5'}
            >
              <span className="text-foreground-muted text-xs">{message.sender}: </span>
              {/* Plain text node — reported content is untrusted input. */}
              <span className="text-sm break-words whitespace-pre-wrap">{message.body}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <Textarea
          rows={2}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder={t('resolution')}
          aria-label={t('resolution')}
          className="min-w-[14rem] flex-1"
          maxLength={500}
        />
        <Button size="sm" disabled={busy || !resolution.trim()} onClick={resolve}>
          {t('resolve')}
        </Button>
      </div>
    </div>
  );
}
