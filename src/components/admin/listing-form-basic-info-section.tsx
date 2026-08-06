'use client';

import { type LocaleTab } from '@/components/admin/listing-form-labels';
import { ListingFormLocaleTabs } from '@/components/admin/listing-form-locale-tabs';
import { Field } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import { Textarea } from '@/components/ui/textarea';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

type Props = {
  activeLocaleTab: LocaleTab;
  onLocaleTabChange: (next: LocaleTab) => void;
};

export function ListingFormBasicInfoSection({ activeLocaleTab, onLocaleTabChange }: Props) {
  const tSections = useTranslations('admin.listingForm.sections');
  const tFields = useTranslations('admin.listingForm.fields');
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateListingInput>();

  return (
    <SectionCard
      title={tSections('basicInfoTitle')}
      description={tSections('basicInfoDescription')}
    >
      <ListingFormLocaleTabs active={activeLocaleTab} onChange={onLocaleTabChange} />

      {activeLocaleTab === 'en' && (
        <>
          <Field
            label={tFields('titleEn')}
            required
            error={errors.title?.en?.message}
            htmlFor="title-en"
            hint={tFields('titleEnHint')}
          >
            <Input
              id="title-en"
              {...register('title.en')}
              placeholder={tFields('titleEnPlaceholder')}
            />
          </Field>
          <Field
            label={tFields('descEn')}
            required
            error={errors.description?.en?.message}
            htmlFor="desc-en"
          >
            <Textarea
              id="desc-en"
              {...register('description.en')}
              rows={5}
              placeholder={tFields('descPlaceholder')}
            />
          </Field>
        </>
      )}

      {activeLocaleTab === 'ru' && (
        <>
          <Field label={tFields('titleRu')} htmlFor="title-ru">
            <Input
              id="title-ru"
              {...register('title.ru')}
              placeholder={tFields('titleFallbackPlaceholder')}
            />
          </Field>
          <Field label={tFields('descRu')} htmlFor="desc-ru">
            <Textarea id="desc-ru" {...register('description.ru')} rows={5} />
          </Field>
        </>
      )}

      {activeLocaleTab === 'az' && (
        <>
          <Field label={tFields('titleAz')} htmlFor="title-az">
            <Input
              id="title-az"
              {...register('title.az')}
              placeholder={tFields('titleFallbackPlaceholder')}
            />
          </Field>
          <Field label={tFields('descAz')} htmlFor="desc-az">
            <Textarea id="desc-az" {...register('description.az')} rows={5} />
          </Field>
        </>
      )}

      <Field
        label={tFields('phone')}
        required
        error={errors.phone?.message}
        htmlFor="phone"
        hint={tFields('phoneHint')}
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          {...register('phone')}
          placeholder={tFields('phonePlaceholder')}
        />
      </Field>
    </SectionCard>
  );
}
