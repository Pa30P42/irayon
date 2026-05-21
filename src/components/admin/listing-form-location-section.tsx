'use client';

import { PLACE_TYPE_LABEL } from '@/components/admin/listing-form-labels';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { Field } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import { Select } from '@/components/ui/select';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useRegions, useVillagesByRegionSlug } from '@/hooks/use-public-regions';
import { useRegionVillageCascade } from '@/hooks/use-region-village-cascade';
import type { CreateListingInput } from '@/lib/api/listings-create-validator';
import { PLACE_TYPES } from '@/lib/constants';
import type { PlaceType } from '@/types';
import { IconCurrentLocation } from '@tabler/icons-react';
import { useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

export function ListingFormLocationSection() {
  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CreateListingInput>();

  const { data: regions } = useRegions();
  const watchedRegion = watch('region');
  const watchedVillageId = watch('villageId');
  const { data: villages } = useVillagesByRegionSlug(watchedRegion);

  const clearVillage = useCallback(
    () => setValue('villageId', null, { shouldValidate: false }),
    [setValue],
  );
  useRegionVillageCascade({
    regionSlug: watchedRegion,
    villageId: watchedVillageId,
    villages,
    onClearVillage: clearVillage,
  });

  const { getCurrentLocation: onUseLocation } = useCurrentLocation({
    onSuccess: ({ lat, lng }) => {
      setValue('lat', lat, { shouldValidate: true });
      setValue('lng', lng, { shouldValidate: true });
    },
  });

  return (
    <SectionCard title="Location">
      <Field label="Region" required htmlFor="region" error={errors.region?.message}>
        <Select id="region" {...register('region')}>
          {regions
            ? regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name.en}
                  {r.name.az ? ` (${r.name.az})` : ''}
                </option>
              ))
            : null}
        </Select>
      </Field>

      <Field
        label="Village"
        htmlFor="village"
        error={errors.villageId?.message}
        hint="Optional sub-location. Cascades from the selected region."
      >
        <Controller
          control={control}
          name="villageId"
          render={({ field }) => (
            <Select
              id="village"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value || null)}
            >
              <option value="">— No village —</option>
              {villages?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name.en}
                  {v.name.az ? ` (${v.name.az})` : ''}
                </option>
              ))}
            </Select>
          )}
        />
      </Field>

      <Field label="Place type" required error={errors.placeType?.message}>
        <Controller
          control={control}
          name="placeType"
          render={({ field }) => (
            <ChipGroup
              ariaLabel="Place type"
              single
              selected={[field.value as PlaceType]}
              onChange={(next) => field.onChange(next[0])}
              options={PLACE_TYPES.map((p) => ({
                value: p as PlaceType,
                label: PLACE_TYPE_LABEL[p as PlaceType],
              }))}
            />
          )}
        />
      </Field>

      <Field label="Address" required error={errors.address?.message} htmlFor="address">
        <Input id="address" {...register('address')} placeholder="e.g. Vandam, Gabala" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" required error={errors.lat?.message} htmlFor="lat">
          <Input
            id="lat"
            type="number"
            step="any"
            inputMode="decimal"
            {...register('lat', { valueAsNumber: true })}
          />
        </Field>
        <Field label="Longitude" required error={errors.lng?.message} htmlFor="lng">
          <Input
            id="lng"
            type="number"
            step="any"
            inputMode="decimal"
            {...register('lng', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onUseLocation} className="gap-2">
        <IconCurrentLocation size={16} />
        Use my current location
      </Button>
    </SectionCard>
  );
}
