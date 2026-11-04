import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { loadWorkshop, parseWorkshopState, STORAGE_KEY } from '../src/state/persistence';
import type { StorageAccess } from '../src/state/persistence';
import { WorkshopProvider } from '../src/state/WorkshopProvider';
import { workshopReducer } from '../src/state/reducer';
import type { WorkshopState } from '../src/state/types';
import { unwrap } from '../src/test/fixtures';
import { acceptedCoins, at, fixtureWorkshop, solve, target } from '../src/test/workshopFixtures';

function storageFor(state: WorkshopState) {
  let raw = JSON.stringify(state);
  return {
    getItem: (_key: string) => raw,
    setItem: vi.fn((_key: string, next: string) => { raw = next; }),
    state: () => unwrap(parseWorkshopState(JSON.parse(raw))),
  };
}

function renderWorkshop(state = fixtureWorkshop(), storage: StorageAccess = storageFor(state)) {
  return render(<WorkshopProvider initial={loadWorkshop(storage)}><App /></WorkshopProvider>);
}

const pan = (name: 'Left' | 'Right') => within(screen.getByRole('group', { name: new RegExp(`^${name} pan`) }));
const identification = () => within(screen.getByRole('form', { name: 'Fragment identification' }));

async function weigh(user: ReturnType<typeof userEvent.setup>) {
  await user.click(pan('Left').getByRole('checkbox', { name: 'C' }));
  await user.click(pan('Right').getByRole('checkbox', { name: 'D' }));
  await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
}

async function identify(user: ReturnType<typeof userEvent.setup>, coin = 'A', difference = 'heavier') {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Corrupted fragment' }), coin);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Weight direction' }), difference);
  await user.click(screen.getByRole('button', { name: 'Submit identification' }));
}

async function fillUnderstanding(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: '24' }));
  const candidates = within(screen.getByRole('group', { name: 'Possible corrupted fragments — select every candidate' }));
  for (const id of ['I', 'J', 'K', 'L']) await user.click(candidates.getByRole('checkbox', { name: id }));
  await user.click(screen.getByRole('radio', { name: 'Either direction' }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(30));
});
afterEach(() => vi.useRealTimers());

