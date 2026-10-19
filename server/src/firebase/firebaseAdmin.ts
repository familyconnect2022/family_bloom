import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) throw new Error("Missing Firebase Admin environment variables");
if (projectId !== "family-connect-4184f") throw new Error(`Unexpected Firebase project: ${projectId}`);

const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
