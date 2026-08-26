import { FirebaseError } from "firebase/app";

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Prevents raw technical error codes from leaking into the UI.
 */
export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (!error) {
    return "An unknown error occurred. Please try again.";
  }

  if (error instanceof FirebaseError || (typeof error === "object" && error !== null && "code" in error)) {
    const code = (error as { code: string }).code;

    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/operation-not-allowed":
        return "Email/Password sign-in is not enabled in Firebase Console.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many unsuccessful attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network connection error. Please check your internet connection.";
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled.";
      case "auth/requires-recent-login":
        return "This action requires recent authentication. Please sign in again.";
      case "auth/expired-action-code":
        return "The password reset link has expired. Please request a new one.";
      case "auth/invalid-action-code":
        return "The password reset link is invalid. Please request a new one.";
      case "auth/missing-email":
        return "Please provide an email address.";
      case "auth/missing-password":
        return "Please provide a password.";
      case "auth/user-token-expired":
        return "Your session has expired. Please sign in again.";
      default:
        // If it's another Firebase code, format it cleanly without the "Firebase: " or code prefix
        if ("message" in error && typeof (error as { message: unknown }).message === "string") {
          const rawMessage = (error as { message: string }).message;
          // Strip "Firebase: Error (auth/...)."
          const cleaned = rawMessage.replace(/^Firebase:\s*(Error\s*)?(\(auth\/[^)]+\)\.?\s*)?/i, "").trim();
          if (cleaned) {
            return cleaned;
          }
        }
        return "Authentication failed. Please try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected authentication error occurred.";
}
