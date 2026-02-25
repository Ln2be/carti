import { Card, CardValue, Contract, PliEntry, Suit } from "./types";

export const verifyBaseClaim = (
  playerHand: Card[],
  allOtherHands: Card[][],
  trumpSuit: string,
) => {
  const remainingCardsInPlay = allOtherHands.flat();
  const badCards: Card[] = [];

  for (const playerCard of playerHand) {
    let isBeatable = false;

    for (const otherCard of remainingCardsInPlay) {
      // 1. If the other card is the SAME SUIT, check if it has higher power
      if (otherCard.suit === playerCard.suit) {
        if (
          getCardPower(otherCard, trumpSuit) >
          getCardPower(playerCard, trumpSuit)
        ) {
          isBeatable = true;
          break;
        }
      }

      // 2. If your card is NOT a trump, any TRUMP card held by an opponent beats it
      if (
        playerCard.suit !== trumpSuit &&
        trumpSuit !== "ALL" &&
        trumpSuit !== "NONE"
      ) {
        if (otherCard.suit === trumpSuit) {
          isBeatable = true;
          break;
        }
      }
    }

    if (isBeatable) {
      badCards.push(playerCard);
    }
  }

  return {
    isValid: badCards.length === 0,
    badCards: badCards,
  };
};
// botStrategy.ts or within your engine
export const getBotMove = (
  hand: Card[],
  currentPli: PliEntry[],
  contract: Contract | null,
  currentPlayer: number,
  getCardPower: (c: Card, t: string) => number,
  getCardPoints: (c: Card, t: string) => number,
): number => {
  const trump = contract?.value || "NONE";

  // 1. Find all legal moves first
  const legalIndices = hand
    .map((_, i) => i)
    .filter((i) => {
      if (currentPli.length === 0) return true;
      const leadCard = currentPli[0].card;
      const highestEntry = getHighestEntrySoFar(currentPli, trump);
      const isPartnerWinning = highestEntry?.player === (currentPlayer + 2) % 4;

      return !isMoveIllegal(
        hand[i],
        hand,
        leadCard,
        trump,
        highestEntry!.card,
        isPartnerWinning,
        getCardPower,
      );
    });

  if (legalIndices.length === 0) return 0; // Fallback

  // 2. STRATEGY: Leading the trick
  if (currentPli.length === 0) {
    // If bot has a Trump Jack or Ace, lead with it to "drain" opponents
    const bestIdx = legalIndices.reduce((prev, curr) =>
      getCardPower(hand[curr], trump) > getCardPower(hand[prev], trump)
        ? curr
        : prev,
    );
    return bestIdx;
  }

  // 3. STRATEGY: Following the trick
  const leadSuit = currentPli[0].card.suit;
  const highestEntry = getHighestEntrySoFar(currentPli, trump)!;
  const isPartnerWinning = highestEntry.player === (currentPlayer + 2) % 4;

  // A. If Partner is winning: Play "Load" (highest points that won't waste a power card)
  if (isPartnerWinning) {
    return legalIndices.sort(
      (a, b) => getCardPoints(hand[b], trump) - getCardPoints(hand[a], trump),
    )[0];
  }

  // B. If Partner is NOT winning: Try to win the trick
  const winningIndices = legalIndices.filter(
    (i) =>
      getCardPower(hand[i], trump) > getCardPower(highestEntry.card, trump),
  );

  if (winningIndices.length > 0) {
    // Win as cheaply as possible (play the lowest power card that still wins)
    return winningIndices.sort(
      (a, b) => getCardPower(hand[a], trump) - getCardPower(hand[b], trump),
    )[0];
  }

  // C. If Bot can't win: Play "Trash" (lowest point card)
  return legalIndices.sort(
    (a, b) => getCardPoints(hand[a], trump) - getCardPoints(hand[b], trump),
  )[0];
};

