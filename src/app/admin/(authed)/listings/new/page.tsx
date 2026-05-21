import { NewListingClient } from '@/components/admin/new-listing-client';
import { Heading } from '@/components/ui/typography';
import { getTranslations } from 'next-intl/server';

export default async function NewListingPage() {
  const t = await getTranslations('admin.listings.newPage');
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <p className="text-foreground-muted text-sm">
          {t.rich('description', { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      </header>
      <NewListingClient />
    </div>
  );
}
