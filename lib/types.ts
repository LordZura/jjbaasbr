export type Tier =
  | "Overpowered"
  | "Very Strong"
  | "Strong"
  | "Normal"
  | "Bad"
  | "Very Bad";

export type SortMode =
  | "name"
  | "part"
  | "tier"
  | "weight"
  | "recent"
  | "least";

export type Character = {
  id: string;
  name: string;
  part: string;
  weight: number;
  tier: Tier;
  notes: string;
  portrait?: string;
};

export type SpinRecord = {
  characterId: string;
  characterName: string;
  tier: Tier;
  timestamp: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  spins: number;
  history: SpinRecord[];
  perCharacterCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  luck: number;
  pity: number;
  lastActiveAt?: string;
};

export type BalanceSettings = {
  recentWindow: number;
  duplicateReduction: number;
  repeatDecay: number;
  pityStrength: number;
  luckDrift: number;
  rareTierBoostCap: number;
  revealIntensity: number;
  soundEnabled: boolean;
};

export type RosterSet = {
  id: string;
  name: string;
  characters: Character[];
  updatedAt: string;
};

export type MiniAccount = {
  id: string;
  name: string;
  email?: string;
  players: PlayerProfile[];
  activePlayerId?: string;
  rosterSets: RosterSet[];
  activeRosterSetId: string;
  settings: BalanceSettings;
  createdAt: string;
  syncedAt?: string;
};

export type FateState = {
  label: "Terrible" | "Uncertain" | "Favorable" | "Blessed";
  fortune: string;
  tone: string;
};
