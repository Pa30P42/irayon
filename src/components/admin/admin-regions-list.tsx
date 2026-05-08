'use client';

import { Button } from '@/components/ui/button';
import { useAdminRegions } from '@/hooks/use-admin-regions';
import {
  IconAlertCircle,
  IconLoader2,
  IconMap2,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconStarFilled,
  IconTrash,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { DeleteRegionDialog } from './delete-region-dialog';

type DialogState = {
  id: string;
  title: string;
  listingCount: number;
  villageCount: number;
} | null;

export function AdminRegionsList() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminRegions();
  const [toDelete, setToDelete] = useState<DialogState>(null);

  const regions = data ?? [];

  return (
    <>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Regions</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            {data ? `${regions.length} total` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
            className="gap-1.5"
          >
            {isFetching ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconRefresh size={16} />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/admin/regions/new">
              <IconPlus size={16} />
              <span>New region</span>
            </Link>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load'}
          onRetry={() => refetch()}
        />
      ) : regions.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {regions.map((r) => (
            <li
              key={r.id}
              className="border-border bg-background flex items-center gap-3 rounded-2xl border p-3 shadow-sm sm:p-4"
            >
              <div className="bg-accent text-foreground-muted grid h-12 w-12 shrink-0 place-items-center rounded-md">
                <IconMap2 size={20} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 truncate text-sm font-medium sm:text-base">
                  {r.name.en}
                  {r.featured ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                      title="Featured on homepage"
                    >
                      <IconStarFilled size={11} />
                      Featured
                    </span>
                  ) : null}
                </h2>
                <p className="text-foreground-muted mt-0.5 text-xs sm:text-sm">
                  <code className="text-[11px]">{r.slug}</code>
                  {' · '}
                  <span>
                    {r.listingCount} listing{r.listingCount === 1 ? '' : 's'}
                  </span>
                  {' · '}
                  <span>
                    {r.villageCount} village{r.villageCount === 1 ? '' : 's'}
                  </span>
                  {' · '}
                  <span>order {r.sortOrder}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link href={`/admin/regions/${r.id}/edit`} aria-label={`Edit ${r.name.en}`}>
                    <IconPencil size={14} />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setToDelete({
                      id: r.id,
                      title: r.name.en,
                      listingCount: r.listingCount,
                      villageCount: r.villageCount,
                    })
                  }
                  className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  aria-label={`Delete ${r.name.en}`}
                >
                  <IconTrash size={14} />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DeleteRegionDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        region={toDelete}
      />
    </>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="border-border bg-background flex animate-pulse items-center gap-3 rounded-2xl border p-3 shadow-sm"
        >
          <div className="bg-accent h-12 w-12 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="bg-accent h-4 w-1/3 rounded" />
            <div className="bg-accent h-3 w-2/3 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed py-16 text-center">
      <div className="bg-accent grid h-12 w-12 place-items-center rounded-full">
        <IconMap2 size={22} className="text-primary" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">No regions yet</h2>
        <p className="text-foreground-muted text-sm">Add the first region to get started.</p>
      </div>
      <Button asChild className="gap-2">
        <Link href="/admin/regions/new">
          <IconPlus size={16} />
          New region
        </Link>
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Couldn&apos;t load regions</p>
        <p className="text-xs">{message}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
