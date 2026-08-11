'use client';

import { ListingForm } from '@/components/listing-form/listing-form';
import { useRouter } from 'next/navigation';

export function NewListingClient() {
  const router = useRouter();
  return (
    <ListingForm
      mode="admin"
      action="create"
      onSubmitted={() => {
        router.push('/admin/listings');
        router.refresh();
      }}
    />
  );
}
