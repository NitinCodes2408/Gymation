"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/config";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase/errors";
import {
  checkGymNameAvailable,
  createOwnerProfile,
  createGym,
  getOwnerGyms,
  type Gym,
} from "@/lib/firebase/gymService";
import type { User } from "@/lib/auth/types";
import {
  validateEmail,
  validatePassword,
  validateGymName,
  validateName,
  validatePhone,
  validateLoginPassword,
} from "@/lib/auth/validation";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; gymName: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function buildGymUser(fbUser: FirebaseUser): Promise<User> {
  const gyms: Gym[] = await getOwnerGyms(fbUser.uid);
  let ownerName = fbUser.displayName || "";
  let ownerPhone = fbUser.phoneNumber || "";

  try {
    const ownerDocSnap = await getDoc(doc(db, "owners", fbUser.uid));
    if (ownerDocSnap.exists()) {
      const oData = ownerDocSnap.data();
      if (!ownerName && oData.name) ownerName = oData.name;
      if (!ownerPhone && oData.phone) ownerPhone = oData.phone;
    }
  } catch {
    // Fallback
  }

  const primaryGym = gyms.length > 0 ? gyms[0] : null;

  return {
    id: fbUser.uid,
    email: fbUser.email || "",
    name: ownerName || (fbUser.email ? fbUser.email.split("@")[0] : "Gym Owner"),
    gymName: primaryGym?.gymName || "Gymation Fitness",
    phone: ownerPhone || primaryGym?.phone || "",
    role: "Gym Owner",
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser) => {
        if (fbUser) {
          const gymUser = await buildGymUser(fbUser);
          setFirebaseUser(fbUser);
          setUser(gymUser);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase auth state listener error:", error);
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const emailError = validateEmail(email);
      if (emailError) return { success: false, error: emailError };

      const passError = validateLoginPassword(password);
      if (passError) return { success: false, error: passError };

      if (!isFirebaseConfigured()) {
        return {
          success: false,
          error: "Firebase is not configured. Please check your environment variables.",
        };
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCredential.user;
        const gymUser = await buildGymUser(fbUser);

        setUser(gymUser);
        setFirebaseUser(fbUser);
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = getFirebaseAuthErrorMessage(err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const register = useCallback(
    async (data: {
      name: string;
      gymName: string;
      email: string;
      phone: string;
      password: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const nameErr = validateName(data.name);
      if (nameErr) return { success: false, error: nameErr };

      const gymErr = validateGymName(data.gymName);
      if (gymErr) return { success: false, error: gymErr };

      const emailErr = validateEmail(data.email);
      if (emailErr) return { success: false, error: emailErr };

      const phoneErr = validatePhone(data.phone);
      if (phoneErr) return { success: false, error: phoneErr };

      const passErr = validatePassword(data.password);
      if (passErr) return { success: false, error: passErr };

      if (!isFirebaseConfigured()) {
        return {
          success: false,
          error: "Firebase is not configured. Please check your environment variables.",
        };
      }

      // Check gym name uniqueness before creating account
      const isAvailable = await checkGymNameAvailable(data.gymName);
      if (!isAvailable) {
        return {
          success: false,
          error: "A gym with this name is already registered.",
        };
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email.trim(),
          data.password
        );

        const uid = userCredential.user.uid;

        // Update display name in Firebase Auth
        if (data.name.trim()) {
          try {
            await updateProfile(userCredential.user, {
              displayName: data.name.trim(),
            });
          } catch (profileErr) {
            console.warn("Failed to set display name on Firebase user:", profileErr);
          }
        }

        // Create owner profile document in /owners/{ownerUID}
        await createOwnerProfile(uid, {
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
        });

        // Create initial gym in /gyms/{gymId} linked to owner UID
        await createGym(uid, {
          gymName: data.gymName.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
        });

        // Explicitly sign out so newly registered user must manually log in
        await signOut(auth);
        setUser(null);
        setFirebaseUser(null);

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = getFirebaseAuthErrorMessage(err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      setFirebaseUser(null);
    }
  }, []);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      const emailError = validateEmail(email);
      if (emailError) return { success: false, error: emailError };

      if (!isFirebaseConfigured()) {
        return {
          success: false,
          error: "Firebase is not configured. Please check your environment variables.",
        };
      }

      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = getFirebaseAuthErrorMessage(err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      const passwordError = validatePassword(newPassword);
      if (passwordError) return { success: false, error: passwordError };

      if (!token) {
        return { success: false, error: "Invalid or missing reset token." };
      }

      if (!isFirebaseConfigured()) {
        return {
          success: false,
          error: "Firebase is not configured. Please check your environment variables.",
        };
      }

      try {
        await confirmPasswordReset(auth, token, newPassword);
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = getFirebaseAuthErrorMessage(err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
