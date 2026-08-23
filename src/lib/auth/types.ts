export interface User {
  id: string;
  email: string;
  name: string;
  gymName: string;
  phone: string;
  role: string;
}

export interface StoredUser extends User {
  password: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  gymName: string;
  phone: string;
  role: string;
}

export interface ResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Fair" | "Good" | "Strong" | "Very Strong";
  color: string;
  barColor: string;
}

export interface FieldErrors {
  [key: string]: string | undefined;
}
