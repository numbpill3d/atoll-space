/**
 * islands.js — island state store
 *
 * manages island data in memory, loaded from supabase.
 * handles drift position computation and sinking state.
 */

import { db } from '../utils/db.js';

class IslandStore {
  constructor() {
    this._islands     = [];
    this._adjacencies = [];
  }

  /** load all public islands + their drops for the map */
  async loadPublic() {
    const { data, error } = await db
      .from('islands')
      .select(`
        id, label, x, y, size, last_drop_at, created_at,
        drops ( id, type, label, content, url, tags, offset_x, offset_y, created_at )
      `)
      .order('last_drop_at', { ascending: false });

    if (error) {
      console.error('[islandStore] loadPublic error', error);
      return;
    }

    const now = Date.now();
    const DAY = 86400000;

    this._islands = (data ?? []).map(row => {
      const lastDrop = row.last_drop_at ? new Date(row.last_drop_at).getTime() : 0;
      const ageDays  = Math.floor((now - lastDrop) / DAY);
      const sinking  = ageDays >= 60 ? 2 : ageDays >= 30 ? 1 : 0;
      const opacity  = sinking === 2 ? 0.15 : sinking === 1 ? 0.5 : 1.0;

      return {
        ...row,
        sinking,
        opacity,
        age_days: ageDays,
      };
    });

    this._computeAdjacencies();

    // also seed drop store
    const { dropStore } = await import('./drops.js');
    const allDrops = this._islands.flatMap(i => (i.drops ?? []).map(d => ({ ...d, island_id: i.id })));
    dropStore.seed(allDrops);
  }

  getAll()         { return this._islands; }
  getById(id)      { return this._islands.find(i => i.id === id) ?? null; }
  getAdjacencies() { return this._adjacencies; }

  /** subscribe to realtime island position updates from drift ticks */
  subscribe(onUpdate) {
    db.channel('island-drift')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'islands',
      }, payload => {
        const idx = this._islands.findIndex(i => i.id === payload.new.id);
        if (idx !== -1) {
          this._islands[idx].x = payload.new.x;
          this._islands[idx].y = payload.new.y;
          onUpdate();
        }
      })
      .subscribe();
  }

  /** returns centroid positions for tag clusters (for map labels) */
  getTagClusters() {
    const tagMap = {};
    this._islands.forEach(isl => {
      const drops = isl.drops ?? [];
      const islandTags = new Set(drops.flatMap(d => d.tags ?? []));
      islandTags.forEach(tag => {
        if (!tagMap[tag]) tagMap[tag] = { xs: [], ys: [] };
        tagMap[tag].xs.push(isl.x);
        tagMap[tag].ys.push(isl.y);
      });
    });

    return Object.entries(tagMap)
      .filter(([, v]) => v.xs.length >= 2)
      .map(([tag, v]) => ({
        tag,
        cx: v.xs.reduce((a, b) => a + b, 0) / v.xs.length,
        cy: v.ys.reduce((a, b) => a + b, 0) / v.ys.length - 30,
      }));
  }

  _computeAdjacencies() {
    this._adjacencies = [];
    const isls = this._islands;
    for (let i = 0; i < isls.length; i++) {
      for (let j = i + 1; j < isls.length; j++) {
        const ta = new Set((isls[i].drops ?? []).flatMap(d => d.tags ?? []));
        const tb = new Set((isls[j].drops ?? []).flatMap(d => d.tags ?? []));
        const shared = [...ta].filter(t => tb.has(t));
        if (shared.length > 0) {
          this._adjacencies.push({ a: isls[i].id, b: isls[j].id, shared });
        }
      }
    }
  }
}

export const islandStore = new IslandStore();
