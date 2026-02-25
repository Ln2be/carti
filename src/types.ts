export type Suit = 'CLUBS' | 'DIAMONDS' | 'HEARTS' | 'SPADES';
export type CardValue = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type ContractValue = Suit | 'NONE' | 'ALL';

export interface Card {
  suit: Suit;
  value: CardValue;
  code: string;
}

export interface Contract {
  label: string;
  value: ContractValue;
}

// src/types.ts
export interface PliEntry {
  card: Card;
  player: number;
  // Make these optional (?) so useCartiGame.ts doesn't crash
  handAtMoment?: Card[];
  cardsBeforeInPli?: Card[];
}

export interface SleptCard {
  card: Card;
  player: number;
}

export interface MoveHistory   {
  player: number;
  cardPlayed: Card;
  handAtTime: Card[];
  leadCard: Card;
  highestCardAtTime: Card | null;
  isPartnerWinningAtTime: boolean;
}