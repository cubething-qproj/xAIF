import { beforeEach, describe, expect, it } from 'vitest';
import { sessions } from './sessions';

/** A minimal in-memory localStorage; vitest runs in node, which has none. */
function stubStorage() {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('sessions', () => {
  beforeEach(stubStorage);

  it('lists sessions most recently saved first and loads their content', async () => {
    sessions.save('a', { name: 'a.json', json: { n: 1 } });
    await new Promise((r) => setTimeout(r, 2));
    sessions.save('b', { name: 'b.json', json: { n: 2 } });
    expect(sessions.list().map((s) => s.id)).toEqual(['b', 'a']);
    expect(sessions.load('a')).toEqual({ name: 'a.json', json: { n: 1 } });
  });

  it('removes a session and its content', () => {
    sessions.save('a', { name: 'a.json', json: {} });
    sessions.remove('a');
    expect(sessions.list()).toEqual([]);
    expect(sessions.load('a')).toBeNull();
  });

  it('moves the old single autosave into a session', () => {
    localStorage.setItem('xaif-editor', JSON.stringify({ name: 'old.json', json: { n: 1 } }));
    sessions.migrate();
    const [only] = sessions.list();
    expect(sessions.load(only.id)).toEqual({ name: 'old.json', json: { n: 1 } });
    expect(localStorage.getItem('xaif-editor')).toBeNull();
  });
});
