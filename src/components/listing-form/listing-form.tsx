'use client';
// Client component: orchestrates the create/edit listing form (RHF + zod).
// Sections live in sibling files and share state via FormProvider.

import { ListingFormActionBar } from '@/components/listing-form/action-bar';
import { ListingFormBasicInfoSection } from '@/components/listing-form/basic-info-section';
import { ListingFormCapacitySection } from '@/components/listing-form/capacity-section';
import { listingEndpointsFor, type ListingFormMode } from '@/components/listing-form/endpoints';
import { DEFAULT_VALUES, type LocaleTab } from '@/components/listing-form/labels';
import { ListingFormLocationSection } from '@/components/listing-form/location-section';
import { ListingFormPhotosSection } from '@/components/listing-form/photos-section';
import { ListingFormStatusBanner } from '@/components/listing-form/status-banner';
import { ListingFormTaxonomySection } from '@/components/listing-form/taxonomy-section';
import { useListingSubmit } from '@/hooks/use-listing-submit';
import { createListingSchema, type CreateListingInput } from '@/lib/api/listings-create-validator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type FormValues = CreateListingInput;

type ExistingImage = { id: string; url: string };

type ListingFormProps = {
  onSubmitted?: (result: { id: string; slug: string }) => void;
  /**
   * WHICH CABINET this form is rendered in. Selects the API base only — the
   * admin and host paths share every field, every validation rule, and every
   * pixel, and the server decides what each actor is allowed to do.
   */
  mode?: ListingFormMode;
  /**
   * `edit` PATCHes an existing listing and renders the existing-images grid
   * above the uploader so old photos can be removed and new ones appended.
   */
  action?: 'create' | 'edit';
  listingId?: string;
  initialValues?: Partial<FormValues>;
  initialImages?: ExistingImage[];
};

export function ListingForm({
  onSubmitted,
  mode = 'admin',
  action = 'create',
  listingId,
  initialValues,
  initialImages = [],
}: ListingFormProps) {
  const isEdit = action === 'edit';
  const endpoints = useMemo(() => listingEndpointsFor(mode), [mode]);
  const methods = useForm<FormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
    mode: 'onBlur',
  });

  const [activeLocaleTab, setActiveLocaleTab] = useState<LocaleTab>('en');
  const [readyFiles, setReadyFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(initialImages);
  const {
    state: submitState,
    isBusy,
    submit,
  } = useListingSubmit({
    action,
    endpoints,
    listingId,
    onSubmitted: (target) => {
      onSubmitted?.(target);
      if (!isEdit) {
        methods.reset(DEFAULT_VALUES);
        setReadyFiles([]);
      }
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => submit(values, readyFiles);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5 pb-28">
        <ListingFormPhotosSection
          action={action}
          endpoints={endpoints}
          listingId={listingId}
          existingImages={existingImages}
          onExistingImagesChange={setExistingImages}
          onReadyFilesChange={setReadyFiles}
        />
        <ListingFormBasicInfoSection
          activeLocaleTab={activeLocaleTab}
          onLocaleTabChange={setActiveLocaleTab}
        />
        <ListingFormLocationSection />
        <ListingFormCapacitySection />
        <ListingFormTaxonomySection />
        <ListingFormStatusBanner submitState={submitState} isEdit={isEdit} />
        <ListingFormActionBar
          submitState={submitState}
          isEdit={isEdit}
          isBusy={isBusy}
          readyFileCount={readyFiles.length}
        />
      </form>
    </FormProvider>
  );
}
