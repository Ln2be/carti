import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { Contract, PliEntry } from "../types";
import { Icon } from "./ui/Icon";
import { Typography } from "./ui/Typography";

const { width, height } = Dimensions.get("window");

const CENTER_STAGE_SIZE = Math.min(width * 0.75, height * 0.35);
const CARD_WIDTH = CENTER_STAGE_SIZE * 0.28;
const CARD_HEIGHT = CARD_WIDTH * 1.4;
const PLAYER_AVATAR_SIZE = 50;

interface GameBoardProps {
  currentPli: PliEntry[];
  currentPlayer: number;
  contract: Contract | null;
  teamScores: { team1: number; team2: number };
  players?: any[];
  playerSeat: number;
  onPlayerPress: (player: any) => void;
  pendingSeat?: number | null;
  t: any;
  gameData: any;
}

// Helper to calculate position based on seat orientation
const getSeatContainerStyle = (
  position: "top" | "bottom" | "left" | "right",
): ViewStyle => {
  const margin = 15;
  switch (position) {
    case "top":
      return { top: -(PLAYER_AVATAR_SIZE + margin), alignSelf: "center" };
    case "bottom":
      return { bottom: -(PLAYER_AVATAR_SIZE + margin), alignSelf: "center" };
    case "left":
      return {
        left: -(PLAYER_AVATAR_SIZE + margin),
        top: "50%",
        marginTop: -PLAYER_AVATAR_SIZE / 2,
      };
    case "right":
      return {
        right: -(PLAYER_AVATAR_SIZE + margin),
        top: "50%",
        marginTop: -PLAYER_AVATAR_SIZE / 2,
      };
    default:
      return {};
  }
};

const BiddingBubble = ({ bid }: { bid: string }) => (
  <View style={styles.bidBubble}>
    <Text style={styles.bidText} numberOfLines={1}>
      {bid}
    </Text>
  </View>
);

const PlayerSeat: React.FC<{
  name: string;
  avatar: string | null;
  isTurn: boolean;
  isLocal: boolean;
  isPending: boolean;
  onPress: () => void;
}> = ({ name, avatar, isTurn, isLocal, isPending, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.seatClickArea}
    >
      <View
        style={[
          styles.avatarCircle,
          isTurn && { borderColor: colors.accent.gold, borderWidth: 3 },
          isLocal && { borderColor: colors.primary[500], borderWidth: 2 },
        ]}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <Icon
            name={isPending ? "Plus" : "User"}
            size="sm"
            color={colors.text.tertiary}
          />
        )}
      </View>
      <View style={styles.nameTag}>
        <Typography
          variant="caption"
          numberOfLines={1}
          style={styles.playerName}
        >
          {name}
        </Typography>
      </View>
    </TouchableOpacity>
  );
};

const GameBoard: React.FC<GameBoardProps> = ({
  currentPli,
  currentPlayer,
  contract,
  gameData,
  players = [],
  playerSeat,
  onPlayerPress,
  pendingSeat,
  t,
}) => {
  // Extract phase and coinche from gameData
  const phase = gameData?.phase || "IDLE";
  const isCoinched = gameData?.isCoinched || false;
  const playerBids = gameData?.playerBids || {};

  const getCardPosition = (actualSeat: number): ViewStyle => {
    const rotationOffset = (4 - playerSeat) % 4;
    const rotatedIdx = (actualSeat + rotationOffset) % 4;
    const cardPositions: ViewStyle[] = [
      { bottom: 15, alignSelf: "center" },
      { right: 15, top: "50%", marginTop: -CARD_HEIGHT / 2 },
      { top: 15, alignSelf: "center" },
      { left: 15, top: "50%", marginTop: -CARD_HEIGHT / 2 },
    ];
    return cardPositions[rotatedIdx];
  };

  const getPlayerAtPosition = (actualSeat: number) => {
    const rotationOffset = (4 - playerSeat) % 4;
    const rotatedPosition = (actualSeat + rotationOffset) % 4;
    const positions: ("bottom" | "right" | "top" | "left")[] = [
      "bottom",
      "right",
      "top",
      "left",
    ];
    const player = players ? players[actualSeat] : null;

    return {
      position: positions[rotatedPosition],
      name: player?.name || (pendingSeat === actualSeat ? t.picking : t.empty),
      avatar: player?.avatar || null,
      isLocal: actualSeat === playerSeat,
      isTurn: currentPlayer === actualSeat,
      isPending: pendingSeat === actualSeat,
      rawData: player ? { ...player, seat: actualSeat } : { seat: actualSeat },
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.gameArea}>
        <View style={[styles.centerStage, shadows.md]}>
          {/* PHASE 2: Final contract display during PLAYING phase */}
          {phase === "PLAYING" && contract && (
            <View style={styles.finalContractBadge}>
              <Text style={styles.contractText}>
                {contract.label} {isCoinched ? "🔥" : ""}
              </Text>
            </View>
          )}

          <View style={styles.feltSurface}>
            {currentPli.map((entry: PliEntry) => (
              <View
                key={entry.player}
                style={[styles.cardWrapper, getCardPosition(entry.player)]}
              >
                <Image
                  source={{
                    uri: `https://deckofcardsapi.com/static/img/${entry.card.code}.png`,
                  }}
                  style={styles.cardImg}
                />
              </View>
            ))}
          </View>

          {/* PLAYER SEATS & BID BUBBLES */}
          {[0, 1, 2, 3].map((seatIdx) => {
            const data = getPlayerAtPosition(seatIdx);
            const bid = playerBids[seatIdx];

            return (
              <View
                key={seatIdx}
                style={[
                  styles.seatWrapper,
                  getSeatContainerStyle(data.position),
                ]}
              >
                {/* PHASE 1: Show individual bids only during BIDDING */}
                {phase === "BIDDING" && bid && <BiddingBubble bid={bid} />}

                <PlayerSeat
                  {...data}
                  onPress={() => onPlayerPress(data.rawData)}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerStage: {
    width: CENTER_STAGE_SIZE,
    height: CENTER_STAGE_SIZE,
    backgroundColor: "#1a472a",
    borderRadius: 16,
    borderWidth: 6,
    borderColor: "#3d2b1f",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  feltSurface: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  seatWrapper: {
    position: "absolute",
    alignItems: "center",
    width: 80,
    zIndex: 10,
  },
  seatClickArea: {
    alignItems: "center",
  },
  avatarCircle: {
    width: PLAYER_AVATAR_SIZE,
    height: PLAYER_AVATAR_SIZE,
    borderRadius: PLAYER_AVATAR_SIZE / 2,
    backgroundColor: "#2c3e50",
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  nameTag: {
    marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  playerName: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
  },
  cardWrapper: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardImg: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    resizeMode: "stretch",
  },
  // NEW STYLES
  bidBubble: {
    backgroundColor: colors.surface.medium,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginBottom: 4, // Sits right above the avatar
    minWidth: 40,
    alignItems: "center",
    ...shadows.sm,
  },
  bidText: {
    color: colors.accent.gold,
    fontSize: 9,
    fontWeight: "bold",
  },
  finalContractBadge: {
    position: "absolute",
    top: -20, // Floating slightly above the center square
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.primary[500],
    zIndex: 100,
  },
  contractText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default GameBoard;
