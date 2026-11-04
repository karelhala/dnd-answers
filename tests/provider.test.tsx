import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { coinQuestions } from '../src/content/questions';
import { loadWorkshop, parseWorkshopState, STORAGE_KEY } from '../src/state/persistence';
import type { StorageAccess, WorkshopBootstrap } from '../src/state/persistence';
import { useWorkshop, WorkshopProvider } from '../src/state/WorkshopProvider';
import { unwrap } from '../src/test/fixtures';
import { acceptedCoins, at, fixtureWorkshop, target } from '../src/test/workshopFixtures';

afterEach(() => vi.restoreAllMocks());

function storageWith(value: string | null = null) {
  let raw = value;
  return {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, next: string) => { raw = next; }),
  };
}

function VerificationProbe() {
  const { state, dispatch } = useWorkshop();
  const session = state.sessions.experience.practice;
  return (
    <div>
      <output aria-label="Test phase">{session.trial.phase}</output>
      <button type="button" onClick={() => {
        dispatch({ type: 'EDIT_VERIFICATION', target: target(session), answers: Object.fromEntries(coinQuestions.map((q) => [q.id, q.correctIds])) });
        dispatch({ type: 'SUBMIT_VERIFICATION', target: target(session), at: at(20) });
      }}>Complete test verification</button>
    </div>
  );
}

function workshop(initial: WorkshopBootstrap, probe = false) {
  return (
    <StrictMode>
      <WorkshopProvider initial={initial}>
        <App />
        {probe && <VerificationProbe />}
      </WorkshopProvider>
    </StrictMode>
  );
}

describe('workshop provider and storage notices', () => {
  it('persists team/mode changes and restores acknowledgment and all cases on remount', async () => {
    const user = userEvent.setup();
    const storage = storageWith();
    const initial = loadWorkshop(storage);
    const originalCases = initial.state.sessions;
    const view = render(workshop(initial));
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    await user.click(screen.getByRole('radio', { name: 'Official' }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge and enter Official' }));
    view.unmount();

    const loaded = loadWorkshop(storage);
    expect(loaded.state.sessions).toEqual(originalCases);
    render(workshop(loaded));
    expect(screen.getByRole('radio', { name: 'ConsoleDot Framework' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Official' })).toBeChecked();
    expect(screen.queryByRole('heading', { name: 'Presenter acknowledgment' })).not.toBeInTheDocument();
  });

  it('does not regenerate cases during StrictMode rendering or navigation', async () => {
    const initial = { state: fixtureWorkshop(), storage: storageWith(), status: 'ready' as const };
    const random = vi.spyOn(crypto, 'getRandomValues');
    const ids = vi.spyOn(crypto, 'randomUUID');
    const view = render(workshop(initial));
    view.rerender(workshop(initial));
    await userEvent.setup().click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    expect(random).not.toHaveBeenCalled();
    expect(ids).not.toHaveBeenCalled();
  });

  it('keeps corrupt storage untouched during navigation and canceled recovery', async () => {
    const user = userEvent.setup();
    const storage = storageWith('{broken');
    render(workshop(loadWorkshop(storage)));
    expect(screen.getByRole('heading', { name: 'Saved progress needs recovery' })).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    await user.click(screen.getByRole('button', { name: 'Reset saved progress' }));
    expect(screen.getByText(/Reset both squads, Practice and Official/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm reset of all progress' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel reset' }));
    expect(screen.getByRole('button', { name: 'Reset saved progress' })).toHaveFocus();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem()).toBe('{broken');
  });

  it('replaces the record only after confirmed recovery and returns to fresh Practice', async () => {
    const user = userEvent.setup();
    const storage = storageWith(JSON.stringify({ schemaVersion: 99 }));
    render(workshop(loadWorkshop(storage)));
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    await user.click(screen.getByRole('radio', { name: 'Official' }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge and enter Official' }));
    expect(storage.setItem).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reset saved progress' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reset of all progress' }));
    expect(screen.queryByRole('heading', { name: 'Saved progress needs recovery' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Practice' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'ConsoleDot Experience' })).toBeChecked();
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    expect(unwrap(parseWorkshopState(JSON.parse(storage.getItem()!))).officialAcknowledged).toBe(false);
  });

  it('warns on quota failure but still permits an in-memory verified solution', async () => {
    const storage: StorageAccess = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); },
    };
    render(workshop({ state: acceptedCoins(), storage, status: 'ready' }, true));
    expect(screen.getByRole('alert')).toHaveTextContent('Progress cannot be saved in this browser. Keep this tab open.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Complete test verification' }));
    expect(screen.getByLabelText('Test phase')).toHaveTextContent('solved');
  });

  it('warns when accessing localStorage itself is denied and leaves controls usable', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    render(workshop(loadWorkshop()));
    expect(screen.getByRole('alert')).toHaveTextContent('Progress cannot be saved');
    await userEvent.setup().click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    expect(screen.getByRole('heading', { name: 'Spectral Steeds' })).toBeVisible();
  });
});
