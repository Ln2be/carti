// sessionService.ts
import { v4 as uuidv4 } from 'uuid';

class SessionService {
  private sessionId: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.initializeSession();
  }

  private initializeSession() {
    // For React Native, use AsyncStorage
    // For web, use localStorage
    try {
      // Try to get existing session
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedSession = localStorage.getItem('carti_session_id');
        const storedUserId = localStorage.getItem('carti_user_id');
        
        if (storedSession && storedUserId) {
          this.sessionId = storedSession;
          this.userId = storedUserId;
        } else {
          this.createNewSession();
        }
      } else {
        // React Native environment
        this.createNewSession();
      }
    } catch (error) {
      console.warn('Failed to access storage, creating new session:', error);
      this.createNewSession();
    }
  }

  private createNewSession() {
    this.sessionId = uuidv4();
    // Generate a user-friendly ID (short, readable)
    this.userId = `user_${Math.random().toString(36).substr(2, 6)}`;
    
    // Store for persistence
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('carti_session_id', this.sessionId);
      localStorage.setItem('carti_user_id', this.userId);
    }
  }

  getSessionId(): string {
    if (!this.sessionId) this.createNewSession();
    return this.sessionId!;
  }

  getUserId(): string {
    if (!this.userId) this.createNewSession();
    return this.userId!;
  }

  // Optional: Reset session (for testing or logout)
  resetSession() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('carti_session_id');
      localStorage.removeItem('carti_user_id');
    }
    this.createNewSession();
  }
}

export const sessionService = new SessionService();