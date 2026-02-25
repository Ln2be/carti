import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Card } from '../types';
import * as Engine from '../engine';
const SUIT_ICONS: { [key: string]: { label: string; color: string } } = {
  HEARTS: { label: '♥️', color: '#e74c3c' },
  DIAMONDS: { label: '♦️', color: '#e74c3c' },
  CLUBS: { label: '♣️', color: '#fff' },
  SPADES: { label: '♠️', color: '#fff' },
};
const VALUES = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

interface SleepProps {
  visible: boolean;
  setVisible: (v: boolean) => void;
  hands: Card[][];
  illegalMoves: { [key: number]: any[][] };
  playerSeat: number;
  onSleepSuccess: (card: Card) => void;
  onSleepFailure: (accusedId: number, card: Card) => void; // New: Adds card to accuser's illegalMoves
}

const Sleep: React.FC<SleepProps> = ({
  visible,
  setVisible,
  hands,
  illegalMoves,
  playerSeat,
  onSleepSuccess,
  onSleepFailure,
}) => {
  const [step, setStep] = useState<'SUIT' | 'VALUE'>('SUIT');
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);

  const opponentIds = [0, 1, 2, 3].filter(
    (id) => id !== playerSeat && id !== (playerSeat + 2) % 4
  );

  const reset = () => {
    setStep('SUIT');
    setSelectedSuit(null);
    setVisible(false);
  };

  const handleFinalSelection = (val: string) => {
    if (!selectedSuit) return;
    const cardCode = `${val === '10' ? '0' : val}${selectedSuit[0]}`;

    let targetId: number | null = null;
    let targetCard: Card | null = null;

    // 1. Find who has the card
    opponentIds.forEach((id) => {
      const cardInHand = (hands[id] || []).find((c) => c.code === cardCode);
      if (cardInHand) {
        targetId = id;
        targetCard = cardInHand;
      }
    });

    if (!targetCard || targetId === null) {
      Alert.alert('SABOTAGE IMPOSSIBLE', "Cette carte n'est pas dans la main adverse.");
      reset();
      return;
    }

    // 2. CHECK: Is this card inside their illegalMoves history as "evidence"?
    // Recall format: [playedCard, evidenceCard1, evidenceCard2...]
    const opponentCheats = illegalMoves[targetId] || [];
    const isActuallyWithheld = opponentCheats.some(cheatArray => 
      cheatArray.slice(1).some(evidenceCard => evidenceCard.code === cardCode)
    );

    if (isActuallyWithheld) {
      Alert.alert('SABOTAGE RÉUSSI', `Le ${val} de ${selectedSuit} est neutralisé !`);
      onSleepSuccess(targetCard);
    } else {
      Alert.alert('ÉCHEC', "Il n'a pas triché avec cette carte. Vous avez fait une erreur !");
      onSleepFailure(targetId, targetCard);
    }
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>SABOTAGE (SLEEP)</Text>

          {step === 'SUIT' && (
            <View>
              <Text style={styles.label}>Quelle couleur ?</Text>
              <View style={styles.grid}>
                {Object.entries(SUIT_ICONS).map(([suit, info]) => (
                  <TouchableOpacity
                    key={suit}
                    style={[styles.suitBtn, { borderColor: info.color }]}
                    onPress={() => {
                      setSelectedSuit(suit);
                      setStep('VALUE');
                    }}>
                    <Text style={[styles.suitIcon, { color: info.color }]}>{info.label}</Text>
                    <Text style={styles.suitName}>{suit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 'VALUE' && selectedSuit && (
            <View>
              <Text style={styles.label}>Quelle carte exactement ?</Text>
              <ScrollView contentContainerStyle={styles.cardGrid}>
                {VALUES.map((v) => {
                  // Construct code for preview: e.g., 'AH', '0S'
                  const previewCode = `${v === '10' ? '0' : v}${selectedSuit[0]}`;
                  return (
                    <TouchableOpacity
                      key={v}
                      onPress={() => handleFinalSelection(v)}
                      style={styles.cardWrapper}>
                      <Image
                        source={{ uri: Engine.getCardUrl(previewCode) }}
                        style={styles.previewCardImg}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity onPress={reset} style={styles.closeBtn}>
            <Text style={styles.closeText}>ANNULER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  container: {
    width: '85%',
    alignSelf: 'center',
    backgroundColor: '#111',
    padding: 25,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: 'cyan',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  label: { color: '#888', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  btn: {
    padding: 15,
    // borderSize: 1,
    borderColor: '#fff',
    borderWidth: 1,
    minWidth: 100,
  },
  btnWide: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#fff',
    margin: 5,
    width: '40%',
  },
  btnSmall: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#fff',
    margin: 5,
    width: 60,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  closeBtn: { marginTop: 30 },
  closeText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  suitBtn: {
    width: '45%',
    padding: 15,
    margin: 5,
    borderWidth: 1,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  suitIcon: { fontSize: 32 },
  suitName: { color: '#888', fontSize: 10, marginTop: 5 },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  cardWrapper: {
    margin: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewCardImg: {
    width: 60,
    height: 90,
    backgroundColor: '#000',
  },
});

export default Sleep;
