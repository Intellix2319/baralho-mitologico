export type SuitCode = 'S' | 'H' | 'D' | 'C' | 'X';

export type CardType = 'ace' | 'number' | 'court' | 'joker';

export interface CardData {
  id: string;
  code: string;
  file: string;
  name: string;
  title: string;
  character: string;
  role?: string;
  suit: string;
  suitCode: SuitCode;
  suitSymbol: string;
  rank: string;
  rankValue: number;
  type: CardType;
  color: string;
  description: string;
}

export interface DeckCardEntry {
  cardId: string;
  count: number;
}

export interface CustomDeck {
  id: string;
  name: string;
  description: string;
  tag: string;
  coverCardId: string;
  cards: DeckCardEntry[];
  createdAt: number;
  updatedAt: number;
}

export type ViewTab = 'play' | 'academy' | 'multiplayer' | 'catalog' | 'tabletop';
export type ExportResolution = '1x' | '2x' | '4x';

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type AIPersonality = 'balanced' | 'aggressive' | 'conservative' | 'bluffer';

export interface GameRuleInfo {
  id: string;
  title: string;
  category: 'Cassino' | 'Truco' | 'Paciência' | 'Família' | 'Vazas';
  players: string;
  deckType: string;
  objective: string;
  overview: string;
  rules: string[];
  scoring: string[];
  combinations?: { name: string; description: string; payoutOrPoints?: string }[];
  tactics: string[];
  aiAdvice: { scenario: string; recommended: string; explanation: string }[];
}

export interface MultiplayerRoom {
  code: string;
  name: string;
  gameId: string;
  gameName: string;
  hostName: string;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  stakes: string;
  aiFilled: boolean;
  aiDifficulty: AIDifficulty;
}
