import { NextResponse } from 'next/server';

const isFirestoreEnabled = (): boolean =>
  (process.env.FIREBASE_USE_FIRESTORE ?? 'false').toLowerCase() === 'true';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'urban-dds',
    status: 'ok',
    timestamp: new Date().toISOString(),
    revision: process.env.K_REVISION ?? null,
    region: process.env.GOOGLE_CLOUD_REGION ?? null,
    nodeEnv: process.env.NODE_ENV ?? 'production',
    firestoreEnabled: isFirestoreEnabled(),
  });
}
