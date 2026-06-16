import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const firebaseInitializationPromise = (async () => {
  if (typeof window !== 'undefined' && !app) {
    const response = await fetch('/api/firebase-config');

    if (!response.ok) {
      // Server reports Firebase is not configured (503) — surface a clear
      // message instead of letting initializeApp() throw auth/invalid-api-key.
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error ? ` ${body.error}` : '';
        if (Array.isArray(body?.missing) && body.missing.length) {
          detail += ` Missing env vars: ${body.missing.join(', ')}.`;
        }
      } catch {
        /* response had no JSON body */
      }
      throw new Error(`Firebase is not configured on the server.${detail}`);
    }

    const firebaseConfig = await response.json();

    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
      throw new Error('Firebase config returned by the server is incomplete.');
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return { auth };
})();

export { firebaseInitializationPromise };
