import { HostCalendar } from '@/components/host/host-calendar';
import { Heading } from '@/components/ui/typography';
import { parseLocalized } from '@/lib/api/localized-text';
import { requireHostPage } from '@/lib/auth-page-guards';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';

type PageProps = { params: Promise<{ locale: string }> };

export default async function HostCalendarPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireHostPage({ locale });
  const t = await getTranslations({ locale, namespace: 'host.calendar' });

  const listings = await prisma.listing.findMany({
    where: { hostId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, title: true },
  });

  return (
    <div className="space-y-5">
      <Heading as="h1" level="page">
        {t('title')}
      </Heading>
      <HostCalendar
        listings={listings.map((listing) => {
          const title = parseLocalized(listing.title);
          return {
            id: listing.id,
            slug: listing.slug,
            title: title[locale as 'az' | 'ru' | 'en'] || title.en,
          };
        })}
      />
    </div>
  );
}
