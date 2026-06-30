import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDnFrxu0a6WMj5z9PpWxGJjNV-i5hiHV2g',
  authDomain: 'vistoria-ubs-app.firebaseapp.com',
  projectId: 'vistoria-ubs-app',
  storageBucket: 'vistoria-ubs-app.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

let app, auth, db;
const isValid =
  !!firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('COLE_') &&
  !firebaseConfig.messagingSenderId.includes('COLE_');

if (isValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

export function initFirebaseAuth(callback) {
  if (!isValid || !auth) return () => {};
  signInAnonymously(auth).catch(e => console.error('Firebase auth error:', e));
  return onAuthStateChanged(auth, callback);
}

export async function salvarFirestore(dados) {
  if (!isValid || !db) return;
  try {
    await addDoc(collection(db, 'vistorias'), {
      ...dados,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Firestore write error:', e);
  }
}
