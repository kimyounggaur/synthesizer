export interface AvailableSampleBank {
  id: string;
  name: string;
  description: string;
  license: string;
}

export const availableSampleBanks: AvailableSampleBank[] = [
  {
    id: 'demo-lite',
    name: 'Demo Lite',
    description: 'Small generated/fallback sample bank for testing.',
    license: 'Generated demo only',
  },
];
