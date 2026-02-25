import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { beloteRound, calculateFinalPoints, getCardPoints } from "../engine";
import { RoomService } from "../services/roomService";
import { Card } from "../types";
import { BaseModuleProps } from "./BaseModule";

const { width, height } = Dimensions.get("window");

export const BaseAuditOverlay: React.FC<BaseModuleProps> = ({ game, t }) => {
  const {
    roomData,
    playerSeat,
    setReady,
    resolveGatClaim,
    players,
    bidder,
    teamScores,
    contract,
    isCoinched,
    roomId,
    startNewRound,
    phase,
  } = game;
  const [selectedCard, setSelectedCard] = useState<{
    card: any;
    ownerId: number;
  } | null>(null);

  const gameData = roomData?.gameData || {};
  if (gameData.baseStatus !== "PENDING") return null;

  const exposedHands = gameData.exposedHands || {};
  const readyPlayers = gameData.readyPlayers || {};
  const illegalMoves = gameData.illegalMoves || {};
  const readyCount = Object.keys(readyPlayers).length;
  const hasAgreed = !!readyPlayers[playerSeat];

  const handleVerifyGat = () => {
    if (!selectedCard) return;

    const { card, ownerId } = selectedCard;
    const playerHistory = illegalMoves[ownerId] || [];

    // Look for the card in the history (which includes the badCards array you pushed)
    const isFound = playerHistory.some(
      (item: any) =>
        Array.isArray(item) && item.some((c: any) => c.code === card.code),
    );

    // Trigger the existing resolve function
    resolveGatClaim(isFound);
    setSelectedCard(null);
  };

  function BaseSuccess(): void {
    // throw new Error("Function not implemented.");
    finalizeBaseSuccess();
    setReady(true);
  }

  const finalizeBaseSuccess = () => {
    const trump = contract?.value;
    const claimer = roomData?.gameData?.baseClaimer; // The seat who clicked BASE
    const allHands = roomData?.gameData?.hands || [[], [], [], []];
    const currentRoundPoints = roomData?.gameData?.roundPoints || {
      team1: 0,
      team2: 0,
    };

    // 1. Calculate the sum of ALL cards left in ALL hands
    let totalRemainingPoints = 0;
    allHands.forEach((hand: Card[]) => {
      totalRemainingPoints += hand.reduce(
        (sum, card) => sum + getCardPoints(card, trump),
        0,
      );
    });

    // 2. Add the "10 de Der" (Last trick bonus)
    // Because a Base claimer wins all remaining tricks, they get the bonus.
    // totalRemainingPoints += 10;

    // 3. Award everything to the claimer's team
    const isTeam1Claimer = claimer === 0 || claimer === 2;
    const finalRoundPoints = {
      team1:
        currentRoundPoints.team1 + (isTeam1Claimer ? totalRemainingPoints : 0),
      team2:
        currentRoundPoints.team2 + (!isTeam1Claimer ? totalRemainingPoints : 0),
    };

    // 4. Run through your Engine's complex scoring logic
    // This handles if they were 'Coinched' or went 'Dedans'
    const finalResult = calculateFinalPoints(
      finalRoundPoints,
      isCoinched,
      bidder,
      trump,
      claimer, // Claimer is the virtual last trick winner
    );

    // 5. Apply Belote Rounding (16 or 26 base)
    const isAllTrump = trump === "NONE" || trump === "ALL";
    const rounded = beloteRound(finalResult.t1, finalResult.t2, isAllTrump);

    // 6. Update running match scores
    let newT1 =
      teamScores.team1 +
      (teamScores.team1 === 0 && rounded.t1 > 0 ? 26 + rounded.t1 : rounded.t1);
    let newT2 =
      teamScores.team2 +
      (teamScores.team2 === 0 && rounded.t2 > 0 ? 26 + rounded.t2 : rounded.t2);

    RoomService.updateRoom(roomId, {
      "gameData/phase": "INGAME",
      "gameData/baseStatus": "SUCCESS",
      "gameData/scores": { team1: newT1, team2: newT2 },
      "gameData/roundPoints": finalRoundPoints,
      "gameData/readyPlayers": {},
    });

    // Move to next round dealer
  };

  return (
    <View style={styles.auditOverlay}>
      <View style={styles.auditContainer}>
        <Text style={styles.auditTitle}>
          🚨 {t.baseAuditTitle || "CONTRÔLE DES MAINS"}
        </Text>

        {/* 1. THE TABLE: Displaying all hands */}
        <ScrollView style={styles.handsScroll}>
          {Object.entries(exposedHands).map(([seat, hand]: [string, any]) => (
            <View key={seat} style={styles.playerRow}>
              <Text style={styles.playerName}>
                {players[Number(seat)]?.name || `Joueur ${seat}`}
                {Number(seat) === gameData.baseClaimer ? " (👑 Base)" : ""}
              </Text>
              <View style={styles.handRow}>
                {hand.map((card: any) => (
                  <TouchableOpacity
                    key={card.code}
                    onPress={() =>
                      setSelectedCard({ card, ownerId: Number(seat) })
                    }
                    style={[
                      styles.cardWrapper,
                      selectedCard?.card.code === card.code &&
                        styles.selectedCard,
                    ]}
                  >
                    <Image
                      source={{
                        uri: `https://deckofcardsapi.com/static/img/${card.code}.png`,
                      }}
                      style={styles.cardImg}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {selectedCard
              ? `Carte choisie: ${selectedCard.card.value} de ${selectedCard.card.suit}`
              : "Touchez une carte suspecte pour l'accuser"}
          </Text>
        </View>

        {/* 2. ACTIONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.gatBtn, !selectedCard && styles.disabledBtn]}
            onPress={handleVerifyGat}
            disabled={!selectedCard}
          >
            <Text style={styles.gatBtnText}>🔎 GAT SUR CETTE CARTE</Text>
          </TouchableOpacity>

          {!hasAgreed && (
            <TouchableOpacity
              style={styles.agreeBtn}
              onPress={() => BaseSuccess()}
            >
              <Text style={styles.agreeBtnText}>
                ✅ ACCEPTER ({readyCount}/4)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {hasAgreed && (
          <Text style={styles.waitingText}>En attente des autres...</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  auditOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  auditContainer: {
    width: width * 0.95,
    maxHeight: height * 0.8,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: "gold",
  },
  auditTitle: {
    color: "gold",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  handsScroll: { flexGrow: 0, marginBottom: 15 },
  playerRow: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    // pb: 5,
  },
  playerName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  handRow: { flexDirection: "row", flexWrap: "wrap" },
  cardWrapper: {
    margin: 2,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: { borderColor: "red" },
  cardImg: { width: 40, height: 60, borderRadius: 4 },
  infoBox: {
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  infoText: { color: "gold", fontSize: 11, textAlign: "center" },
  actionRow: { flexDirection: "row", justifyContent: "space-between" },
  gatBtn: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  gatBtnText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 11,
  },
  agreeBtn: {
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  agreeBtnText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 11,
  },
  disabledBtn: { backgroundColor: "#555", opacity: 0.5 },
  waitingText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
});
