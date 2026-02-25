import React from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";

export const PlayerActionModal = ({
  visible,
  onClose,
  player,
  isOwner,
  isModerator,
  onAction,
  onFollow,
  isMuted,
  onToggleMute,
  t, // <--- Pass the translation object here
  currentUserId, // <--- Pass your own UID here to prevent self-actions
  isAudioConnected,
  remoteStreams = {},
}: any) => {
  if (!player) return null;

  const isBot = player.type === "BOT";
  const isSelf = player.uid === currentUserId;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          <Image source={{ uri: player.avatar }} style={styles.largeAvatar} />
          <Text style={styles.username}>{player.name}</Text>

          <View style={styles.buttonGrid}>
            {/* NEW: Allow Owner/Mod to move THEMSELVES to audience */}
            {(isOwner || isModerator) && isSelf && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.primary[500] }]}
                onPress={() => onAction("TO_AUDIENCE", player)}
              >
                <Text style={styles.btnText}>🪑 {t.toAudience}</Text>
              </TouchableOpacity>
            )}
            {/* VOICE & FOLLOW: Only for Human Players */}
            {!isBot && (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isMuted && { borderColor: "#f1c40f" },
                  ]}
                  onPress={() => onToggleMute(player.id || player.uid)}
                >
                  <Text
                    style={[styles.btnText, isMuted && { color: "#f1c40f" }]}
                  >
                    {isMuted ? `🔊 ${t.unmute}` : `🔇 ${t.mute}`}
                  </Text>
                </TouchableOpacity>

                {!isSelf && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onFollow(player)}
                  >
                    <Text style={styles.btnText}>👤 {t.follow}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ADMIN ACTIONS: Owner/Mod only, and never on yourself */}
            {(isOwner || isModerator) && !isSelf && (
              <>
                {!isBot && (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => onAction("TO_AUDIENCE", player)}
                    >
                      <Text style={styles.btnText}>🪑 {t.toAudience}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => onAction("MOD", player)}
                    >
                      <Text style={styles.btnText}>⭐ {t.makeMod}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* KICK / REMOVE BOT */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.kickBtn]}
                  onPress={() => onAction("KICK", player)}
                >
                  <Text style={styles.kickText}>
                    {isBot ? `🤖 ${t.removeBot}` : `🚫 ${t.kick}`}
                  </Text>
                </TouchableOpacity>

                {/* BAN: Only for humans and only for the Owner */}
                {isOwner && !isBot && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.kickBtn]}
                    onPress={() => onAction("BAN", player)}
                  >
                    <Text style={[styles.kickText, { color: "#c0392b" }]}>
                      🔨 {t.ban}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: "#1a3a2a",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
    borderWidth: 1,
    borderColor: "#2ecc71",
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    backgroundColor: "#0f2d1a",
  },
  username: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 25,
  },
  buttonGrid: { width: "100%" },
  actionBtn: {
    backgroundColor: "#0f2d1a",
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2d3748",
  },
  btnText: { color: "white", fontWeight: "600" },
  kickBtn: { borderColor: "#e74c3c", marginTop: 15 },
  kickText: { color: "#e74c3c", fontWeight: "bold" },
});
