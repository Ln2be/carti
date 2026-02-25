import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { verifyBaseClaim } from "../engine";
import { RoomService } from "../services/roomService";

const { width } = Dimensions.get("window");

export interface BaseModuleProps {
  game: any;
  t: any;
}

// --- EXPORT 1: THE BUTTON ---
export const BaseButton: React.FC<BaseModuleProps> = ({ game, t }) => {
  const {
    playerSeat,
    lastTrickWinner,
    phase,
    roomData,
    roomId,
    hands,
    contract,
    illegalMoves,
  } = game;
  const baseStatus = roomData?.gameData?.baseStatus;

  const isWinner =
    Number(lastTrickWinner) === Number(playerSeat) && phase === "PLAYING";
  const isPending = baseStatus === "PENDING";

  const handleBaseClaim = () => {
    if (lastTrickWinner !== playerSeat) return;

    const otherHands = hands.filter((_: any, idx: any) => idx !== playerSeat);
    const trump = contract?.value as string;

    const { badCards } = verifyBaseClaim(hands[playerSeat], otherHands, trump);

    const history = illegalMoves?.[playerSeat] || [];

    RoomService.updateRoom(roomId, {
      "gameData/phase": "BASE_REVIEW",
      "gameData/baseClaimer": playerSeat,
      "gameData/baseStatus": "PENDING",
      "gameData/exposedHands": hands, // Critical for the audit
      [`gameData/illegalMoves/${playerSeat}`]: [...history, badCards],
    });
  };

  return (
    <TouchableOpacity
      style={[styles.baseBtn, (!isWinner || isPending) && styles.disabledBtn]}
      disabled={!isWinner || isPending}
      onPress={handleBaseClaim}
    >
      <Text
        style={[styles.btnText, (!isWinner || isPending) && { color: "#666" }]}
      >
        {isPending ? "..." : t.base || "BASE"}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseBtn: {
    backgroundColor: "#2c3e50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "gold",
  },
  disabledBtn: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    opacity: 0.5,
  },
  btnText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  auditOverlay: {
    ...StyleSheet.absoluteFillObject, // Makes it cover the whole screen
    backgroundColor: "rgba(0,0,0,0.6)", // Dim the background
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999, // Super high zIndex
  },
  auditContainer: {
    width: width * 0.8,
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "gold",
    elevation: 20,
  },
  auditTitle: {
    color: "gold",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  statsText: { color: "#fff", fontSize: 14 },
  gatTrigger: { backgroundColor: "#e74c3c", padding: 10, borderRadius: 6 },
  gatTriggerText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  agreementRow: { borderTopWidth: 1, borderTopColor: "#333", paddingTop: 15 },
  agreeBtn: { backgroundColor: "#27ae60", padding: 15, borderRadius: 8 },
  agreeBtnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  waitingText: { color: "#aaa", textAlign: "center", fontStyle: "italic" },
});
