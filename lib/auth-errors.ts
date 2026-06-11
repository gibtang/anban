/**
 * Map Firebase auth error codes to user-friendly messages.
 */
const errorMap: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/invalid-credential': 'Invalid email or password. Try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed. Try again.',
  'auth/popup-blocked': 'Popup was blocked. Allow popups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
};

export function getFriendlyAuthError(error: unknown): string {
  if (error instanceof Error) {
    // Firebase errors have a code property
    const code = (error as { code?: string }).code;
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    // Check if the message contains a Firebase error code
    for (const [key, msg] of Object.entries(errorMap)) {
      if (error.message.includes(key)) {
        return msg;
      }
    }
    // Return the original message if it's already user-friendly
    if (error.message.length < 100 && !error.message.includes('Firebase')) {
      return error.message;
    }
  }
  return 'Something went wrong. Please try again.';
}
