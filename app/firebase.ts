import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const firebaseInitializationPromise = (async () => {
  if (typeof window !== 'undefined' && !app) {
    const response = await fetch('/api/firebase-config');
    const firebaseConfig = await response.json();
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return { auth };
})();

export { firebaseInitializationPromise };