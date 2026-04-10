/**
 * session.js — auth session store
 */

import { db } from '../utils/db.js';

class Session {
  constructor() {
    this.user = null;
  }

  async init() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return null;

    const { data: island } = await db
      .from('islands')
      .select('id, label')
      .eq('user_id', session.user.id)
      .maybeSingle();

    this.user = {
      ...session.user,
      island_id:    island?.id ?? null,
      island_label: island?.label ?? null,
    };

    return this.user;
  }

  async sendMagicLink(email, islandName) {
    const { error } = await db.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        data: { island_name: islandName },
      },
    });
    return { error };
  }

  async signOut() {
    await db.auth.signOut();
    this.user = null;
  }

  isAuthenticated() {
    return this.user !== null;
  }
}

export const session = new Session();
