import { renderWithProviders, screen } from '@/test/test-utils';
import type { Listing } from '@/types';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ListingCard } from './listing-card';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const baseListing: Listing = {
  id: 'lst_test',
  slug: 'test-villa',
  title: { az: 'AZ', ru: 'RU', en: 'Test Villa' },
  description: { az: 'd', ru: 'd', en: 'd' },
  region: 'gabala',
  direction: 'others',
  placeType: 'villa-cottage',
  price: 320,
  images: ['https://example.test/img.jpg'],
  amenities: ['wifi', 'pool', 'bbq', 'kitchen'],
  category: 'mountain',
  rating: 4.9,
  reviewCount: 150,
  capacity: 6,
  bedrooms: 3,
  phone: '+994500000000',
  meals: ['breakfast'],
  activities: [],
  location: { lat: 0, lng: 0, address: 'Vandam' },
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('ListingCard', () => {
  it('renders title, region, price, and rating', () => {
    renderWithProviders(<ListingCard listing={baseListing} locale="en" />);
    expect(screen.getByRole('heading', { name: 'Test Villa' })).toBeInTheDocument();
    expect(screen.getByText('Gabala')).toBeInTheDocument();
    expect(screen.getByText(/320/)).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('renders the "Top pick" badge when rating >= 4.85 and reviews >= 100', () => {
    renderWithProviders(<ListingCard listing={baseListing} locale="en" />);
    expect(screen.getByText('Top pick')).toBeInTheDocument();
  });

  it('toggles the favorite button on click and updates aria-pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ListingCard listing={baseListing} locale="en" />);

    const fav = screen.getByRole('button', { name: /add to favorites/i });
    expect(fav).toHaveAttribute('aria-pressed', 'false');

    await user.click(fav);

    expect(screen.getByRole('button', { name: /remove from favorites/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows at most 3 amenity icons', () => {
    renderWithProviders(<ListingCard listing={baseListing} locale="en" />);
    const list = screen.getByRole('list', { name: /amenities/i });
    expect(list.querySelectorAll('li')).toHaveLength(3);
  });
});
