'use client';

import { ChipGroup } from '@/components/ui/chip-group';
import { Field } from '@/components/ui/form-field';
import { SectionCard } from '@/components/ui/section-card';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { ACTIVITIES, AMENITIES, CATEGORIES, MEALS } from '@/lib/constants';
import type { Activity, Amenity, ListingCategory, Meal } from '@/types';
import { useTranslations } from 'next-intl';
import { Controller, useFormContext } from 'react-hook-form';

export function ListingFormTaxonomySection() {
  const tSections = useTranslations('admin.listingForm.sections');
  const tFields = useTranslations('admin.listingForm.fields');
  const tCategory = useTranslations('admin.labels.category');
  const tAmenity = useTranslations('admin.labels.amenity');
  const tMeal = useTranslations('admin.labels.meal');
  const tActivity = useTranslations('admin.labels.activity');

  const {
    control,
    formState: { errors },
  } = useFormContext<CreateListingInput>();

  return (
    <>
      <SectionCard
        title={tSections('categoriesTitle')}
        description={tSections('categoriesDescription')}
      >
        <Controller
          control={control}
          name="categories"
          render={({ field }) => (
            <ChipGroup
              ariaLabel={tSections('categoriesTitle')}
              selected={field.value as ListingCategory[]}
              onChange={field.onChange}
              options={CATEGORIES.map((c) => ({
                value: c as ListingCategory,
                label: tCategory(c as ListingCategory),
              }))}
            />
          )}
        />
        {errors.categories?.message ? (
          <p className="text-xs text-rose-600">{errors.categories.message}</p>
        ) : null}
      </SectionCard>

      <SectionCard
        title={tSections('amenitiesTitle')}
        description={tSections('amenitiesDescription')}
      >
        <Controller
          control={control}
          name="amenities"
          render={({ field }) => (
            <ChipGroup
              ariaLabel={tSections('amenitiesTitle')}
              selected={field.value as Amenity[]}
              onChange={field.onChange}
              options={AMENITIES.map((a) => ({
                value: a as Amenity,
                label: tAmenity(a as Amenity),
              }))}
            />
          )}
        />
      </SectionCard>

      <SectionCard title={tSections('mealsActivitiesTitle')}>
        <Field label={tFields('meals')}>
          <Controller
            control={control}
            name="meals"
            render={({ field }) => (
              <ChipGroup
                ariaLabel={tFields('meals')}
                selected={field.value as Meal[]}
                onChange={field.onChange}
                options={MEALS.map((m) => ({ value: m as Meal, label: tMeal(m as Meal) }))}
              />
            )}
          />
        </Field>
        <Field label={tFields('activities')}>
          <Controller
            control={control}
            name="activities"
            render={({ field }) => (
              <ChipGroup
                ariaLabel={tFields('activities')}
                selected={field.value as Activity[]}
                onChange={field.onChange}
                options={ACTIVITIES.map((a) => ({
                  value: a as Activity,
                  label: tActivity(a as Activity),
                }))}
              />
            )}
          />
        </Field>
      </SectionCard>
    </>
  );
}
