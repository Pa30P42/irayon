'use client';
// Client component: orchestrates the create/edit region form (RHF + zod).

import { Field, SectionCard } from '@/components/admin/form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  regionCreateSchema,
  type RegionCreateInput,
} from '@/lib/api/regions-validator';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

type LocaleTab = 'en' | 'ru' | 'az';

const DEFAULT_VALUES: RegionCreateInput = {
  name: { az: '', ru: '', en: '' },
  coverImage: null,
  featured: false,
  sortOrder: 0,
};

export type RegionFormProps = {
  mode?: 'create' | 'edit';
  /** Current slug — shown read-only in edit mode. Slugs are immutable. */
  slug?: string;
  initialValues?: Partial<RegionCreateInput>;
  onSubmit: (values: RegionCreateInput) => Promise<void>;
  submitLabel?: string;
};

export function RegionForm({
  mode = 'create',
  slug,
  initialValues,
  onSubmit,
  submitLabel,
}: RegionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegionCreateInput>({
    resolver: zodResolver(regionCreateSchema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
    mode: 'onBlur',
  });

  const [activeTab, setActiveTab] = useState<LocaleTab>('en');
  const [submitState, setSubmitState] = useState<
    | { phase: 'idle' }
    | { phase: 'submitting' }
    | { phase: 'success' }
    | { phase: 'error'; message: string }
  >({ phase: 'idle' });

  const submit: SubmitHandler<RegionCreateInput> = async (values) => {
    setSubmitState({ phase: 'submitting' });
    try {
      await onSubmit({
        ...values,
        coverImage: values.coverImage?.trim() ? values.coverImage.trim() : null,
      });
      setSubmitState({ phase: 'success' });
    } catch (err) {
      setSubmitState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Save failed',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <SectionCard
        title="Name"
        description="Localized region name. English is required and used as the canonical fallback."
      >
        <div role="tablist" aria-label="Locale" className="border-border flex gap-1 border-b">
          {(['en', 'ru', 'az'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'text-foreground-muted hover:text-foreground border-transparent',
              )}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={activeTab === 'en' ? '' : 'hidden'}>
          <Field
            label="Name (EN)"
            required
            htmlFor="name-en"
            error={errors.name?.en?.message}
          >
            <Input id="name-en" {...register('name.en')} placeholder="Gabala" />
          </Field>
        </div>
        <div className={activeTab === 'ru' ? '' : 'hidden'}>
          <Field label="Name (RU)" htmlFor="name-ru" error={errors.name?.ru?.message}>
            <Input id="name-ru" {...register('name.ru')} placeholder="Габала" />
          </Field>
        </div>
        <div className={activeTab === 'az' ? '' : 'hidden'}>
          <Field label="Name (AZ)" htmlFor="name-az" error={errors.name?.az?.message}>
            <Input id="name-az" {...register('name.az')} placeholder="Qəbələ" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Display" description="Controls homepage placement and ordering.">
        {mode === 'edit' && slug ? (
          <Field label="Slug" hint="Immutable — used in public URLs and bookmarked filters.">
            <Input value={slug} readOnly disabled />
          </Field>
        ) : null}
        <Field
          label="Cover image URL"
          hint="Optional. Shown in the homepage Regions grid."
          htmlFor="cover-image"
          error={errors.coverImage?.message}
        >
          <Input
            id="cover-image"
            type="url"
            placeholder="https://example.com/gabala.jpg"
            {...register('coverImage')}
          />
        </Field>
        <Field
          label="Sort order"
          hint="Lower numbers appear first. Defaults to 0."
          htmlFor="sort-order"
          error={errors.sortOrder?.message}
        >
          <Input
            id="sort-order"
            type="number"
            inputMode="numeric"
            {...register('sortOrder', { valueAsNumber: true })}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" {...register('featured')} />
          <span>
            Featured on homepage
            <span className="text-foreground-muted block text-xs">
              Featured regions appear in the homepage Regions grid.
            </span>
          </span>
        </label>
      </SectionCard>

      {submitState.phase === 'error' ? (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{submitState.message}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="submit"
          disabled={!isValid || submitState.phase === 'submitting'}
          className="gap-2"
        >
          {submitState.phase === 'submitting' ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : submitState.phase === 'success' ? (
            <>
              <IconCheck size={16} />
              Saved
            </>
          ) : (
            (submitLabel ?? (mode === 'edit' ? 'Save changes' : 'Create region'))
          )}
        </Button>
      </div>
    </form>
  );
}
