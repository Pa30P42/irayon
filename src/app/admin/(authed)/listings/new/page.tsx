import { NewListingClient } from '@/components/admin/new-listing-client';

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">New listing</h1>
        <p className="text-foreground-muted text-sm">
          Photos first — they&apos;re the most important field. Everything below is one screen,
          scroll to fill it out, then tap <strong>Create listing</strong>.
        </p>
      </header>
      <NewListingClient />
    </div>
  );
}
