/**
 * drops.js — drop (item) state store
 */

import { db } from '../utils/db.js';

class DropStore {
  constructor() {
    this._drops = [];
  }

  /** seed from island load — avoids second db roundtrip */
  seed(drops) {
    this._drops = drops.map(d => ({
      ...d,
      dropped_ago: _relativeTime(d.created_at),
    }));
  }

  getAll()        { return this._drops; }
  getById(id)     { return this._drops.find(d => d.id === id) ?? null; }
  getByIsland(id) { return this._drops.filter(d => d.island_id === id); }

  async create(payload) {
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('not authenticated');

    const { data: island } = await db
      .from('islands')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!island) throw new Error('no island found');

    const { data, error } = await db
      .from('drops')
      .insert({
        island_id: island.id,
        type:      payload.type,
        label:     payload.label ?? payload.content?.slice(0, 60) ?? '',
        content:   payload.content,
        url:       payload.url,
        tags:      payload.tags ?? [],
        offset_x:  _randomOffset(),
        offset_y:  _randomOffset(),
      })
      .select()
      .single();

    if (error) throw error;

    await db.from('islands').update({ last_drop_at: new Date().toISOString() })
      .eq('id', island.id);

    this._drops.push({ ...data, island_id: island.id, dropped_ago: 'just now' });
    return data;
  }
}

function _relativeTime(iso) {
  if (!iso) return '';
  const ms   = Date.now() - new Date(iso).getTime();
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
