import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { dialogue } from '../src/content/narrative';
import { getOutcome } from '../src/domain/outcomes';
import { loadWorkshop } from '../src/state/persistence';
import { workshopReducer } from '../src/state/reducer';
import type { WorkshopState } from '../src/state/types';
import { WorkshopProvider } from '../src/state/WorkshopProvider';
import { acceptedCoins, acceptedSteeds, at, fixtureWorkshop, solve, target } from '../src/test/workshopFixtures';

function storageFor(state: WorkshopState) {
  let raw = JSON.stringify(state);
  return {
    getItem: () => raw,
    setItem: (_key: string, value: string) => { raw = value; },
    state: () => JSON.parse(raw) as WorkshopState,
  };
}

function renderWorkshop(state = fixtureWorkshop(), storage = storageFor(state)) {
  return render(<WorkshopProvider initial={loadWorkshop(storage)}><App /></WorkshopProvider>);
}

function readyWorkshop(memory: 'solved' | 'repaired', judgment: 'solved' | 'repaired', mode: 'practice' | 'official' = 'official') {
  let state = acceptedSteeds(acceptedCoins(fixtureWorkshop(), mode), mode);
  for (const [teamId, phase] of [['experience', memory], ['framework', judgment]] as const) {
    const session = state.sessions[teamId][mode];
    state = phase === 'solved' ? solve(state, session) : workshopReducer(state, {
      type: 'CONFIRM_REPAIR', target: target(session), at: at(20), confirmations: [true, true, true],
    });
  }
  return state;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(30));
});
afterEach(() => vi.useRealTimers());

