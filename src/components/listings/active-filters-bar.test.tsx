import { makeFilterState } from '@/test/factories';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActiveFiltersBar } from './active-filters-bar';

describe('ActiveFiltersBar — CopyLinkButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies the current URL and shows a confirmation', async () => {
    // `userEvent.setup()` installs a virtual clipboard, so we must spy AFTER
    // setup — patching earlier (e.g. in beforeEach) gets overwritten.
    const user = userEvent.setup();
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);

    // Need at least one active filter for the bar to render.
    renderWithProviders(
      <ActiveFiltersBar
        state={makeFilterState({ extra: ['pool'] })}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /copy link/i }));

    expect(writeTextSpy).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText(/^copied$/i)).toBeInTheDocument();
  });

  it('does not render when no filters are active', () => {
    renderWithProviders(
      <ActiveFiltersBar state={makeFilterState()} onChange={vi.fn()} onReset={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
  });
});
