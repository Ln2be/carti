import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface PlayerSeatProps {
  position: 'top' | 'bottom' | 'left' | 'right';
  name: string;
  avatar: string | null;
  isTurn: boolean;
  isLocal: boolean;
  isPending: boolean; // True when Host is currently selecting someone for this seat
  onPress: () => void;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ 
  position, 
  name, 
  avatar, 
  isTurn, 
  isLocal, 
  isPending, 
  onPress 
}) => {
  
  // Dynamic positioning based on the table layout
  const getPositionStyle = () => {
    switch (position) {
      case 'top': return styles.topSeat;
      case 'bottom': return styles.bottomSeat;
      case 'left': return styles.leftSeat;
      case 'right': return styles.rightSeat;
      default: return styles.bottomSeat;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.seatWrapper, getPositionStyle()]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[
        styles.seatContainer,
        isTurn && styles.activeSeatGlow,
        isLocal && styles.localSeatBorder,
        isPending && styles.pendingSeatBorder // Highlights seat during recruitment
      ]}>
        
        {/* AVATAR SECTION */}
        <View style={styles.avatarCircle}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.emptyAvatarBackground}>
               {/* Show a question mark if the host is actively filling this seat */}
              <Text style={styles.placeholderEmoji}>{isPending ? '❓' : '👤'}</Text>
            </View>
          )}
          
          {/* Active Turn Indicator */}
          {isTurn && <View style={styles.turnIndicatorDot} />}
        </View>

        {/* NAME TAG */}
        <View style={[
          styles.nameTag, 
          isLocal && styles.localNameTag,
          isPending && styles.pendingNameTag
        ]}>
          <Text 
            numberOfLines={1} 
            style={[
              styles.playerName, 
              isLocal && styles.localNameText,
              isPending && styles.pendingNameText
            ]}
          >
            {isPending ? "PICKING..." : name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  seatWrapper: { 
    position: 'absolute', 
    zIndex: 10 
  },
  seatContainer: { 
    alignItems: 'center', 
    width: 85,
    padding: 5,
    borderRadius: 15,
  },
  
  // Avatar Styling
  avatarCircle: { 
    width: 54, 
    height: 54, 
    borderRadius: 27, 
    backgroundColor: '#162e21', 
    borderWidth: 2, 
    borderColor: '#2d3748', 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  avatarImage: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover'
  },
  emptyAvatarBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a3a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: { 
    fontSize: 24,
    opacity: 0.6
  },

  // Name Tag Styling
  nameTag: { 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginTop: 6, 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#4a5568' 
  },
  playerName: { 
    color: '#eee', 
    fontSize: 10, 
    fontWeight: '800', 
    textAlign: 'center',
    textTransform: 'uppercase'
  },

  // Visual States
  activeSeatGlow: { 
    borderColor: '#f1c40f',
    borderWidth: 1,
    shadowColor: '#f1c40f', 
    shadowRadius: 12, 
    shadowOpacity: 0.9, 
    elevation: 12 
  },
  localSeatBorder: { 
    borderColor: '#2ecc71',
    borderWidth: 1
  },
  localNameTag: {
    borderColor: '#2ecc71',
    backgroundColor: 'rgba(46, 204, 113, 0.2)'
  },
  localNameText: { 
    color: '#2ecc71' 
  },
  
  // Recruitment State (Pending)
  pendingSeatBorder: { 
    borderColor: '#f1c40f', 
    borderStyle: 'dashed',
    backgroundColor: 'rgba(241, 196, 15, 0.1)'
  },
  pendingNameTag: {
    borderColor: '#f1c40f',
    borderStyle: 'dashed'
  },
  pendingNameText: {
    color: '#f1c40f'
  },

  // UI Indicators
  turnIndicatorDot: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#f1c40f', 
    borderWidth: 2, 
    borderColor: '#000',
    zIndex: 20
  },

  // Layout Positions
  topSeat: { top: 15 },
  bottomSeat: { bottom: 15 },
  leftSeat: { left: 15, top: '42%' },
  rightSeat: { right: 15, top: '42%' },
});

export default PlayerSeat;