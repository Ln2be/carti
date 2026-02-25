import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthService } from '../../src/services/authService';
import { UserService, UserProfile } from '../../src/services/UserService';
import { VoiceProvider } from '../../src/contexts/VoiceChatContext';
import LobbyScreen from '../../src/screens/LobbyScreen';
import GameScreen from '../../src/screens/GameScreen';
import { AuthScreen } from '../../src/screens/AuthScreen';
import { OnboardingScreen } from '../../src/screens/OnboardingScreen';
import { db } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // index.tsx (or App.tsx)
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth(async (u) => {
      setLoading(true);
      if (u) {
        setFirebaseUser(u);
        
        // 1. CHECK if profile exists BEFORE doing anything else
        const profile = await UserService.getProfile(u.uid);
        
        if (profile) {
          // 2. VALID USER: Only now we enable presence logic
          UserService.setUserPresence(u.uid); 
          setUserProfile(profile);
        } else {
          // 3. GHOST/NEW USER: Don't set presence. 
          // Force them to Onboarding to create a valid profile first.
          setUserProfile(null);
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- NEW: AUTO-JOIN LISTENER ---
  // This watches the user's data in Firebase. If a host adds them to a room,
  // their currentRoomId changes, and this effect triggers the navigation.
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const userStatusRef = ref(db, `users/${firebaseUser.uid}/currentRoomId`);
    
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const roomFromDb = snapshot.val();
      if (roomFromDb) {
        setRoomId(roomFromDb); // Automatically move the player to the GameScreen
      } else {
        setRoomId(null); // Move back to Lobby if room is cleared
      }
    });

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  const handleOnboardingComplete = async (data: { username: string; avatar: string }) => {
    if (!firebaseUser) return;
    
    setLoading(true);
    const newProfile: Partial<UserProfile> = {
      username: data.username,
      avatar: data.avatar,
      isAnonymous: firebaseUser.isAnonymous,
      followerCount: 0,
      followingCount: 0,
      // createdAt: Date.now(),
    };

    try {
      await UserService.saveProfile(firebaseUser.uid, newProfile);
      const savedProfile = await UserService.getProfile(firebaseUser.uid);
      setUserProfile(savedProfile);
    } catch (e) {
      console.error("Save Profile Error:", e);
    } finally {
      setLoading(false);
    }
  };

  
  // 1. Loading State
  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f2d1a'}}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  // 2. Not Logged In -> Show Auth
  if (!firebaseUser) {
    return <AuthScreen />;
  }

  // 3. Logged in but No Profile -> Show Onboarding
  if (!userProfile) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // 4. Everything Ready -> Show Game
return (
    <>
    <ThemeProvider>
      {roomId ? (
        <VoiceProvider>
          <GameScreen 
            roomId={roomId} 
            userProfile={userProfile} 
            onExit={() => setRoomId(null)} 
          />
        </VoiceProvider>
      ) : (
        <LobbyScreen 
          userProfile={userProfile} 
          onJoinRoom={(id: string) => setRoomId(id)} 
        />
      )}
      </ThemeProvider>
    </>
  );
}