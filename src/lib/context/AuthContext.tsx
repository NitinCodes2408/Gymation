"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, StoredUser, AuthSession, ResetToken } from "@/lib/auth/types";
import { AUTH_KEY, USERS_KEY, RESET_TOKENS_KEY, DEFAULT_USERS } from "@/lib/auth/constants";
import { validateEmail, validatePassword, validateGymName, validateName, validatePhone } from "@/lib/auth/validation";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; gymName: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; token?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getUsers(): StoredUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StoredUser[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default seed accounts exist for testing
        const existingEmails = new Set(parsed.map(u => u.email.toLowerCase()));
        let needsUpdate = false;
        const merged = [...parsed];
        for (const defaultUser of DEFAULT_USERS) {
          if (!existingEmails.has(defaultUser.email.toLowerCase())) {
            merged.push(defaultUser);
            needsUpdate = true;
          }
        }
        if (needsUpdate) {
          localStorage.setItem(USERS_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    } catch {
      // Fallback
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: StoredUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getResetTokens(): ResetToken[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(RESET_TOKENS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as ResetToken[];
    } catch {
      return [];
    }
  }
  return [];
}

function saveResetTokens(tokens: ResetToken[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));
}

function persistSession(session: AuthSession, rememberMe: boolean) {
  if (typeof window === "undefined") return;
  const data = JSON.stringify(session);
  if (rememberMe) {
    localStorage.setItem(AUTH_KEY, data);
    sessionStorage.removeItem(AUTH_KEY);
  } else {
    sessionStorage.setItem(AUTH_KEY, data);
    localStorage.removeItem(AUTH_KEY);
  }
}

function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    return null;
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
}

function sessionToUser(session: AuthSession): User {
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    gymName: session.gymName || "Gymation Fitness",
    phone: session.phone,
    role: session.role || "Gym Owner",
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(sessionToUser(session));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const emailError = validateEmail(email);
    if (emailError) return { success: false, error: emailError };
    if (!password) return { success: false, error: "Password is required" };

    const users = getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!found || found.password !== password) {
      return { success: false, error: "Invalid email or password." };
    }

    const session: AuthSession = {
      userId: found.id,
      email: found.email,
      name: found.name,
      gymName: found.gymName || "Gymation Fitness",
      phone: found.phone,
      role: found.role || "Gym Owner",
    };

    persistSession(session, rememberMe);
    setUser(sessionToUser(session));
    return { success: true };
  }, []);

  const register = useCallback(async (data: { name: string; gymName: string; email: string; phone: string; password: string }) => {
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

    const users = getUsers();
    const exists = users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());

    if (exists) {
      return { success: false, error: "An account with this email already exists." };
    }

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      gymName: data.gymName.trim(),
      phone: data.phone.trim(),
      password: data.password,
      role: "Gym Owner",
      createdAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);

    // Automatically create session for the newly registered gym owner
    const session: AuthSession = {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      gymName: newUser.gymName,
      phone: newUser.phone,
      role: newUser.role,
    };
    persistSession(session, true);
    setUser(sessionToUser(session));

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const emailError = validateEmail(email);
    if (emailError) return { success: false, error: emailError };

    const users = getUsers();
    const userExists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!userExists) {
      return { success: false, error: "No account found with this email address." };
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const tokens = getResetTokens().filter((t) => t.email.toLowerCase() !== email.trim().toLowerCase());
    tokens.push({ email: email.trim().toLowerCase(), token, expiresAt });
    saveResetTokens(tokens);

    return { success: true, token };
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const passwordError = validatePassword(newPassword);
    if (passwordError) return { success: false, error: passwordError };

    const tokens = getResetTokens();
    const validToken = tokens.find((t) => t.token === token && t.expiresAt > Date.now());

    if (!validToken) {
      return { success: false, error: "Reset link is invalid or has expired." };
    }

    const users = getUsers();
    const updatedUsers = users.map((u) => {
      if (u.email.toLowerCase() === validToken.email.toLowerCase()) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    saveUsers(updatedUsers);
    saveResetTokens(tokens.filter((t) => t.token !== token));

    return { success: true };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
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
