import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "../components/ui/Icon";
import { Typography } from "../components/ui/Typography";
import { useTheme } from "../contexts/ThemeContext";
import { RoomService } from "../services/roomService";
import { UserProfile, UserService } from "../services/UserService";
import  TRANSLATIONS  from "../translations";
import { ProfileScreen } from "./ProfileScreen";

interface LobbyScreenProps {
  onJoinRoom: (roomId: string) => void;
  userProfile: UserProfile;
}

export default function LobbyScreen({
  onJoinRoom,
  userProfile,
}: LobbyScreenProps) {
  const { colors, spacing, shadows } = useTheme();
  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showProfileId, setShowProfileId] = useState<string | null>(null);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  const t = TRANSLATIONS;

  // Logic - Kept exactly as original
  useEffect(() => {
    const unsubscribe = RoomService.subscribeToLobby((roomsList) => {
      setRooms(roomsList);
      setLoadingRooms(false);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  if (showProfileId) {
    return (
      <ProfileScreen
        viewingUserId={showProfileId}
        userProfile={userProfile}
        onBack={() => setShowProfileId(null)}
      />
    );
  }

  const togglePublicStatus = async () => {
    const newStatus = !isReadyToPlay;
    setIsReadyToPlay(newStatus);
    await UserService.setMatchmakingStatus(userProfile.uid, newStatus);
  };

  const handleCreateRoom = async () => {
    const roomName = newRoomName.trim() || `Room_${Date.now().toString(36)}`;
    setLoading(true);
    try {
      const roomId = await RoomService.createRoom(userProfile, roomName);
      if (roomId) {
        await RoomService.joinOrCreateRoom(roomId, userProfile);
        // onJoinRoom(roomId);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await RoomService.joinAsAudience(roomId, userProfile);
    } catch (error) {
      Alert.alert(t.error, t.joinError);
    }
  };

  const renderRoomItem = ({ item }: { item: any }) => {
    const playersArray = item.players ? Object.values(item.players) : [];
    const playerCount = playersArray.filter(Boolean).length;
    const isFull = playerCount >= 4;

    return (
      <TouchableOpacity
        style={[
          {
            backgroundColor: colors.surface.medium,
            borderRadius: spacing.borderRadius.md,
            marginBottom: spacing.sm,
            borderLeftWidth: 4,
            borderLeftColor: isFull
              ? colors.text.tertiary
              : colors.primary[500],
            ...shadows.md,
          },
        ]}
        onPress={() => handleJoinRoom(item.id)}
      >
        <View style={{ padding: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h2" style={{ fontSize: 18 }}>
              {item.name || "Untitled Room"}
            </Typography>
            <View
              style={{
                backgroundColor: isFull
                  ? colors.overlay.medium
                  : colors.primary[900],
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
                borderRadius: spacing.borderRadius.xs,
              }}
            >
              <Typography
                variant="caption"
                color={isFull ? colors.text.tertiary : colors.primary[500]}
              >
                {isFull ? t.full : t.waiting}
              </Typography>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: spacing.sm,
              alignItems: "center",
            }}
          >
            <Typography variant="body" color={colors.text.secondary}>
              👥 {playerCount} / 4 {t.players}
            </Typography>
            <Typography variant="label" color={colors.accent.cyan}>
              {t.join} ➔
            </Typography>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.dark }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        {/* TOP NAV ROW */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.xl,
          }}
        >
          <Typography variant="h1" color={colors.primary[500]}>
            🎴 {t.lobbyTitle}
          </Typography>
          <TouchableOpacity
            onPress={() => setShowProfileId(userProfile.uid)}
            style={{
              backgroundColor: colors.surface.medium,
              padding: spacing.sm,
              borderRadius: spacing.borderRadius.full,
              borderWidth: 1,
              borderColor: colors.primary[500],
            }}
          >
            <Icon name="User" size="sm" color={colors.primary[500]} />
          </TouchableOpacity>
        </View>

        {/* MATCHMAKING TOGGLE */}
        <TouchableOpacity
          style={[
            {
              backgroundColor: isReadyToPlay
                ? colors.primary[900]
                : colors.surface.medium,
              padding: spacing.md,
              borderRadius: spacing.borderRadius.lg,
              borderWidth: 2,
              borderColor: isReadyToPlay
                ? colors.primary[500]
                : colors.border.medium,
              marginBottom: spacing.xl,
              alignItems: "center",
              ...shadows.glow.green,
            },
            !isReadyToPlay && { shadowOpacity: 0 },
          ]}
          onPress={togglePublicStatus}
        >
          <Typography
            variant="h2"
            color={isReadyToPlay ? colors.primary[500] : colors.text.primary}
          >
            {isReadyToPlay ? `🟢 ${t.readyMatch}` : `📡 ${t.searchMatch}`}
          </Typography>
        </TouchableOpacity>

        {/* CREATE ROOM SECTION */}
        <Typography
          variant="label"
          color={colors.text.tertiary}
          style={{ marginBottom: spacing.xs }}
        >
          {t.createRoom}
        </Typography>
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            marginBottom: spacing.xl,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.surface.medium,
              color: colors.text.primary,
              padding: spacing.md,
              borderRadius: spacing.borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border.light,
            }}
            placeholder={t.roomPlaceholder}
            placeholderTextColor={colors.text.tertiary}
            value={newRoomName}
            onChangeText={setNewRoomName}
          />
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary[700],
              paddingHorizontal: spacing.lg,
              borderRadius: spacing.borderRadius.md,
              justifyContent: "center",
              ...shadows.sm,
            }}
            onPress={handleCreateRoom}
            disabled={loading}
          >
            <Typography variant="label">
              {loading ? "..." : t.createBtn}
            </Typography>
          </TouchableOpacity>
        </View>

        {/* ROOM LIST */}
        <Typography
          variant="label"
          color={colors.text.tertiary}
          style={{ marginBottom: spacing.xs }}
        >
          Available Rooms
        </Typography>

        {loadingRooms ? (
          <ActivityIndicator
            size="large"
            color={colors.primary[500]}
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            renderItem={renderRoomItem}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            ListEmptyComponent={
              <Typography
                style={{ textAlign: "center", marginTop: 40, opacity: 0.5 }}
              >
                {t.noRooms}
              </Typography>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
