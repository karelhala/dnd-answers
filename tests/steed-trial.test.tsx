import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { loadWorkshop, parseWorkshopState } from '../src/state/persistence';
import { workshopReducer } from '../src/state/reducer';
import type { Mode, WorkshopState } from '../src/state/types';
import { WorkshopProvider } from '../src/state/WorkshopProvider';
import { canonicalStrategy, unwrap } from '../src/test/fixtures';
import { acceptedSteeds, at, fixtureWorkshop, solve } from '../src/test/workshopFixtures';

function framework(state = fixtureWorkshop()) {
  return workshopReducer(state, { type: 'SELECT_TEAM', teamId: 'framework' });
}

function storageFor(state: WorkshopState) {
  let raw = JSON.stringify(state);
  return {
    getItem: () => raw,
    setItem: (_key: string, value: string) => { raw = value; },
    state: () => unwrap(parseWorkshopState(JSON.parse(raw))),
  };
}

function renderWorkshop(state = framework(), storage = storageFor(state)) {
  return render(<WorkshopProvider initial={loadWorkshop(storage)}><App /></WorkshopProvider>);
}

const participants = () => within(screen.getByRole('group', { name: /^Race participants/ }));
const ranking = () => within(screen.getByRole('form', { name: 'Top three ranking' }));

async function race(user: ReturnType<typeof userEvent.setup>, ids: readonly string[]) {
  const clear = screen.getByRole('button', { name: 'Clear race selection' });
  if (!clear.hasAttribute('disabled')) await user.click(clear);
  for (const id of ids) await user.click(participants().getByRole('checkbox', { name: id }));
  await user.click(screen.getByRole('button', { name: 'Race selected steeds' }));
}

async function submit(user: ReturnType<typeof userEvent.setup>, ids: readonly string[]) {
  for (const label of ['First', 'Second', 'Third']) await user.selectOptions(screen.getByRole('combobox', { name: `${label} place` }), '');
  for (const [index, label] of ['First', 'Second', 'Third'].entries()) await user.selectOptions(screen.getByRole('combobox', { name: `${label} place` }), ids[index]);
  await user.click(screen.getByRole('button', { name: 'Submit top three' }));
}

async function understand(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'No' }));
  const candidates = within(screen.getByRole('group', { name: 'Remaining second/third candidates — select every candidate' }));
  for (const id of ['A2', 'A3', 'B1', 'B2', 'C1']) await user.click(candidates.getByRole('checkbox', { name: id }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(30));
});
afterEach(() => vi.useRealTimers());

