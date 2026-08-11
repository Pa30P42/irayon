import { HostListingFormClient } from '@/components/host/host-listing-form-client';
import { listingToFormValues } from '@/components/listing-form/labels';
import { Heading } from '@/components/ui/typography';
import { getListingById, getListingImagesById } from '@/lib/api/listings-service';
import { requireHostPage } from '@/lib/auth-page-guards';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = { params: Promise<{ locale: string; id: string }> };

export default async function EditHostListingPage({ params }: PageProps) {
  const { locale, id } = await params;
  const user = await requireHostPage({ locale });

  // Ownership scoped into the query itself, and a miss is a 404 — a 403 would
  // confirm the id exists, which is an enumeration oracle over other hosts'
  // private listings. Admins bypass ownership, matching `requireListingOwner`.
  const owned = await prisma.listing.findFirst({
    where: user.role === 'admin' ? { id } : { id, hostId: user.id },
    select: { id: true, moderationStatus: true, moderationNote: true, pendingChanges: true },
  });
  if (!owned) notFound();

  const [listing, images, t, tMod] = await Promise.all([
    getListingById(id),
    getListingImagesById(id),
    getTranslations({ locale, namespace: 'host.listings' }),
    getTranslations({ locale, namespace: 'host.moderation' }),
  ]);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          {t('editTitle')}
        </Heading>
        <p className="text-foreground-muted text-sm">{t('editDescription')}</p>
      </header>

      {owned.pendingChanges !== null ? (
        <div className="border-border rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">{tMod('pendingChanges')}</p>
          <p className="text-foreground-muted mt-1 text-sm">{tMod('pendingChangesBody')}</p>
        </div>
      ) : null}

      {owned.moderationStatus === 'REJECTED' && owned.moderationNote ? (
        <div className="border-border rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">{tMod('rejectedReason')}</p>
          {/* Plain text node: a moderator's note is untrusted input. */}
          <p className="text-foreground-muted mt-1 text-sm">{owned.moderationNote}</p>
        </div>
      ) : null}

      <HostListingFormClient
        action="edit"
        listing={listing}
        images={images}
        initialValues={listingToFormValues(listing)}
      />
    </div>
  );
}
