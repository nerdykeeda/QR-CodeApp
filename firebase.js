const admin = require('firebase-admin');
const firebaseConfig = require('./firebase-config');

// Initialize Firebase Admin using local configuration file
function initializeFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = firebaseConfig.projectId;
  const clientEmail = firebaseConfig.clientEmail;
  let privateKey = firebaseConfig.privateKey;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Please configure firebase-config.js with your Firebase project details');
  }

  // Check if projectId still has placeholder value
  if (projectId === 'your-project-id') {
    throw new Error('Please update firebase-config.js with your actual Firebase project ID');
  }

  // Check if clientEmail still has placeholder value
  if (clientEmail === 'firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com') {
    throw new Error('Please update firebase-config.js with your actual Firebase service account email');
  }

  // Check if privateKey still has placeholder value
  if (privateKey.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) {
    throw new Error('Please update firebase-config.js with your actual Firebase private key');
  }

  // Ensure private key has proper format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Invalid private key format. Make sure it includes BEGIN and END markers');
  }

  // Clean up the private key - remove any extra whitespace
  privateKey = privateKey.trim();

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    if (error.message.includes('ASN.1') || error.message.includes('Too few bytes')) {
      throw new Error('Private key parsing error. Make sure the private key is properly formatted with actual newlines, not \\n characters.');
    }
    throw error;
  }

  return admin.app();
}

const app = initializeFirebase();
const db = admin.firestore(app);

module.exports = { admin, db };