export const evaluateHandForBidding = (hand: Card[]) => {
  const suits: Suit[] = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];
  let bestSuit: Suit = "HEARTS";
  let maxScore = 0;

  suits.forEach((suit) => {
    let score = 0;
    const suitCards = hand.filter((c) => c.suit === suit);

    // Core Trump Logic: J is 20pts, 9 is 14pts
    if (suitCards.some((c) => c.value === "J")) score += 40;
    if (suitCards.some((c) => c.value === "9")) score += 25;
    if (suitCards.some((c) => c.value === "A")) score += 15;

    // Side Aces are valuable
    const sideAces = hand.filter(
      (c) => c.suit !== suit && c.value === "A",
    ).length;
    score += sideAces * 20;

    if (score > maxScore) {
      maxScore = score;
      bestSuit = suit;
    }
  });

  // Threshold for bidding: roughly 60+ points in this weight system
  if (maxScore > 70) return { value: bestSuit, type: "NORMAL" };
  return "Pass";
};

export const beloteRound = (
  score1: number,
  score2: number,
  isAllTrump: boolean,
) => {
  const TOTAL_AVAILABLE = isAllTrump ? 26 : 16;

  // 1. Initial Rounding
  let t1 = Math.floor(score1 / 10) + (score1 % 10 >= 6 ? 1 : 0);
  let t2 = Math.floor(score2 / 10) + (score2 % 10 >= 6 ? 1 : 0);

  // 2. CAPOT PROTECTION: If a team got 0 raw points, they stay at 0
  if (score1 === 0) return { t1: 0, t2: Math.max(t2, TOTAL_AVAILABLE) };
  if (score2 === 0) return { t1: Math.max(t1, TOTAL_AVAILABLE), t2: 0 };

  // 3. Regular Conservation (only if no one is capot)
  if (t1 + t2 > TOTAL_AVAILABLE) {
    if (score1 >= score2) {
      t2 = Math.max(0, TOTAL_AVAILABLE - t1);
    } else {
      t1 = Math.max(0, TOTAL_AVAILABLE - t2);
    }
  }

  return { t1, t2 };
};
/**
 * Basic Game Setup & Navigation
 */
export const createDeck = (): Card[] => {
  // 'as const' ensures these strings match the union types in src/types.ts
  const suits = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"] as const;
  const values = ["7", "8", "9", "10", "J", "Q", "K", "A"] as const;

  const deck: Card[] = [];

  suits.forEach((suit) => {
    values.forEach((value) => {
      deck.push({
        suit: suit as Suit,
        value: value as CardValue,
        code: `${value === "10" ? "0" : value}${suit[0]}`,
      });
    });
  });

  return deck.sort(() => Math.random() - 0.5);
};

export const getRandomDealer = () => Math.floor(Math.random() * 4);
// src/engine.ts

// CHANGE THIS: from (current + 1) % 4
export const getNextPlayer = (current: number): number => {
  // TO THIS:
  // return current === 0 ? 3 : current - 1;
  return current === 3 ? 0 : current + 1;
};
/**
 * Power & Point Logic
 */
export const getCardPower = (card: Card, trumpSuit: string): number => {
  const values: { [key: string]: number } = {
    "7": 1,
    "8": 2,
    "9": 3,
    J: 4,
    Q: 5,
    K: 6,
    "10": 7,
    A: 8,
  };
  const trumpValues: { [key: string]: number } = {
    "7": 1,
    "8": 2,
    Q: 3,
    K: 4,
    "10": 5,
    A: 6,
    "9": 7,
    J: 8,
  };

  if (trumpSuit === "ALL") return trumpValues[card.value] || 0;
  if (trumpSuit === "NONE") return values[card.value] || 0;
  return card.suit === trumpSuit ? trumpValues[card.value] : values[card.value];
};

export const getCardPoints = (card: Card, trumpSuit: string): number => {
  const values: { [key: string]: number } = {
    "7": 0,
    "8": 0,
    "9": 0,
    J: 2,
    Q: 3,
    K: 4,
    "10": 10,
    A: 11,
  };
  const trumpValues: { [key: string]: number } = {
    "7": 0,
    "8": 0,
    Q: 3,
    K: 4,
    "10": 10,
    A: 11,
    "9": 14,
    J: 20,
  };

  if (trumpSuit === "ALL") return trumpValues[card.value];
  if (trumpSuit === "NONE") return values[card.value];
  return card.suit === trumpSuit ? trumpValues[card.value] : values[card.value];
};
/**
 * Table State & Winner Resolution
 */
