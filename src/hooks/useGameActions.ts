import { ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { db } from "../../firebaseConfig";
import { useVoice } from "../contexts/VoiceChatContext";
import { verifyBaseClaim } from "../engine";
import { RoomService } from "../services/roomService";
import { UserProfile, UserService } from "../services/UserService";

interface PlayerData {
  id: string;
  name: string;
  seat: number;
  avatar?: string;
  type?: "HUMAN" | "BOT";
}

export const useGameScreenActions = (
  roomId: string,
  userProfile: any,
  game: any,
  t: any,
  onExit: () => void,
) => {
  const isOwner = userProfile?.uid === game.roomData?.owner;

  const handleFindPlayers = async () => {
    if (!isOwner) return; // Guard clause
    try {
      const willing = await UserService.searchWillingPlayers();
      const filtered = willing.filter((u) => u.uid !== userProfile.uid);

      if (filtered.length === 0) {
        Alert.alert(t.lobbyEmpty, t.noPlayersSearching);
        return;
      }

      const luckyOnes = filtered.sort(() => 0.5 - Math.random()).slice(0, 3);

      // 1. Create the update object
      const updates: any = {};

      luckyOnes.forEach((u) => {
        // Use ABSOLUTE paths from the root of the database
        // This allows updating both 'rooms' and 'users' in one call
        updates[`rooms/${roomId}/audience/${u.uid}`] = {
          uid: u.uid,
          name: u.username,
          avatar: u.avatar,
        };

        updates[`users/${u.uid}/currentRoomId`] = roomId;
        updates[`users/${u.uid}/isSearching`] = false; // Stop them from being pulled by others
      });

      // 2. Use the root database reference
      // import { ref, update } from 'firebase/database';
      // import { db } from '../../firebaseConfig';
      await update(ref(db), updates);

      console.log(
        "✅ Successfully pulled players to audience:",
        luckyOnes.map((u) => u.username),
      );
    } catch (e) {
      console.error("Find players error:", e);
      Alert.alert(t.error, t.failedPull);
    }
  };
  /**
   * 2. RECRUIT FROM AUDIENCE
   * Logic to fill a table seat with a Bot or a Spectator.
   */
  const [pendingSeat, setPendingSeat] = useState<number | null>(null);

  const onAudienceSelect = async (selection: any) => {
    if (pendingSeat === null) return;

    const updates: any = {};

    if (selection.type === "BOT") {
      const botId = `bot_${Math.random().toString(36).substr(2, 5)}`;

      // REMOVE "rooms/${roomId}/" from the start of the keys
      updates[`players/${pendingSeat}`] = {
        id: botId,
        uid: botId,
        name: `AI Bot ${pendingSeat + 1}`,
        type: "BOT",
        seat: pendingSeat,
        avatar: `https://robohash.org/${botId}?set=set4`,
        isReady: true,
      };
    } else {
      // REMOVE "rooms/${roomId}/" from the start of the keys
      updates[`players/${pendingSeat}`] = {
        id: selection.uid,
        name: selection.name,
        avatar: selection.avatar,
        type: "HUMAN",
        seat: pendingSeat,
        isReady: true,
      };
      updates[`audience/${selection.uid}`] = null;
    }

    // Debugging log to see exactly what is being sent
    console.log("Sending updates to Firebase:", updates);

    try {
      await RoomService.updateRoom(roomId, updates);
      setPendingSeat(null);
    } catch (error) {
      console.error("Firebase update failed:", error);
    }
  };

  const [selectedPlayer, setSelectedPlayer] = useState<UserProfile | null>(
    null,
  );

  const handleAudienceClick = (selection: any) => {
    // If the owner has clicked an empty seat first (pendingSeat is set)
    if (pendingSeat !== null && isOwner) {
      // SEAT THE PLAYER
      onAudienceSelect(selection);
    } else {
      // SHOW ACTIONS (Ban, Mod, Kick, Follow)
      setSelectedPlayer(selection);
    }
  };

  const playerSeat = game.playerSeat;

  const leaveRoom = async () => {
    console.log(roomId, userProfile.uid);
    if (!roomId || !userProfile?.uid) return;

    const updates: any = {};

    // 1. Remove from seat (FIXED: Added full path)
    updates[`rooms/${roomId}/players/${playerSeat}`] = null;

    // 2. Remove from audience
    updates[`rooms/${roomId}/audience/${userProfile.uid}`] = null;

    // 3. Reset user location
    updates[`users/${userProfile.uid}/currentRoomId`] = null;
    updates[`users/${userProfile.uid}/isSearching`] = false;

    try {
      // CRITICAL: Ensure you are referencing the ROOT (ref(db))
      // so that the paths above are interpreted correctly.
      await update(ref(db), updates);

      // 4. Navigate away
      onExit();
    } catch (e) {
      console.error("Error leaving room:", e);
      // Fallback: If DB update fails, still try to exit the UI
      onExit();
    }
  };

  // Define isModerator by checking if your UID exists in the moderators object
  const isModerator = !!game.roomData?.moderators?.[userProfile?.uid];
  const handleAdminAction = async (
    action: "KICK" | "BAN" | "MOD" | "TO_AUDIENCE",
    targetPlayer: any,
  ) => {
    if (!isOwner && !isModerator) return; // Only authorized users

    const targetUid = targetPlayer.id || targetPlayer.uid;
    const targetSeat = targetPlayer.seat;
    const updates: any = {};

    switch (action) {
      case "TO_AUDIENCE":
        // 1. Clear seat if they were playing
        if (targetSeat !== undefined)
          updates[`rooms/${roomId}/players/${targetSeat}`] = null;
        // 2. Add to audience
        updates[`rooms/${roomId}/audience/${targetUid}`] = {
          uid: targetUid,
          name: targetPlayer.name,
          avatar: targetPlayer.avatar,
        };
        break;

      case "KICK":
        if (targetSeat !== undefined)
          updates[`rooms/${roomId}/players/${targetSeat}`] = null;
        updates[`rooms/${roomId}/audience/${targetUid}`] = null;
        updates[`users/${targetUid}/currentRoomId`] = null; // Teleport to Lobby
        break;

      case "BAN":
        if (targetSeat !== undefined)
          updates[`rooms/${roomId}/players/${targetSeat}`] = null;
        updates[`rooms/${roomId}/audience/${targetUid}`] = null;
        updates[`rooms/${roomId}/banned/${targetUid}`] = true; // Add to block list
        updates[`users/${targetUid}/currentRoomId`] = null;
        break;

      case "MOD":
        updates[`rooms/${roomId}/moderators/${targetUid}`] = true;
        break;
    }

    try {
      await update(ref(db), updates);
      setSelectedPlayer(null); // Close modal
    } catch (e) {
      console.error(`Admin action ${action} failed:`, e);
    }
  };

  const handleFollow = async (targetPlayer: any) => {
    const targetUid = targetPlayer.id || targetPlayer.uid;
    if (!userProfile?.uid || targetUid === userProfile.uid) return;

    const updates = {
      [`users/${userProfile.uid}/following/${targetUid}`]: true,
      [`users/${targetUid}/followers/${userProfile.uid}`]: true,
    };

    await update(ref(db), updates);
    Alert.alert(t.success, `${t.followSuccess} ${targetPlayer.name}`);
  };

  const handlePlayerPress = (playerData: any) => {
    const targetUid = playerData.id || playerData.uid;

    // SCENARIO A: Clicking an EMPTY seat
    if (!targetUid) {
      if (isOwner) {
        // Owner starts the recruitment process for this specific seat
        setPendingSeat(playerData.seat);
        console.log(`🎯 Setting pending seat to: ${playerData.seat}`);
      }
      return;
    }

    // SCENARIO B: Clicking a FILLED seat (or a BOT)
    // We open the Modal for actions (Kick, Ban, Mod, etc.)
    setSelectedPlayer(playerData);
  };

  const hostUsername = game.players
    ? (Object.values(game.players).filter(Boolean) as PlayerData[]) // Remove null holes (seats 1, 2)
        .find((p: any) => p.seat === 0)?.name || "Host"
    : "Host";
  // Change this line:

  // THE VOICE PLACE
  const { connectToVoice } = useVoice();

  // 1. Initial Signal (Run once on mount)
  useEffect(() => {
    if (roomId && userProfile?.uid) {
      RoomService.signalVoiceReady(roomId, userProfile);
    }
    return () => {
      RoomService.signalVoiceLeft(roomId, userProfile);
    };
  }, [roomId]);

  // 2. The Automatic Handshake (Run whenever participants list updates)
  useEffect(() => {
    // Only attempt connection if:
    // - We have the roomId and userProfile
    // - There is at least one OTHER person marked as 'voiceReady' in the database
    const others = game.voiceParticipants.filter(
      (uid: any) => uid !== userProfile.uid,
    );

    if (roomId && userProfile && others.length > 0) {
      console.log("📡 Participants detected, initializing WebRTC handshake...");

      // Pass the live list of everyone who is ready
      connectToVoice(roomId, userProfile, game.voiceParticipants);
    }
  }, [game.voiceParticipants]); // <--- This is the key: it re-runs when Firebase data arrives

  return {
    handleFindPlayers,
    handleAdminAction,
    leaveRoom,
    handleFollow,
    isOwner,
    handleAudienceClick,
    pendingSeat,
    handlePlayerPress,
    hostUsername,
    selectedPlayer,
    setSelectedPlayer,
  };
};
