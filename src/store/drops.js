/**
 * drops.js — drop (item) state store
 */

import { db } from '../utils/db.js';
import { session } from './session.js';
import {
  collection, addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';

class DropStore {
  constructor() {
    this._drops = [];
  }

  /** seed from island load — avoids second db roundtrip */
  seed(drops) {
    this._drops = drops.map(d => ({
      ...d,
      dropped_ago: _relativeTime(d.created_at?.toDate?.() ?? d.created_at),
    }));
  }

  getAll()        { return this._drops; }
  getById(id)     { return this._drops.find(d => d.id === id) ?? null; }
  getByIsland(id) { return this._drops.filter(d => d.island_id === id); }

  async create(payload) {
    const user = session.user;
    if (!user) throw new Error('not authenticated');
    if (!user.island_id) throw new Error('no island found');

    const islandRef  = doc(db, 'islands', user.island_id);
    const dropsRef   = collection(db, 'islands', user.island_id, 'drops');

    const docRef = await addDoc(dropsRef, {
      type:      payload.type,
      label:     payload.label ?? payload.content?.slice(0, 60) ?? '',
      content:   payload.content ?? null,
      url:       payload.url ?? null,
      tags:      payload.tags ?? [],
      offset_x:  _randomOffset(),
      offset_y:  _randomOffset(),
      created_at: serverTimestamp(),
    });

    await updateDoc(islandRef, { last_drop_at: serverTimestamp() });

    const newDrop = {
      id:         docRef.id,
      island_id:  user.island_id,
      type:       payload.type,
      label:      payload.label ?? payload.content?.slice(0, 60) ?? '',
      content:    payload.content ?? null,
      url:        payload.url ?? null,
      tags:       payload.tags ?? [],
      dropped_ago: 'just now',
    };

    this._drops.push(newDrop);
    return newDrop;
  }
}

function _relativeTime(date) {
  if (!date) return '';
  const ms   = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2)    return 'just now';
  if (mins < 60)   return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)   return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function _randomOffset() {
  return (Math.random() - 0.5) * 24;
}

export const dropStore = new DropStore();