export const getHighestEntrySoFar = (
  pli: PliEntry[],
  trump: string,
  sleptCard?: Card | null,
): PliEntry | null => {
  if (pli.length === 0) return null;

  // Filter: A "Slept" card is rendered powerless and cannot be the highest
  const validEntries = pli.filter(
    (entry) => !(sleptCard && entry.card.code === sleptCard.code),
  );

  // If the lead card itself was slept, we fall back to the first card to avoid errors,
  // but it will likely be beaten by any valid card.
  if (validEntries.length === 0) return pli[0];

  let best = validEntries[0];
  const leadSuit = pli[0].card.suit;

  for (let i = 1; i < validEntries.length; i++) {
    const current = validEntries[i];
    const isBestTrump = best.card.suit === trump || trump === "ALL";
    const isCurrTrump = current.card.suit === trump || trump === "ALL";

    if (isCurrTrump && !isBestTrump) {
      best = current;
    } else if (isCurrTrump === isBestTrump) {
      if (current.card.suit === best.card.suit) {
        if (
          getCardPower(current.card, trump) > getCardPower(best.card, trump)
        ) {
          best = current;
        }
      } else if (!isCurrTrump && current.card.suit === leadSuit) {
        if (
          getCardPower(current.card, trump) > getCardPower(best.card, trump)
        ) {
          best = current;
        }
      }
    }
  }
  return best;
};

/**
 * GAT & SLEEP Verification Logic
 */
export interface PlayContext {
  leadCard: Card;
  trumpSuit: string;
  highestCardAtTime: Card | null;
  isPartnerWinningAtTime: boolean;
}

