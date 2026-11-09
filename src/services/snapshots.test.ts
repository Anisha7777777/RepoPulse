import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSnapshots, writeSnapshots } from './snapshots';

const key = 'repopulse.snapshots.v1';

function fakeStorage(saved: string | null) {
  const values = new Map<string, string>();
  if (saved !== null) values.set(key, saved);
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => { values.set(name, value); },
  });
  return values;
}

afterEach(() => vi.unstubAllGlobals());

describe('saved snapshots', () => {
  it('reports unreadable JSON without crashing', () => {
    fakeStorage('{broken');
    expect(readSnapshots()).toEqual({ snapshots: [], warning: expect.stringContaining('could not be read') });
  });

  it('keeps valid captures and makes malformed metrics unavailable', () => {
    fakeStorage(JSON.stringify([
      { id: 'one', repository: 'facebook/react', capturedAt: '2026-11-09T12:00:00.000Z',
        stars: 12, forks: 'bad', openIssues: 0,
        activity: { count: 4, days: 7, partial: false },
        attention: { count: -1, days: 7, filter: 'all', partial: false } },
      { id: 'bad', repository: 'other/repo', capturedAt: 'not-a-date' },
    ]));
    const result = readSnapshots();
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0]).toMatchObject({ stars: 12, forks: null, openIssues: 0,
      activity: { count: 4, days: 7 }, attention: null });
    expect(result.warning).toContain('1 invalid saved snapshot');
  });

  it('reports unavailable storage and allows a later save to replace bad data', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
    expect(readSnapshots().warning).toContain('could not be read');
    const values = fakeStorage('{broken');
    writeSnapshots([]);
    expect(values.get(key)).toBe('[]');
    expect(readSnapshots()).toEqual({ snapshots: [], warning: '' });
  });
});
