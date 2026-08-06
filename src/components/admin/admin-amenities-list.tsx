'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Heading } from '@/components/ui/typography';
import { AMENITIES_QUERY_KEY, useAmenities } from '@/hooks/use-amenities';
import type { ApiError } from '@/lib/api/api-response';
import type { AmenityOption, LocalizedText } from '@/types';
import { IconAlertCircle, IconLoader2, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const CATEGORIES = ['essentials', 'outdoor', 'kitchen', 'family', 'extras'] as const;

const okOrThrow = async (res: Response): Promise<unknown> => {
  if (res.ok) return res.json();
  const body = (await res.json().catch(() => null)) as ApiError | null;
  throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
};

type DraftAmenity = {
  name: LocalizedText;
  category: (typeof CATEGORIES)[number];
};

const emptyDraft = (): DraftAmenity => ({
  name: { az: '', ru: '', en: '' },
  category: 'extras',
});

export function AdminAmenitiesList() {
  const t = useTranslations('admin.amenities');
  const tCategory = useTranslations('admin.amenityCategories');
  const queryClient = useQueryClient();
  const { data: amenities, isLoading } = useAmenities();
  const [draft, setDraft] = useState<DraftAmenity>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: AMENITIES_QUERY_KEY });

  const create = useMutation({
    mutationFn: async (input: DraftAmenity) =>
      okOrThrow(
        await fetch('/api/admin/amenities', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      setDraft(emptyDraft());
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('saveFailed')),
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DraftAmenity }) =>
      okOrThrow(
        await fetch(`/api/admin/amenities/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('saveFailed')),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      okOrThrow(
        await fetch(`/api/admin/amenities/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      ),
    onSuccess: () => {
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('deleteFailed')),
  });

  return (
    <>
      <header className="mb-5">
        <Heading as="h1" level="page">
          {t('title')}
        </Heading>
        <p className="text-foreground-muted mt-1 text-sm">{t('subtitle')}</p>
      </header>

      {error ? (
        <Alert variant="error" size="sm" className="mb-4 text-sm text-rose-700">
          <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </Alert>
      ) : null}

      <section className="border-border bg-background mb-6 rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">{t('createTitle')}</h2>
        <AmenityFields draft={draft} onChange={setDraft} tCategory={tCategory} t={t} />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!draft.name.en.trim() || create.isPending}
            onClick={() => create.mutate(draft)}
          >
            {create.isPending ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconPlus size={14} />
            )}
            {t('create')}
          </Button>
        </div>
      </section>

      {isLoading ? (
        <ul className="space-y-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={`s-${i}`} className="bg-accent h-12 animate-pulse rounded-md" />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {(amenities ?? []).map((amenity) => (
            <li
              key={amenity.id}
              className="border-border bg-background rounded-2xl border p-3 shadow-sm"
            >
              {editingId === amenity.id ? (
                <AmenityEditor
                  amenity={amenity}
                  pending={update.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(input) => update.mutate({ id: amenity.id, input })}
                  tCategory={tCategory}
                  t={t}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {amenity.name.en}
                      <span className="text-foreground-muted ml-2 font-mono text-xs">
                        {amenity.slug}
                      </span>
                    </p>
                    <p className="text-foreground-muted text-xs">
                      {tCategory(amenity.category)} · {amenity.name.az} · {amenity.name.ru}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(amenity.id)}
                      className="gap-1.5"
                    >
                      <IconPencil size={14} />
                      <span className="hidden sm:inline">{t('edit')}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructiveGhost"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(amenity.id)}
                      className="gap-1.5"
                    >
                      <IconTrash size={14} />
                      <span className="hidden sm:inline">{t('delete')}</span>
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AmenityFields({
  draft,
  onChange,
  tCategory,
  t,
}: {
  draft: DraftAmenity;
  onChange: (next: DraftAmenity) => void;
  tCategory: ReturnType<typeof useTranslations<'admin.amenityCategories'>>;
  t: ReturnType<typeof useTranslations<'admin.amenities'>>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      {(['en', 'ru', 'az'] as const).map((locale) => (
        <Input
          key={locale}
          value={draft.name[locale]}
          onChange={(e) =>
            onChange({ ...draft, name: { ...draft.name, [locale]: e.target.value } })
          }
          placeholder={t(`namePlaceholder.${locale}`)}
          aria-label={t(`namePlaceholder.${locale}`)}
        />
      ))}
      <Select
        value={draft.category}
        onChange={(e) =>
          onChange({ ...draft, category: e.target.value as DraftAmenity['category'] })
        }
        aria-label={t('categoryLabel')}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {tCategory(c)}
          </option>
        ))}
      </Select>
    </div>
  );
}

function AmenityEditor({
  amenity,
  pending,
  onCancel,
  onSave,
  tCategory,
  t,
}: {
  amenity: AmenityOption;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: DraftAmenity) => void;
  tCategory: ReturnType<typeof useTranslations<'admin.amenityCategories'>>;
  t: ReturnType<typeof useTranslations<'admin.amenities'>>;
}) {
  const [draft, setDraft] = useState<DraftAmenity>({
    name: amenity.name,
    category: (CATEGORIES as readonly string[]).includes(amenity.category)
      ? (amenity.category as DraftAmenity['category'])
      : 'extras',
  });

  return (
    <div className="space-y-3">
      <AmenityFields draft={draft} onChange={setDraft} tCategory={tCategory} t={t} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!draft.name.en.trim() || pending}
          onClick={() => onSave(draft)}
          className="gap-1.5"
        >
          {pending ? <IconLoader2 size={14} className="animate-spin" /> : null}
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
