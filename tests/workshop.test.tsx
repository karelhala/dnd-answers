import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { loadWorkshop } from '../src/state/persistence';
import { WorkshopProvider } from '../src/state/WorkshopProvider';

function renderWorkshop() {
  return render(<WorkshopProvider initial={loadWorkshop()}><App /></WorkshopProvider>);
}

beforeEach(() => localStorage.clear());

describe('workshop foundation', () => {
  it('opens the Experience trial in Practice with local selection persistence', () => {
    renderWorkshop();

    expect(screen.getByRole('heading', { name: "Rehor's Restoration Console" })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'ConsoleDot Experience' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Practice' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Corrupted Core' })).toBeVisible();
    expect(screen.getByText('Core: Memory')).toBeVisible();
    expect(screen.getByText(/selections are retained locally/)).toBeVisible();
  });

  it('switches squads using keyboard-accessible radio controls', async () => {
    const user = userEvent.setup();
    renderWorkshop();

    await user.tab();
    expect(screen.getByRole('radio', { name: 'ConsoleDot Experience' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'ConsoleDot Framework' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Spectral Steeds' })).toBeVisible();
    expect(screen.getByText('Core: Judgment')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('ConsoleDot Framework · Practice mode');
  });

  it('keeps Practice active when the presenter cancels acknowledgment', async () => {
    const user = userEvent.setup();
    renderWorkshop();

    await user.click(screen.getByRole('radio', { name: 'Official' }));
    expect(screen.getByRole('heading', { name: 'Presenter acknowledgment' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Practice' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: 'Presenter acknowledgment' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Practice' })).toBeChecked();
  });

  it('requires acknowledgment before Official and retains mode across squad switches', async () => {
    const user = userEvent.setup();
    renderWorkshop();

    await user.click(screen.getByRole('radio', { name: 'Official' }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge and enter Official' }));
    expect(screen.getByRole('radio', { name: 'Official' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('ConsoleDot Experience · Official mode');

    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    expect(screen.getByRole('status')).toHaveTextContent('ConsoleDot Framework · Official mode');
    await user.click(screen.getByRole('radio', { name: 'Practice' }));
    await user.click(screen.getByRole('radio', { name: 'Official' }));
    expect(screen.getByRole('radio', { name: 'Official' })).toBeChecked();
    expect(screen.queryByRole('heading', { name: 'Presenter acknowledgment' })).not.toBeInTheDocument();
  });
});
