/**
 * session.js — Firebase Auth session (email + password)
 */

import { auth, db } from '../utils/db.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from 'firebase/firestore';

class Session {
  constructor() {
    this.user = null;
  }

  async init() {
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, async fbUser => {
        unsub();
        if (!fbUser) { this.user = null; resolve(null); return; }
        const island = await this._getIsland(fbUser.uid);
        this.user = {
          uid:          fbUser.uid,
          email:        fbUser.email,
          island_id:    island?.id    ?? null,
          island_label: island?.label ?? null,
        };
        resolve(this.user);
      });
    });
  }

  async signIn(email, password, islandName) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await this._loadUser(result.user);
      return { error: null };
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        return this._register(email, password, islandName);
      }
      return { error: e };
    }
  }

  async _register(email, password, islandName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await this._ensureIsland(result.user, islandName || 'island');
      await this._loadUser(result.user);
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  }

  async _loadUser(fbUser) {
    const island = await this._getIsland(fbUser.uid);
    this.user = {
      uid:          fbUser.uid,
      email:        fbUser.email,
      island_id:    island?.id    ?? null,
      island_label: island?.label ?? null,
    };
  }

  async signOut() {
    await signOut(auth);
    this.user = null;
  }

  isAuthenticated() {
    return this.user !== null;
  }

  async _getIsland(uid) {
    const q    = query(collection(db, 'islands'), where('user_id', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  async _ensureIsland(fbUser, islandName) {
    const existing = await this._getIsland(fbUser.uid);
    if (existing) return existing;
    const ref = await addDoc(collection(db, 'islands'), {
      user_id:      fbUser.uid,
      label:        islandName,
      x:            Math.floor(Math.random() * 2400 + 300),
      y:            Math.floor(Math.random() * 1600 + 200),
      size:         1.0,
      last_drop_at: null,
      created_at:   serverTimestamp(),
    });
    return { id: ref.id, label: islandName };
  }
}

export const session = new Session();
