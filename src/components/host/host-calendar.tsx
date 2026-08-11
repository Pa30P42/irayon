'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toDisabledMatchers } from '@/hooks/use-availability';
import { useCreateBlock, useDeleteBlock, useHostBlocks } from '@/hooks/use-host-blocks';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

export type HostListingOption = { id: string; slug: string; title: string };

/** `Date` → `YYYY-MM-DD` in local terms — the day the host actually clicked. */
const toCalendarString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * A block's `end` is half-open — the morning the place reopens. Showing it raw
 * reads as an off-by-one to the host: they closed the 20th to the 22nd and the
 * list would say "20 → 23". Display the last CLOSED night instead.
 */
const lastBlockedNight = (end: string): string => {
  const date = new Date(`${end}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

export function HostCalendar({ listings }: { listings: HostListingOption[] }) {
  const t = useTranslations('host.calendar');
  const [listingId, setListingId] = useState(listings[0]?.id ?? '');
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: blocks = [] } = useHostBlocks(listingId || null);
  const createBlock = useCreateBlock(listingId);
  const deleteBlock = useDeleteBlock(listingId);

  /**
   * Existing blocks are shown as disabled days so the host can't stack a
   * second block on top of one that already exists — the API would accept it,
   * and the result would be two rows describing the same closed nights.
   */
  const blockedMatchers = useMemo(() => toDisabledMatchers(blocks), [blocks]);

  const onSubmit = () => {
    if (!range?.from || !range?.to || !listingId) return;
    setError(null);
    createBlock.mutate(
      {
        startDate: toCalendarString(range.from),
        // The picker's `to` is the last night the host selected; the API wants
        // a half-open end, i.e. the morning they reopen. Add a day.
        endDate: toCalendarString(new Date(range.to.getTime() + 86_400_000)),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: () => {
          setRange(undefined);
          setNote('');
        },
        onError: (err) =>
          setError(err.message === 'dates_booked' ? t('dates_booked') : err.message),
      },
    );
  };

  if (listings.length === 0) {
    return <p className="text-foreground-muted text-sm">{t('noListings')}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="listing">{t('selectListing')}</Label>
        <select
          id="listing"
          value={listingId}
          onChange={(e) => {
            setListingId(e.target.value);
            setRange(undefined);
          }}
          className="border-border bg-background h-10 w-full rounded-md border px-3 text-sm"
        >
          {listings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="border-border rounded-xl border p-2">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            disabled={[{ before: new Date() }, ...blockedMatchers]}
          />
        </div>

        <div className="min-w-[16rem] flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="blockNote">{t('blockNote')}</Label>
            <Input
              id="blockNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          ) : null}

          <Button disabled={!range?.from || !range?.to || createBlock.isPending} onClick={onSubmit}>
            {t('addBlock')}
          </Button>
          {!range?.from || !range?.to ? (
            <p className="text-foreground-muted text-xs">{t('selectRange')}</p>
          ) : null}

          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">{t('blocked')}</p>
            {blocks.length === 0 ? (
              <p className="text-foreground-muted text-sm">{t('noBlocks')}</p>
            ) : (
              <ul className="space-y-1.5">
                {blocks.map((block) => (
                  <li
                    key={block.id}
                    className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="tabular-nums">
                        {block.start} → {lastBlockedNight(block.end)}
                      </span>
                      {/* Plain text node — the host's own note, rendered as text. */}
                      {block.note ? (
                        <span className="text-foreground-muted block truncate text-xs">
                          {block.note}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleteBlock.isPending}
                      onClick={() => deleteBlock.mutate(block.id)}
                    >
                      {t('removeBlock')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
