import { getListingBySlug } from '@/lib/api/listings-service';
import { SITE } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Next 15: route params are async — every other route in this app awaits them.
// Without `await`, `params.slug` is `undefined` and we'd silently ship the
// fallback for every listing.
type Props = { params: Promise<{ locale: 'az' | 'ru' | 'en'; slug: string }> };

const FALLBACK_TITLE = 'iRayon — Villa rentals across Azerbaijan';

export default async function ListingOgImage({ params }: Props) {
  const { locale, slug } = await params;
  const listing = await getListingBySlug(slug);
  const title = listing?.title[locale] ?? FALLBACK_TITLE;
  const cover = listing?.images[0];
  const region = listing?.region ?? '';
  const price = listing ? `${formatPrice(listing.price, locale)} AZN` : '';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        color: '#ffffff',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: 'linear-gradient(135deg, #1e3d2a 0%, #2d5a3d 60%, #5a9e6f 100%)',
        position: 'relative',
      }}
    >
      {cover ? (
        // Cover photo as the bottom layer; gradient overlay sits on top.
        // next/og's ImageResponse requires plain <img> — next/image is unsupported here.
        <img
          src={cover}
          alt=""
          width={1200}
          height={630}
          style={{ position: 'absolute', inset: 0, objectFit: 'cover' }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: '#ffffff',
              color: '#2d5a3d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            iR
          </div>
          {SITE.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          {listing ? (
            <div style={{ display: 'flex', gap: 16, fontSize: 28, opacity: 0.94 }}>
              <span style={{ textTransform: 'capitalize' }}>{region}</span>
              <span>·</span>
              <span>{price} / night</span>
              <span>·</span>
              <span>{listing.capacity} guests</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