describe('interactive steed trial', () => {
  it('shows 25 labeled steeds, proof requirements, and the first-race gate', () => {
    renderWorkshop();
    expect(participants().getAllByRole('checkbox')).toHaveLength(25);
    expect(screen.getByText('Races used: 0 / 7')).toBeVisible();
    expect(screen.getByText(/a correct guess without proof does not pass/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit top three' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Resolve through cooperative repair' })).not.toBeInTheDocument();
  });

  it('rejects empty, one-steed, and six-steed selections without consuming quota', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await user.click(screen.getByRole('button', { name: 'Race selected steeds' }));
    const form = within(screen.getByRole('form', { name: 'Steed race' }));
    expect(form.getByText(/Choose two to five steeds/)).toBeVisible();
    await race(user, ['A']);
    expect(screen.getByText('Races used: 0 / 7')).toBeVisible();
    expect(participants().getByRole('checkbox', { name: 'A' })).toBeChecked();
    await race(user, ['A', 'B', 'C', 'D', 'E', 'F']);
    expect(screen.getByText('Races used: 0 / 7')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Race participants (6 selected)' })).toBeVisible();
  });

  it('records ordered evidence independent of selection order and preserves ordinary focus', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await race(user, ['C', 'A', 'B']);
    const order = within(screen.getByRole('list', { name: 'Race 1 finishing order' }));
    expect(order.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['B', 'C', 'A']);
    expect(screen.getByRole('button', { name: 'Race selected steeds' })).toHaveFocus();
    expect(screen.getByRole('form', { name: 'Steed race' }).querySelector('[aria-live]')).toHaveTextContent('B → C → A');
  });

  it('does not distinguish a correct hidden guess from a wrong guess before proof exists', async () => {
    const user = userEvent.setup();
    const state = framework();
    renderWorkshop(state);
    await race(user, ['A', 'B', 'C', 'D', 'E']);
    await submit(user, state.sessions.framework.practice.trial.case.ranking.slice(0, 3));
    expect(ranking().getByText(/Your observations do not yet establish a unique top three/)).toBeVisible();
    await submit(user, ['Y', 'X', 'W']);
    expect(ranking().getByText(/Your observations do not yet establish a unique top three/)).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Verify your understanding' })).not.toBeInTheDocument();
  });

  it.each(['practice', 'official'] as const)('completes the seven-race strategy and exact follow-ups in %s', async (mode: Mode) => {
    const user = userEvent.setup();
    let state = framework();
    if (mode === 'official') state = workshopReducer(state, { type: 'ACKNOWLEDGE_OFFICIAL' });
    const storage = storageFor(state);
    renderWorkshop(state, storage);
    const hidden = state.sessions.framework[mode].trial.case;
    for (const observation of canonicalStrategy(hidden).observations) await race(user, observation.order);
    expect(screen.getByText('Races used: 7 / 7')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Race selected steeds' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit top three' })).toBeEnabled();
    const [first, second, third] = hidden.ranking;
    await submit(user, [first, third, second]);
    expect(ranking().getByText(/That ranking is not the order established/)).toBeVisible();
    await submit(user, [first, second, third]);
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).toHaveFocus();
    expect(screen.getByRole('combobox', { name: 'First place' })).toBeDisabled();
    expect(screen.getByRole('table', { name: 'Hypothetical group finishes — fastest first' })).toBeVisible();
    expect(screen.getByText(/These group aliases are not your current A–Y IDs/)).toBeVisible();
    await understand(user);
    const candidates = within(screen.getByRole('group', { name: 'Remaining second/third candidates — select every candidate' }));
    await user.click(candidates.getByRole('checkbox', { name: 'D1' }));
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByText('Verification incomplete. Review the feedback and try again.')).toBeVisible();
    expect(candidates.getByRole('checkbox', { name: 'A2' })).toBeChecked();
    await user.click(candidates.getByRole('checkbox', { name: 'D1' }));
    await user.click(screen.getByRole('button', { name: 'Check understanding' }));
    expect(screen.getByRole('heading', { name: mode === 'practice' ? 'Practice complete' : 'Core restored' })).toHaveFocus();
    const summary = within(screen.getByRole('region', { name: mode === 'practice' ? 'Official cores' : 'Official restoration status' }));
    expect(summary.getByText(mode === 'practice' ? 'ConsoleDot Framework — Judgment: Not restored' : 'Puzzle verified')).toBeVisible();
    if (mode === 'official') {
      expect(screen.getByText(/ConsoleDot Framework → 1 Rehor intervention/)).toBeVisible();
      expect(screen.getByText('ConsoleDot Experience → Alliance Surge: 2 shared rerolls.')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Resolve through cooperative repair' })).not.toBeInTheDocument();
    } else expect(screen.queryByText(/→ 1 Rehor intervention/)).not.toBeInTheDocument();
    expect(storage.state().sessions.framework[mode].trial.phase).toBe('solved');
    expect(storage.state().sessions.framework[mode].trial.observations).toHaveLength(7);
  });

  it('disables duplicate ranked choices while allowing correction', async () => {
    const user = userEvent.setup();
    renderWorkshop();
    await user.selectOptions(screen.getByRole('combobox', { name: 'First place' }), 'A');
    expect(within(screen.getByRole('combobox', { name: 'Second place' })).getByRole('option', { name: 'A' })).toBeDisabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'First place' }), '');
    expect(within(screen.getByRole('combobox', { name: 'Second place' })).getByRole('option', { name: 'A' })).toBeEnabled();
  });

  it('accepts a noncanonical six-race chain without changing the hypothetical follow-ups', async () => {
    const user = userEvent.setup();
    const state = framework();
    const hidden = state.sessions.framework.practice.trial.case.ranking;
    renderWorkshop(state);
    for (let start = 0; start <= 20; start += 4) await race(user, hidden.slice(start, start + 5));
    await submit(user, hidden.slice(0, 3));
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).toBeVisible();
    expect(screen.getByText('Races used: 6 / 7')).toBeVisible();
    expect(screen.getByRole('table', { name: 'Hypothetical group finishes — fastest first' })).toBeVisible();
  });

  it('restores selection, race and answer drafts across team/mode switches and reload', async () => {
    const user = userEvent.setup();
    const state = framework();
    const storage = storageFor(state);
    const view = renderWorkshop(state, storage);
    await race(user, ['A', 'B']);
    await user.selectOptions(screen.getByRole('combobox', { name: 'First place' }), 'Y');
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Experience' }));
    await user.click(screen.getByRole('radio', { name: 'ConsoleDot Framework' }));
    expect(participants().getByRole('checkbox', { name: 'A' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Official' }));
    await user.click(screen.getByRole('button', { name: 'Acknowledge and enter Official' }));
    expect(screen.getByText('Races used: 0 / 7')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Practice' }));
    view.unmount();
    renderWorkshop(state, storage);
    expect(screen.getByText('Races used: 1 / 7')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'First place' })).toHaveValue('Y');
    expect(participants().getByRole('checkbox', { name: 'B' })).toBeChecked();
    expect(storage.state().sessions.framework.practice.caseId).toBe(state.sessions.framework.practice.caseId);
  });

  it('restores incomplete questions and terminal results without duplicate resolution', async () => {
    const user = userEvent.setup();
    const state = framework(acceptedSteeds());
    const storage = storageFor(state);
    const view = renderWorkshop(state, storage);
    await user.click(screen.getByRole('radio', { name: 'No' }));
    view.unmount();
    const restored = renderWorkshop(state, storage);
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Verify your understanding' })).not.toHaveFocus();
    restored.unmount();
    const solved = solve(storage.state(), storage.state().sessions.framework.practice, 40);
    const terminalStorage = storageFor(solved);
    const terminal = renderWorkshop(solved, terminalStorage);
    expect(screen.getByRole('heading', { name: 'Practice complete' })).toBeVisible();
    terminal.unmount();
    renderWorkshop(solved, terminalStorage);
    expect(terminalStorage.state().sessions.framework.practice.history.filter((event) => event.kind === 'resolution')).toHaveLength(1);
  });
});
