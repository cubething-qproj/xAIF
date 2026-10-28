import { describe, expect, it } from 'vitest';
import { LEVER_HANDLE, PORTS, portsFor } from './flow';
import { NODE_KINDS, canConnect } from './xaif';

describe('ports', () => {
  it('fit exactly the edges IAT allows', () => {
    for (const from of NODE_KINDS)
      for (const to of NODE_KINDS) expect([from, to, !!portsFor(from, to)]).toEqual([from, to, canConnect(from, to)]);
  });

  it('take a lever only from an I-node into an RA', () => {
    expect(portsFor('I', 'RA', { lever: true })).toMatchObject({ targetHandle: LEVER_HANDLE });
    expect(portsFor('I', 'RA')?.targetHandle).not.toBe(LEVER_HANDLE);
    expect(portsFor('L', 'RA', { lever: true })).toBeNull();
  });

  it('reject a handle that does not take the other end', () => {
    expect(portsFor('I', 'RA', { target: 'anchor' })).toBeNull();
    expect(portsFor('YA', 'I', { source: 'reports' })).toBeNull();
  });

  it('have unique IDs per node', () => {
    for (const kind of NODE_KINDS) expect(new Set(PORTS[kind].map((p) => p.id)).size).toBe(PORTS[kind].length);
  });
});
