import admin from "firebase-admin";
import { readFileSync } from "node:fs";

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw?.trim()) {
    try {
      return JSON.parse(raw) as admin.ServiceAccount;
    } catch {
      // fallthrough to path-based config
    }
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path?.trim()) {
    try {
      const txt = readFileSync(path.trim(), "utf8");
      return JSON.parse(txt) as admin.ServiceAccount;
    } catch {
      return null;
    }
  }

  return null;
}

export function getFirebaseAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Firebase admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (single-line JSON) or FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file).",
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  return app.auth().verifyIdToken(idToken);
}

