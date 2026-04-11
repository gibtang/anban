import admin from 'firebase-admin';

let isInitialized = false;

function getAdminApp() {
  if (!isInitialized) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Firebase admin credentials are not configured. Please set FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and FIREBASE_CLIENT_EMAIL environment variables.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    isInitialized = true;
  }

  return admin;
}

export async function verifyIdToken(token: string) {
  const admin = getAdminApp();
  return await admin.auth().verifyIdToken(token);
}
