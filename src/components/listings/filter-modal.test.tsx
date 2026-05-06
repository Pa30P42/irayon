import { makeFilterState, makeListing } from '@/test/factories';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterModal } from './filter-modal';

const listings = [
  makeListing({ id: '1', direction: 'guba', amenities: ['pool'] }),
  makeListing({ id: '2', direction: 'lerik', amenities: ['fireplace'] }),
  makeListing({ id: '3', direction: 'ismayilli', amenities: ['pool', 'sauna'] }),
];

describe('FilterModal', () => {
  it('opens when the trigger is clicked and shows all groups', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FilterModal state={makeFilterState()} listings={listings} onApply={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /filter/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Direction')).toBeInTheDocument();
    expect(within(dialog).getByText('Place type')).toBeInTheDocument();
    expect(within(dialog).getByText('Extras')).toBeInTheDocument();
  });

  it('updates the apply button count as the user toggles options', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FilterModal state={makeFilterState()} listings={listings} onApply={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /filter/i }));
    const dialog = await screen.findByRole('dialog');

    // Initially: 3 listings → "Show 3 options"
    expect(within(dialog).getByRole('button', { name: /show 3 options/i })).toBeInTheDocument();

    // Toggle pool: 2 listings have pool
    await user.click(within(dialog).getByRole('checkbox', { name: /^pool\b/i }));
    expect(within(dialog).getByRole('button', { name: /show 2 options/i })).toBeInTheDocument();
  });

  it('apply forwards the draft and closes the dialog', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithProviders(
      <FilterModal state={makeFilterState()} listings={listings} onApply={onApply} />,
    );

    await user.click(screen.getByRole('button', { name: /filter/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: /^pool\b/i }));
    await user.click(within(dialog).getByRole('button', { name: /show 2 options/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]?.[0].extra).toContain('pool');
  });

  it('reset clears the draft selections', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FilterModal state={makeFilterState()} listings={listings} onApply={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /filter/i }));
    const dialog = await screen.findByRole('dialog');

    const pool = within(dialog).getByRole('checkbox', { name: /^pool\b/i });
    await user.click(pool);
    expect(pool).toBeChecked();

    await user.click(within(dialog).getByRole('button', { name: /^reset$/i }));
    expect(within(dialog).getByRole('checkbox', { name: /^pool\b/i })).not.toBeChecked();
  });
});
