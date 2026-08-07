'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Heading } from '@/components/ui/typography';
import { useDebounce } from '@/hooks/use-debounce';
import type { Paginated } from '@/lib/api/api-response';
import { IconChevronLeft, IconChevronRight, IconHistory, IconLoader2 } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type AdminLogEntry = {
  id: string;
  action: string;
  target: string | null;
  metadata: unknown;
  createdAt: string;
};

async function fetchLogs(
  action: string,
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<AdminLogEntry>> {
  const params = new URLSearchParams();
  if (action) params.set('action', action);
  params.set('page', String(page));
  const res = await fetch(`/api/admin/logs?${params}`, { ...(signal ? { signal } : {}) });
  if (!res.ok) throw new Error(`Logs fetch failed (${res.status})`);
  return (await res.json()) as Paginated<AdminLogEntry>;
}

export function AdminLogsList() {
  const t = useTranslations('admin.logs');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedAction = useDebounce(actionFilter, 250);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-logs', debouncedAction, page],
    queryFn: ({ signal }) => fetchLogs(debouncedAction, page, signal),
  });

  const logs = data?.data ?? [];

  return (
    <>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <Heading as="h1" level="page">
            {t('title')}
          </Heading>
          <p className="text-foreground-muted mt-1 text-sm">
            {data ? t('totalCount', { count: data.meta.total }) : t('loading')}
          </p>
        </div>
        {isFetching ? (
          <IconLoader2 size={16} className="text-foreground-muted animate-spin" />
        ) : null}
      </header>

      <div className="mb-4 max-w-xs">
        <Input
          type="search"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          placeholder={t('filterPlaceholder')}
          aria-label={t('filterPlaceholder')}
        />
      </div>

      {isLoading ? (
        <LogsSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<IconHistory size={22} className="text-primary" aria-hidden />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-border bg-accent/50 border-b text-left">
                <th className="px-4 py-3 font-medium">{t('columns.time')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.action')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.target')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.details')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-border border-b align-top last:border-b-0">
                  <td className="text-foreground-muted px-4 py-3 whitespace-nowrap tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="text-foreground-muted max-w-40 truncate px-4 py-3 font-mono text-xs">
                    {log.target ?? '—'}
                  </td>
                  <td className="text-foreground-muted max-w-72 px-4 py-3 font-mono text-xs break-all">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.total > data.meta.limit ? (
        <div className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1.5"
          >
            <IconChevronLeft size={14} />
            {t('previous')}
          </Button>
          <span className="text-foreground-muted text-sm">
            {t('pageOf', {
              page: data.meta.page,
              pages: Math.ceil(data.meta.total / data.meta.limit),
            })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!data.meta.hasMore || isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1.5"
          >
            {t('next')}
            <IconChevronRight size={14} />
          </Button>
        </div>
      ) : null}
    </>
  );
}

function LogsSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={`skeleton-${i}`} className="bg-accent h-10 animate-pulse rounded-md" />
      ))}
    </ul>
  );
}
