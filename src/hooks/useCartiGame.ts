import { useEffect, useRef, useState } from "react";
import { sortHand } from "../components/CardHand";
import { CONTRACTS } from "../constants";
import * as Engine from "../engine";
import { beloteRound } from "../engine";
import { RoomService } from "../services/roomService";
import { UserProfile } from "../services/UserService";
import { Card, Contract, PliEntry } from "../types";

interface Player {
  id: string;
  seat: number;
  name?: string;
  // add other fields if needed
}

export const useCartiGame = (roomId: string, userProfile: UserProfile) => {
  // ==================== FIREBASE STATE ====================
  const [roomData, setRoomData] = useState<any>(null);
  const [playerSeat, setPlayerSeat] = useState<number>(0);

  // ==================== DERIVED STATE FROM FIREBASE ====================
  // Extract all game state from Firebase roomData
  const phase = roomData?.gameData?.phase || "IDLE";
  const hands = roomData?.gameData?.hands || [[], [], [], []];
  const currentPlayer = roomData?.gameData?.currentPlayer || 0;
  const dealer = roomData?.gameData?.dealer || 0;
  const contract = roomData?.gameData?.contract || null;
  const starter = roomData?.gameData?.starter ?? -1;
  const bidder = roomData?.gameData?.bidder ?? -1;
  const currentPli = roomData?.gameData?.currentPli || [];
  const isCoinched = roomData?.gameData?.isCoinched || false;
  const teamScores = roomData?.gameData?.scores || { team1: 0, team2: 0 };
  const roundPoints = roomData?.gameData?.roundPoints || { team1: 0, team2: 0 };
  const moveHistory = roomData?.gameData?.moveHistory || [];
  const sleptCards = roomData?.gameData?.sleptCards || [];
  const deck = roomData?.gameData?.deck || [];
  const players = roomData?.players || [];
  const illegalMoves = roomData?.gameData?.illegalMoves || {
    0: [],
    1: [],
    2: [],
    3: [],
  };
  const playedCards = roomData?.gameData?.playedCards || [];
  // Extract contest score (sets won), default to 0-0
  const contestScore = roomData?.gameData?.contestScore || {
    team1: 0,
    team2: 0,
  };
  // We also need to track the last player list to detect changes
  const lastPlayerIds = roomData?.gameData?.lastPlayerIds || [];
  const playerBids = roomData?.gameData?.playerBids || null;
  const lastTrickWinner = roomData?.gameData?.lastTrickWinner ?? -1;

  // ==================== FIREBASE SUBSCRIPTION ====================

  const lock = useRef(false);

  const withLock = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    try {
      await fn();
    } finally {
      lock.current = false;
    }
  };

  useEffect(() => {
    if (!roomId || !roomData || currentPlayer === -1) return;

    const currentPlayerData = roomData?.players?.[currentPlayer];
    const isBot = currentPlayerData?.type === "BOT";

    // Only the host (seat 0) runs the Bot logic
    if (isBot && playerSeat === 0) {
      const timer = setTimeout(() => {
        if (phase === "BIDDING") {
          const botHand = hands[currentPlayer];
          const decision = Engine.evaluateHandForBidding(botHand); // Use the logic from previous step
          if (currentPlayer === starter && decision === "Pass") {
            handleBid(CONTRACTS[0]);
          } else {
            handleBid(decision as any);
          }
        } else if (phase === "PLAYING") {
          const botHand = hands[currentPlayer];

          // Call the new separate function
          const chosenIdx = Engine.getBotMove(
            botHand,
            currentPli,
            contract,
            currentPlayer,
            Engine.getCardPower,
            Engine.getCardPoints,
          );

          executePlay(chosenIdx);
        }
      }, 1500); // 1.5s delay feels more "human"

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, phase, roomData]);

  // NEW: Expose voiceReady for GameScreen WebRTC logic
  const voiceReady = roomData?.voiceReady || {};
  const voiceParticipants = Object.keys(voiceReady);

  // ==================== FIREBASE SUBSCRIPTION ====================
  useEffect(() => {
    if (!roomId || !userProfile?.uid) return;

    const unsubscribe = RoomService.subscribe(
      roomId,
      (data: { players: { [s: string]: unknown } | ArrayLike<unknown> }) => {
        if (!data) return;
        setRoomData(data);

        // STRONG AUTH: Find my seat by searching for my UNIQUE UID
        // This prevents "Ghost" sessions from taking over your UI
        if (data.players) {
          // const playersList = Array.isArray(data.players)
          //     ? data.players
          //     : Object.values(data.players);
          const playersList = Object.values(data.players).filter(
            Boolean,
          ) as Player[];
          const me = userProfile?.uid
            ? playersList.find((p: any) => p.id === userProfile.uid)
            : null;
          if (me && me.seat !== playerSeat) {
            setPlayerSeat(me.seat);
            console.log(
              `✅ Seat verified for UID ${userProfile.uid}: Seat ${me.seat}`,
            );
          }
        }
      },
    );

    return () => unsubscribe();
  }, [roomId, userProfile.uid]);

  useEffect(() => {
    if (phase !== "BASE_REVIEW" || playerSeat !== 0) return;

    const readyPlayers = roomData?.gameData?.readyPlayers || {};
    const playersList = Object.values(roomData?.players || {}).filter(
      Boolean,
    ) as any[];

    // 1. Force Bots to be ready
    playersList.forEach((p) => {
      if (p.type === "BOT" && !readyPlayers[p.seat]) {
        RoomService.updateRoom(roomId, {
          [`gameData/readyPlayers/${p.seat}`]: true,
        });
      }
    });

    // 2. If everyone (4/4) is ready, finalize the points
    if (Object.keys(readyPlayers).length === 4) {
      setTimeout(() => startNewRound(), 2500);
      //   finalizeBaseSuccess();
    }
  }, [roomData?.gameData?.readyPlayers, phase]);

  const setReady = (isReady: boolean) => {
    if (!roomId) return;

    // We use the playerSeat as the key to track who is ready
    // Using a path like "gameData/readyPlayers/0" allows multiple
    // players to update the object simultaneously without overwriting each other.
    RoomService.updateRoom(roomId, {
      [`gameData/readyPlayers/${playerSeat}`]: isReady,
    });
  };
  // Base implementation here

  const startNewGame = () => {
    if (!roomId) {
      console.warn("🔥 Firebase: Cannot start new game - no roomId");
      return;
    }

    // Calculate initial game state
    const newDealer = Engine.getRandomDealer();
    const starter = Engine.getNextPlayer(newDealer); // First player after dealer

    // Prepare Firebase update payload - this is the single source of truth
    const updatePayload = {
      phase: "INGAME",
      currentPlayer: starter, // First player can start the first round
      dealer: newDealer,
      bidder: starter,
      starter: starter,
      isCoinched: false,
      lastUpdated: Date.now(),
      gameReset: true, // Optional flag for tracking
      hands: [[], [], [], []],
      deck: [],
      currentPli: [],
      moveHistory: [],
      contract: null,
      scores: { team1: 0, team2: 0 }, // Reset scores to 0-0
      roundPoints: { team1: 0, team2: 0 },
      sleptCards: [],
    };

    // Use a special key to target the root of gameData
    RoomService.updateRoom(roomId, {
      gameData: updatePayload,
    });
  };

  const startNewRound = () => {
    if (!roomId) return;

    // The points of the last round should be awarded here

    const newDeck = Engine.createDeck();
    const initialHands = [0, 1, 2, 3].map((i) =>
      sortHand(newDeck.slice(i * 5, (i + 1) * 5)),
    );

    const nextDealer = Engine.getNextPlayer(dealer);
    const starter = Engine.getNextPlayer(nextDealer);

    const updateLoad = {
      // Inside startNewRound updateLoad:
      "gameData/lastTrickWinner": starter, // Reset to the new starter for the new round
      "gameData/phase": "BIDDING",
      "gameData/currentPlayer": starter,
      "gameData/dealer": nextDealer,
      "gameData/isCoinched": false,
      "gameData/lastUpdated": Date.now(),
      "gameData/hands": initialHands,
      "gameData/deck": newDeck.slice(20),
      "gameData/currentPli": [],
      "gameData/moveHistory": [],
      "gameData/contract": null,
      "gameData/bidder": starter,
      "gameData/starter": starter,
      "gameData/scores": teamScores, // Keep existing scores
      "gameData/roundPoints": { team1: 0, team2: 0 },
      "gameData/sleptCards": [],
      "gameData/illegalMoves": {
        0: [],
        1: [],
        2: [],
        3: [],
      },
      // Inside startNewRound...
      "gameData/playedCards": [],
      "gameData/playerBids": null,
    };

    RoomService.updateRoom(roomId, updateLoad);
  };

  // const handleBid = (selection: Contract | "Pass" | "Coinche") => {
  //   if (!roomId) {
  //     console.warn("🔥 Firebase: Cannot handle bid - no roomId");
  //     return;
  //   }

  //   withLock(async () => {
  //     // existing logic

  //     if (selection === "Coinche") {
  //       // Prepare updates

  //       const updates = {
  //         "gameData/lastUpdated": Date.now(),
  //         "gameData/isCoinched": true,
  //       };

  //       RoomService.updateRoom(roomId, updates);

  //       if (contract) finalizeBidding();
  //     } else if (selection === "Pass") {
  //       const nextPlayer = Engine.getNextPlayer(currentPlayer);

  //       const updates = {
  //         "gameData/lastUpdated": Date.now(),
  //         "gameData/currentPlayer": nextPlayer,
  //       };
  //       RoomService.updateRoom(roomId, updates);

  //       if (nextPlayer === starter) finalizeBidding();
  //     } else {
  //       // Regular bid (e.g., Bot bids 'Tout')
  //       const nextPlayer = Engine.getNextPlayer(currentPlayer);
  //       const newContract = selection; // Store the selection clearly

  //       RoomService.updateRoom(roomId, {
  //         "gameData/currentPlayer": nextPlayer,
  //         "gameData/lastUpdated": Date.now(),
  //         "gameData/contract": newContract,
  //         "gameData/bidder": currentPlayer,
  //       });

  //       // CRITICAL FIX: Use 'newContract', NOT the old 'contract' state variable
  //       if (nextPlayer === starter) {
  //         finalizeBidding();
  //       }
  //     }
  //   });
  // };

  const handleBid = (selection: Contract | "Pass" | "Coinche") => {
    if (!roomId) return;

    withLock(async () => {
      // Safety Check: Determine what string to save
      let bidLabel: string;

      if (selection === "Pass") bidLabel = "Pass";
      else if (selection === "Coinche") bidLabel = "Coinche";
      else if (typeof selection === "object" && selection?.label)
        bidLabel = selection.label;
      else bidLabel = "Unknown"; // Fallback to prevent 'undefined'

      const updates: any = {
        "gameData/lastUpdated": Date.now(),
        [`gameData/playerBids/${currentPlayer}`]: bidLabel, // Use our safe label
      };

      if (selection === "Coinche") {
        updates["gameData/isCoinched"] = true;
        await RoomService.updateRoom(roomId, updates);
        if (contract) finalizeBidding();
      } else if (selection === "Pass") {
        const nextPlayer = Engine.getNextPlayer(currentPlayer);
        updates["gameData/currentPlayer"] = nextPlayer;
        await RoomService.updateRoom(roomId, updates);
        if (nextPlayer === starter) finalizeBidding();
      } else {
        // Regular contract bid
        const nextPlayer = Engine.getNextPlayer(currentPlayer);
        updates["gameData/currentPlayer"] = nextPlayer;
        updates["gameData/contract"] = selection;
        updates["gameData/bidder"] = currentPlayer;

        await RoomService.updateRoom(roomId, updates);
        if (nextPlayer === starter) finalizeBidding();
      }
    });
  };

  const finalizeBidding = () => {
    if (!roomId) {
      console.warn("🔥 Firebase: Cannot finalize bidding - no roomId");
      return;
    }

    // Calculate the distributed hands locally
    let remaining = [...deck];
    const fullHands = hands.map((hand: any) => {
      const extra = remaining.slice(0, 3);
      remaining = remaining.slice(3);
      return sortHand([...hand, ...extra]);
    });

    // Determine first player (player after dealer)
    const firstPlayer = Engine.getNextPlayer(dealer);

    // Prepare Firebase update payload
    const updatePayload = {
      "gameData/phase": "PLAYING",
      "gameData/currentPlayer": firstPlayer,
      "gameData/lastUpdated": Date.now(),
      "gameData/hands": fullHands, // Full 8-card hands
      "gameData/deck": remaining,
      "gameData/currentPli": [], // Reset trick
      "gameData/moveHistory": [], // Reset move history for new round
    };

    // Write directly to Firebase - this becomes the source of truth
    RoomService.updateRoom(roomId, updatePayload)
      .then(() => {})
      .catch((error: any) => {
        console.error("❌ Firebase update failed:", error);
        // Optional: Add retry logic or user notification
      });
  };

  // Add this effect inside useCartiGame.ts to handle the pause
  useEffect(() => {
    // Only the 'host' (playerSeat 0) should trigger the cleanup timer to avoid 4 players doing it
    if (currentPli.length === 4 && playerSeat === 0) {
      const timer = setTimeout(() => {
        finalizeTrick();
      }, 2000); // 2 seconds delay so players can see the 4th card
      return () => clearTimeout(timer);
    }
  }, [currentPli.length, playerSeat]);

  const executePlay = (cardIdx: number) => {
    if (!roomId || lock.current) return;

    lock.current = true;

    // Force it to always be an array of 4, filling missing slots with []
    const nhands = [0, 1, 2, 3].map((i) => {
      if (!hands) return [];
      return hands[i] || [];
    });

    const card = nhands[currentPlayer][cardIdx];
    const newHands = nhands.map((hand: any, i: number) =>
      i === currentPlayer
        ? hand.filter((_: any, idx: number) => idx !== cardIdx)
        : hand,
    );

    const entry: PliEntry = { card, player: currentPlayer };
    const nextPli = [...currentPli, entry];

    // FLAT HISTORY: Append the current card to the list of played cards
    const updatedPlayedCards = [...playedCards, card];

    const updates: any = {
      "gameData/currentPli": nextPli,
      "gameData/hands": newHands,
      "gameData/playedCards": updatedPlayedCards, // <--- Simple flat list
      "gameData/lastUpdated": Date.now(),
    };

    // This will be an array: [PlayedCard, ...ValidCards]
    let cheatEvidenceEntry: any[] | null = null;

    if (currentPli.length > 0) {
      const currentHand = newHands[currentPlayer];
      const cardPlayed = card;
      const leadCard = currentPli[0].card;
      const trump = contract?.value || "NONE";
      const highestEntry = Engine.getHighestEntrySoFar(
        currentPli,
        trump,
        sleptCards[0],
      );
      const highestCard = highestEntry!.card;
      const isPartnerWinning = highestEntry?.player === (currentPlayer + 2) % 4;

      const isIllegal = Engine.isMoveIllegal(
        cardPlayed,
        currentHand,
        leadCard,
        trump,
        highestCard,
        isPartnerWinning,
        Engine.getCardPower,
      );

      if (isIllegal) {
        // Evidence: Find all valid options
        const validCards = currentHand.filter(
          (c: Card) =>
            !Engine.isMoveIllegal(
              c,
              currentHand,
              leadCard,
              trump,
              highestCard,
              isPartnerWinning,
              Engine.getCardPower,
            ),
        );

        // As requested: just the played card and the evidence cards in one array
        cheatEvidenceEntry = [cardPlayed, ...validCards];

        // Push the simple array to the player's history
        if (cheatEvidenceEntry) {
          const history = illegalMoves?.[currentPlayer] || [];
          updates[`gameData/illegalMoves/${currentPlayer}`] = [
            ...history,
            cheatEvidenceEntry,
          ];
        }

        if (players[currentPlayer].name == "AI Gamma") {
          console.log(cheatEvidenceEntry);
        }
      }
    }

    // 2. Advance the turn or stop for the delay
    if (nextPli.length < 4) {
      updates["gameData/currentPlayer"] = Engine.getNextPlayer(currentPlayer);
    } else {
      // Trick is full! We set currentPlayer to -1 to "pause" the game
      updates["gameData/currentPlayer"] = -1;
    }

    RoomService.updateRoom(roomId, updates)
      .then(() => {})
      .finally(() => {
        lock.current = false;
      });
  };

  // const finalizeTrick = () => {
  //   withLock(async () => {
  //     // Use a local reference and provide defaults to prevent "undefined" errors
  //     const currentHands = roomData?.gameData?.hands || [[], [], [], []];
  //     const currentPli = roomData?.gameData?.currentPli || [];

  //     if (currentPli.length !== 4) return;

  //     const trump = contract?.value as string;
  //     const winner = Engine.getWinnerOfPli(currentPli, trump, sleptCards);

  //     // Calculate points
  //     const trickPoints = currentPli.reduce(
  //       (sum: number, item: { card: Card }) =>
  //         sum + Engine.getCardPoints(item.card, trump),
  //       0,
  //     );

  //     const isTeam1Winner = winner === 0 || winner === 2;
  //     const newRoundPoints = {
  //       team1: isTeam1Winner
  //         ? (roundPoints?.team1 || 0) + trickPoints
  //         : roundPoints?.team1 || 0,
  //       team2: !isTeam1Winner
  //         ? (roundPoints?.team2 || 0) + trickPoints
  //         : roundPoints?.team2 || 0,
  //     };

  //     // CHECK: If all hands are empty, it's the last trick
  //     // Using .every safely on the local reference
  //     const isLastTrick = currentHands.every(
  //       (h: any) => Array.isArray(h) && h.length === 0,
  //     );

  //     const updates: any = {
  //       "gameData/currentPli": [],
  //       "gameData/roundPoints": newRoundPoints,
  //       "gameData/lastUpdated": Date.now(),
  //     };

  //     if (isLastTrick) {
  //       // const final = Engine.calculateFinalPoints(
  //       //   newRoundPoints,
  //       //   isCoinched,
  //       //   bidder,
  //       //   trump,
  //       //   winner,
  //       // );

  //       // const newTeam1Total = (teamScores?.team1 || 0) + final.t1;
  //       // const newTeam2Total = (teamScores?.team2 || 0) + final.t2;

  //       const rawFinal = Engine.calculateFinalPoints(
  //         newRoundPoints,
  //         isCoinched,
  //         bidder,
  //         trump,
  //         winner,
  //       );

  //       // Determine if we are in All-Trump (assuming 'ALL' is your value for Tout Atout)
  //       const isAllTrump = trump === "NONE" || trump === "ALL";

  //       // Apply the "Conservation of Points" rounding
  //       const rounded = beloteRound(rawFinal.t1, rawFinal.t2, isAllTrump);

  //       // 1. Apply the "Conservation of Points" rounding from our previous step
  //       // const rounded = beloteRound(rawFinal.t1, rawFinal.t2, isAllTrump);

  //       // 2. Calculate New Totals with the "26 Base" Rule
  //       let newTeam1Total = teamScores?.team1 || 0;
  //       let newTeam2Total = teamScores?.team2 || 0;

  //       // Apply base for Team 1: Only if they have 0 AND they actually won points this round
  //       if (newTeam1Total === 0 && rounded.t1 > 0) {
  //         newTeam1Total = 26 + rounded.t1;
  //       } else {
  //         newTeam1Total += rounded.t1;
  //       }

  //       // Apply base for Team 2: Only if they have 0 AND they actually won points this round
  //       if (newTeam2Total === 0 && rounded.t2 > 0) {
  //         newTeam2Total = 26 + rounded.t2;
  //       } else {
  //         newTeam2Total += rounded.t2;
  //       }

  //       // const newTeam1Total = (teamScores?.team1 || 0) + rounded.t1;
  //       // const newTeam2Total = (teamScores?.team2 || 0) + rounded.t2;
  //       // --- WIN CONDITION LOGIC ---
  //       const team1Wins = newTeam1Total >= 100 && newTeam1Total > newTeam2Total;
  //       const team2Wins = newTeam2Total >= 100 && newTeam2Total > newTeam1Total;

  //       if (team1Wins || team2Wins) {
  //         // Increment Contest Score (The "Sets" score)
  //         const currentContest = roomData?.gameData?.contestScore || {
  //           team1: 0,
  //           team2: 0,
  //         };
  //         const updatedContest = {
  //           team1: team1Wins ? currentContest.team1 + 1 : currentContest.team1,
  //           team2: team2Wins ? currentContest.team2 + 1 : currentContest.team2,
  //         };
  //         updates["gameData/phase"] = "IDLE"; // Return to lobby state
  //         updates["gameData/scores"] = { team1: 0, team2: 0 }; // Reset match points
  //         updates["gameData/contestScore"] = updatedContest;
  //         updates["gameData/contract"] = null;
  //         updates["gameData/lastWinner"] = team1Wins ? "Team 1" : "Team 2";
  //       } else {
  //         updates["gameData/phase"] = "INGAME";
  //         updates["gameData/scores"] = {
  //           team1: (teamScores?.team1 || 0) + newTeam1Total,
  //           team2: (teamScores?.team2 || 0) + newTeam2Total,
  //         };
  //         updates["gameData/contract"] = null;
  //         updates["gameData/hands"] = [[], [], [], []]; // Explicitly set to empty arrays
  //       }
  //     } else {
  //       updates["gameData/currentPlayer"] = winner;
  //     }

  //     RoomService.updateRoom(roomId, updates);
  //   });
  // };

  const finalizeTrick = () => {
    withLock(async () => {
      const currentHands = roomData?.gameData?.hands || [[], [], [], []];
      const currentPli = roomData?.gameData?.currentPli || [];
      if (currentPli.length !== 4) return;

      const trump = contract?.value as string;
      const winner = Engine.getWinnerOfPli(currentPli, trump, sleptCards);

      const trickPoints = currentPli.reduce(
        (sum: number, item: { card: Card }) =>
          sum + Engine.getCardPoints(item.card, trump),
        0,
      );

      const isTeam1Winner = winner === 0 || winner === 2;
      const newRoundPoints = {
        team1: isTeam1Winner
          ? (roundPoints?.team1 || 0) + trickPoints
          : roundPoints?.team1 || 0,
        team2: !isTeam1Winner
          ? (roundPoints?.team2 || 0) + trickPoints
          : roundPoints?.team2 || 0,
      };

      const isLastTrick = currentHands.every(
        (h: any) => Array.isArray(h) && h.length === 0,
      );

      const updates: any = {
        "gameData/currentPli": [],
        "gameData/roundPoints": newRoundPoints,
        "gameData/lastUpdated": Date.now(),
      };

      if (isLastTrick) {
        const rawFinal = Engine.calculateFinalPoints(
          newRoundPoints,
          isCoinched,
          bidder,
          trump,
          winner,
        );

        // Rule: isAllTrump is true if it's 'ALL' (Tout Atout) or 'NONE' (Sans Atout)
        const isAllTrump = trump === "NONE" || trump === "ALL";

        const rounded = beloteRound(rawFinal.t1, rawFinal.t2, isAllTrump);

        let newTeam1Total = teamScores?.team1 || 0;
        let newTeam2Total = teamScores?.team2 || 0;

        // Apply Base 26 Rule and update the running total
        if (newTeam1Total === 0 && rounded.t1 > 0) {
          newTeam1Total = 26 + rounded.t1;
        } else {
          newTeam1Total += rounded.t1;
        }

        if (newTeam2Total === 0 && rounded.t2 > 0) {
          newTeam2Total = 26 + rounded.t2;
        } else {
          newTeam2Total += rounded.t2;
        }

        // Check Win Condition (using 100 as your threshold per your code)
        const team1Wins = newTeam1Total >= 100 && newTeam1Total > newTeam2Total;
        const team2Wins = newTeam2Total >= 100 && newTeam2Total > newTeam1Total;

        if (team1Wins || team2Wins) {
          const currentContest = roomData?.gameData?.contestScore || {
            team1: 0,
            team2: 0,
          };
          updates["gameData/contestScore"] = {
            team1: team1Wins ? currentContest.team1 + 1 : currentContest.team1,
            team2: team2Wins ? currentContest.team2 + 1 : currentContest.team2,
          };
          updates["gameData/scores"] = { team1: 0, team2: 0 }; // RESET match points
          updates["gameData/phase"] = "IDLE";
          updates["gameData/lastWinner"] = team1Wins ? "Team 1" : "Team 2";
        } else {
          updates["gameData/phase"] = "INGAME";
          // FIXED: Do not add teamScores again here!
          updates["gameData/scores"] = {
            team1: newTeam1Total,
            team2: newTeam2Total,
          };
        }
        // Round cleanup
        updates["gameData/contract"] = null;
        updates["gameData/hands"] = [[], [], [], []];
      } else {
        updates["gameData/currentPlayer"] = winner;
        updates["gameData/lastTrickWinner"] = winner;
      }

      RoomService.updateRoom(roomId, updates);
    });
  };

  const endCurrentGame = () => {
    if (!roomId) {
      console.warn("🔥 Firebase: Cannot end game - no roomId");
      return;
    }

    // Write directly to Firebase - this becomes the source of truth
    RoomService.updateRoom(roomId, { gameData: {} })
      .then(() => {})
      .catch((error: any) => {
        console.error("❌ Firebase update failed for game end:", error);
        // Optional: Show error to user or implement retry logic
      });
  };

  const resolveGatClaim = (isSuccessful: boolean) => {
    if (!roomId) {
      console.warn("🔥 Firebase: Cannot resolve GAT claim - no roomId");
      return;
    }

    // Calculate GAT points
    const trump = contract?.value as string;
    let totalPossiblePoints = trump === "NONE" || trump === "ALL" ? 26 : 16;

    if (isCoinched) totalPossiblePoints = totalPossiblePoints * 2;

    const finalResult = isSuccessful
      ? { team1: totalPossiblePoints, team2: 0 }
      : { team1: 0, team2: totalPossiblePoints };

    // Calculate new team scores
    const newTeamScores = {
      team1: teamScores.team1 + finalResult.team1,
      team2: teamScores.team2 + finalResult.team2,
    };

    // Determine new dealer (rotate dealer for next round)
    const newDealer = Engine.getNextPlayer(dealer);

    // Prepare Firebase update payload
    const updatePayload = {
      "gameData/phase": "IDLE",
      "gameData/dealer": newDealer,
      "gameData/currentPlayer": newDealer, // Dealer starts next round
      "gameData/firstBidderOfRound": -1,
      "gameData/isCoinched": false, // Reset coinche
      "gameData/lastUpdated": Date.now(),
      "gameData/gatResult": {
        success: isSuccessful,
        pointsAwarded: totalPossiblePoints,
        timestamp: Date.now(),
      },
      "gameData/scores": newTeamScores,
      "gameData/roundPoints": finalResult,
      "gameData/currentPli": [], // Clear table
      "gameData/moveHistory": [], // Reset history
      "gameData/contract": null, // Reset contract
      "gameData/hands": [[], [], [], []], // Clear hands
      "gameData/deck": [], // Clear deck
      "gameData/sleptCards": null, // Clear sleep sabotage
    };

    // Write directly to Firebase - single source of truth
    RoomService.updateRoom(roomId, updatePayload)
      .then(() => {})
      .catch((error: any) => {
        console.error("❌ Firebase update failed for GAT:", error);
        // Optional: Add retry logic or user notification
      });

    // Note: No setTimeout needed for local state updates
    // Firebase subscription will handle UI updates immediately
  };

  const onSleepSuccess = (card: Card) => {
    // const currentSlept = roomData?.gameData?.sleptCards || [];
    RoomService.updateRoom(roomId, {
      "gameData/sleptCards": [...sleptCards, card],
      "gameData/lastUpdated": Date.now(),
    });
  };

  const onSleepFailure = (targetOpponentId: number, attemptedCard: Card) => {
    // If you fail a sleep, the card you targeted is proof that YOU are lying/guessing.
    // We add this to YOUR illegalMoves so the opponent can launch a GAT on YOU.
    const myHistory = illegalMoves[playerSeat] || [];

    // Create a "False Accusation" entry
    // [PlayedCard (null since it's a sleep failure), the card you falsely claimed was a cheat]
    const failureEntry = [
      {
        code: "SLEEP_FAIL",
        suit: attemptedCard.suit,
        value: attemptedCard.value,
      },
      attemptedCard,
    ];

    RoomService.updateRoom(roomId, {
      [`gameData/illegalMoves/${playerSeat}`]: [...myHistory, attemptedCard],
      "gameData/lastUpdated": Date.now(),
    });
  };
  return {
    phase,
    hands,
    currentPlayer,
    contract,
    bidder,
    currentPli,
    teamScores,
    roundPoints,
    startNewRound,
    handleBid,
    executePlay,
    starter,
    isCoinched,
    moveHistory,
    resolveGatClaim,
    sleptCards,
    startNewGame,
    endCurrentGame,
    players,
    playerSeat,
    playedCards,
    illegalMoves,
    onSleepSuccess,
    onSleepFailure,
    userProfile,

    voiceReady, // <--- Added for Strong Auth Voice
    voiceParticipants, // <--- Added for PeerJS calling list
    roomData,
    lastTrickWinner,
    roomId,
    setReady,
  };
};
