const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
// Required envs: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// For private key, use escaped newlines in .env and we will replace them here
function initializeFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  // Handle escaped newlines in env
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return admin.app();
}

const app = initializeFirebase();
const db = admin.firestore(app);

module.exports = { admin, db };


