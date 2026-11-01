import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ErpTableName, TeamMember, UserRole } from './types/erp';

const app = initializeApp(firebaseConfig);

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ORG_ID = 'shoukhin-hd';
export const OWNER_EMAIL = 'shamim.usfba@gmail.com';

// Mandatory Firestore Error Handler per firebase-integration-rpc
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sanitize ID to match ^[a-zA-Z0-9_\-]+$ and maxLength 128
export function sanitizeDocId(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

export function makeErpDocId(table: ErpTableName, itemId: string): string {
  return sanitizeDocId(`${table}_${itemId}`);
}

// Clean undefined values recursively so Firestore doesn't reject payloads
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveErpRecord<T extends { id: string }>(table: ErpTableName, item: T): Promise<T> {
  if (!auth.currentUser) throw new Error('Please sign in to save changes.');
  const docId = makeErpDocId(table, item.id);
  const path = `erp_records/${docId}`;
  const docRef = doc(db, 'erp_records', docId);
  const cleanPayload = stripUndefined(item) as Record<string, unknown>;

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        payload: cleanPayload,
        updatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: docId,
        table,
        orgId: ORG_ID,
        payload: cleanPayload,
        updatedBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveErpRecords<T extends { id: string }>(
  table: ErpTableName,
  items: T[],
  existingIds: Set<string>
): Promise<void> {
  if (!auth.currentUser) throw new Error('Please sign in to save changes.');
  const uid = auth.currentUser.uid;
  const chunkSize = 400;

  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of slice) {
      const docId = makeErpDocId(table, item.id);
      const docRef = doc(db, 'erp_records', docId);
      const cleanPayload = stripUndefined(item) as Record<string, unknown>;
      if (existingIds.has(docId)) {
        batch.update(docRef, {
          payload: cleanPayload,
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(docRef, {
          id: docId,
          table,
          orgId: ORG_ID,
          payload: cleanPayload,
          updatedBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'erp_records');
    }
  }
}

export async function deleteErpRecord(table: ErpTableName, itemId: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Please sign in.');
  const docId = makeErpDocId(table, itemId);
  const path = `erp_records/${docId}`;
  try {
    await deleteDoc(doc(db, 'erp_records', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function ensureUserProfile(): Promise<TeamMember | null> {
  const user = auth.currentUser;
  if (!user || !user.email) return null;
  const uid = sanitizeDocId(user.uid);
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    const isOwner = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    if (snap.exists()) {
      const data = snap.data() as TeamMember;
      if (isOwner) {
        const adminRef = doc(db, 'admins', uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid,
            email: user.email.slice(0, 200),
            role: 'owner',
            createdAt: serverTimestamp(),
          });
        }
      }
      return data;
    }

    const defaultRole: UserRole = isOwner ? 'owner' : 'staff';
    const displayName = (user.displayName || user.email.split('@')[0] || 'Team Member').slice(0, 100);
    const newProfile = {
      uid,
      displayName,
      email: user.email.slice(0, 200),
      role: defaultRole,
      active: true,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, newProfile);

    if (isOwner) {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: user.email.slice(0, 200),
        role: 'owner',
        createdAt: serverTimestamp(),
      });
    }

    return {
      uid,
      displayName,
      email: user.email.slice(0, 200),
      role: defaultRole,
      active: true,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateTeamMemberRole(
  targetMember: TeamMember,
  role: UserRole,
  active: boolean
): Promise<void> {
  if (!auth.currentUser) throw new Error('Authentication required');
  const uid = sanitizeDocId(targetMember.uid);
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: targetMember.displayName.slice(0, 100),
      role,
      active,
      updatedBy: auth.currentUser.uid,
      updatedAt: serverTimestamp(),
    });

    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    if (role === 'owner' || role === 'admin') {
      if (adminSnap.exists()) {
        await updateDoc(adminRef, {
          role,
          email: targetMember.email.slice(0, 200),
        });
      } else {
        await setDoc(adminRef, {
          uid,
          email: targetMember.email.slice(0, 200),
          role,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedWorkspaceToken = credential.accessToken;
  }
  return result;
}

export async function connectGoogleWorkspace(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Could not obtain Google Sheets access token. Please try again.');
  }
  cachedWorkspaceToken = credential.accessToken;
  return cachedWorkspaceToken;
}

export async function logoutUser() {
  cachedWorkspaceToken = null;
  return firebaseSignOut(auth);
}