export const isMoveIllegal = (
  cardPlayed: Card,
  handAtThatTime: Card[],
  leadCard: Card,
  trumpSuit: string,
  highestCardInPli: Card,
  isPartnerWinning: boolean,
  getCardPower: (c: Card, trump: string) => number,
): boolean => {
  const leadSuit = leadCard.suit;
  const hasLeadSuit = handAtThatTime.some((c) => c.suit === leadSuit);
  const tablePower = getCardPower(highestCardInPli, trumpSuit);

  // --- RULE 1: FOLLOW SUIT ---
  if (hasLeadSuit) {
    if (cardPlayed.suit !== leadSuit) return true;

    // --- RULE 2: MONTER IN "ALL" ---
    // In ALL, you must always go higher if you can. Partner winning DOES NOT apply.
    if (trumpSuit === "ALL") {
      const canGoHigher = handAtThatTime.some(
        (c) => c.suit === leadSuit && getCardPower(c, "ALL") > tablePower,
      );
      if (canGoHigher && getCardPower(cardPlayed, "ALL") <= tablePower) {
        return true;
      }
    }
    return false;
  }

  // --- RULE 3: TRUMP RULES (When out of Lead Suit) ---
  if (trumpSuit !== "NONE" && trumpSuit !== "ALL") {
    const hasTrump = handAtThatTime.some((c) => c.suit === trumpSuit);

    if (hasTrump) {
      // Teammate exception ONLY applies to the obligation to cut (Coupe)
      if (isPartnerWinning) return false;

      // Must cut if partner isn't winning
      if (cardPlayed.suit !== trumpSuit) return true;

      // --- RULE 4: OVER-TRUMP (Monter à l'atout) ---
      if (highestCardInPli.suit === trumpSuit) {
        const canGoHigher = handAtThatTime.some(
          (c) =>
            c.suit === trumpSuit && getCardPower(c, trumpSuit) > tablePower,
        );
        if (canGoHigher && getCardPower(cardPlayed, trumpSuit) <= tablePower) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Scoring & Finalization
 */
export const getWinnerOfPli = (
  pli: PliEntry[],
  trumpSuit: string,
  slept: Card[] = [],
): number => {
  if (!pli || pli.length === 0) return 0;

  const leadCard = pli[0].card;
  let bestEntry = pli[0];

  // Hierarchies
  const tOrder = ["J", "9", "A", "10", "K", "Q", "8", "7"]; // Trump Power
  const nOrder = ["A", "10", "K", "Q", "J", "9", "8", "7"]; // Normal Power

  for (let i = 1; i < pli.length; i++) {
    const currentEntry = pli[i];
    const currentCard = currentEntry.card;

    // Skip cards that are out of play
    if (slept && slept.some((s) => s.code === currentCard.code)) continue;

    // --- BRANCH 1: ALL TRUMP (Tout Atout) ---
    if (trumpSuit === "ALL") {
      // In ALL, every card follows the Trump Hierarchy.
      // You must follow the lead suit to win.
      if (currentCard.suit === leadCard.suit) {
        if (
          tOrder.indexOf(currentCard.value) <
          tOrder.indexOf(bestEntry.card.value)
        ) {
          bestEntry = currentEntry;
        }
      }
    }
    // --- BRANCH 2: NO TRUMP (Sans Atout) ---
    else if (trumpSuit === "NONE") {
      // In NONE, every card follows the Normal Hierarchy.
      // You must follow the lead suit to win.
      if (currentCard.suit === leadCard.suit) {
        if (
          nOrder.indexOf(currentCard.value) <
          nOrder.indexOf(bestEntry.card.value)
        ) {
          bestEntry = currentEntry;
        }
      }
    }
    // --- BRANCH 3: SPECIFIC SUIT (HEARTS, SPADES, etc.) ---
    else {
      const currentIsTrump = currentCard.suit === trumpSuit;
      const bestIsTrump = bestEntry.card.suit === trumpSuit;

      if (currentIsTrump && !bestIsTrump) {
        // Current cuts with trump
        bestEntry = currentEntry;
      } else if (currentIsTrump && bestIsTrump) {
        // Higher trump wins
        if (
          tOrder.indexOf(currentCard.value) <
          tOrder.indexOf(bestEntry.card.value)
        ) {
          bestEntry = currentEntry;
        }
      } else if (currentCard.suit === leadCard.suit && !bestIsTrump) {
        // No trumps involved, follow lead suit with normal hierarchy
        if (
          nOrder.indexOf(currentCard.value) <
          nOrder.indexOf(bestEntry.card.value)
        ) {
          bestEntry = currentEntry;
        }
      }
    }
  }

  return bestEntry.player;
};

export const calculateFinalPoints = (
  rawPoints: { team1: number; team2: number },
  isCoinched: boolean,
  bidder: number,
  contractType: string,
  lastTrickWinner: number,
): { t1: number; t2: number } => {
  let t1 = rawPoints.team1;
  let t2 = rawPoints.team2;

  // 1. Add 10 de Der (Last Trick)
  const derPoints = 10;
  if (lastTrickWinner === 0 || lastTrickWinner === 2) t1 += derPoints;
  else t2 += derPoints;

  // 2. Initial Multiplier for NONE (Sans Atout)
  if (contractType === "NONE") {
    t1 *= 2;
    t2 *= 2;
  }

  const total = t1 + t2;
  const half = total / 2;
  const attackerIsTeam1 = bidder === 0 || bidder === 2;

  // 3. COINCHE LOGIC (Takes priority)
  if (isCoinched) {
    if (t1 === t2) return { t1, t2 }; // Litige
    if (t1 < half) return { t1: 0, t2: total * 2 }; // Team 1 failed
    if (t2 < half) return { t1: total * 2, t2: 0 }; // Team 2 failed
    return { t1, t2 }; // Fallback
  }

  // 4. CAPOT LOGIC (Only if NOT Coinched)
  // If a team wins everything, they get the fixed bonus
  if (t2 === 0) {
    // Team 1 Capot
    const val = contractType === "ALL" || contractType === "NONE" ? 350 : 250;
    return { t1: val, t2: 0 };
  }
  if (t1 === 0) {
    // Team 2 Capot
    const val = contractType === "ALL" || contractType === "NONE" ? 350 : 250;
    return { t1: 0, t2: val };
  }

  // 5. NORMAL DEDANS / SUCCESS LOGIC
  if (t1 === t2) return { t1, t2 }; // Litige

  if (attackerIsTeam1 && t1 < half) {
    return { t1: 0, t2: total }; // Failed: defenders get everything
  }

  if (!attackerIsTeam1 && t2 < half) {
    return { t1: total, t2: 0 }; // Failed: defenders get everything
  }

  // Success: Everyone keeps what they won
  return { t1, t2 };
};

export const getCardUrl = (code: string) =>
  `https://deckofcardsapi.com/static/img/${code}.png`;
