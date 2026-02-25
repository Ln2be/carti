// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { UserService, UserProfile } from '../services/UserService';

interface ProfileScreenProps {
  viewingUserId: string; // The ID of the profile we are looking at
  userProfile: UserProfile;      // Your own ID (to show 'Follow' or 'Edit')
  onBack: () => void;
}

export const ProfileScreen = ({ viewingUserId, userProfile, onBack }: ProfileScreenProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMe = viewingUserId === userProfile.uid;

  useEffect(() => {
    loadProfile();
  }, [viewingUserId]);

  const loadProfile = async () => {
    setLoading(true);
    const data = await UserService.getProfile(viewingUserId);
    setProfile(data);
    setLoading(false);
  };

  const handleFollow = async () => {
    await UserService.followUser(userProfile.uid, viewingUserId);
    loadProfile(); // Refresh stats
  };

  if (loading) return <ActivityIndicator size="large" style={styles.loader} />;
  if (!profile) return <Text style={styles.errorText}>Profile not found</Text>;

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Main Profile Info */}
      <View style={styles.header}>
        <View>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          <View style={[styles.statusDot, { backgroundColor: profile.presence === 'online' ? '#2ecc71' : '#95a5a6' }]} />
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.presenceText}>{profile.presence === 'online' ? 'Online' : 'Offline'}</Text>
      </View>

      {/* Social Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{profile.followerCount || 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{profile.followingCount || 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      {/* Action Button */}
      {!isMe ? (
        <TouchableOpacity style={styles.followBtn} onPress={handleFollow}>
          <Text style={styles.followBtnText}>Follow Player</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.followBtn, { backgroundColor: '#34495e' }]}>
          <Text style={styles.followBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2d1a', padding: 20 },
  loader: { flex: 1, justifyContent: 'center' },
  backBtn: { marginTop: 40, marginBottom: 20 },
  backText: { color: '#2ecc71', fontSize: 18 },
  header: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#2ecc71' },
  statusDot: { width: 20, height: 20, borderRadius: 10, position: 'absolute', bottom: 5, right: 10, borderWidth: 3, borderColor: '#0f2d1a' },
  username: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 15 },
  presenceText: { color: '#999', fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 30, backgroundColor: '#1a3a2a', padding: 20, borderRadius: 15 },
  statBox: { alignItems: 'center' },
  statNumber: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#2ecc71', fontSize: 14 },
  followBtn: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center' },
  followBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 50 }
});