import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

const isFirestoreEnabled = (): boolean =>
  (process.env.FIREBASE_USE_FIRESTORE ?? 'false').toLowerCase() === 'true';

const hasExplicitCredentials = (
  projectId: string | undefined,
  clientEmail: string | undefined,
  privateKey: string | undefined
): boolean => Boolean(projectId && clientEmail && privateKey);

const stripOptionalQuotes = (value: string): string => value.replace(/^"|"$/g, '');

const normalizePrivateKey = (privateKey: string): string =>
  stripOptionalQuotes(privateKey).replace(/\\n/g, '\n');

const initializeWithADC = (): App | null => {
  try {
    return initializeApp();
  } catch (error) {
    console.warn(
      `[firebase] ADC initialization failed: ${error instanceof Error ? error.message : 'unknown'}`
    );
    return null;
  }
};

let cachedApp: App | null = null;
let attemptedInitialization = false;

const createAdminApp = (): App | null => {
  if (!isFirestoreEnabled()) {
    return null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  const adcApp = initializeWithADC();
  if (adcApp) {
    return adcApp;
  }

  if (!hasExplicitCredentials(projectId, clientEmail, privateKey)) {
    console.warn(
      '[firebase] FIREBASE_USE_FIRESTORE=true but explicit credentials are incomplete and ADC was unavailable.'
    );
    return null;
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey!),
      }),
    });
  } catch (error) {
    console.warn(
      `[firebase] failed to initialize with explicit credentials. Firestore logging is disabled: ${
        error instanceof Error ? error.message : 'unknown'
      }`
    );
    return null;
  }
};

export const getFirebaseAdminApp = (): App | null => {
  if (cachedApp) {
    return cachedApp;
  }

  if (attemptedInitialization) {
    return null;
  }

  attemptedInitialization = true;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0] ?? null;
    return cachedApp;
  }

  cachedApp = createAdminApp();
  return cachedApp;
};

export const getFirestoreClient = (): Firestore | null => {
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  return getFirestore(app);
};