describe('interactive coin trial', () => {
  it('shows honest scope, labeled pans, full rules, and the minimum-observation gate', () => {
    renderWorkshop();
    expect(pan('Left').getAllByRole('checkbox')).toHaveLength(12);
    expect(pan('Right').getAllByRole('checkbox')).toHaveLength(12);
    expect(screen.getByText(/not a complete strategy across all 24 possible cases/)).toBeVisible();
    expect(screen.getByText('Weighings used: 0 / 3')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit identification' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Verify your understanding' })).not.toBeInTheDocument();
  });

  it('disables overlap selections and records accessible text outcomes without discarding pans', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await user.click(pan('Left').getByRole('checkbox', { name: 'A' }));
    expect(pan('Right').getByRole('checkbox', { name: 'A' })).toBeDisabled();
    await user.click(pan('Right').getByRole('checkbox', { name: 'B' }));
    const button = screen.getByRole('button', { name: 'Weigh fragments' });
    await user.click(button);
    expect(button).toHaveFocus();
    expect(screen.getByText('Weighings used: 1 / 3')).toBeVisible();
    const history = within(screen.getByRole('list', { name: 'Weighing history' }));
    expect(history.getByText('Weighing 1: Left heavier.')).toBeVisible();
    expect(history.getByText(/Left: A. Right: B./)).toBeVisible();
    expect(pan('Left').getByRole('checkbox', { name: 'A' })).toBeChecked();
    expect(screen.getByRole('form', { name: 'Balance weighing' }).querySelector('[aria-live]')).toHaveTextContent('Left heavier');
  });

  it('rejects empty and unequal pans without consuming quota or losing selections', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    const form = within(screen.getByRole('form', { name: 'Balance weighing' }));
    await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
    expect(form.getByText(/Place at least one fragment on each pan/)).toBeVisible();
    await user.click(pan('Left').getByRole('checkbox', { name: 'A' }));
    await user.click(pan('Left').getByRole('checkbox', { name: 'B' }));
    await user.click(pan('Right').getByRole('checkbox', { name: 'C' }));
    await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
    expect(form.getByText(/Use equal counts/)).toBeVisible();
    expect(screen.getByText('Weighings used: 0 / 3')).toBeVisible();
    expect(pan('Left').getByRole('checkbox', { name: 'A' })).toBeChecked();
    expect(pan('Left').getByRole('checkbox', { name: 'B' })).toBeChecked();
  });

  it('keeps wrong or incomplete identifications correctable without revealing the hidden answer', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await weigh(user);
    await user.click(screen.getByRole('button', { name: 'Submit identification' }));
    expect(identification().getByText(/Choose one fragment and either heavier or lighter/)).toBeVisible();
    await identify(user, 'B', 'lighter');
    expect(identification().getByText(/That identification does not match this case/)).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Corrupted fragment' })).toHaveValue('B');
    expect(screen.queryByRole('heading', { name: 'Verify your understanding' })).not.toBeInTheDocument();
    await identify(user);
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).toHaveFocus();
  });

  it('exhausts only observations, leaving identification available after three weighings', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await weigh(user);
    await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
    await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
    expect(screen.getByText('Weighings used: 3 / 3')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Weigh fragments' })).toBeDisabled();
    expect(pan('Left').getByRole('checkbox', { name: 'C' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit identification' })).toBeEnabled();
    await identify(user);
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).toBeVisible();
  });

  it('finishes Practice only after both exact-set questions pass, with unlimited correction', async () => {
    const user = userEvent.setup();
    const storage = storageFor(fixtureWorkshop());
    renderWorkshop(fixtureWorkshop(), storage);
    await weigh(user);
    await identify(user);
    expect(screen.getByRole('button', { name: 'Weigh fragments' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Corrupted fragment' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByText('Verification incomplete. Review the feedback and try again.')).toBeVisible();
    await fillUnderstanding(user);
    const candidates = within(screen.getByRole('group', { name: 'Possible corrupted fragments — select every candidate' }));
    await user.click(candidates.getByRole('checkbox', { name: 'H' }));
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).toBeVisible();
    expect(screen.getByRole('radio', { name: '24' })).toBeChecked();
    expect(candidates.getByRole('checkbox', { name: 'I' })).toBeChecked();
    await user.click(candidates.getByRole('checkbox', { name: 'H' }));
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByRole('heading', { name: 'Practice complete' })).toHaveFocus();
    expect(within(screen.getByRole('region', { name: 'Practice complete' })).getByText('Practice only. No official rewards are granted.')).toBeVisible();
    expect(screen.queryByText(/→ 1 Rehor intervention/)).not.toBeInTheDocument();
    expect(storage.state().sessions.experience.practice.trial.phase).toBe('solved');
    expect(storage.state().sessions.experience.official.trial.phase).toBe('playing');
  });

  it('announces both Official reward recipients and never copies Practice evidence', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await weigh(user);
    await user.click(screen.getByRole('radio', { name: 'Official' }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge and enter Official' }));
    expect(screen.getByText('Weighings used: 0 / 3')).toBeVisible();
    expect(pan('Left').getByRole('checkbox', { name: 'C' })).not.toBeChecked();
    await weigh(user);
    await identify(user);
    await fillUnderstanding(user);
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByRole('heading', { name: 'Core restored' })).toHaveFocus();
    expect(screen.getByText(/ConsoleDot Experience → 1 Rehor intervention/)).toBeVisible();
    expect(screen.getByText('ConsoleDot Framework → Alliance Surge: 2 shared rerolls.')).toBeVisible();
  });

  it('retains pan and answer drafts across team switches and browser reloads', async () => {
    const user = userEvent.setup();
    const storage = storageFor(fixtureWorkshop());
    const view = renderWorkshop(fixtureWorkshop(), storage);
    await weigh(user);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Corrupted fragment' }), 'L');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Weight direction' }), 'lighter');
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Experience' }));
    expect(pan('Left').getByRole('checkbox', { name: 'C' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Corrupted fragment' })).toHaveValue('L');
    view.unmount();
    renderWorkshop(fixtureWorkshop(), storage);
    expect(screen.getByText('Weighings used: 1 / 3')).toBeVisible();
    expect(pan('Right').getByRole('checkbox', { name: 'D' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Corrupted fragment' })).toHaveValue('L');
    expect(screen.getByRole('combobox', { name: 'Weight direction' })).toHaveValue('lighter');
  });

  it('restores incomplete follow-up drafts without reopening the puzzle or stealing focus', async () => {
    const user = userEvent.setup();
    const state = acceptedCoins();
    const storage = storageFor(state);
    const view = renderWorkshop(state, storage);
    await user.click(screen.getByRole('radio', { name: '24' }));
    view.unmount();
    renderWorkshop(fixtureWorkshop(), storage);
    expect(screen.getByRole('radio', { name: '24' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).not.toHaveFocus();
    expect(screen.getByRole('button', { name: 'Weigh fragments' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit identification' })).toBeDisabled();
  });

  it('restores terminal Official results without adding resolution records or claiming another grant', () => {
    const accepted = acceptedCoins(fixtureWorkshop(), 'official');
    const state = solve(accepted, accepted.sessions.experience.official);
    const storage = storageFor(state);
    const view = renderWorkshop(state, storage);
    expect(screen.getByRole('heading', { name: 'Core restored' })).toBeVisible();
    expect(screen.getByText(/not a new reward grant on each visit/)).toBeVisible();
    view.unmount();
    renderWorkshop(fixtureWorkshop(), storage);
    expect(storage.state().sessions.experience.official.history.filter((event) => event.kind === 'resolution')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Check understanding' })).not.toBeInTheDocument();
  });

  it('presents saved cooperative repair distinctly, without cross-team rerolls', () => {
    let state = acceptedCoins(fixtureWorkshop(), 'official');
    state = workshopReducer(state, { type: 'CONFIRM_REPAIR', target: target(state.sessions.experience.official), at: at(20), confirmations: [true, true, true] });
    renderWorkshop(state);
    expect(screen.getByText('Restored through cooperation')).toBeVisible();
    expect(screen.getByText('ConsoleDot Framework → no additional buff from this repair.')).toBeVisible();
    expect(screen.queryByText(/Alliance Surge:/)).not.toBeInTheDocument();
  });

  it('can finish with denied persistence and keeps attempt feedback available', async () => {
    const user = userEvent.setup();
    const state = acceptedCoins();
    const storage = { getItem: () => JSON.stringify(state), setItem: () => { throw new Error('Storage denied'); } };
    renderWorkshop(state, storage);
    expect(screen.getByRole('alert')).toHaveTextContent('Progress cannot be saved');
    await fillUnderstanding(user);
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByRole('heading', { name: 'Practice complete' })).toBeVisible();
    await user.click(screen.getByText(/^Attempt history/));
    expect(screen.getByText(/— Puzzle verified. Core restored./)).toBeVisible();
  });

  it('supports keyboard pan selection without changing focus on ordinary edits', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    const checkbox = pan('Left').getByRole('checkbox', { name: 'A' });
    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveFocus();
  });

  it('writes only the namespaced local record during interaction', async () => {
    const user = userEvent.setup();
    const storage = storageFor(fixtureWorkshop());
    renderWorkshop(fixtureWorkshop(), storage);
    await weigh(user);
    expect(storage.setItem.mock.calls.every(([key]) => key === STORAGE_KEY)).toBe(true);
  });
});
