import { ReportActions } from '@/components/admin/report-actions';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { listReports } from '@/lib/api/reports-service';
import type { Route } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type PageProps = { searchParams: Promise<{ resolved?: string }> };

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const { resolved } = await searchParams;
  const includeResolved = resolved === '1';
  const [t, reports] = await Promise.all([
    getTranslations('admin.reports'),
    listReports(includeResolved),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Heading as="h1" level="page">
            {t('title')}
          </Heading>
          <p className="text-foreground-muted text-sm">{t('subtitle')}</p>
        </div>
        <Link
          href={(includeResolved ? '/admin/reports' : '/admin/reports?resolved=1') as Route}
          className="text-foreground-muted text-sm hover:underline"
        >
          {includeResolved ? t('hideResolved') : t('showResolved')}
        </Link>
      </header>

      {reports.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="border-border space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={report.resolvedAt ? 'outline' : 'solid'}>
                      {report.targetType}
                    </Badge>
                    <span className="text-sm font-medium">{report.reason}</span>
                    {report.resolvedAt ? <Badge variant="outline">{t('resolved')}</Badge> : null}
                  </div>
                  <p className="text-foreground-muted text-xs">
                    {t('reporter')}: {report.reporter.name ?? report.reporter.email} ·{' '}
                    {report.createdAt.slice(0, 10)}
                  </p>

                  <p className="text-sm">
                    {t('target')}:{' '}
                    {report.target.kind === 'missing' ? (
                      // A vanished target is a NORMAL outcome — a listing was
                      // archived, or a message cascaded away with its booking.
                      // The row still has to render, and still has to be
                      // resolvable, or the queue fills with rows nobody can clear.
                      <em className="text-foreground-muted">{t('missing')}</em>
                    ) : report.target.kind === 'listing' && report.target.href ? (
                      <Link href={`/az${report.target.href}` as Route} className="hover:underline">
                        {report.target.label}
                      </Link>
                    ) : (
                      /* Plain text node — reported content is untrusted input. */
                      <span className="break-words">{report.target.label}</span>
                    )}
                  </p>

                  {report.note ? (
                    <p className="text-foreground-muted text-sm break-words">
                      {t('note')}: {report.note}
                    </p>
                  ) : null}

                  {report.resolution ? (
                    <p className="text-foreground-muted text-sm">✓ {report.resolution}</p>
                  ) : null}
                </div>
              </div>

              {!report.resolvedAt ? (
                <ReportActions
                  reportId={report.id}
                  canOpenThread={report.target.kind === 'message'}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
