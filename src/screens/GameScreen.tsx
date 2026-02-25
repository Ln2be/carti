import React, { useState } from "react";
import { useVoice } from "../contexts/VoiceChatContext";
// import * as Localization from "expo-localization";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "../../firebaseConfig";
import { CardHand } from "../../src/components/CardHand";
import GameBoard from "../../src/components/GameBoard";
import Modals from "../../src/components/Modals";
import Sleep from "../../src/components/Sleep";
import { CONTRACTS } from "../../src/constants";
import { useCartiGame } from "../../src/hooks/useCartiGame";
import  TRANSLATIONS  from "../../src/translations";
// The search for random players button
import { InviteModal } from "../../src/components/InviteModal";
import { AudienceBar } from "../components/AudienceBar";
import { BaseAuditOverlay } from "../components/BaseAuditOverlay";
import { BaseButton } from "../components/BaseModule";
import { PlayerActionModal } from "../components/PlayerActionModal";
import { Icon } from "../components/ui/Icon";
import { Typography } from "../components/ui/Typography";
import { useGameScreenActions } from "../hooks/useGameActions";
import { UserProfile } from "../services/UserService";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { spacing } from "../theme/spacing";

// The Languge Part


export default function GameScreen({
  roomId,
  userProfile,
  onExit,
}: {
  roomId: string;
  userProfile: UserProfile;
  onExit: () => void;
}) {
  const t = TRANSLATIONS;

  const game = useCartiGame(roomId, userProfile); // Pass room info
  const gameScreenHook = useGameScreenActions(
    roomId,
    userProfile,
    game,
    t,
    onExit,
  );

  // UI Visibility states
  const [fraudVisible, setFraudVisible] = useState(false);
  const [sleepVisible, setSleepVisible] = useState(false);
  // This controls whether the new Menu Modal is open or closed
  const [controlsVisible, setControlsVisible] = useState(false);
  // const [playerSeat, setPlayerSeat] = useState<number>(0); // Default to player 0
  const playerSeat = game.playerSeat;

  // Add Firebase phase state
  const hands = [0, 1, 2, 3].map((i) => {
    if (!game.hands) return [];
    return game.hands[i] || [];
  });

  // Logic: First bidder cannot pass
  const canPass = !(game.currentPlayer === game.starter);

  // THE SEARCH PLAYER LOGIC
  // --- NEW: SEARCH PLAYER LOGIC ---
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Logic to determine if current user is the host (usually seat 0)
  const isHost = playerSeat === 0;

  // THE VOICE PLACE
  const {
    // connectToVoice,
    isAudioConnected,
    remoteStreams,
    isMicOpen,
    toggleMic,
    // mutedPeers,
    mutedUids,
    toggleMutePeer,
    isGlobalMute,
    toggleGlobalMute,
  } = useVoice();

  // // Get the audience list from Firebase data
  const audience = game.roomData?.audience
    ? Object.values(game.roomData.audience)
    : [];

  const actualPlayerCount = game.players.filter(Boolean).length;

  const PAModal = (
    <PlayerActionModal
      visible={!!gameScreenHook.selectedPlayer}
      player={gameScreenHook.selectedPlayer}
      isOwner={gameScreenHook.isOwner} // userProfile.uid === game.roomData.owner
      isModerator={game.roomData?.moderators?.[userProfile.uid]}
      onClose={() => gameScreenHook.setSelectedPlayer(null)}
      onAction={gameScreenHook.handleAdminAction} // The consolidated function we built
      onFollow={gameScreenHook.handleFollow}
      isMuted={
        gameScreenHook.selectedPlayer
          ? mutedUids.includes(
              gameScreenHook.selectedPlayer.uid ||
                gameScreenHook.selectedPlayer.uid,
            )
          : false
      }
      onToggleMute={(uid: string) => toggleMutePeer(uid)}
      t={t} // Add this
      isAudioConnected={isAudioConnected} // From your useVoice hook
      remoteStreams={remoteStreams} // From your useVoice hook
    />
  );

  // The invite modal
  const IModal = userProfile && (
    <InviteModal
      visible={inviteModalVisible}
      onClose={() => setInviteModalVisible(false)}
      roomId={roomId}
      hostName={gameScreenHook.hostUsername} // This now has a fallback of "Host"
      userProfile={userProfile}
    />
  );

  const SModal = (
    <Sleep
      visible={sleepVisible}
      setVisible={setSleepVisible}
      hands={game.hands}
      illegalMoves={game.illegalMoves}
      playerSeat={game.playerSeat}
      // If the card was truly withheld illegally
      onSleepSuccess={(card) => {
        game.onSleepSuccess(card); // Adds to gameData/sleptCards
        setSleepVisible(false);
      }}
      // If the accuser was wrong (False Accusation)
      onSleepFailure={(targetId, card) => {
        game.onSleepFailure(targetId, card); // Marks the accuser as a cheater
        setSleepVisible(false);
      }}
    />
  );

  const GatModal = (
    // <Modals
    //   fraudVisible={fraudVisible}
    //   setFraudVisible={setFraudVisible}
    //   playedCards={game.playedCards}
    //   illegalMoves={game.illegalMoves}
    //   resolveGatClaim={game.resolveGatClaim}
    //   // NEW PROPS
    //   players={game.players}
    //   playerSeat={game.playerSeat}
    // />
    <Modals
      fraudVisible={fraudVisible}
      setFraudVisible={setFraudVisible}
      playedCards={game.playedCards}
      illegalMoves={game.roomData?.gameData?.illegalMoves || {}} // Ensure it defaults to empty object
      resolveGatClaim={game.resolveGatClaim}
      players={game.players}
      playerSeat={game.playerSeat}
      // NEW PROPS FOR BASE AUDIT
      baseStatus={game.roomData?.gameData?.baseStatus}
      baseClaimer={game.roomData?.gameData?.baseClaimer}
      allHands={game.roomData?.gameData?.exposedHands || {}}
      t={t} // Your localization/translations object
    />
  );

  const GameBoardElement = (
    <GameBoard
      currentPli={game.currentPli}
      currentPlayer={game.currentPlayer} // Local for gameplay
      // firebaseCurrentPlayer={firebaseCurrentPlayer} // Firebase for UI indicator
      contract={game.contract}
      teamScores={game.teamScores}
      players={game.players}
      playerSeat={game.playerSeat}
      t={t}
      // ADD THIS LINE:
      pendingSeat={gameScreenHook.pendingSeat} // Pass this down
      onPlayerPress={gameScreenHook.handlePlayerPress}
      gameData={game.roomData?.gameData}
    />
  );

  const AudiencBarElement = (
    <AudienceBar
      audience={audience}
      isHost={isHost}
      onSelect={gameScreenHook.handleAudienceClick}
      onFindPlayers={gameScreenHook.handleFindPlayers}
      t={t} // Add this
    />
  );

  function handleBaseClaim(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. AUDIENCE BAR (Keep at top) */}
      {AudiencBarElement}

      {/* 2. COMPACT CONTROL BAR */}
      <View style={styles.topActionRow}>
        {/* Existing Actions - only show during PLAYING phase */}
        {game.phase === "PLAYING" && (
          <>
            <TouchableOpacity
              style={[styles.compactBtn, styles.gatBtn]}
              onPress={() => setFraudVisible(true)}
            >
              <Text style={styles.compactBtnText}>{t.gat}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.compactBtn, styles.sleepBtn]}
              onPress={() => setSleepVisible(true)}
            >
              <Text style={styles.compactBtnText}>{t.sleepTitle}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* New Buttons - Always visible or conditional based on your preference */}

        <BaseButton
          game={game} // The logic we wrote earlier
          t={t}
        />

        <TouchableOpacity
          style={[styles.compactBtn, styles.endGameBtn]}
          onPress={() => {
            /* Add your End Game logic here */
            game.endCurrentGame();
          }}
        >
          <Text style={styles.compactBtnText}>END GAME</Text>
        </TouchableOpacity>
      </View>
      {/* 3. DUAL SCORES (SINGLE ROW) */}
      <View style={styles.unifiedScoreRow}>
        {/* TOTAL GAME SCORE (Current Match points) */}
        <View style={styles.scoreHalf}>
          <Text style={styles.scoreLabel}>POINTS</Text>
          <Text style={styles.scoreValue}>
            🏆 {game.teamScores.team1} — {game.teamScores.team2}
          </Text>
        </View>

        <View style={styles.scoreDivider} />

        {/* CONTEST SCORE (Sets won 1-0, etc.) */}
        <View style={styles.scoreHalf}>
          <Text style={styles.scoreLabel}>CONTEST</Text>
          <Text style={styles.scoreValue}>
            ⭐ {game.roomData?.gameData?.contestScore?.team1 || 0} —{" "}
            {game.roomData?.gameData?.contestScore?.team2 || 0}
          </Text>
        </View>
      </View>
      {/* 2. MENU TRIGGER (New Icon Menu) */}
      <View style={{ position: "absolute", top: 55, right: 20, zIndex: 100 }}>
        <TouchableOpacity
          onPress={() => setControlsVisible(true)}
          style={styles.menuIconButton}
        >
          <Icon name="Menu" size="sm" color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {/* 3. BOARD SECTION (Maximized) */}
      <View style={styles.boardContainer}>
        {/* {game.sleptCards && ( */}
        {/* <View style={styles.sleepBadge}> */}
        {/* <Text style={styles.sleepBadgeText}>Sabotage content</Text> */}
        {/* </View> */}
        {/* )} */}
        {GameBoardElement}
      </View>
      {/* 3. The Bottom-most layer (Last rendered = Top layer) */}
      <BaseAuditOverlay game={game} t={t} />

      {/* 4. FOOTER SECTION (Squeezed for Table focus) */}
      <View style={styles.footer}>
        {/* PHASE ACTION ROW (GAT / SLEEP) */}
        {/* {game.phase === "PLAYING" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.gatBtn]}
              onPress={() => setFraudVisible(true)}
            >
              <Text style={styles.btnText}>{t.gat}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.sleepBtn]}
              onPress={() => setSleepVisible(true)}
            >
              <Text style={styles.btnText}>{t.sleepTitle}</Text>
            </TouchableOpacity>
          </View>
        )} */}

        {/* START / DISTRIBUTE BUTTONS */}
        {game.phase === "IDLE" && game.players && actualPlayerCount === 4 && (
          <TouchableOpacity
            style={styles.mainBtn}
            onPress={() => game.startNewGame()}
          >
            <Text style={styles.mainBtnText}>{t.startGame}</Text>
          </TouchableOpacity>
        )}
        {game.phase === "INGAME" && (
          <TouchableOpacity
            style={styles.mainBtn}
            onPress={() => game.startNewRound()}
          >
            <Text style={styles.mainBtnText}>{t.distribute}</Text>
          </TouchableOpacity>
        )}

        {/* BIDDING CONTROLS */}
        {game.phase === "BIDDING" && game.currentPlayer === game.playerSeat && (
          <View style={styles.bidArea}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bidRow}
            >
              {CONTRACTS.map((c, index) => {
                const currentContractIdx = CONTRACTS.findIndex(
                  (item) => item.value === game.contract?.value,
                );
                return index > currentContractIdx ? (
                  <TouchableOpacity
                    key={c.value}
                    style={styles.miniBtn}
                    onPress={() => game.handleBid(c)}
                  >
                    <Text style={styles.miniBtnText}>{c.label}</Text>
                  </TouchableOpacity>
                ) : null;
              })}
            </ScrollView>

            <View style={styles.actionRow}>
              {/* FIXED SECTION: Conditional must wrap the whole button */}
              {canPass && (
                <TouchableOpacity
                  style={[styles.passBtn, !canPass && styles.disabledBtn]}
                  onPress={() => game.handleBid("Pass")}
                  disabled={!canPass}
                >
                  <Text style={styles.actionText}>{t.pass}</Text>
                </TouchableOpacity>
              )}

              {game.contract && game.bidder !== 0 && game.bidder !== 2 && (
                <TouchableOpacity
                  style={styles.coincheBtn}
                  onPress={() => game.handleBid("Coinche")}
                >
                  <Text style={styles.actionText}>{t.coinche}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* THE HAND (Restricted height to prioritize board) */}
        {(game.phase === "BIDDING" || game.phase === "PLAYING") && (
          <View style={styles.squeezedHandWrapper}>
            <CardHand
              hand={
                Array.isArray(hands) && hands[playerSeat]
                  ? hands[playerSeat]
                  : []
              }
              onCardPress={(idx) => {
                if (
                  game.phase === "PLAYING" &&
                  game.currentPlayer === playerSeat &&
                  game.hands[playerSeat]?.length > 0
                ) {
                  game.executePlay(idx);
                }
              }}
            />
          </View>
        )}
      </View>

      {/* 5. NEW ROOM CONTROLS MODAL */}
      {controlsVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.controlModalContent}>
            <Typography
              variant="h2"
              style={{ textAlign: "center", marginBottom: spacing.xl }}
            >
              {t.roomTitle || "Room Controls"}
            </Typography>
            <View style={styles.voiceStatusHeader}>
              <Text style={styles.voiceStatusText}>
                {!isAudioConnected
                  ? `⏳ ${t.connectingVoice || "Connecting..."}`
                  : `✅ ${Object.keys(remoteStreams).length} ${t.othersConnected}`}
              </Text>
            </View>
            <View style={{ gap: spacing.md }}>
              {/* MIC ROW */}
              <TouchableOpacity style={styles.controlRow} onPress={toggleMic}>
                <Typography variant="label" color={colors.text.primary}>
                  {isMicOpen ? t.micOn : t.micOff}
                </Typography>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isMicOpen
                        ? colors.primary[700]
                        : colors.suits.hearts,
                    },
                  ]}
                >
                  <Icon
                    name={isMicOpen ? "Mic" : "MicOff"}
                    size="sm"
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>

              {/* AUDIO ROW */}
              <TouchableOpacity
                style={styles.controlRow}
                onPress={toggleGlobalMute}
              >
                <Typography variant="label" color={colors.text.primary}>
                  Audio System
                </Typography>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      borderWidth: 2,
                      borderColor: isGlobalMute
                        ? colors.suits.hearts
                        : colors.primary[500],
                    },
                  ]}
                >
                  <Icon
                    name={isGlobalMute ? "VolumeX" : "Volume2"}
                    size="sm"
                    color={
                      isGlobalMute ? colors.suits.hearts : colors.primary[500]
                    }
                  />
                </View>
              </TouchableOpacity>

              {/* INVITE ROW */}
              <TouchableOpacity
                style={styles.controlRow}
                onPress={() => {
                  setControlsVisible(false);
                  setInviteModalVisible(true);
                }}
              >
                <Typography variant="label" color={colors.text.primary}>
                  {t.invite}
                </Typography>
                <View
                  style={[
                    styles.iconCircle,
                    { borderWidth: 2, borderColor: colors.accent.cyan },
                  ]}
                >
                  <Icon name="Plus" size="sm" color={colors.accent.cyan} />
                </View>
              </TouchableOpacity>

              {/* LEAVE ROW */}
              <TouchableOpacity
                style={styles.controlRow}
                onPress={() => {
                  setControlsVisible(false);
                  gameScreenHook.leaveRoom();
                }}
              >
                <Typography variant="label" color={colors.suits.hearts}>
                  {t.leave}
                </Typography>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      borderWidth: 2,
                      borderColor: colors.suits.hearts,
                      backgroundColor: "rgba(231, 76, 60, 0.1)",
                    },
                  ]}
                >
                  <Icon name="LogOut" size="sm" color={colors.suits.hearts} />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setControlsVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Typography variant="label">
                {t.close || "Back to Game"}
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODALS LAYER */}
      {GatModal}
      {SModal}
      {IModal}
      {PAModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    backgroundColor: "#2c3e50",
    borderColor: "gold",
    borderWidth: 1,
  },
  disabledBtn: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    opacity: 0.5,
  },
  activeBaseBtn: {
    backgroundColor: "gold",
    shadowColor: "gold",
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  compactBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  unifiedScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  scoreHalf: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  scoreDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scoreLabel: {
    fontSize: 8,
    color: colors.primary[500],
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "monospace",
  },

  // Keep that center square huge!
  boardContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  topActionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.4)", // Darker translucent bar
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 8, // Space between buttons
  },
  compactBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  // compactBtnText: {
  //   color: "#fff",
  //   fontWeight: "bold",
  //   fontSize: 10,
  //   textTransform: "uppercase",
  //   letterSpacing: 0.5,
  // },
  // Color Variants
  gatBtn: {
    backgroundColor: "#c0392b",
    borderColor: "#e74c3c",
  },
  sleepBtn: {
    backgroundColor: "#1a3a3a",
    borderColor: "cyan",
  },
  // baseBtn: {
  //   backgroundColor: colors.surface.medium,
  //   borderColor: colors.primary[500],
  // },
  endGameBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderColor: colors.suits.hearts, // Red border for a "stop" action
  },

  // Ensure the board takes the rest of the screen
  // boardContainer: {
  //   flex: 1,
  //   width: "100%",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  voiceStatusHeader: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.2)",
  },
  voiceStatusText: {
    color: "#2ecc71",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  menuIconButton: {
    backgroundColor: colors.surface.medium,
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
  },
  // boardContainer: {
  //   flex: 1, // Board takes all available center space
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  squeezedHandWrapper: {
    height: 120, // Forces the hand to be small/squeezed
    overflow: "hidden",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  controlModalContent: {
    width: "85%",
    backgroundColor: colors.surface.dark,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary[700],
    ...shadows.glow.green,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 30,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(46, 204, 113, 0.2)", // Light green
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2ecc71",
    marginRight: 10,
  },
  mutedBtn: {
    backgroundColor: "rgba(231, 76, 60, 0.2)", // Light red
    borderColor: "#e74c3c",
  },
  iconText: {
    fontSize: 20,
  },
  headerActions: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    zIndex: 100,
  },
  leaveBtn: {
    backgroundColor: "rgba(231, 76, 60, 0.2)", // Subtle red
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  leaveBtnText: {
    color: "#e74c3c",
    fontWeight: "bold",
    fontSize: 12,
  },
  addPlayerTrigger: {
    backgroundColor: "#2ecc71", // Distinct green color
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: "auto", // This pushes the button to the far right of the bar
    borderWidth: 1,
    borderColor: "#27ae60",
    elevation: 3, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  addPlayerText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  // Voice Control Bar
  voiceControlBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderBottomWidth: 2,
    borderBottomColor: "#2ecc71",
    zIndex: 100,
  },

  voiceButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 100,
    alignItems: "center",
  },

  micActive: {
    backgroundColor: "#27ae60",
    borderColor: "#2ecc71",
  },

  micMuted: {
    backgroundColor: "#e74c3c",
    borderColor: "#c0392b",
  },

  voiceButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },

  voiceStatus: {
    flex: 1,
    marginLeft: 15,
  },

  peerMuteControls: {
    flexDirection: "row",
    marginLeft: 10,
  },

  peerMuteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(52, 152, 219, 0.3)",
    borderWidth: 1,
    borderColor: "#3498db",
    marginHorizontal: 3,
  },

  peerMuted: {
    backgroundColor: "rgba(231, 76, 60, 0.3)",
    borderColor: "#e74c3c",
  },

  peerMuteText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  container: { flex: 1, backgroundColor: "#0f2d1a" },
  // boardContainer: { flex: 1 },
  sleepBadge: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "rgba(0, 255, 255, 0.2)",
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "cyan",
    zIndex: 100,
  },
  sleepBadgeText: { color: "cyan", fontWeight: "bold", fontSize: 13 },
  coincheBadge: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    backgroundColor: "#e74c3c",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 10,
  },
  coincheText: { color: "#fff", fontWeight: "bold", fontSize: 20 },
  footer: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: "center",
    borderWidth: 1,
  },
  // gatBtn: { backgroundColor: "#c0392b", borderColor: "#e74c3c" },
  // sleepBtn: { backgroundColor: "#1a3a3a", borderColor: "cyan" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  mainBtn: {
    backgroundColor: "#27ae60",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 20,
  },
  mainBtnText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  bidArea: { marginBottom: 10 },
  bidRow: { flexDirection: "row", marginBottom: 10 },
  miniBtn: {
    backgroundColor: "#f1c40f",
    padding: 12,
    margin: 4,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  miniBtnText: { fontWeight: "bold", color: "#000" },
  passBtn: {
    backgroundColor: "#7f8c8d",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  coincheBtn: {
    backgroundColor: "#e67e22",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  actionText: { color: "#fff", fontWeight: "bold" },
  // disabledBtn: { opacity: 0.5 },
  handWrapper: { height: 120, marginTop: 10 },
  // Debug panel styles (updated)
  debugPanel: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  debugText: {
    color: "#0af",
    fontSize: 10,
    fontFamily: "monospace",
    marginVertical: 1,
  },
  debugSuccess: {
    color: "#0f0",
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginTop: 3,
  },

  // New Game/End Game button styles
  newGameBtn: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#2980b9",
  },
  newGameBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // endGameBtn: {
  //   backgroundColor: "#e74c3c",
  //   padding: 12,
  //   borderRadius: 10,
  //   alignItems: "center",
  //   marginVertical: 5,
  //   borderWidth: 2,
  //   borderColor: "#c0392b",
  // },
  endGameBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  continueBtn: {
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 5,
    borderWidth: 2,
    borderColor: "#27ae60",
  },
  continueBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  idleControls: {
    marginVertical: 10,
  },
});
