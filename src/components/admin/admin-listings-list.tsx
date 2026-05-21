'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState as UiEmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { useListings } from '@/hooks/use-listings';
import { formatPrice } from '@/lib/utils';
import {
  IconAlertCircle,
  IconExternalLink,
  IconLoader2,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DeleteListingDialog } from './delete-listing-dialog';

type DialogState = { id: string; title: string; photoCount: number } | null;

export function AdminListingsList() {
  const t = useTranslations('admin.listings');
  const tCommon = useTranslations('admin.common');
  const locale = useLocale();
  const [toDelete, setToDelete] = useState<DialogState>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useListings({
    sort: 'newest',
    limit: 100,
  });

  const listings = useMemo(() => data?.data ?? [], [data]);

  return (
    <>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <Heading as="h1" level="page">
            {t('title')}
          </Heading>
          <p className="text-foreground-muted mt-1 text-sm">
            {data ? t('totalCount', { count: data.meta.total }) : t('loadingCount')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t('refresh')}
            className="gap-1.5"
          >
            {isFetching ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconRefresh size={16} />
            )}
            <span className="hidden sm:inline">{t('refresh')}</span>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/admin/listings/new">
              <IconPlus size={16} />
              <span>{t('new')}</span>
            </Link>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <ListingsSkeleton />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : tCommon('loadFailed')}
          onRetry={() => refetch()}
        />
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="border-border bg-background overflow-hidden rounded-2xl border shadow-sm"
            >
              <div className="flex items-stretch">
                <div className="bg-accent relative h-24 w-24 shrink-0 sm:h-28 sm:w-32">
                  {listing.images[0] ? (
                    <Image
                      src={listing.images[0]}
                      alt={listing.title.en}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-foreground-muted grid h-full w-full place-items-center">
                      <IconPhoto size={20} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium sm:text-base">
                      {listing.title.en}
                    </h2>
                    <p className="text-foreground-muted mt-0.5 text-xs sm:text-sm">
                      <span className="capitalize">{listing.region}</span>
                      {' · '}
                      <span>
                        {formatPrice(listing.price, 'en')} AZN{' '}
                        <span className="text-foreground-muted">{t('perNight')}</span>
                      </span>
                      {' · '}
                      <span>{t('photoCount', { count: listing.images.length })}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                      <Link
                        href={`/${locale}/listings/${listing.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <IconExternalLink size={14} />
                        <span className="hidden sm:inline">{t('view')}</span>
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                      <Link
                        href={`/admin/listings/${listing.id}/edit`}
                        aria-label={t('editAria', { title: listing.title.en })}
                      >
                        <IconPencil size={14} />
                        <span className="hidden sm:inline">{t('edit')}</span>
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="destructiveGhost"
                      size="sm"
                      onClick={() =>
                        setToDelete({
                          id: listing.id,
                          title: listing.title.en,
                          photoCount: listing.images.length,
                        })
                      }
                      className="gap-1.5"
                      aria-label={t('deleteAria', { title: listing.title.en })}
                    >
                      <IconTrash size={14} />
                      <span className="hidden sm:inline">{t('delete')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DeleteListingDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        listing={toDelete}
      />
    </>
  );
}

function ListingsSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={`skeleton-${i}`}
          className="border-border bg-background flex animate-pulse items-center gap-3 rounded-2xl border p-3 shadow-sm"
        >
          <div className="bg-accent h-24 w-24 shrink-0 rounded-md sm:h-28 sm:w-32" />
          <div className="flex-1 space-y-2">
            <div className="bg-accent h-4 w-2/3 rounded" />
            <div className="bg-accent h-3 w-1/2 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  const t = useTranslations('admin.listings');
  return (
    <UiEmptyState
      icon={<IconPhoto size={22} className="text-primary" aria-hidden />}
      title={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <Button asChild className="gap-2">
          <Link href="/admin/listings/new">
            <IconPlus size={16} />
            {t('emptyAction')}
          </Link>
        </Button>
      }
    />
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('admin.listings');
  const tCommon = useTranslations('admin.common');
  return (
    <Alert variant="error" size="lg">
      <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{t('loadFailed')}</p>
        <p className="text-xs">{message}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        {tCommon('retry')}
      </Button>
    </Alert>
  );
}
