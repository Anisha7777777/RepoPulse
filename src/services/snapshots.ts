import type { ActivitySummary, AttentionSummary, RepositorySnapshot } from '../types/snapshot';

const storageKey = 'repopulse.snapshots.v1';

export interface SnapshotReadResult {
  snapshots: RepositorySnapshot[];
  warning: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function savedCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function savedActivity(value: unknown): ActivitySummary | null {
  if (!isRecord(value)) return null;
  const count = savedCount(value.count);
  if (count === null || ![7, 30, 90].includes(value.days as number) || typeof value.partial !== 'boolean') return null;
  return { count, days: value.days as number, partial: value.partial };
}

function savedAttention(value: unknown): AttentionSummary | null {
  if (!isRecord(value)) return null;
  const count = savedCount(value.count);
  if (count === null || ![7, 14, 30].includes(value.days as number) ||
      !['all', 'issue', 'pull request'].includes(value.filter as string) || typeof value.partial !== 'boolean') return null;
  return { count, days: value.days as number, filter: value.filter as AttentionSummary['filter'], partial: value.partial };
}

function savedSnapshot(value: unknown): RepositorySnapshot | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() ||
      typeof value.repository !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(value.repository) ||
      typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt))) return null;
  return {
    id: value.id,
    repository: value.repository,
    capturedAt: value.capturedAt,
    stars: savedCount(value.stars),
    forks: savedCount(value.forks),
    openIssues: savedCount(value.openIssues),
    activity: savedActivity(value.activity),
    attention: savedAttention(value.attention),
  };
}

export function readSnapshots(): SnapshotReadResult {
  let saved: string | null;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    return { snapshots: [], warning: 'Browser storage could not be read. Saved snapshots are unavailable right now.' };
  }
  if (!saved) return { snapshots: [], warning: '' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return { snapshots: [], warning: 'Saved snapshot data could not be read. Saving a new capture will replace the damaged data.' };
  }
  if (!Array.isArray(parsed)) {
    return { snapshots: [], warning: 'Saved snapshot data has an outdated format. Saving a new capture will replace it.' };
  }
  const snapshots = parsed.map(savedSnapshot).filter((item): item is RepositorySnapshot => item !== null);
  const skipped = parsed.length - snapshots.length;
  return { snapshots, warning: skipped ? `${skipped} invalid saved ${skipped === 1 ? 'snapshot was' : 'snapshots were'} skipped. Valid captures remain available.` : '' };
}

export function writeSnapshots(snapshots: RepositorySnapshot[]): void {
  localStorage.setItem(storageKey, JSON.stringify(snapshots));
}
