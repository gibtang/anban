'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  IdTokenResult,
} from 'firebase/auth';
import { firebaseInitializationPromise } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const { auth: firebaseAuth } = await firebaseInitializationPromise;
        setAuth(firebaseAuth);

        if (firebaseAuth) {
          const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            setUser(user);

            // Set or clear cookie based on auth state
            if (user) {
              try {
                const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
                await fetch('/api/auth/set-cookie', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken: idTokenResult.token }),
                });
              } catch (error) {
                console.error('Error setting auth cookie:', error);
              }
            } else {
              // Clear cookie when user signs out
              await fetch('/api/auth/set-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: '' }),
              });
            }

            setLoading(false);
          });

          return () => unsubscribe();
        }
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setLoading(false);
      }
    };

    // Check if auth is disabled
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true') {
      // Create a mock user for development
      const mockUser = {
        uid: 'dev-user',
        email: 'dev@localhost',
        displayName: 'Dev User',
        emailVerified: true,
        isAnonymous: false,
        providerId: 'dev',
        phoneNumber: null,
        photoURL: null,
        providerData: [],
        tenantId: null,
        metadata: {},
        refreshToken: 'dev-refresh-token',
        delete: async () => {},
        getIdToken: async () => 'dev-token',
        getIdTokenResult: async () => ({ token: 'dev-token', signInProvider: 'dev', authTime: new Date().toISOString(), issuedAtTime: new Date().toISOString(), expirationTime: new Date().toISOString(), signInSecondFactor: null, claims: {} }),
        reload: async () => {},
        toJSON: () => ({}),
      } as User;

      setUser(mockUser);
      setLoading(false);
    } else {
      initFirebase();
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not initialized');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not initialized');
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase not initialized');
    await firebaseSignOut(auth);
    // Clear cookie
    try {
      await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: '' }),
      });
    } catch (error) {
      console.error('Error clearing auth cookie:', error);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase not initialized');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
