import { ModerationActions } from '@/components/admin/moderation-actions';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Heading } from '@/components/ui/typography';
import { parseLocalized } from '@/lib/api/localized-text';
import { moderationQueueWhere } from '@/lib/api/moderation-service';
import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

/** Fields that can appear in `pendingChanges`, in the order they're shown. */
const DIFF_FIELDS = [
  'title',
  'description',
  'address',
  'phone',
  'placeType',
  'region',
  'villageId',
  'lat',
  'lng',
] as const;

type DiffField = (typeof DIFF_FIELDS)[number];

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    const localized = value as Record<string, unknown>;
    // Localized blobs are compared/shown in English — the moderator needs one
    // canonical column, not three.
    return typeof localized.en === 'string' ? localized.en : JSON.stringify(value);
  }
  return String(value);
};

export default async function ModerationQueuePage() {
  const t = await getTranslations('admin.moderation');

  const listings = await prisma.listing.findMany({
    where: moderationQueueWhere(),
    // Oldest first: a newest-first queue starves whoever has waited longest,
    // which is the one case where waiting is already doing damage.
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      address: true,
      phone: true,
      placeType: true,
      lat: true,
      lng: true,
      villageId: true,
      createdAt: true,
      moderationStatus: true,
      pendingChanges: true,
      region: { select: { slug: true } },
      host: { select: { email: true, name: true } },
      images: {
        select: { id: true, url: true, moderationState: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <p className="text-foreground-muted text-sm">{t('subtitle')}</p>
      </header>

      {listings.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyDescription')} />
      ) : (
        <ul className="space-y-4">
          {listings.map((listing) => {
            const changes = (listing.pendingChanges ?? {}) as Record<string, unknown>;
            const current: Record<DiffField, unknown> = {
              title: parseLocalized(listing.title),
              description: parseLocalized(listing.description),
              address: listing.address,
              phone: listing.phone,
              placeType: listing.placeType,
              region: listing.region.slug,
              villageId: listing.villageId,
              lat: listing.lat,
              lng: listing.lng,
            };
            const changedFields = DIFF_FIELDS.filter((f) => f in changes);
            const isNew = listing.moderationStatus === $Enums.ModerationStatus.PENDING;

            return (
              <li key={listing.id} className="border-border space-y-4 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{parseLocalized(listing.title).en}</p>
                    <div className="text-foreground-muted flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={isNew ? 'solid' : 'outline'}>
                        {isNew ? t('newListing') : t('editedListing')}
                      </Badge>
                      <span>
                        {t('host')}: {listing.host?.name || listing.host?.email || '—'}
                      </span>
                      <span>
                        {t('submitted')}: {listing.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </div>
                  </div>
                  <ModerationActions listingId={listing.id} />
                </div>

                {/* Field-level diff — only for edits; a brand-new listing has
                    nothing to compare against. */}
                {!isNew ? (
                  changedFields.length === 0 ? (
                    <p className="text-foreground-muted text-xs">{t('noFieldChanges')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-foreground-muted text-left text-xs">
                            <th className="py-1 pr-3 font-normal" />
                            <th className="py-1 pr-3 font-normal">{t('currentValue')}</th>
                            <th className="py-1 font-normal">{t('proposedValue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changedFields.map((field) => (
                            <tr key={field} className="border-border border-t align-top">
                              <th className="py-2 pr-3 text-left text-xs font-medium whitespace-nowrap">
                                {t(`fields.${field}`)}
                              </th>
                              {/* Plain text nodes: every value here is host-supplied. */}
                              <td className="text-foreground-muted py-2 pr-3">
                                {asText(current[field])}
                              </td>
                              <td className="py-2 font-medium">{asText(changes[field])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : null}

                {listing.images.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-foreground-muted text-xs">{t('livePhotos')}</p>
                    <ul className="flex flex-wrap gap-2">
                      {listing.images.map((img) => (
                        <li key={img.id} className="relative">
                          <div className="bg-accent relative h-20 w-28 overflow-hidden rounded-md">
                            <Image
                              src={img.url}
                              alt=""
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          </div>
                          {img.moderationState !== 'LIVE' ? (
                            <span className="bg-primary absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white">
                              {img.moderationState === 'PENDING_ADD'
                                ? t('pendingAdd')
                                : t('pendingRemove')}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
