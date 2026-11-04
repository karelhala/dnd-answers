export const teams = {
  experience: {
    name: 'ConsoleDot Experience',
    trial: 'Corrupted Core',
    core: 'Memory',
    description:
      'Identify the one corrupted fragment among twelve crystals using at most three balance weighings.',
  },
  framework: {
    name: 'ConsoleDot Framework',
    trial: 'Spectral Steeds',
    core: 'Judgment',
    description:
      'Establish the fastest three of twenty-five spectral steeds using at most seven races.',
  },
} as const;

export type TeamId = keyof typeof teams;
