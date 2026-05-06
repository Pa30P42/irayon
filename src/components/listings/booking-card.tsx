import { formatPrice, formatPhoneNumber } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { CallButton } from './call-button';

type BookingCardProps = {
  listing: Listing;
  locale: Locale;
};

export function BookingCard({ listing, locale }: BookingCardProps) {
  const t = useTranslations('detail.booking');
  const tCommon = useTranslations('common');

  const fmtMoney = (amount: number) => `${formatPrice(amount, locale)} ${tCommon('currency')}`;

  return (
    <aside className="border-border bg-background sticky top-24 space-y-5 rounded-2xl border p-6 shadow-sm">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{fmtMoney(listing.price)}</span>
        <span className="text-foreground-muted text-sm">{t('perNight')}</span>
      </p>

      <CallButton listingId={listing.id} phone={listing.phone} source="detail" />

      <p className="text-foreground-muted text-center text-xs">
        {formatPhoneNumber(listing.phone)}
      </p>
    </aside>
  );
}
