/**
 * session.js — Firebase Auth session (email magic link)
 */

import { auth, db } from '../utils/db.js';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from 'firebase/firestore';

const LS_EMAIL       = 'atoll_sign_in_email';
const LS_ISLAND_NAME = 'atoll_island_name';

class Session {
  constructor() {
    this.user = null;
  }

  async init() {
    // Complete email link sign-in if we're on a redirect URL
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email      = localStorage.getItem(LS_EMAIL) || window.prompt('confirm your email address');
      const islandName = localStorage.getItem(LS_ISLAND_NAME) || 'island';
      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        localStorage.removeItem(LS_EMAIL);
        localStorage.removeItem(LS_ISLAND_NAME);
        await this._ensureIsland(result.user, islandName);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('[session] email link sign-in failed', e);
      }
    }

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

  async sendMagicLink(email, islandName) {
    localStorage.setItem(LS_EMAIL, email);
    if (islandName) localStorage.setItem(LS_ISLAND_NAME, islandName);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: true,
      });
      return { error: null };
    } catch (e) {
      return { error: e };
    }
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
