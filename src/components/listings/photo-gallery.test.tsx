import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PhotoGallery } from './photo-gallery';

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

const photos = [
  'https://example.test/a.jpg',
  'https://example.test/b.jpg',
  'https://example.test/c.jpg',
];

describe('PhotoGallery', () => {
  it('renders the show-all-photos trigger with the count', () => {
    renderWithProviders(<PhotoGallery photos={photos} alt="Test villa" />);
    expect(screen.getByRole('button', { name: /show all photos · 3/i })).toBeInTheDocument();
  });

  it('opens the lightbox dialog when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PhotoGallery photos={photos} alt="Test villa" />);

    await user.click(screen.getByRole('button', { name: /show all photos/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    // Photo counter renders twice: visible counter + sr-only DialogDescription.
    expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0);
  });

  it('navigates between photos with the next/prev buttons', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PhotoGallery photos={photos} alt="Test villa" />);

    await user.click(screen.getByRole('button', { name: /show all photos/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0);

    // wraps
    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0);
  });

  it('returns null with no photos', () => {
    const { container } = renderWithProviders(<PhotoGallery photos={[]} alt="Empty" />);
    expect(container).toBeEmptyDOMElement();
  });
});
