import rawCards from '../cards_data.json';

export interface CardInfo {
  id: string;
  file: string;
  name: string;
  rank: string;
  suit: string;
  suitCode: string;
  suitSymbol: string;
}

const LIST = rawCards as any[];
const BY_ID: Record<string, CardInfo> = Object.fromEntries(LIST.map((c) => [c.id, c]));

export const cardInfo = (id: string): CardInfo => BY_ID[id];
export const cardThumb = (id: string) => `/assets/deck/thumb/${BY_ID[id].file.replace('.png', '.webp')}`;
export const cardFull = (id: string) => `/assets/deck/${BY_ID[id].file}`;
export const BACK_THUMB = '/assets/deck/thumb/BACK.webp';
export const isRed = (id: string) => BY_ID[id].suitCode === 'H' || BY_ID[id].suitCode === 'D';
