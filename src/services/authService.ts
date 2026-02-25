import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../../firebaseConfig'; // Ensure this points to your Firebase init file


const googleProvider = new GoogleAuthProvider();

// Configure Google Provider (Optional: forces account selection)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const AuthService = {
  /**
   * 1. QUICK START: Anonymous Login
   * Perfect for guests who want to play immediately.
   */
  loginAnonymously: async (): Promise<User | null> => {
    try {
      const credential = await signInAnonymously(auth);
      console.log("👤 Logged in as Guest:", credential.user.uid);
      return credential.user;
    } catch (error) {
      console.error("❌ Anonymous Auth Error:", error);
      throw error;
    }
  },

  /**
   * 2. SOCIAL: Google Login
   * Best for permanent accounts and cross-device sync.
   */
  loginWithGoogle: async (): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("🛡️ Google Login Success:", result.user.displayName);
      return result.user;
    } catch (error: any) {
      console.error("❌ Google Auth Error:", error.code, error.message);
      throw error;
    }
  },

  /**
   * 3. TRADITIONAL: Email/Password SignUp
   */
  signUpWithEmail: async (email: string, pass: string): Promise<User | null> => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      return credential.user;
    } catch (error) {
      console.error("❌ Email SignUp Error:", error);
      throw error;
    }
  },

  /**
   * 4. TRADITIONAL: Email/Password Login
   */
  loginWithEmail: async (email: string, pass: string): Promise<User | null> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      return credential.user;
    } catch (error) {
      console.error("❌ Email Login Error:", error);
      throw error;
    }
  },

  /**
   * 5. SESSION: Listener
   * Use this in your App.tsx to track if the user is logged in.
   */
  subscribeToAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * 6. EXIT: Logout
   */
  logout: async () => {
    try {
      await signOut(auth);
      console.log("🚪 Logged out successfully");
    } catch (error) {
      console.error("❌ Logout Error:", error);
    }
  },

  /**
   * 7. HELPER: Get current user directly
   */
  getCurrentUser: () => auth.currentUser
};