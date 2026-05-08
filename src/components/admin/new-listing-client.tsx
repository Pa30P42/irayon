'use client';

import { ListingForm } from '@/components/admin/listing-form';
import { useRouter } from 'next/navigation';

export function NewListingClient() {
  const router = useRouter();
  return (
    <ListingForm
      onSubmitted={() => {
        router.push('/admin/listings');
        router.refresh();
      }}
    />
  );
}
