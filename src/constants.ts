import { Contract, CardValue, Suit } from './types';

export const SUITS: Suit[] = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'];
export const VALUES: CardValue[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const CONTRACTS: Contract[] = [
  { label: '♣', value: 'CLUBS' }, { label: '♦', value: 'DIAMONDS' },
  { label: '♥', value: 'HEARTS' }, { label: '♠', value: 'SPADES' },
  { label: '100', value: 'NONE' }, { label: 'Tou', value: 'ALL' }
];

export const CARD_POWER: Record<'TRUMP' | 'NON_TRUMP', Record<string, number>> = {
  TRUMP: { 'J': 8, '9': 7, 'A': 6, '10': 5, 'K': 4, 'Q': 3, '8': 2, '7': 1 },
  NON_TRUMP: { 'A': 8, '10': 7, 'K': 6, 'Q': 5, 'J': 4, '9': 3, '8': 2, '7': 1 }
};

export const CARD_POINTS: Record<'TRUMP' | 'NON_TRUMP', Record<string, number>> = {
  TRUMP: { 'J': 20, '9': 14, 'A': 11, '10': 10, 'K': 4, 'Q': 3, '8': 0, '7': 0 },
  NON_TRUMP: { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0 }
};