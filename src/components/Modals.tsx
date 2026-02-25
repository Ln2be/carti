import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Card } from "../types";

const getCardUrl = (code: string) =>
  `https://deckofcardsapi.com/static/img/${code}.png`;

interface ModalsProps {
  fraudVisible: boolean;
  setFraudVisible: (v: boolean) => void;
  playedCards: Card[];
  illegalMoves: { [key: number]: any }; // Stores both baseViolations and historical cheats
  resolveGatClaim: (isSuccessful: boolean) => void;
  players: any[];
  playerSeat: number;
  baseStatus?: "PENDING" | "FAILED" | null;
  baseClaimer?: number | null;
  allHands: { [key: number]: Card[] }; // Current hands of all players
  t: any; // Translations object
}

const Modals: React.FC<ModalsProps> = ({
  fraudVisible,
  setFraudVisible,
  playedCards = [],
  illegalMoves = {},
  resolveGatClaim,
  players,
  playerSeat,
  baseStatus,
  baseClaimer,
  allHands = {},
  t,
}) => {
  const [accusedId, setAccusedId] = useState<number | null>(null);

  // Filter out yourself and teammate for standard Gat
  const opponentIds = [0, 1, 2, 3].filter(
    (id) => id !== playerSeat && id !== (playerSeat + 2) % 4,
  );

  // Group played cards into tricks (4 cards each)
  const tricks: Card[][] = [];
  for (let i = 0; i < playedCards.length; i += 4) {
    tricks.push(playedCards.slice(i, i + 4));
  }

  const handleVerify = (clickedCard: Card, cardOwnerId?: number) => {
    const targetId = cardOwnerId !== undefined ? cardOwnerId : accusedId;
    if (targetId === null) return;

    const accusedData = illegalMoves[targetId];
    const accusedName = players[targetId]?.name || `Joueur ${targetId}`;

    // --- 1. BASE FRAUD CHECK ---
    if (baseStatus === "PENDING") {
      const baseViolations = accusedData?.baseViolations || [];
      const isBaseFraud = baseViolations.some(
        (c: Card) => c.code === clickedCard.code,
      );

      // Also check if this card was a historical cheat (hiding a card)
      const historicalCheats = Array.isArray(accusedData) ? accusedData : [];
      const isHistoricalCheat = historicalCheats.find((cheatArray) =>
        cheatArray
          .slice(1)
          .some((evidenceCard: Card) => evidenceCard.code === clickedCard.code),
      );

      if (isBaseFraud || isHistoricalCheat) {
        Alert.alert(
          t.gatSuccess || "GAT RÉUSSI !",
          `${accusedName} a été démasqué !`,
        );
        resolveGatClaim(true);
        reset();
        return;
      }
    }

    // --- 2. STANDARD TRICK GAT CHECK ---
    const playerCheats = Array.isArray(accusedData) ? accusedData : [];
    const foundCheat = playerCheats.find(
      (cheatArray) => cheatArray[0].code === clickedCard.code,
    );

    if (foundCheat) {
      const evidence = foundCheat.slice(1);
      Alert.alert(
        t.gatSuccess || "GAT RÉUSSI !",
        `${accusedName} a triché ! Il a joué le ${clickedCard.value} alors qu'il avait : ${evidence.map((c: { value: any }) => c.value).join(", ")}.`,
      );
      resolveGatClaim(true);
    } else {
      Alert.alert(
        t.gatFailed || "GAT ÉCHOUÉ",
        t.gatFailedDesc ||
          "Cette carte ne prouve rien. Votre équipe perd le round.",
      );
      resolveGatClaim(false);
    }
    reset();
  };

  const reset = () => {
    setAccusedId(null);
    setFraudVisible(false);
  };

  return (
    <Modal visible={fraudVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {baseStatus === "PENDING"
              ? "AUDIT GÉNÉRAL (BASE)"
              : "INSPECTION GAT"}
          </Text>

          {baseStatus === "PENDING" ? (
            /* --- MODE A: TOTAL EXPOSURE (BASE CLAIMED) --- */
            <ScrollView style={styles.historyList}>
              <Text style={styles.baseAlert}>
                ⚠️ {t.baseAuditDesc || "RECHERCHE DE FRAUDE"}
              </Text>
              {[0, 1, 2, 3].map((id) => (
                <View
                  key={id}
                  style={[
                    styles.exposedRow,
                    id === baseClaimer && styles.claimerRow,
                  ]}
                >
                  <View style={styles.profileColumn}>
                    <Image
                      source={{
                        uri:
                          players[id]?.avatar ||
                          `https://robohash.org/${id}?set=set4`,
                      }}
                      style={styles.miniAvatar}
                    />
                    <Text style={styles.miniName} numberOfLines={1}>
                      {players[id]?.name}
                    </Text>
                    {id === baseClaimer && (
                      <View style={styles.claimerBadge}>
                        <Text style={styles.claimerBadgeText}>BASE</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardsColumn}>
                    <View style={styles.exposedCardsRow}>
                      {allHands[id]?.map((card, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleVerify(card, id)}
                        >
                          <Image
                            source={{ uri: getCardUrl(card.code) }}
                            style={styles.exposedCardImg}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : /* --- MODE B: STANDARD SELECTION (NORMAL PLAY) --- */
          accusedId === null ? (
            <View>
              <Text style={styles.label}>1. Qui accusez-vous ?</Text>
              <View style={styles.playerRow}>
                {opponentIds.map((id) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.playerBtn}
                    onPress={() => setAccusedId(id)}
                  >
                    <Text style={styles.playerBtnText}>
                      {players[id]?.name?.toUpperCase() || `OPPOSANT ${id}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>
                2. Cliquez sur la triche de {players[accusedId]?.name} :
              </Text>
              <ScrollView style={styles.historyList}>
                {tricks.map((trick, trickIdx) => (
                  <View key={trickIdx} style={styles.pliContainer}>
                    <Text style={styles.pliLabel}>PLI {trickIdx + 1}</Text>
                    <View style={styles.cardsRow}>
                      {trick.map((card, cardIdx) => (
                        <TouchableOpacity
                          key={cardIdx}
                          onPress={() => handleVerify(card)}
                        >
                          <Image
                            source={{ uri: getCardUrl(card.code) }}
                            style={styles.cardImg}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity onPress={reset} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{t.cancel || "ANNULER"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.98)",
    justifyContent: "center",
  },
  container: {
    width: "96%",
    alignSelf: "center",
    backgroundColor: "#000",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 2,
  },
  label: {
    color: "#888",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 11,
    textTransform: "uppercase",
  },
  baseAlert: {
    color: "gold",
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 15,
    fontSize: 12,
  },

  // Player Selection Styles
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  playerBtn: {
    backgroundColor: "#111",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#444",
  },
  playerBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  // History/Tricks Styles
  historyList: { maxHeight: 500 },
  pliContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 10,
  },
  pliLabel: {
    color: "#444",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  cardImg: { width: 60, height: 90, borderRadius: 4 },

  // Total Exposure (Base Audit) Styles
  exposedRow: {
    flexDirection: "row",
    backgroundColor: "#080808",
    marginBottom: 10,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  claimerRow: {
    borderColor: "gold",
    backgroundColor: "rgba(212, 175, 55, 0.05)",
  },
  profileColumn: {
    width: 70,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#222",
    marginRight: 10,
  },
  miniAvatar: { width: 34, height: 34, borderRadius: 17, marginBottom: 4 },
  miniName: { color: "#fff", fontSize: 9, textAlign: "center" },
  claimerBadge: {
    backgroundColor: "gold",
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  claimerBadgeText: { color: "#000", fontSize: 8, fontWeight: "900" },
  cardsColumn: { flex: 1 },
  exposedCardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  exposedCardImg: { width: 42, height: 62, borderRadius: 3 },

  cancelBtn: { marginTop: 20, alignSelf: "center" },
  cancelText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});

export default Modals;
