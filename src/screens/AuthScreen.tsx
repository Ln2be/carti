import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { AuthService } from '../services/authService';

export const AuthScreen = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await AuthService.signUpWithEmail(email, password);
        console.log("✅ Email Sign Up Success");
      } else {
        await AuthService.loginWithEmail(email, password);
        console.log("✅ Email Login Success");
      }
    } catch (error: any) {
      console.error("❌ Email Auth Error:", error);
      Alert.alert("Authentication Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (type: 'google' | 'anonymous') => {
    setLoading(true);
    try {
      if (type === 'google') {
        await AuthService.loginWithGoogle();
      } else {
        await AuthService.loginAnonymously();
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.logo}>🃏</Text>
            <Text style={styles.title}>CARTI</Text>
            <Text style={styles.subtitle}>Social Card Gaming</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formHeader}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#718096"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#718096"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Sign Up with Email' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.toggleContainer}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.googleButton]} 
              onPress={() => handleSocialAuth('google')}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.guestButton]} 
              onPress={() => handleSocialAuth('anonymous')}
            >
              <Text style={styles.guestButtonText}>Play as Guest</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            Guest progress is saved only on this device.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2d1a' },
  scrollContent: { padding: 30, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 60, marginBottom: 10 },
  title: { fontSize: 42, fontWeight: 'bold', color: '#2ecc71', letterSpacing: 4 },
  subtitle: { fontSize: 16, color: '#a0aec0' },
  formContainer: { width: '100%', maxWidth: 400, marginBottom: 20 },
  formHeader: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: '#1a3a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  primaryButton: { backgroundColor: '#2ecc71' },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  googleButton: { backgroundColor: '#ffffff' },
  googleButtonText: { color: '#1a202c', fontSize: 16, fontWeight: 'bold' },
  guestButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#2ecc71' },
  guestButtonText: { color: '#2ecc71', fontSize: 16, fontWeight: 'bold' },
  toggleContainer: { marginTop: 15 },
  toggleText: { color: '#a0aec0', textAlign: 'center', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30, width: '100%', maxWidth: 400 },
  line: { flex: 1, height: 1, backgroundColor: '#2d3748' },
  orText: { marginHorizontal: 15, color: '#718096', fontSize: 12, fontWeight: 'bold' },
  buttonContainer: { width: '100%', maxWidth: 400 },
  footerNote: { marginTop: 30, color: '#718096', fontSize: 12, textAlign: 'center' },
});