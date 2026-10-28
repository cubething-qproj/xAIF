/**
 * Named editing sessions kept in localStorage, so several files can be open
 * and switched between, or shown side by side in different tabs.
 *
 * A session is a file name plus its xAIF. The index (`xaif-editor:sessions`)
 * lists every session with its last-saved time; each session's content is
 * stored under its own key. A tab is bound to one session by the URL hash
 * (see `App.svelte`). Two tabs on the same session overwrite each other:
 * the last save wins.
 */

/** A session as listed in the index. */
export interface SessionInfo {
  id: string;
  name: string;
  /** Last save, in milliseconds since the epoch. */
  updated: number;
}

/** A session's content. */
export interface Session {
  name: string;
  json: unknown;
}

const PREFIX = 'xaif-editor:';
const INDEX = `${PREFIX}sessions`;
/** Where the editor kept its single autosave before sessions existed. */
const LEGACY = 'xaif-editor';

export const sessions = {
  /** All sessions, most recently saved first. */
  list(): SessionInfo[] {
    try {
      const list = JSON.parse(localStorage.getItem(INDEX) ?? '[]') as SessionInfo[];
      return list.sort((a, b) => b.updated - a.updated);
    } catch {
      return [];
    }
  },

  /** A session's content, or null if there is none under that ID. */
  load(id: string): Session | null {
    try {
      return JSON.parse(localStorage.getItem(this.key(id)) ?? 'null');
    } catch {
      return null;
    }
  },

  /** Stores a session's content and records it in the index. */
  save(id: string, session: Session) {
    localStorage.setItem(this.key(id), JSON.stringify(session));
    const others = this.list().filter((s) => s.id !== id);
    localStorage.setItem(INDEX, JSON.stringify([{ id, name: session.name, updated: Date.now() }, ...others]));
  },

  remove(id: string) {
    localStorage.removeItem(this.key(id));
    localStorage.setItem(INDEX, JSON.stringify(this.list().filter((s) => s.id !== id)));
  },

  /** A new, unused session ID, short enough for a URL hash. */
  newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  /** The storage key of a session's content, e.g. to recognise `storage` events for it. */
  key(id: string): string {
    return `${PREFIX}session:${id}`;
  },

  /** Moves the pre-sessions autosave, if any, into a session. */
  migrate() {
    const legacy = localStorage.getItem(LEGACY);
    if (!legacy) return;
    try {
      const { name, json } = JSON.parse(legacy);
      if (json) this.save(this.newId(), { name: name ?? 'untitled.json', json });
    } finally {
      localStorage.removeItem(LEGACY);
    }
  },
};
