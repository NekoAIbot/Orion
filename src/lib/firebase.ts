import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'roles', 'connection_check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function postAuthenticatedAiRequest<T = Record<string, unknown>>(
  endpoint: string,
  payload: Record<string, unknown>,
  activeRole: string
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; requiresAuth?: boolean; error: string }
> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      status: 401,
      requiresAuth: true,
      error:
        'Authentication required: Please sign in with Google (Firebase Auth) as an Independent Learner, School Student, Teacher, or Administrator to use ORION AI services.',
    };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        'X-Orion-Role': activeRole,
        'X-KokoLearn-Role': activeRole,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as T & { error?: string; requiresAuth?: boolean };
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        requiresAuth: response.status === 401 || Boolean(data?.requiresAuth),
        error: data?.error || `Request failed with status ${response.status}`,
      };
    }

    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : 'Network error while contacting AI server.',
    };
  }
}

export {
  doc,
  getDoc,
  collection,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  signInWithPopup,
  signOut,
};

