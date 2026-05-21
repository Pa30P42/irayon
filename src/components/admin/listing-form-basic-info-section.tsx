'use client';

import { ListingFormLocaleTabs } from '@/components/admin/listing-form-locale-tabs';
import { type LocaleTab } from '@/components/admin/listing-form-labels';
import { Field } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import { Textarea } from '@/components/ui/textarea';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { useFormContext } from 'react-hook-form';

type Props = {
  activeLocaleTab: LocaleTab;
  onLocaleTabChange: (next: LocaleTab) => void;
};

export function ListingFormBasicInfoSection({ activeLocaleTab, onLocaleTabChange }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateListingInput>();

  return (
    <SectionCard title="Basic info" description="Title and description in each language.">
      <ListingFormLocaleTabs active={activeLocaleTab} onChange={onLocaleTabChange} />

      {activeLocaleTab === 'en' && (
        <>
          <Field
            label="Title (English)"
            required
            error={errors.title?.en?.message}
            htmlFor="title-en"
            hint="Used for the URL slug."
          >
            <Input
              id="title-en"
              {...register('title.en')}
              placeholder="e.g. Gabala Pine Retreat"
            />
          </Field>
          <Field
            label="Description (English)"
            required
            error={errors.description?.en?.message}
            htmlFor="desc-en"
          >
            <Textarea
              id="desc-en"
              {...register('description.en')}
              rows={5}
              placeholder="What guests can expect..."
            />
          </Field>
        </>
      )}

      {activeLocaleTab === 'ru' && (
        <>
          <Field label="Название (Русский)" htmlFor="title-ru">
            <Input
              id="title-ru"
              {...register('title.ru')}
              placeholder="Optional — falls back to English"
            />
          </Field>
          <Field label="Описание (Русский)" htmlFor="desc-ru">
            <Textarea id="desc-ru" {...register('description.ru')} rows={5} />
          </Field>
        </>
      )}

      {activeLocaleTab === 'az' && (
        <>
          <Field label="Başlıq (Azərbaycanca)" htmlFor="title-az">
            <Input
              id="title-az"
              {...register('title.az')}
              placeholder="Optional — falls back to English"
            />
          </Field>
          <Field label="Təsvir (Azərbaycanca)" htmlFor="desc-az">
            <Textarea id="desc-az" {...register('description.az')} rows={5} />
          </Field>
        </>
      )}

      <Field
        label="Phone"
        required
        error={errors.phone?.message}
        htmlFor="phone"
        hint="Shown on the Call button."
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          {...register('phone')}
          placeholder="+994 50 123 45 67"
        />
      </Field>
    </SectionCard>
  );
}
