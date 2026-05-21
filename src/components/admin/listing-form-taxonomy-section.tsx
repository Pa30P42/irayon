'use client';

import {
  ACTIVITY_LABEL,
  AMENITY_LABEL,
  CATEGORY_LABEL,
  MEAL_LABEL,
} from '@/components/admin/listing-form-labels';
import { ChipGroup } from '@/components/ui/chip-group';
import { Field } from '@/components/ui/form-field';
import { SectionCard } from '@/components/ui/section-card';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { ACTIVITIES, AMENITIES, CATEGORIES, MEALS } from '@/lib/constants';
import type { Activity, Amenity, ListingCategory, Meal } from '@/types';
import { Controller, useFormContext } from 'react-hook-form';

export function ListingFormTaxonomySection() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateListingInput>();

  return (
    <>
      <SectionCard
        title="Categories"
        description="Pick every category this place fits. A forest cabin near a river can be both."
      >
        <Controller
          control={control}
          name="categories"
          render={({ field }) => (
            <ChipGroup
              ariaLabel="Categories"
              selected={field.value as ListingCategory[]}
              onChange={field.onChange}
              options={CATEGORIES.map((c) => ({
                value: c as ListingCategory,
                label: CATEGORY_LABEL[c as ListingCategory],
              }))}
            />
          )}
        />
        {errors.categories?.message ? (
          <p className="text-xs text-rose-600">{errors.categories.message}</p>
        ) : null}
      </SectionCard>

      <SectionCard title="Amenities" description="Tap each amenity that this place offers.">
        <Controller
          control={control}
          name="amenities"
          render={({ field }) => (
            <ChipGroup
              ariaLabel="Amenities"
              selected={field.value as Amenity[]}
              onChange={field.onChange}
              options={AMENITIES.map((a) => ({
                value: a as Amenity,
                label: AMENITY_LABEL[a as Amenity],
              }))}
            />
          )}
        />
      </SectionCard>

      <SectionCard title="Meals & activities">
        <Field label="Meals">
          <Controller
            control={control}
            name="meals"
            render={({ field }) => (
              <ChipGroup
                ariaLabel="Meals"
                selected={field.value as Meal[]}
                onChange={field.onChange}
                options={MEALS.map((m) => ({ value: m as Meal, label: MEAL_LABEL[m as Meal] }))}
              />
            )}
          />
        </Field>
        <Field label="Activities">
          <Controller
            control={control}
            name="activities"
            render={({ field }) => (
              <ChipGroup
                ariaLabel="Activities"
                selected={field.value as Activity[]}
                onChange={field.onChange}
                options={ACTIVITIES.map((a) => ({
                  value: a as Activity,
                  label: ACTIVITY_LABEL[a as Activity],
                }))}
              />
            )}
          />
        </Field>
      </SectionCard>
    </>
  );
}
