import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
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
import { ErpTableName, TeamMember, UserRole, UserStatus, AuditLogEntry } from './types/erp';

const app = initializeApp(firebaseConfig);
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    dbId
  );
} catch {
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ORG_ID = 'shoukhin-hd';
export const OWNER_EMAIL = 'shoukhinhd@gmail.com';

let cachedWorkspaceToken: string | null = null;

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
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
  console.warn(`[Firestore ${operationType} Notice (${path || 'root'})]:`, errInfo.error);
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
    return item;
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
  const cleanEmail = user.email.toLowerCase().trim();
  const isOwner = cleanEmail === OWNER_EMAIL.toLowerCase();
  const displayName = (user.displayName || user.email.split('@')[0] || 'Admin').slice(0, 100);

  const fallbackProfile: TeamMember = {
    uid,
    displayName,
    email: cleanEmail,
    role: 'admin',
    status: isOwner ? 'approved' : 'pending',
    active: isOwner ? true : false,
  };

  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as TeamMember;
      if (isOwner && (!data.active || data.status !== 'approved')) {
        await updateDoc(userRef, {
          role: 'admin',
          status: 'approved',
          active: true,
          updatedAt: new Date().toISOString(),
        });
        data.role = 'admin';
        data.status = 'approved';
        data.active = true;
      }
      return data;
    }

    const now = new Date().toISOString();
    const newProfile: TeamMember = {
      uid,
      displayName,
      email: cleanEmail,
      role: 'admin',
      status: isOwner ? 'approved' : 'pending',
      active: isOwner ? true : false,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
      ...(isOwner ? { approvedAt: now, approvedBy: 'system_bootstrap' } : {}),
    };
    await setDoc(userRef, newProfile);

    if (isOwner) {
      try {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          email: cleanEmail,
          role: 'admin',
          createdAt: serverTimestamp(),
        });
      } catch (adminErr) {
        console.warn('Could not ensure admin doc:', adminErr);
      }
    }

    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
    return fallbackProfile;
  }
}

export async function saveAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<void> {
  const finalEntry: AuditLogEntry = {
    id: entry.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action: entry.action,
    targetEmail: entry.targetEmail,
    targetUid: entry.targetUid,
    targetName: entry.targetName,
    performedBy: entry.performedBy,
    timestamp: entry.timestamp || new Date().toISOString(),
    notes: entry.notes || '',
  };
  try {
    const docRef = doc(db, 'audit_logs', finalEntry.id);
    await setDoc(docRef, finalEntry);
  } catch (err) {
    console.warn('Audit log write notice:', err);
  }
}

export async function approveAdminRequest(
  targetMember: TeamMember,
  performedByEmail: string
): Promise<void> {
  if (!auth.currentUser) throw new Error('Authentication required');
  const uid = sanitizeDocId(targetMember.uid);
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', uid), {
    role: 'admin',
    status: 'approved',
    active: true,
    approvedAt: now,
    approvedBy: performedByEmail,
    updatedBy: auth.currentUser.uid,
    updatedAt: now,
  });

  try {
    const adminRef = doc(db, 'admins', uid);
    await setDoc(adminRef, {
      uid,
      email: targetMember.email,
      role: 'admin',
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Admin record sync notice:', e);
  }

  await saveAuditLog({
    action: 'ADMIN_APPROVED',
    targetEmail: targetMember.email,
    targetUid: targetMember.uid,
    targetName: targetMember.displayName,
    performedBy: performedByEmail,
    notes: 'Approved account as Admin with full ERP access',
  });
}

export async function rejectAdminRequest(
  targetMember: TeamMember,
  performedByEmail: string
): Promise<void> {
  if (!auth.currentUser) throw new Error('Authentication required');
  const uid = sanitizeDocId(targetMember.uid);
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', uid), {
    status: 'rejected',
    active: false,
    rejectedAt: now,
    rejectedBy: performedByEmail,
    updatedBy: auth.currentUser.uid,
    updatedAt: now,
  });

  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch {}

  await saveAuditLog({
    action: 'ADMIN_REJECTED',
    targetEmail: targetMember.email,
    targetUid: targetMember.uid,
    targetName: targetMember.displayName,
    performedBy: performedByEmail,
    notes: 'Rejected admin access request',
  });
}