describe('narrative integration', () => {
  it('shows one mode-specific diagram, separate briefings, and no opening gate', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    const overview = within(screen.getByRole('region', { name: 'Training projection' }));
    expect(overview.getByText('Fullsend shard')).toBeVisible();
    expect(overview.getByText('Signal unidentified')).toBeVisible();
    expect(overview.getByText('Practice simulation — Official cores unchanged.')).toBeVisible();
    expect(overview.getByRole('region', { name: 'Official cores' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Weigh fragments' })).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Restoration steps' }).querySelector('[aria-current="step"]')).toHaveTextContent('Gather evidence');
    await user.click(screen.getByText('Mission briefing', { exact: true }));
    expect(screen.getByText(/Rehor's memories have shattered/)).toBeVisible();
    expect(screen.getByText('Full balance rules')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    await user.click(screen.getByText('Mission briefing', { exact: true }));
    expect(screen.getByText(/Rehor must choose three spectral steeds/)).toBeVisible();
    expect(screen.getByText('Full race rules')).toBeVisible();
    expect(overview.getByText(/ConsoleDot Framework · Active squad/)).toBeVisible();
  });

  it('form edits do not generate dialogue or events; observations preserve focus and permit early submission', async () => {
    const user = userEvent.setup();
    const state = fixtureWorkshop();
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    await user.click(within(screen.getByRole('group', { name: /^Left pan/ })).getByRole('checkbox', { name: 'A' }));
    await user.click(within(screen.getByRole('group', { name: /^Right pan/ })).getByRole('checkbox', { name: 'B' }));
    expect(screen.getByText(`“${dialogue.dormant}”`, { exact: false })).toBeVisible();
    expect(storage.state().sessions.experience.practice.history).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
    expect(screen.getByRole('button', { name: 'Weigh fragments' })).toHaveFocus();
    expect(screen.getByText(`“${dialogue.observed}”`, { exact: false })).toBeVisible();
    expect(screen.getByText('You may submit a finding whenever ready; using every observation is not required.')).toBeVisible();
    const history = storage.state().sessions.experience.practice.history;
    await user.selectOptions(screen.getByRole('combobox', { name: 'Corrupted fragment' }), 'L');
    expect(storage.state().sessions.experience.practice.history).toEqual(history);
    expect(screen.getByText(`“${dialogue.observed}”`, { exact: false })).toBeVisible();
  });

  it('quota guidance does not claim sufficient evidence or require additional observations', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await user.click(within(screen.getByRole('group', { name: /^Left pan/ })).getByRole('checkbox', { name: 'A' }));
    await user.click(within(screen.getByRole('group', { name: /^Right pan/ })).getByRole('checkbox', { name: 'B' }));
    for (let index = 0; index < 3; index++) await user.click(screen.getByRole('button', { name: 'Weigh fragments' }));
    expect(screen.getByText(/The limit does not mean your evidence is sufficient/)).toBeVisible();
    expect(screen.getByText(`“${dialogue.exhausted}”`, { exact: false })).toBeVisible();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Submit finding');
    expect(screen.getByRole('button', { name: 'Submit identification' })).toBeEnabled();
  });

  it('Practice readiness cannot announce Official restoration or grant battle rewards', async () => {
    const user = userEvent.setup();
    const state = readyWorkshop('solved', 'solved', 'practice');
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    expect(screen.getByRole('heading', { name: 'Training projection operational' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Rehor operational' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Alliance Surge: 2/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /core online/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Practice only. No official rewards are granted.')).toHaveLength(2);
    await user.click(screen.getByRole('radio', { name: 'Official' }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge and enter Official' }));
    expect(screen.getByRole('region', { name: 'Official restoration status' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Training projection operational' })).not.toBeInTheDocument();
    expect(screen.getByText('Restoration pending')).toBeVisible();
    expect(storage.state().sessions).toEqual(state.sessions);
  });

  it.each([
    ['solved', 'solved'], ['solved', 'repaired'], ['repaired', 'repaired'],
  ] as const)('Official %s / %s announces readiness, not victory; reset removes it', async (memory, judgment) => {
    const user = userEvent.setup();
    const state = readyWorkshop(memory, judgment);
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    expect(screen.getByRole('heading', { name: 'Rehor operational' })).toBeVisible();
    expect(screen.getByText('Ready for the shared final battle. The battle still lies ahead.')).toBeVisible();
    const result = within(screen.getByRole('region', { name: 'Core restored' }));
    for (const reward of getOutcome(state.sessions.experience.official)!.rewards) expect(result.getByText(reward)).toBeVisible();
    if (memory === 'repaired') {
      expect(screen.getAllByText('Bypassed through cooperative repair')).toHaveLength(3);
      expect(result.getByText('Restored through cooperation')).toBeVisible();
      expect(result.getByText(/Not every answer comes from a trial/)).toBeVisible();
    } else expect(result.getByRole('heading', { name: 'Memory core online' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Start new case' }));
    await user.click(screen.getByRole('button', { name: 'Confirm new case' }));
    expect(screen.queryByRole('heading', { name: 'Rehor operational' })).not.toBeInTheDocument();
    expect(screen.getByText('One core restored')).toBeVisible();
    expect(storage.state().sessions.framework).toEqual(state.sessions.framework);
  });

  it('reload renders saved feedback without appending events or stealing focus', () => {
    let state = acceptedCoins(fixtureWorkshop(), 'official');
    state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: target(state.sessions.experience.official), at: at(3) });
    const storage = storageFor(state);
    const first = renderWorkshop(state, storage);
    expect(screen.getByText(`“${dialogue.incomplete}”`, { exact: false })).toBeVisible();
    first.unmount();
    renderWorkshop(state, storage);
    expect(screen.getByText(`“${dialogue.incomplete}”`, { exact: false })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).not.toHaveFocus();
    expect(storage.state()).toEqual(state);
    expect(screen.getByText('Verification incomplete. Review the feedback and try again.')).toBeVisible();
  });

  it('team switching preserves evidence and changes briefing and emphasis only', async () => {
    const user = userEvent.setup();
    const state = acceptedCoins();
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    expect(screen.getByText(/ConsoleDot Framework · Active squad/)).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Experience' }));
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'ConsoleDot Experience' })).toHaveFocus();
    expect(storage.state().sessions).toEqual(state.sessions);
  });
});
