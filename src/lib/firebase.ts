/**
 * Firebase Data Adapter
 * ─────────────────────
 * This file is intentionally empty until Badru provides the Firebase config keys.
 *
 * WHEN KEYS ARRIVE — do the following:
 *
 * 1. Install the SDK:
 *      npm install firebase
 *
 * 2. Add these to your Vercel environment variables:
 *      NEXT_PUBLIC_FIREBASE_API_KEY
 *      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *      NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *      NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * 3. Replace the placeholder below with the real config:
 *
 *    import { initializeApp, getApps } from "firebase/app";
 *    import { getFirestore } from "firebase/firestore";
 *
 *    const firebaseConfig = {
 *      apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
 *      authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
 *      projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
 *      storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
 *      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
 *      appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
 *    };
 *
 *    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
 *    export const db = getFirestore(app);
 *
 * 4. Ask Badru for the Firestore collection names (e.g. "products", "categories")
 *    and the field names that map to our Product type (see src/types/index.ts).
 *
 * 5. Then update src/lib/api.ts — replace the WooCommerce functions with
 *    Firestore queries. The UI will work with zero changes since it depends
 *    only on the Product type, not on where the data comes from.
 */

export {};
