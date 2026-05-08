'use client';
// Client component: orchestrates the create/edit listing form (RHF + zod).

import { ExistingImagesGrid } from '@/components/admin/existing-images-grid';
import { ChipGroup, Field, SectionCard, Stepper } from '@/components/admin/form-controls';
import { ImageUploader } from '@/components/admin/image-uploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRegions, useVillagesByRegionSlug } from '@/hooks/use-public-regions';
import { createListingSchema, type CreateListingInput } from '@/lib/api/listings-create-validator';
import { ACTIVITIES, AMENITIES, CATEGORIES, MEALS, PLACE_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Activity, Amenity, ListingCategory, Meal, PlaceType } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconCheck, IconCurrentLocation, IconLoader2 } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

type LocaleTab = 'en' | 'ru' | 'az';

type FormValues = CreateListingInput;

const DEFAULT_VALUES: FormValues = {
  title: { az: '', ru: '', en: '' },
  description: { az: '', ru: '', en: '' },
  region: 'gabala',
  villageId: null,
  placeType: 'villa-cottage' as PlaceType,
  category: 'mountain' as ListingCategory,
  price: 200,
  capacity: 4,
  bedrooms: 2,
  lat: 40.4093,
  lng: 49.8671,
  address: '',
  phone: '+994',
  amenities: [],
  meals: [],
  activities: [],
};

const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  'a-frame': 'A-frame',
  'villa-cottage': 'Villa / cottage',
  hotel: 'Hotel',
  modular: 'Modular home',
  'village-room': 'Village room',
};

const CATEGORY_LABEL: Record<ListingCategory, string> = {
  mountain: 'Mountain',
  forest: 'Forest',
  river: 'River',
  sea: 'Sea',
  lake: 'Lake',
};

const AMENITY_LABEL: Record<Amenity, string> = {
  wifi: 'Wi-Fi',
  parking: 'Parking',
  pool: 'Pool',
  sauna: 'Sauna',
  jacuzzi: 'Jacuzzi',
  fireplace: 'Fireplace',
  kitchen: 'Kitchen',
  bbq: 'BBQ',
  pets: 'Pets allowed',
  heating: 'Heating',
  ac: 'Air conditioning',
  tv: 'TV',
  washer: 'Washing machine',
  iron: 'Iron',
  hairdryer: 'Hairdryer',
  crib: 'Baby crib',
  kids: "Kids' entertainment",
  'ev-charger': 'EV charger',
};

const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast included',
  'on-request': 'Meals on request',
};

const ACTIVITY_LABEL: Record<Activity, string> = {
  quad: 'Quad bike',
  horse: 'Horseback riding',
  fishing: 'Fishing',
};

type SubmitState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'updating' }
  | { phase: 'uploading'; current: number; total: number }
  | { phase: 'success'; id: string; slug: string }
  | { phase: 'error'; message: string };

type ExistingImage = { id: string; url: string };

type ListingFormProps = {
  onSubmitted?: (result: { id: string; slug: string }) => void;
  /**
   * When set, the form runs in "edit" mode: PATCHes /api/admin/listings/:id
   * instead of POSTing, and renders the existing-images grid above the
   * uploader so admins can remove old photos and append new ones.
   */
  mode?: 'create' | 'edit';
  listingId?: string;
  initialValues?: Partial<FormValues>;
  initialImages?: ExistingImage[];
};

