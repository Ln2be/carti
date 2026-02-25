import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  ScrollView
} from 'react-native';

// Organized Seeds by Category
const AVATAR_DATA = {
  male: [
    'Felix', 'Bibi', 'Jack', 'Oliver', 'George', // Young & Middle
    'Alexander', 'Robert', 'Milo', 'Thomas', 'Pat' // Middle & Old
  ],
  female: [
    'Aneka', 'Caitlin', 'Zoe', 'Sarah', 'Tania', // Young & Middle
    'Kim', 'Vivian', 'Lilly', 'Jude', 'Nala'     // Middle & Old
  ]
};

const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;

export const OnboardingScreen = ({ onComplete }: { onComplete: (data: any) => void }) => {
  const [step, setStep] = useState(1); // 1: Gender, 2: Avatar/Name
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [name, setName] = useState('');
  const [selectedSeed, setSelectedSeed] = useState('');

  const handleGenderSelect = (selected: 'male' | 'female') => {
    setGender(selected);
    setSelectedSeed(AVATAR_DATA[selected][0]); // Set default avatar for that gender
    setStep(2);
  };

  const renderAvatarItem = ({ item }: { item: string }) => {
    const isSelected = selectedSeed === item;
    return (
      <TouchableOpacity 
        onPress={() => setSelectedSeed(item)}
        style={[styles.avatarWrapper, isSelected && styles.selectedWrapper]}
      >
        <Image source={{ uri: getAvatarUrl(item) }} style={styles.avatarImage} />
      </TouchableOpacity>
    );
  };

  if (step === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Carti</Text>
        <Text style={styles.subtitle}>Choose your character type</Text>
        
        <View style={styles.genderRow}>
          <TouchableOpacity style={styles.genderBtn} onPress={() => handleGenderSelect('male')}>
            <Text style={styles.genderEmoji}>👨</Text>
            <Text style={styles.btnText}>Male</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.genderBtn} onPress={() => handleGenderSelect('female')}>
            <Text style={styles.genderEmoji}>👩</Text>
            <Text style={styles.btnText}>Female</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setStep(1)} style={styles.backLink}>
        <Text style={styles.backText}>← Change Gender</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Refine Your Look</Text>
      
      <View style={styles.gridContainer}>
        <FlatList
          data={gender ? AVATAR_DATA[gender] : []}
          renderItem={renderAvatarItem}
          keyExtractor={(item) => item}
          numColumns={5}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <View style={styles.inputSection}>
        <TextInput 
          style={styles.input} 
          placeholder="Enter Your Display Name" 
          placeholderTextColor="#999"
          value={name} 
          onChangeText={setName} 
          maxLength={15}
        />

        <TouchableOpacity 
          style={[styles.btn, !name.trim() && styles.btnDisabled]} 
          disabled={!name.trim()}
          onPress={() => onComplete({ 
            username: name, 
            avatar: getAvatarUrl(selectedSeed),
            gender: gender 
          })}
        >
          <Text style={styles.btnText}>Start Playing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2d1a', paddingHorizontal: 20, paddingTop: 80 },
  title: { color: '#2ecc71', fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 40, marginTop: 10 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  genderBtn: { backgroundColor: '#1a3a2a', padding: 30, borderRadius: 20, alignItems: 'center', width: '45%', borderWidth: 1, borderColor: '#2d3748' },
  genderEmoji: { fontSize: 50, marginBottom: 10 },
  gridContainer: { height: 200, marginBottom: 30, marginTop: 20 },
  listContent: { alignItems: 'center' },
  avatarWrapper: { padding: 5, margin: 5, borderRadius: 35, borderWidth: 2, borderColor: 'transparent' },
  selectedWrapper: { borderColor: '#2ecc71', backgroundColor: '#2ecc7133' },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  backLink: { marginBottom: 20 },
  backText: { color: '#888', fontSize: 14 },
  inputSection: { flex: 1 },
  input: { 
    backgroundColor: '#1a3a2a', 
    color: 'white', 
    padding: 18, 
    borderRadius: 12, 
    fontSize: 18, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d3748'
  },
  btn: { backgroundColor: '#2ecc71', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});