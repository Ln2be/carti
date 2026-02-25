// src/services/roomService.ts
import {
  get,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { db } from "../../firebaseConfig";
import { UserProfile, UserService } from "./UserService"

export const RoomService = {
  joinAsAudience: async (roomId: string, profile: UserProfile) => {
    // Add this check at the start of joinAsAudience
    const roomRef = ref(db, `rooms/${roomId}/players`);
    const roomSnap = await get(roomRef);
    const currentPlayers = roomSnap.val() || [];
    const isAlreadyPlaying = currentPlayers.some(
      (p: any) => p?.id === profile.uid,
    );

    if (isAlreadyPlaying) return; // Don't add to audience if they have a seat
    // 1. Check where the user is currently
    const userRef = ref(db, `users/${profile.uid}`);
    const userSnap = await get(userRef);
    const oldRoomId = userSnap.val()?.currentRoomId;

    const updates: any = {};

    // 2. If they were in a different room, clean up the old one
    if (oldRoomId && oldRoomId !== roomId) {
      // Remove from old audience
      updates[`rooms/${oldRoomId}/audience/${profile.uid}`] = null;
      // Remove from old seats (0-3)
      for (let i = 0; i < 4; i++) {
        updates[`rooms/${oldRoomId}/players/${i}`] = null;
      }
      // Remove from old voice
      updates[`rooms/${oldRoomId}/voiceReady/${profile.uid}`] = null;
    }

    // 3. Add to the new audience
    updates[`rooms/${roomId}/audience/${profile.uid}`] = {
      uid: profile.uid,
      name: profile.username,
      avatar: profile.avatar,
      joinedAt: Date.now(),
    };

    // 4. Update user profile
    updates[`users/${profile.uid}/currentRoomId`] = roomId;
    updates[`users/${profile.uid}/isSearching`] = false;

    return update(ref(db), updates);
  },
  /**
   * NEW JOIN LOGIC: Only joins as a spectator (Audience)
   */
  // joinAsAudience: async (roomId: string, profile: UserProfile) => {
  //   const updates: any = {};

  //   // 1. Add to the audience node
  //   updates[`rooms/${roomId}/audience/${profile.uid}`] = {
  //     uid: profile.uid,
  //     name: profile.username,
  //     avatar: profile.avatar,
  //     joinedAt: Date.now()
  //   };

  //   // 2. Set the user's active room so their UI navigates
  //   updates[`users/${profile.uid}/currentRoomId`] = roomId;
  //   updates[`users/${profile.uid}/isSearching`] = false;

  //   return update(ref(db), updates);
  // },

  // Add these to the RoomService object in src/services/roomService.ts

  /**
   * Pulls a spectator from the Audience into an active player seat.
   */
  promoteSpectatorToPlayer: async (
    roomId: string,
    seatIndex: number,
    spectator: any,
  ) => {
    const updates: any = {};

    // 1. Define the player data
    const playerData = {
      id: spectator.uid,
      name: spectator.name,
      avatar: spectator.avatar,
      seat: seatIndex,
      type: "HUMAN",
      joinedAt: Date.now(),
      isReady: true,
    };

    // 2. Add to players array and remove from audience map
    updates[`rooms/${roomId}/gameData/players/${seatIndex}`] = playerData;
    updates[`rooms/${roomId}/audience/${spectator.uid}`] = null;

    return update(ref(db), updates);
  },

  /**
   * Removes a player from a seat and puts them back into the audience.
   */
  demotePlayerToAudience: async (
    roomId: string,
    seatIndex: number,
    player: any,
  ) => {
    const updates: any = {};

    updates[`rooms/${roomId}/gameData/players/${seatIndex}`] = null;
    updates[`rooms/${roomId}/audience/${player.id || player.uid}`] = {
      uid: player.id || player.uid,
      name: player.name,
      avatar: player.avatar,
    };

    return update(ref(db), updates);
  },

  // Add Random Players to the Audience of the Room
  async pullRandomReadyPlayers(roomId: string) {
    // 1. Get everyone who clicked "Join Public Room"
    const willing = await UserService.searchWillingPlayers();

    // 2. Shuffle and pick up to, say, 5 random people
    const selected = willing.sort(() => 0.5 - Math.random()).slice(0, 5);

    const updates: any = {};
    selected.forEach((player) => {
      // Add to audience list
      updates[`rooms/${roomId}/audience/${player.uid}`] = {
        uid: player.uid,
        name: player.username,
        avatar: player.avatar,
      };
      // Force the user's UI to navigate to this room
      updates[`users/${player.uid}/currentRoomId`] = roomId;
      updates[`users/${player.uid}/isSearching`] = false;
    });

    return update(ref(db), updates);
  },

  async signalVoiceReady(roomId: string, profile: UserProfile) {
    const voiceRef = ref(db, `rooms/${roomId}/voiceReady/${profile.uid}`);
    return set(voiceRef, {
      // MUST MATCH VoiceChatContext: carti_ + 10 chars
      peerId: `carti_${profile.uid.substring(0, 10)}`,
      username: profile.username,
      avatar: profile.avatar,
      uid: profile.uid,
      status: "online",
      updatedAt: serverTimestamp(),
    });
  },

  // VOICE EXIT: Uses profile.uid for targeted cleanup
  async signalVoiceLeft(roomId: string, profile: UserProfile) {
    const voiceReadyRef = ref(db, `rooms/${roomId}/voiceReady/${profile.uid}`);
    await remove(voiceReadyRef);
    console.log(`🎤 Voice slot for UID ${profile.uid} removed`);
  },

  subscribeToVoiceReady: (roomId: string, callback: (data: any) => void) => {
    const voiceReadyRef = ref(db, `rooms/${roomId}/voiceReady`);
    return onValue(voiceReadyRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    });
  },

  // JOIN ROOM: Refactored to use UserProfile
  joinOrCreateRoom: async (
    roomId: string,
    profile: UserProfile,
  ): Promise<number> => {
    console.log(`🎯 Attempting join: room=${roomId}, user=${profile.uid}`);

    const roomRef = ref(db, `rooms/${roomId}`);
    let assignedSeat = 0;

    await runTransaction(roomRef, (room) => {
      if (!room) {
        throw new Error(`Room ${roomId} does not exist`);
      }

      if (!room.players) room.players = [];

      // Check if this UID is already in the room
      const existingPlayerIndex = room.players.findIndex(
        (p: any) => p.id === profile.uid,
      );

      if (existingPlayerIndex !== -1) {
        room.players[existingPlayerIndex].name = profile.username;
        assignedSeat = room.players[existingPlayerIndex].seat;
        return room;
      }

      // Seat assignment logic (0-3)
      const occupiedSeats = room.players.map((p: any) => p.seat);
      for (let seat = 0; seat < 4; seat++) {
        if (!occupiedSeats.includes(seat)) {
          assignedSeat = seat;
          break;
        }
      }

      const actualPlayerCount = room.players.filter(Boolean).length;

      if (actualPlayerCount >= 4) throw new Error("Room is full!");

      const newPlayer = {
        id: profile.uid,
        name: profile.username,
        avatar: profile.avatar, // Added avatar for better room display
        seat: assignedSeat,
        type: "HUMAN",
        joinedAt: Date.now(),
      };

      room.players.push(newPlayer);
      room.status = actualPlayerCount === 4 ? "FULL" : "WAITING";

      return room;
    });

    return assignedSeat;
  },

  // CREATE ROOM: Uses hostProfile
  // createRoom: async (hostProfile: UserProfile, roomName: string) => {
  //   const newRoomRef = push(ref(db, "rooms"));
  //   const roomId = newRoomRef.key;

  //   const roomProfile = {
  //     id: roomId,
  //     name: roomName,
  //     owner: hostProfile.uid,
  //     status: "WAITING",
  //     config: {
  //       isPrivate: false,
  //       voiceEnabled: true,
  //       maxPlayers: 4,
  //     },
  //     players: [],
  //     createdAt: serverTimestamp(),
  //   };

  //   await set(newRoomRef, roomProfile);
  //   return roomId;
  // },
  createRoom: async (hostProfile: UserProfile, roomName: string) => {
    const newRoomRef = push(ref(db, "rooms"));

    // Inside createRoom in roomService.ts
    const roomId = newRoomRef.key;

    // 1. Update the user FIRST
    await update(ref(db, `users/${hostProfile.uid}`), {
      currentRoomId: roomId,
      isSearching: false,
    });

    // 2. Then set the room
    await set(newRoomRef, hostProfile);
    // const roomId = newRoomRef.key;

    // Define the host as the first player
    const hostAsPlayer = {
      id: hostProfile.uid,
      name: hostProfile.username,
      avatar: hostProfile.avatar,
      seat: 0, // Host always starts at Seat 0
      type: "HUMAN",
      joinedAt: Date.now(),
      isReady: true,
    };

    const roomProfile = {
      id: roomId,
      name: roomName,
      owner: hostProfile.uid,
      status: "WAITING",
      config: {
        isPrivate: false,
        voiceEnabled: true,
        maxPlayers: 4,
      },
      // Fix: Put the host in the players array immediately
      players: [hostAsPlayer],
      gameData: {
        phase: "IDLE",
        scores: { team1: 0, team2: 0 },
        contestScore: { team1: 0, team2: 0 },
      },
      createdAt: serverTimestamp(),
    };

    await set(newRoomRef, roomProfile);

    // Also update the user's current location immediately
    await update(ref(db, `users/${hostProfile.uid}`), {
      currentRoomId: roomId,
      isSearching: false,
    });

    return roomId;
  },
  // LEAVE ROOM: Uses profile.uid
  leaveRoom: async (roomId: string, profile: UserProfile) => {
    console.log(`🚪 User ${profile.uid} leaving room ${roomId}`);
    const roomRef = ref(db, `rooms/${roomId}`);

    await runTransaction(roomRef, (room) => {
      if (!room || !room.players) return room;
      room.players = room.players.filter((p: any) => p.id !== profile.uid);

      if (room.players.length === 0) {
        room.status = "EMPTY";
      } else {
        room.status = "WAITING";
      }
      return room;
    });
  },

  // UTILITIES
  subscribe: (roomId: string, callback: (data: any) => void) => {
    const roomRef = ref(db, `rooms/${roomId}`);
    return onValue(roomRef, (snapshot) => callback(snapshot.val()));
  },

  subscribeToLobby: (callback: (rooms: any[]) => void) => {
    const roomsRef = ref(db, "rooms");
    return onValue(roomsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const roomsList = Object.entries(data)
        .map(([id, details]: any) => ({
          id,
          ...details,
          players: details.players || [],
        }))
        .filter((room: any) => room.status !== "EMPTY");
      callback(roomsList);
    });
  },

  updateRoom: async (roomId: string, updates: any) => {
    return update(ref(db, `rooms/${roomId}`), updates);
  },
};
