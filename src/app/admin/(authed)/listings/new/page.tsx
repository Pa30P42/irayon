import { NewListingClient } from '@/components/admin/new-listing-client';
import { Heading } from '@/components/ui/typography';

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <Heading as="h1" level="page">
          New listing
        </Heading>
        <p className="text-foreground-muted text-sm">
          Photos first — they&apos;re the most important field. Everything below is one screen,
          scroll to fill it out, then tap <strong>Create listing</strong>.
        </p>
      </header>
      <NewListingClient />
    </div>
  );
}