export function ListingForm({
  onSubmitted,
  mode = 'create',
  listingId,
  initialValues,
  initialImages = [],
}: ListingFormProps) {
  const isEdit = mode === 'edit';
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
    mode: 'onBlur',
  });

  const [activeLocaleTab, setActiveLocaleTab] = useState<LocaleTab>('en');
  const [readyFiles, setReadyFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(initialImages);
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: 'idle' });

  // Region/village data is admin-managed, so the form pulls them at runtime.
  // Village options cascade from the currently-selected region.
  const { data: regions } = useRegions();
  const watchedRegion = watch('region');
  const watchedVillageId = watch('villageId');
  const { data: villages } = useVillagesByRegionSlug(watchedRegion);

  // Clear villageId whenever the region changes to a region that doesn't own
  // the currently-selected village. The cascade dropdown then re-populates.
  useEffect(() => {
    if (!watchedVillageId || !villages) return;
    const stillBelongs = villages.some((v) => v.id === watchedVillageId);
    if (!stillBelongs) {
      setValue('villageId', null, { shouldValidate: false });
    }
  }, [watchedRegion, villages, watchedVillageId, setValue]);

  const onUseLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', Number(pos.coords.latitude.toFixed(6)), { shouldValidate: true });
        setValue('lng', Number(pos.coords.longitude.toFixed(6)), { shouldValidate: true });
      },
      () => {
        // Permission denied / unavailable — silently keep manual input.
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      let target: { id: string; slug: string };

      if (isEdit) {
        if (!listingId) throw new Error('Edit mode requires a listingId');
        setSubmitState({ phase: 'updating' });
        const patchRes = await fetch(`/api/admin/listings/${listingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!patchRes.ok) {
          const text = await patchRes.text();
          throw new Error(text || `Update failed (${patchRes.status})`);
        }
        const updated = (await patchRes.json()) as { id: string; slug: string };
        target = { id: updated.id, slug: updated.slug };
      } else {
        setSubmitState({ phase: 'creating' });
        const createRes = await fetch('/api/admin/listings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!createRes.ok) {
          const text = await createRes.text();
          throw new Error(text || `Create failed (${createRes.status})`);
        }
        target = (await createRes.json()) as { id: string; slug: string };
      }

      if (readyFiles.length > 0) {
        setSubmitState({ phase: 'uploading', current: 0, total: readyFiles.length });
        const form = new FormData();
        for (const f of readyFiles) form.append('files', f);
        const uploadRes = await fetch(`/api/admin/listings/${target.id}/images`, {
          method: 'POST',
          body: form,
        });
        if (!uploadRes.ok) {
          const text = await uploadRes.text();
          throw new Error(text || `Upload failed (${uploadRes.status})`);
        }
        setSubmitState({
          phase: 'uploading',
          current: readyFiles.length,
          total: readyFiles.length,
        });
      }

      setSubmitState({ phase: 'success', id: target.id, slug: target.slug });
      onSubmitted?.({ id: target.id, slug: target.slug });
      if (!isEdit) {
        reset(DEFAULT_VALUES);
        setReadyFiles([]);
      }
    } catch (err) {
      setSubmitState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  };

  const isBusy =
    submitState.phase === 'creating' ||
    submitState.phase === 'updating' ||
    submitState.phase === 'uploading';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-28">
      {/* PHOTOS — first to encourage uploads */}
      <SectionCard
        title="Photos"
        description="Tap to add photos from your phone. We'll compress them automatically without losing quality."
      >
        {isEdit && listingId ? (
          <ExistingImagesGrid
            listingId={listingId}
            images={existingImages}
            onChange={setExistingImages}
          />
        ) : null}
        <ImageUploader onReadyFilesChange={setReadyFiles} />
      </SectionCard>

      {/* BASIC INFO */}
      <SectionCard title="Basic info" description="Title and description in each language.">
        <LocaleTabs active={activeLocaleTab} onChange={setActiveLocaleTab} />

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
              <textarea
                id="desc-en"
                {...register('description.en')}
                rows={5}
                className="border-border focus:ring-primary bg-background w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
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
              <textarea
                id="desc-ru"
                {...register('description.ru')}
                rows={5}
                className="border-border focus:ring-primary bg-background w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
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
              <textarea
                id="desc-az"
                {...register('description.az')}
                rows={5}
                className="border-border focus:ring-primary bg-background w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
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

      {/* LOCATION */}
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

      {/* CAPACITY & PRICE */}
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

      {/* CATEGORY */}
      <SectionCard title="Category" description="Where is this place located?">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <ChipGroup
              ariaLabel="Category"
              single
              selected={[field.value as ListingCategory]}
              onChange={(next) => field.onChange(next[0])}
              options={CATEGORIES.map((c) => ({
                value: c as ListingCategory,
                label: CATEGORY_LABEL[c as ListingCategory],
              }))}
            />
          )}
        />
      </SectionCard>

      {/* AMENITIES */}
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

      {/* MEALS & ACTIVITIES */}
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

      {/* STATUS BANNER */}
      {submitState.phase === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {isEdit ? "Couldn't update the listing" : "Couldn't create the listing"}
            </p>
            <p className="text-xs">{submitState.message}</p>
          </div>
        </div>
      )}

      {submitState.phase === 'success' && (
        <div className="border-primary/30 bg-accent text-primary flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
          <IconCheck size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{isEdit ? 'Listing updated' : 'Listing created'}</p>
            <p className="text-xs">
              Slug: <code>{submitState.slug}</code>.
              {isEdit ? ' Changes saved.' : ' Form is reset — you can create another.'}
            </p>
          </div>
        </div>
      )}

      {/* STICKY ACTION BAR */}
      <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur">
        <div className="container-wide flex items-center justify-between gap-3 py-3">
          <div className="text-foreground-muted hidden text-xs sm:block">
            {watch('title.en') || 'New listing'} · {readyFiles.length} photo
            {readyFiles.length === 1 ? '' : 's'}
          </div>
          <Button type="submit" size="lg" disabled={!isValid || isBusy} className="ml-auto gap-2">
            {isBusy ? (
              <>
                <IconLoader2 size={16} className="animate-spin" />
                {submitState.phase === 'uploading'
                  ? 'Uploading photos…'
                  : submitState.phase === 'updating'
                    ? 'Saving…'
                    : 'Creating…'}
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create listing'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function LocaleTabs({
  active,
  onChange,
}: {
  active: LocaleTab;
  onChange: (next: LocaleTab) => void;
}) {
  return (
    <div className="border-border inline-flex gap-1 rounded-lg border p-1" role="tablist">
      {(['en', 'ru', 'az'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === t}
          onClick={() => onChange(t)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium uppercase transition-colors',
            active === t ? 'bg-primary text-white' : 'text-foreground-muted hover:bg-accent',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
