'use client';

import { Field } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import { Stepper } from '@/components/ui/stepper';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { Controller, useFormContext } from 'react-hook-form';

export function ListingFormCapacitySection() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateListingInput>();

  return (
    <SectionCard title="Capacity & price">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Guests" required error={errors.capacity?.message}>
          <Controller
            control={control}
            name="capacity"
            render={({ field }) => (
              <Stepper
                ariaLabel="Guests"
                min={1}
                max={50}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field label="Bedrooms" required error={errors.bedrooms?.message}>
          <Controller
            control={control}
            name="bedrooms"
            render={({ field }) => (
              <Stepper
                ariaLabel="Bedrooms"
                min={0}
                max={20}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <Field label="Price / night (AZN)" required error={errors.price?.message} htmlFor="price">
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            {...register('price', { valueAsNumber: true })}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
