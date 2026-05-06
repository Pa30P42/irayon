import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterCheckbox } from './filter-checkbox';

describe('FilterCheckbox', () => {
  it('renders default state (unchecked, enabled)', () => {
    renderWithProviders(
      <FilterCheckbox id="t1" label="Pool" checked={false} count={5} onChange={() => {}} />,
    );
    const cb = screen.getByRole('checkbox', { name: /pool/i });
    expect(cb).not.toBeChecked();
    expect(cb).not.toBeDisabled();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders checked state', () => {
    renderWithProviders(
      <FilterCheckbox id="t2" label="Pool" checked={true} count={5} onChange={() => {}} />,
    );
    expect(screen.getByRole('checkbox', { name: /pool/i })).toBeChecked();
  });

  it('renders incompatible state: strikethrough, disabled, count shows 0', () => {
    renderWithProviders(
      <FilterCheckbox
        id="t3"
        label="Sauna"
        checked={false}
        count={2}
        incompatible
        onChange={() => {}}
      />,
    );
    const cb = screen.getByRole('checkbox', { name: /sauna/i });
    expect(cb).toBeDisabled();
    const label = screen.getByText('Sauna');
    expect(label.className).toMatch(/line-through/);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('still allows un-checking when incompatible but already checked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <FilterCheckbox id="t4" label="Pool" checked count={1} incompatible onChange={onChange} />,
    );
    const cb = screen.getByRole('checkbox', { name: /pool/i });
    expect(cb).not.toBeDisabled();
    await user.click(cb);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('fires onChange with the next boolean value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <FilterCheckbox id="t5" label="Pool" checked={false} count={5} onChange={onChange} />,
    );
    await user.click(screen.getByRole('checkbox', { name: /pool/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
