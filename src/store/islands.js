/**
 * islands.js — island state store
 *
 * manages island data in memory, loaded from Firestore.
 * handles drift position computation and sinking state.
 */

import { db } from '../utils/db.js';
import {
  collection, query, getDocs, orderBy,
  onSnapshot,
} from 'firebase/firestore';

class IslandStore {
  constructor() {
    this._islands     = [];
    this._adjacencies = [];
  }

  /** load all public islands + their drops for the map */
  async loadPublic() {
    const islandsSnap = await getDocs(
      query(collection(db, 'islands'), orderBy('last_drop_at', 'desc'))
    );

    const islands = islandsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // fetch drops for all islands in parallel
    const dropSnapshots = await Promise.all(
      islands.map(isl =>
        getDocs(collection(db, 'islands', isl.id, 'drops'))
          .then(snap => snap.docs.map(d => ({ id: d.id, island_id: isl.id, ...d.data() })))
      )
    );

    const now = Date.now();
    const DAY = 86400000;

    this._islands = islands.map((row, i) => {
      const lastDrop = row.last_drop_at?.toMillis?.() ?? 0;
      const ageDays  = Math.floor((now - lastDrop) / DAY);
      const sinking  = ageDays >= 60 ? 2 : ageDays >= 30 ? 1 : 0;
      const opacity  = sinking === 2 ? 0.15 : sinking === 1 ? 0.5 : 1.0;

      return {
        ...row,
        drops:    dropSnapshots[i],
        sinking,
        opacity,
        age_days: ageDays,
      };
    });

    this._computeAdjacencies();

    // seed drop store
    const { dropStore } = await import('./drops.js');
    const allDrops = this._islands.flatMap(i => i.drops ?? []);
    dropStore.seed(allDrops);
  }

  getAll()         { return this._islands; }
  getById(id)      { return this._islands.find(i => i.id === id) ?? null; }
  getAdjacencies() { return this._adjacencies; }

  /** subscribe to realtime island position updates */
  subscribe(onUpdate) {
    const q = query(collection(db, 'islands'));
    onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const idx = this._islands.findIndex(i => i.id === change.doc.id);
          if (idx !== -1) {
            const data = change.doc.data();
            this._islands[idx].x = data.x;
            this._islands[idx].y = data.y;
          }
        }
      });
      onUpdate();
    });
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
