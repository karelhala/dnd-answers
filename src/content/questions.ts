export interface VerificationQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly correctIds: readonly string[];
  readonly explanation: string;
  readonly scenario?: string;
  readonly groups?: readonly { readonly label: string; readonly order: readonly string[] }[];
}

export const coinQuestions: readonly VerificationQuestion[] = [
  {
    id: 'coin-case-count',
    prompt: 'Before any weighing, how many possible corruption cases are there?',
    options: [12, 18, 24, 36].map((count) => ({ id: `cases-${count}`, label: String(count) })),
    correctIds: ['cases-24'],
    explanation: 'Each of twelve fragments can be heavier or lighter: 24 cases.',
  },
  {
    id: 'coin-balanced-candidates',
    scenario: 'Hypothetical: A–D balances against E–H. This need not match your own first weighing.',
    prompt: 'Which fragments could still be corrupted, and in which weight direction?',
    options: [
      ...'ABCDEFGHIJKL'.split('').map((id) => ({ id, label: id })),
      { id: 'heavier-only', label: 'Heavier only' },
      { id: 'lighter-only', label: 'Lighter only' },
      { id: 'either-direction', label: 'Either direction' },
    ],
    correctIds: ['I', 'J', 'K', 'L', 'either-direction'],
    explanation: 'The balanced fragments are normal. Only I, J, K, or L remain, each possibly heavier or lighter.',
  },
];

export const steedQuestions: readonly VerificationQuestion[] = [
  {
    id: 'steed-three-ahead',
    prompt: 'Three distinct steeds are already proven faster than steed X. Can X still be in the overall top three?',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    correctIds: ['no'],
    explanation: 'No: at least three places must be ahead of X.',
  },
  {
    id: 'steed-remaining-candidates',
    scenario: 'Hypothetical: five groups each raced internally, finishing in the table order. Their winners then finished A1, B1, C1, D1, E1. A1 is fastest overall. These group aliases are not your current A–Y IDs and do not assume your race strategy.',
    groups: ['A', 'B', 'C', 'D', 'E'].map((label) => ({
      label,
      order: [1, 2, 3, 4, 5].map((place) => `${label}${place}`),
    })),
    prompt: 'Select every remaining candidate for second or third overall.',
    options: ['A', 'B', 'C', 'D', 'E'].flatMap((group) =>
      [1, 2, 3, 4, 5].map((place) => ({ id: `${group}${place}`, label: `${group}${place}` })),
    ),
    correctIds: ['A2', 'A3', 'B1', 'B2', 'C1'],
    explanation: 'Only A2, A3, B1, B2, and C1 have fewer than three steeds already established ahead of them. A1 is already first.',
  },
];