export async function revokeOrSuspendAdmin(
  targetMember: TeamMember,
  allMembers: TeamMember[],
  performedByEmail: string
): Promise<void> {
  if (!auth.currentUser) throw new Error('Authentication required');
  const activeAdmins = allMembers.filter((m) => m.active && m.status === 'approved');
  if (activeAdmins.length <= 1 && activeAdmins.some((m) => m.uid === targetMember.uid)) {
    throw new Error('Action blocked: Cannot remove or suspend the last active Admin of the workspace.');
  }

  const uid = sanitizeDocId(targetMember.uid);
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', uid), {
    status: 'suspended',
    active: false,
    updatedBy: auth.currentUser.uid,
    updatedAt: now,
  });

  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch {}

  await saveAuditLog({
    action: 'ADMIN_SUSPENDED',
    targetEmail: targetMember.email,
    targetUid: targetMember.uid,
    targetName: targetMember.displayName,
    performedBy: performedByEmail,
    notes: 'Suspended admin account access',
  });
}

export async function requestAdminAccess(
  name: string,
  email: string,
  pass: string
): Promise<{ success: boolean; isBootstrapped: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = cred.user;
  if (!user) throw new Error('Account creation failed');

  try {
    await updateProfile(user, { displayName: name });
  } catch {}

  const uid = sanitizeDocId(user.uid);
  const isBootstrapped = cleanEmail === OWNER_EMAIL.toLowerCase();
  const status: UserStatus = isBootstrapped ? 'approved' : 'pending';
  const active: boolean = isBootstrapped ? true : false;
  const now = new Date().toISOString();

  const userRef = doc(db, 'users', uid);
  const profile: TeamMember = {
    uid,
    displayName: name,
    email: cleanEmail,
    role: 'admin',
    status,
    active,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    ...(isBootstrapped ? { approvedAt: now, approvedBy: 'system_bootstrap' } : {}),
  };

  await setDoc(userRef, profile);

  if (isBootstrapped) {
    try {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: cleanEmail,
        role: 'admin',
        createdAt: serverTimestamp(),
      });
    } catch {}
  }

  await saveAuditLog({
    action: 'ADMIN_REQUESTED',
    targetEmail: cleanEmail,
    targetUid: uid,
    targetName: name,
    performedBy: cleanEmail,
    notes: isBootstrapped ? 'Bootstrapped primary Admin' : 'Submitted new admin access request (Pending)',
  });

  // If pending, sign out immediately so they cannot access protected data
  if (!isBootstrapped) {
    await firebaseSignOut(auth);
  }

  return {
    success: true,
    isBootstrapped,
    message: isBootstrapped
      ? 'Primary Admin access established.'
      : 'Access request submitted! An existing Admin must approve your request before you can sign in.',
  };
}

export async function loginAdminWithEmail(
  email: string,
  pass: string
): Promise<TeamMember> {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const uid = sanitizeDocId(cred.user.uid);
  const isOwner = cleanEmail === OWNER_EMAIL.toLowerCase();

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    if (isOwner) {
      const now = new Date().toISOString();
      const profile: TeamMember = {
        uid,
        displayName: cred.user.displayName || 'Primary Admin',
        email: cleanEmail,
        role: 'admin',
        status: 'approved',
        active: true,
        approvedAt: now,
        approvedBy: 'system_bootstrap',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, profile);
      try {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          email: cleanEmail,
          role: 'admin',
          createdAt: serverTimestamp(),
        });
      } catch {}
      return profile;
    }

    await firebaseSignOut(auth);
    throw new Error('Account record not found. Please request admin access first.');
  }

  const profile = snap.data() as TeamMember;

  if (isOwner && (!profile.active || profile.status !== 'approved')) {
    profile.active = true;
    profile.status = 'approved';
    profile.role = 'admin';
    await updateDoc(userRef, { active: true, status: 'approved', role: 'admin' });
    try {
      await setDoc(doc(db, 'admins', uid), { uid, email: cleanEmail, role: 'admin', createdAt: serverTimestamp() });
    } catch {}
    return profile;
  }

  if (profile.status === 'pending' || !profile.active) {
    await firebaseSignOut(auth);
    throw new Error('Account access requires admin approval. Your request is currently pending review by an active Admin.');
  }

  if (profile.status === 'rejected') {
    await firebaseSignOut(auth);
    throw new Error('Your admin access request has been rejected. Please contact an administrator.');
  }

  if (profile.status === 'suspended') {
    await firebaseSignOut(auth);
    throw new Error('Your admin account has been suspended. Please contact an active workspace administrator.');
  }

  return profile;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, cleanEmail);
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

export function loginDemoOwner(): TeamMember {
  const profile: TeamMember = {
    uid: 'owner_shoukhin_main',
    displayName: 'Shoukhin Home Decor (Admin)',
    email: OWNER_EMAIL,
    role: 'admin',
    status: 'approved',
    active: true,
  };
  localStorage.setItem('shd_demo_user', JSON.stringify(profile));
  return profile;
}
