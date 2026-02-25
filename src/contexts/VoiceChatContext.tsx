import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getMediaDevices, RTCView } from "../components/WebRTCAdapter.native";
import { UserProfile } from "../services/UserService"; // Adjust path as needed
import { useLibraries } from "./LibrariesContext";
import { db } from "../../firebaseConfig";
import {
  ref as dbRef,
  onValue,
  push,
  set as dbSet,
  remove as dbRemove,
} from "firebase/database";


// interface VoiceContextType {
//   // Now accepts userProfile and the list of active UIDs in the room
//   connectToVoice: (roomId: string, userProfile: UserProfile, participants: string[]) => void;
//   isAudioConnected: boolean;
//   remoteStreams: { uid: string; stream: any }[];
//   isMicOpen: boolean;
//   toggleMic: () => void;
//   mutedUids: string[];
//   toggleMutePeer: (uid: string) => void;
// }

interface VoiceContextType {
  // Existing fields
  connectToVoice: (
    roomId: string,
    userProfile: UserProfile,
    participants: string[],
  ) => void;
  isAudioConnected: boolean;
  remoteStreams: { uid: string; stream: any }[];
  isMicOpen: boolean;
  toggleMic: () => void;
  mutedUids: string[];
  toggleMutePeer: (uid: string) => void;

  // NEW: Global Mute Fields
  /** Whether the user has silenced ALL incoming remote audio */
  isGlobalMute: boolean;
  /** Toggle function to silence/unsilence everyone at once */
  toggleGlobalMute: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {

  // We no longer use PeerJS. Use native RTCPeerConnection via the WebRTC adapter.
  const { mediaDevices } = useLibraries();
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [uid: string]: any }>(
    {},
  );

  // const { Peer, mediaDevices, NativeRTCView } = useLibraries();
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  // Inside VoiceProvider.tsx
  const [isGlobalMute, setIsGlobalMute] = useState(false);

  const toggleGlobalMute = () => setIsGlobalMute((prev) => !prev);

  // Requirement: Muted by default
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [mutedUids, setMutedUids] = useState<string[]>([]);

  const peerInstance = useRef<any | null>(null);
  // Map of RTCPeerConnection instances keyed by remote UID
  const pcs = useRef<Record<string, RTCPeerConnection>>({});

  // Listeners refs so we can cleanup DB listeners on disconnect
  const signalListeners = useRef<any[]>([]);
  const candidateListeners = useRef<any[]>([]);

  useEffect(() => {
    const devices = getMediaDevices();
    if (devices) {
      devices
        .getUserMedia({ audio: true, video: false })
        .then((stream: any) => {
          // Force tracks to be disabled initially (Hardware mute)
          stream.getAudioTracks().forEach((t: any) => (t.enabled = false));
          setLocalStream(stream);
        })
        .catch((err: any) => console.warn("Mic initialization error:", err));
    }
    return () => {
      // Cleanup peer connections
      Object.values(pcs.current).forEach((pc) => {
        try {
          pc.close();
        } catch (e) {}
      });
      pcs.current = {};
      // Cleanup DB listeners
      signalListeners.current.forEach((u) => u && u.off && u.off());
      candidateListeners.current.forEach((u) => u && u.off && u.off());
    };
  }, []);

  const toggleMic = () => {
    if (localStream) {
      const newState = !isMicOpen;
      localStream.getAudioTracks().forEach((t: any) => (t.enabled = newState));
      setIsMicOpen(newState);
    }
  };

