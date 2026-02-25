// src/services/UserService.ts
import { db } from "../../firebaseConfig";
import {
  get,
  increment,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";

export interface UserProfile {
  uid: string;
  username: string;
  avatar: string;
  isAnonymous: boolean;
  followingCount: number;
  followerCount: number;
  presence: "online" | "offline";
  lastSeen: number;
}

export const UserService = {
  // Add these to the UserService object in src/services/UserService.ts

  /**
   * Fetches all users who have 'isSearching' set to true.
   * These are the candidates the Host can "pull" into their room.
   */
  // searchWillingPlayers: async (): Promise<UserProfile[]> => {
  //   const usersRef = ref(db, 'users');
  //   const snapshot = await get(usersRef);

  //   if (!snapshot.exists()) return [];

  //   const allUsers: any = snapshot.val();
  //   return Object.keys(allUsers)
  //     .map(uid => ({ ...allUsers[uid], uid }))
  //     .filter(user =>
  //       user.presence === 'online' &&
  //       user.isSearching === true
  //       // !user.currentRoomId // Don't pull people already in a game
  //     );
  // },

  /**
   * Clears matchmaking status and room location.
   * Used when kicking a player or when they leave a room.
   */

  setUserPresence: (uid: string, currentRoomId?: string) => {
    const presenceRef = ref(db, `users/${uid}/presence`);
    const connectedRef = ref(db, ".info/connected");

    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const onDisconnectRef = onDisconnect(presenceRef);

        // When offline:
        onDisconnectRef.set("offline");

        // NEW: If they are in a room, remove them from the room on disconnect
        if (currentRoomId) {
          const roomAudienceRef = ref(
            db,
            `rooms/${currentRoomId}/audience/${uid}`,
          );
          onDisconnect(roomAudienceRef).remove();

          // Note: We don't usually auto-kick from a SEAT on disconnect
          // because they might just be reconnecting.
          // We only kick from Audience immediately.
        }

        set(presenceRef, "online");
      }
    });
  },

  joinRoomCleanly: async (newRoomId: string, userProfile: UserProfile) => {
    const userRef = ref(db, `users/${userProfile.uid}`);
    const userSnap = await get(userRef);
    const oldRoomId = userSnap.val()?.currentRoomId;

    const updates: any = {};

    // 1. If they were in an old room, wipe them out of it
    if (oldRoomId && oldRoomId !== newRoomId) {
      // Remove from any potential seat (0-3)
      for (let i = 0; i < 4; i++) {
        updates[`rooms/${oldRoomId}/players/${i}`] = null;
      }
      // Remove from audience
      updates[`rooms/${oldRoomId}/audience/${userProfile.uid}`] = null;
    }

    // 2. Add to the new room audience
    updates[`rooms/${newRoomId}/audience/${userProfile.uid}`] = {
      uid: userProfile.uid,
      username: userProfile.username,
      avatar: userProfile.avatar,
    };

    // 3. Update user's current location
    updates[`users/${userProfile.uid}/currentRoomId`] = newRoomId;

    return update(ref(db), updates);
  },

  clearUserRoomStatus: async (uid: string) => {
    return update(ref(db, `users/${uid}`), {
      currentRoomId: null,
      isSearching: false,
    });
  },

  // The Avatar and Menu related to player
  kickPlayer: async (roomId: string, seatIndex: number, playerUid: string) => {
    const updates: any = {};
    // Remove from the room seat
    updates[`rooms/${roomId}/players/${seatIndex}`] = null;
    // Clear the player's current room so they teleport back to lobby
    updates[`users/${playerUid}/currentRoomId`] = null;

    return update(ref(db), updates);
  },

  toggleFollow: async (
    myUid: string,
    targetUid: string,
    isFollowing: boolean,
  ) => {
    const updates: any = {};
    updates[`users/${myUid}/following/${targetUid}`] = isFollowing
      ? true
      : null;
    updates[`users/${targetUid}/followers/${myUid}`] = isFollowing
      ? true
      : null;

    return update(ref(db), updates);
  },

  // Add a Ready Player to a Room to Play
  addPlayerToRoom: async (player: UserProfile, roomId: string) => {
    const roomRef = ref(db, `rooms/${roomId}/players`);
    const snapshot = await get(roomRef);
    const players = snapshot.val() || [];

    const actualPlayerCount = players.filter(Boolean).length;

    if (actualPlayerCount >= 4) {
      throw new Error("Room is full!");
    }

    const nextSeat = players.length;
    const newPlayerData = {
      uid: player.uid,
      name: player.username,
      avatar: player.avatar,
      seat: nextSeat,
      isReady: true,
    };

    // Update both paths: The Room's list and the Player's current location
    const updates: any = {};
    updates[`rooms/${roomId}/players/${nextSeat}`] = newPlayerData;
    updates[`users/${player.uid}/currentRoomId`] = roomId;
    updates[`users/${player.uid}/isSearching`] = false; // Take them out of the pool

    return update(ref(db), updates);
  },

  searchOnlineUsers: async (query: string): Promise<UserProfile[]> => {
    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const allUsers: any = snapshot.val();
    const queryLower = query.toLowerCase();

    return Object.keys(allUsers)
      .map((uid) => ({ ...allUsers[uid], uid }))
      .filter(
        (user) =>
          user.presence === "online" &&
          user.username.toLowerCase().includes(queryLower) &&
          !user.currentRoomId, // Ensure they aren't already in a room
      )
      .slice(0, 10); // Limit results for performance
  },

  sendInvitation: async (
    targetUid: string,
    inviteData: { roomId: string; hostName: string; roomName: string },
  ) => {
    const inviteRef = ref(db, `invitations/${targetUid}`);
    return set(inviteRef, {
      ...inviteData,
      timestamp: serverTimestamp(),
      status: "pending",
    });
  },

  // Toggle the "Join a Public Room" status
  setMatchmakingStatus: async (uid: string, isSearching: boolean) => {
    return update(ref(db, `users/${uid}`), {
      isSearching: isSearching,
      lastStatusUpdate: serverTimestamp(),
    });
  },

  // Search ONLY for users who clicked "Join a Public Room"
  searchWillingPlayers: async (): Promise<UserProfile[]> => {
    const usersRef = ref(db, "users");
    // In production, you'd use a Firebase Index for "isSearching"
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const allUsers: any = snapshot.val();
    return Object.keys(allUsers)
      .map((uid) => ({ ...allUsers[uid], uid }))
      .filter(
        (user) => user.presence === "online" && user.isSearching === true,
      );
  },

  getProfile: async (uid: string): Promise<UserProfile | null> => {
    const snapshot = await get(ref(db, `users/${uid}`));
    return snapshot.exists() ? snapshot.val() : null;
  },

  saveProfile: async (uid: string, data: any) => {
    return update(ref(db, `users/${uid}`), { ...data, uid });
  },

  // src/services/UserService.ts
  // setUserPresence: (uid: string) => {
  //   const statusRef = ref(db, `users/${uid}/presence`);
  //   const lastSeenRef = ref(db, `users/${uid}/lastSeen`);
  //   const connectedRef = ref(db, ".info/connected");

  //   onValue(connectedRef, (snap) => {
  //     if (snap.val() === true) {
  //       // When app closes/crashes, set to offline
  //       onDisconnect(statusRef).set("offline");
  //       onDisconnect(lastSeenRef).set(serverTimestamp());

  //       // Set to online only for this specific UID
  //       set(statusRef, "online");
  //       set(lastSeenRef, serverTimestamp());
  //     }
  //   });
  // },

  // --- SOCIAL LISTS ---
  followUser: async (myUid: string, targetUid: string) => {
    const updates: any = {};
    updates[`users/${myUid}/following/${targetUid}`] = true;
    updates[`users/${myUid}/followingCount`] = increment(1);
    updates[`users/${targetUid}/followers/${myUid}`] = true;
    updates[`users/${targetUid}/followerCount`] = increment(1);
    return update(ref(db), updates);
  },

  getSocialList: async (uid: string, type: "following" | "followers") => {
    const snap = await get(ref(db, `users/${uid}/${type}`));
    if (!snap.exists()) return [];
    // Fetch profiles for each UID in the list
    const uids = Object.keys(snap.val());
    const profiles = await Promise.all(
      uids.map((id) => UserService.getProfile(id)),
    );
    return profiles.filter((p) => p !== null);
  },
};
