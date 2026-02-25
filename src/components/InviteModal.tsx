import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserProfile, UserService } from '../services/UserService';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  hostName: string;
  userProfile: UserProfile; // Add this so the owner doesn't see themselves
}

export const InviteModal = ({ visible, onClose, roomId, hostName, userProfile }: InviteModalProps) => {
  const [readyPlayers, setReadyPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReadyPlayers = async () => {
    // We only set loading on the first fetch to keep the UI smooth during auto-refreshes
    if (readyPlayers.length === 0) setLoading(true);
    
    try {
      const players = await UserService.searchWillingPlayers();
      // Only show people who aren't you
      setReadyPlayers(players.filter(p => p.uid !== userProfile.uid));
    } catch (error) {
      console.error("Fetch ready players error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchReadyPlayers();
      // Refresh the list every 5 seconds while the modal is open
      const interval = setInterval(fetchReadyPlayers, 5000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const sendInvite = async (user: UserProfile) => {
    try {
      await UserService.sendInvitation(user.uid, {
        roomId,
        hostName,
        roomName: "Cardi Match"
      });
      alert(`Invite sent to ${user.username}!`);
    } catch (error) {
      alert("Failed to send invite.");
    }
  };

  // Pull The player into the room
  const handlePullPlayer = async (user: UserProfile) => {
    try {
      await UserService.addPlayerToRoom(user, roomId);
      // Modal closes once the player is successfully pulled in
      onClose(); 
    } catch (error: any) {
      alert(error.message || "Failed to add player.");
    }
  };


  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Public Players Pool</Text>
            <Text style={styles.subtitle}>Showing users ready to join a room</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2ecc71" style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={readyPlayers}
              keyExtractor={(item) => item.uid}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No players are currently searching for a public room.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.userName}>{item.username}</Text>
                  </View>


                  <TouchableOpacity 
                    style={styles.inviteBtn} 
                    onPress={() => handlePullPlayer(item)}
                  >
                    <Text style={styles.inviteBtnText}>ADD TO GAME</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Back to Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f2d1a', borderRadius: 20, padding: 20, maxHeight: '70%', borderWidth: 1, borderColor: '#2ecc71' },
  header: { marginBottom: 20 },
  title: { color: '#2ecc71', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 4 },
  userRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1a3a2a' 
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ecc71', marginRight: 10 },
  userName: { color: 'white', fontSize: 17, fontWeight: '500' },
  inviteBtn: { backgroundColor: '#2ecc71', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  inviteBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyText: { color: '#555', textAlign: 'center', marginVertical: 30, fontStyle: 'italic' },
  closeBtn: { marginTop: 20, padding: 15, alignItems: 'center', backgroundColor: '#1a3a2a', borderRadius: 10 },
  closeBtnText: { color: '#e74c3c', fontWeight: 'bold' }
});