import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { loadWorkshop, parseWorkshopState } from '../src/state/persistence';
import { workshopReducer } from '../src/state/reducer';
import type { WorkshopState } from '../src/state/types';
import { WorkshopProvider } from '../src/state/WorkshopProvider';
import { unwrap } from '../src/test/fixtures';
import { acceptedCoins, acceptedSteeds, at, fixtureWorkshop, solve } from '../src/test/workshopFixtures';

function storageFor(state: WorkshopState) {
  let raw = JSON.stringify(state);
  return {
    getItem: () => raw,
    setItem: vi.fn((_key: string, next: string) => { raw = next; }),
    state: () => unwrap(parseWorkshopState(JSON.parse(raw))),
  };
}

function renderWorkshop(state = fixtureWorkshop(), storage = storageFor(state)) {
  return render(<StrictMode><WorkshopProvider initial={loadWorkshop(storage)}><App /></WorkshopProvider></StrictMode>);
}

async function repair(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Resolve through cooperative repair' }));
  const confirmations = within(screen.getByRole('group', { name: 'Confirm all three spoken answers' }));
  for (const checkbox of confirmations.getAllByRole('checkbox')) await user.click(checkbox);
  await user.click(screen.getByRole('button', { name: 'Confirm repair' }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(30));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('presenter repair', () => {
  it('is unavailable in Practice and for already solved Official cores', () => {
    const view = renderWorkshop();
    expect(screen.queryByRole('button', { name: 'Resolve through cooperative repair' })).not.toBeInTheDocument();
    view.unmount();
    let state = acceptedCoins(fixtureWorkshop(), 'official');
    state = solve(state, state.sessions.experience.official);
    renderWorkshop(state);
    expect(screen.queryByRole('button', { name: 'Resolve through cooperative repair' })).not.toBeInTheDocument();
  });

  it('requires all three confirmations and restores trigger focus after cancel', async () => {
    const user = userEvent.setup();
    const state = acceptedCoins(fixtureWorkshop(), 'official');
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    const trigger = screen.getByRole('button', { name: 'Resolve through cooperative repair' });
    await user.click(trigger);
    expect(screen.getByRole('heading', { name: "Repair ConsoleDot Experience's Memory core" })).toHaveFocus();
    expect(screen.getByText(/ConsoleDot Framework leads the repair/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm repair' })).toBeDisabled();
    const confirmations = within(screen.getByRole('group', { name: 'Confirm all three spoken answers' })).getAllByRole('checkbox');
    await user.click(confirmations[0]);
    await user.click(confirmations[1]);
    expect(screen.getByRole('button', { name: 'Confirm repair' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel repair' }));
    expect(trigger).toHaveFocus();
    expect(storage.state()).toEqual(state);
    await user.click(trigger);
    expect(within(screen.getByRole('group', { name: 'Confirm all three spoken answers' })).getAllByRole('checkbox').every((input) => !(input as HTMLInputElement).checked)).toBe(true);
  });

  it.each(['playing', 'verification'] as const)('repairs only the selected Official core from %s, retaining evidence', async (phase) => {
    const user = userEvent.setup();
    const state = phase === 'verification' ? acceptedCoins(fixtureWorkshop(), 'official')
      : workshopReducer(fixtureWorkshop(), { type: 'ACKNOWLEDGE_OFFICIAL' });
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    await repair(user);
    expect(screen.getByRole('heading', { name: 'Core restored' })).toHaveFocus();
    const result = within(screen.getByRole('region', { name: 'Core restored' }));
    expect(result.getByText('Restored through cooperation')).toBeVisible();
    expect(result.getByText(/ConsoleDot Experience → 1 Rehor intervention/)).toBeVisible();
    expect(result.queryByText(/Alliance Surge:/)).not.toBeInTheDocument();
    const saved = storage.state();
    expect(saved.sessions.experience.official.trial.phase).toBe('repaired');
    expect(saved.sessions.experience.official.trial.observations).toEqual(state.sessions.experience.official.trial.observations);
    expect(saved.sessions.experience.practice).toEqual(state.sessions.experience.practice);
    expect(saved.sessions.framework).toEqual(state.sessions.framework);
    expect(screen.queryByRole('button', { name: 'Resolve through cooperative repair' })).not.toBeInTheDocument();
  });

  it('repairs both cores separately and persists the distinct summaries without duplicate grants', async () => {
    const user = userEvent.setup();
    const state = workshopReducer(fixtureWorkshop(), { type: 'ACKNOWLEDGE_OFFICIAL' });
    const storage = storageFor(state);
    const view = renderWorkshop(state, storage);
    await repair(user);
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    await repair(user);
    const summary = within(screen.getByRole('region', { name: 'Official cores' }));
    expect(summary.getByText('ConsoleDot Experience — Memory: Restored through cooperation')).toBeVisible();
    expect(summary.getByText('ConsoleDot Framework — Judgment: Restored through cooperation')).toBeVisible();
    expect(screen.getByText(/ConsoleDot Framework → 1 Rehor intervention/)).toBeVisible();
    view.unmount();
    renderWorkshop(state, storage);
    expect(screen.getByText(/ConsoleDot Experience → no additional buff/)).toBeVisible();
    for (const slots of Object.values(storage.state().sessions)) {
      expect(slots.official.history.filter((event) => event.kind === 'resolution')).toHaveLength(1);
    }
  });
});

describe('scoped reset controls', () => {
  it.each(['Start new case', 'Reset team', 'Reset workshop'])('canceling %s leaves everything untouched and restores focus', async (name) => {
    const user = userEvent.setup();
    const state = acceptedCoins(fixtureWorkshop(), 'official');
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    const random = vi.spyOn(crypto, 'getRandomValues');
    const ids = vi.spyOn(crypto, 'randomUUID');
    const trigger = screen.getByRole('button', { name });
    await user.click(trigger);
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(dialog.getByText(/does not grant another reward/)).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(trigger).toHaveFocus();
    expect(storage.state()).toEqual(state);
    expect(random).not.toHaveBeenCalled();
    expect(ids).not.toHaveBeenCalled();
  });

  it('treats the native dialog cancel event as a non-destructive cancellation', async () => {
    const state = fixtureWorkshop();
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    const trigger = screen.getByRole('button', { name: 'Reset workshop' });
    await userEvent.setup().click(trigger);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(storage.state()).toEqual(state);
  });

  it.each(['practice', 'official'] as const)('new case clears only the active %s slot, including terminal and question state', async (mode) => {
    const user = userEvent.setup();
    let state = acceptedCoins(fixtureWorkshop(), mode);
    state = solve(state, state.sessions.experience[mode]);
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    await user.click(screen.getByRole('button', { name: 'Start new case' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Start a new case?' }));
    expect(dialog.getByText(new RegExp(`ConsoleDot Experience's ${mode === 'practice' ? 'Practice' : 'Official'} case`))).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Confirm new case' }));
    const saved = storage.state();
    const replacement = saved.sessions.experience[mode];
    expect(replacement.caseId).not.toBe(state.sessions.experience[mode].caseId);
    expect(replacement.trial.phase).toBe('playing');
    expect(replacement.trial.observations).toEqual([]);
    expect(replacement.verification).toEqual({});
    expect(replacement.history).toEqual([]);
    expect(replacement.draft.coin).toBe('');
    expect(replacement.acceptedAnswerAt).toBeUndefined();
    expect(replacement.resolvedAt).toBeUndefined();
    expect(saved.sessions.experience[mode === 'practice' ? 'official' : 'practice']).toEqual(state.sessions.experience[mode === 'practice' ? 'official' : 'practice']);
    expect(saved.sessions.framework).toEqual(state.sessions.framework);
    expect(screen.getByRole('button', { name: 'Start new case' })).toHaveFocus();
  });

  it('team reset replaces both modes for only the selected squad', async () => {
    const user = userEvent.setup();
    let state = acceptedSteeds(acceptedSteeds(fixtureWorkshop()), 'official');
    state = workshopReducer(state, { type: 'SELECT_TEAM', teamId: 'framework' });
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    await user.click(screen.getByRole('button', { name: 'Reset team' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Reset ConsoleDot Framework?' }));
    expect(dialog.getByText(/Reset both Practice and Official for ConsoleDot Framework/)).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Confirm team reset' }));
    const saved = storage.state();
    expect(saved.sessions.experience).toEqual(state.sessions.experience);
    for (const mode of ['practice', 'official'] as const) {
      expect(saved.sessions.framework[mode].caseId).not.toBe(state.sessions.framework[mode].caseId);
      expect(saved.sessions.framework[mode].trial.phase).toBe('playing');
      expect(saved.sessions.framework[mode].trial.observations).toEqual([]);
    }
    expect(saved.activeTeam).toBe('framework');
    expect(saved.activeMode).toBe('official');
  });

  it('workshop reset replaces all four cases and clears presenter acknowledgment', async () => {
    const user = userEvent.setup();
    const state = workshopReducer(acceptedSteeds(fixtureWorkshop(), 'official'), { type: 'SELECT_TEAM', teamId: 'framework' });
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    await user.click(screen.getByRole('button', { name: 'Reset workshop' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Reset entire workshop?' }));
    expect(dialog.getByText(/both squads, both Practice and Official, and presenter acknowledgment/)).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Confirm workshop reset' }));
    const saved = storage.state();
    expect(saved.activeTeam).toBe('experience');
    expect(saved.activeMode).toBe('practice');
    expect(saved.officialAcknowledged).toBe(false);
    for (const team of ['experience', 'framework'] as const) {
      for (const mode of ['practice', 'official'] as const) {
        expect(saved.sessions[team][mode].caseId).not.toBe(state.sessions[team][mode].caseId);
        expect(saved.sessions[team][mode].trial.phase).toBe('playing');
      }
    }
  });

  it('preserves corrupt storage through team reset and replaces it only after confirmed workshop reset', async () => {
    const user = userEvent.setup();
    let raw = '{broken';
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => { raw = value; },
    };
    render(<WorkshopProvider initial={loadWorkshop(storage)}><App /></WorkshopProvider>);
    await user.click(screen.getByRole('button', { name: 'Reset team' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm team reset' }));
    expect(raw).toBe('{broken');
    expect(screen.getByRole('heading', { name: 'Saved progress needs recovery' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reset workshop' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Confirm workshop reset' }));
    expect(parseWorkshopState(JSON.parse(raw)).ok).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Saved progress needs recovery' })).not.toBeInTheDocument();
  });
});