  const toggleMutePeer = (uid: string) => {
    setMutedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const connectToVoice = (
    roomId: string,
    userProfile: UserProfile,
    participants: string[],
  ) => {
    if (!localStream) return;

    setIsAudioConnected(true);
    console.log("🎤 Voice connection (native) initializing for UID:", userProfile.uid);

    const myUid = userProfile.uid;

    // Listen for incoming signals addressed to me
    const signalsRef = dbRef(db, `webrtc/signals/${myUid}`);
    const signalListener = onValue(signalsRef, async (snap) => {
      const data = snap.val() || {};
      // data structure: { fromUid: { type, sdp } }
      for (const fromUid in data) {
        const msg = data[fromUid];
        if (!msg) continue;

        // Ensure we have a RTCPeerConnection for this peer
        let pc = pcs.current[fromUid];
        if (!pc) {
          pc = createPeerConnection(fromUid);
          pcs.current[fromUid] = pc;
        }

        if (msg.type === "offer") {
          await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
          // create answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // send answer back
          await dbSet(dbRef(db, `webrtc/signals/${fromUid}/${myUid}`), {
            type: "answer",
            sdp: answer.sdp,
          });
        } else if (msg.type === "answer") {
          await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        }

        // remove processed message
        await dbRemove(dbRef(db, `webrtc/signals/${myUid}/${fromUid}`));
      }
    });

    signalListeners.current.push(signalListener);

    // Listen for incoming ICE candidates for me from others
    const candidatesRef = dbRef(db, `webrtc/candidates/${myUid}`);
    const candListener = onValue(candidatesRef, (snap) => {
      const data = snap.val() || {};
      for (const fromUid in data) {
        const candidates = data[fromUid] || [];
        const pc = pcs.current[fromUid];
        if (pc && Array.isArray(candidates)) {
          candidates.forEach((c: any) => {
            try {
              pc.addIceCandidate(c);
            } catch (e) {}
          });
        }
        // cleanup candidates after adding
        dbRemove(dbRef(db, `webrtc/candidates/${myUid}/${fromUid}`)).catch(() => {});
      }
    });
    candidateListeners.current.push(candListener);

    // Create outgoing connections and send offers
    participants.forEach(async (otherUid) => {
      if (otherUid === myUid) return;

      const pc = createPeerConnection(otherUid);
      pcs.current[otherUid] = pc;

      // add local tracks
      try {
        localStream.getTracks().forEach((track: any) => pc.addTrack(track, localStream));
      } catch (e) {
        console.warn("Failed to add local tracks:", e);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // write offer to target's signals path
      await dbSet(dbRef(db, `webrtc/signals/${otherUid}/${myUid}`), {
        type: "offer",
        sdp: offer.sdp,
      });
    });
  };

  // Helper to create RTCPeerConnection and wire events
  const createPeerConnection = (remoteUid: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // push candidate to remote's candidate list under myUid
        const cPath = `webrtc/candidates/${remoteUid}/${userId()}`;
        // store as array under fromUid
        dbSet(dbRef(db, cPath), [event.candidate]).catch(() => {});
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0];
      if (stream) {
        setRemoteStreams((prev) => ({ ...prev, [remoteUid]: stream }));
      }
    };

    return pc;
  };

  const userId = () => {
    // Helper to produce a short id used in candidate paths (matches previous prefixing if needed)
    return `carti_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Format streams for the UI
  const activeStreams = Object.keys(remoteStreams).map((uid) => ({
    uid,
    stream: remoteStreams[uid],
  }));

  return (
    <VoiceContext.Provider
      value={{
        connectToVoice,
        isAudioConnected,
        remoteStreams: activeStreams,
        isMicOpen,
        toggleMic,
        mutedUids,
        toggleMutePeer,
        isGlobalMute,
        toggleGlobalMute,
      }}
    >
      {children}
      {/* Hidden Audio Elements */}
      {/* <div style={{ display: 'none' }}>
        {activeStreams.map((item) => (
          !mutedUids.includes(item.uid) && (
            <RTCView 
              key={item.uid} 
              stream={item.stream} 
              style={{ width: 0, height: 0 }} 
            />
          )
        ))}
      </div> */}

      <div style={{ display: "none" }}>
        {activeStreams.map((item) => {
          // AUDIO LOGIC: Silence if Global Mute is ON OR if this specific UID is muted
          const shouldSilence = isGlobalMute || mutedUids.includes(item.uid);

          if (shouldSilence) return null;

          return (
            <RTCView
              key={item.uid}
              stream={item.stream}
              style={{ width: 0, height: 0 }}
            />
          );
        })}
      </div>
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error("useVoice must be used within VoiceProvider");
  return context;
};
