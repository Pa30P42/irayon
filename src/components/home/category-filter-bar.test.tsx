import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import type { UrlUpdateEvent } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFilterBar } from './category-filter-bar';

describe('CategoryFilterBar', () => {
  it('marks "All" as active by default', () => {
    renderWithProviders(<CategoryFilterBar />);
    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  it('selects a category from the URL', () => {
    renderWithProviders(<CategoryFilterBar />, { searchParams: '?category=forest' });
    expect(screen.getByRole('tab', { name: /forest/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /^all$/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('updates the URL when a category is clicked', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(e: UrlUpdateEvent) => void>();

    renderWithProviders(<CategoryFilterBar />, { onUrlUpdate });

    await user.click(screen.getByRole('tab', { name: /sea/i }));

    expect(onUrlUpdate).toHaveBeenCalled();
    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.queryString).toContain('category=sea');
  });

  it('clears the URL param when "All" is clicked', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn<(e: UrlUpdateEvent) => void>();

    renderWithProviders(<CategoryFilterBar />, {
      searchParams: '?category=mountain',
      onUrlUpdate,
    });

    await user.click(screen.getByRole('tab', { name: /^all$/i }));

    expect(onUrlUpdate).toHaveBeenCalled();
    const event = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(event?.queryString ?? '').not.toContain('category=');
  });
});
