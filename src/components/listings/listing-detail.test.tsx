import { makeListing } from '@/test/factories';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ListingDetailContent } from './listing-detail-content';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

const listing = makeListing({
  id: 'lst_test',
  slug: 'gabala-pine-retreat',
  title: { az: 'AZ Title', ru: 'RU Title', en: 'Gabala Pine Retreat' },
  description: { az: 'AZ desc', ru: 'RU desc', en: 'A peaceful pine retreat in the woods.' },
  region: 'gabala',
  category: 'forest',
  price: 320,
  capacity: 8,
  bedrooms: 4,
  rating: 4.9,
  reviewCount: 128,
  amenities: ['wifi', 'pool', 'fireplace', 'kitchen'],
  images: ['https://example.test/1.jpg', 'https://example.test/2.jpg'],
  createdAt: '2024-05-01T00:00:00.000Z',
  location: { lat: 40.9876, lng: 47.8234, address: 'Vandam, Gabala' },
});

const similar = [
  makeListing({
    id: 'lst_sim_1',
    slug: 'gabala-nohur',
    title: { az: 'A', ru: 'B', en: 'Nohur Lake Villa' },
    region: 'gabala',
  }),
];

describe('ListingDetailContent', () => {
  it('renders the listing title as h1', () => {
    renderWithProviders(<ListingDetailContent listing={listing} similar={similar} locale="en" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Gabala Pine Retreat' }),
    ).toBeInTheDocument();
  });

  it('renders price + address + rating in the header', () => {
    renderWithProviders(<ListingDetailContent listing={listing} similar={similar} locale="en" />);
    expect(screen.getAllByText(/320/).length).toBeGreaterThan(0);
    // Address appears in both header and location section.
    expect(screen.getAllByText('Vandam, Gabala').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('renders the host section with member-since year derived from createdAt', () => {
    renderWithProviders(<ListingDetailContent listing={listing} similar={similar} locale="en" />);
    expect(screen.getByText(/Member since 2024/)).toBeInTheDocument();
  });

  it('renders amenity groups (essentials, outdoor, kitchen)', () => {
    renderWithProviders(<ListingDetailContent listing={listing} similar={similar} locale="en" />);
    // Group headings — match the full localized labels so the "Kitchen" amenity
    // (which appears as a list item) doesn't collide with the "Kitchen & dining"
    // group heading.
    expect(screen.getByRole('heading', { level: 3, name: /Essentials/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /Outdoor & wellness/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /Kitchen & dining/i }),
    ).toBeInTheDocument();
  });

  it('renders the similar listings section heading and at least one card', () => {
    renderWithProviders(<ListingDetailContent listing={listing} similar={similar} locale="en" />);
    expect(screen.getByRole('heading', { name: /more in this region/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Nohur Lake Villa' })).toBeInTheDocument();
  });

  it('renders a Call button linking to the listing phone number', () => {
    renderWithProviders(<ListingDetailContent listing={listing} similar={similar} locale="en" />);
    const link = screen.getByRole('link', { name: /call/i });
    expect(link).toHaveAttribute('href', `tel:${listing.phone}`);
  });
});
