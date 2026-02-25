import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Card } from '../types';

interface CardHandProps {
  hand: Card[];
  onCardPress: (index: number) => void;
  legalCards?: number[];
}

export const CardHand: React.FC<CardHandProps> = ({ hand, onCardPress }) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const suitSymbols: Record<string, string> = { 'SPADES': '♠', 'HEARTS': '♥', 'DIAMONDS': '♦', 'CLUBS': '♣' };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handContainer}>
      {hand.map((card, index) => {
        const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
        return (
          <TouchableOpacity key={`${card.code}-${index}`} style={styles.cardWrapper} onPress={() => onCardPress(index)}>
            <View style={[styles.cardFallback, { borderColor: isRed ? '#e74c3c' : '#2c3e50' }]}>
              <Text style={[styles.cardText, { color: isRed ? '#e74c3c' : '#2c3e50' }]}>{card.value === '10' ? '10' : card.value[0]}</Text>
              <Text style={[styles.suitText, { color: isRed ? '#e74c3c' : '#2c3e50' }]}>{suitSymbols[card.suit]}</Text>
            </View>
            {!imageErrors[card.code] && (
              <Image 
                source={{ uri: `https://deckofcardsapi.com/static/img/${card.code}.png` }} 
                style={styles.cardImage} 
                onError={() => setImageErrors(prev => ({ ...prev, [card.code]: true }))}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

export const sortHand = (hand: Card[]): Card[] => {
  const suitOrder = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
  const valueOrder = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'];
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
  });
};

const styles = StyleSheet.create({
  handContainer: { paddingVertical: 10, paddingHorizontal: 15 },
  cardWrapper: { width: 65, height: 95, marginRight: -20, backgroundColor: '#fff', borderRadius: 8, elevation: 5 },
  cardImage: { ...StyleSheet.absoluteFillObject, borderRadius: 8, zIndex: 2 },
  cardFallback: { ...StyleSheet.absoluteFillObject, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, zIndex: 1 },
  cardText: { fontSize: 20, fontWeight: 'bold' },
  suitText: { fontSize: 24 }
});