import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import {
  cleanupSyncedOlderThanDays,
  fetchUnsynced,
  initDb,
  PendingCheckinRecord,
  updateSyncStatus,
} from './sqlite';
import {
  ApiOptions,
  BatchCheckInItem,
  BatchCheckInResult,
  getApiErrorMessage,
  postBatchCheckIns,
  postCheckIn,
} from './api';

export interface SyncOptions extends ApiOptions {
  cleanupDays?: number;
}

let isSyncing = false;

function isConnected(state: NetInfoState): boolean {
  return Boolean(state.isConnected) && (state.isInternetReachable ?? true);
}

function buildBatchPayload(records: PendingCheckinRecord[]): BatchCheckInItem[] {
  return records.map((record) => ({
    local_id: record.id,
    qr_code: record.qr_code,
    staff_id: record.staff_id,
    device_id: record.device_id,
    scanned_at: record.scanned_at,
  }));
}

function findResult(
  results: BatchCheckInResult[],
  record: PendingCheckinRecord,
  index: number
): BatchCheckInResult | undefined {
  return (
    results.find((item) => item.local_id === record.id) ||
    results[index]
  );
}

export async function syncPendingCheckins(options?: SyncOptions): Promise<void> {
  if (isSyncing) {
    return;
  }
  isSyncing = true;

  try {
    await initDb();
    let batch = await fetchUnsynced(50);

    while (batch.length > 0) {
      const payload = buildBatchPayload(batch);
      let results: BatchCheckInResult[] = [];

      try {
        results = await postBatchCheckIns(payload, options);
      } catch (error) {
        const message = getApiErrorMessage(error);
        await Promise.all(
          batch.map((record) => updateSyncStatus(record.id, -1, message))
        );
        break;
      }

      await Promise.all(
        batch.map((record, index) => {
          const result = findResult(results, record, index);
          if (!result) {
            return updateSyncStatus(record.id, -1, 'Missing sync result.');
          }
          if (result.status === 'ok') {
            return updateSyncStatus(record.id, 1, null);
          }
          return updateSyncStatus(record.id, -1, result.message ?? 'Sync failed.');
        })
      );

      batch = await fetchUnsynced(50);
    }

    await cleanupSyncedOlderThanDays(options?.cleanupDays ?? 7);
  } finally {
    isSyncing = false;
  }
}

export function startSyncListener(options?: SyncOptions): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (isConnected(state)) {
      // Offline-to-online transition: when connectivity returns, drain the
      // local queue by replaying the oldest pending check-ins first.
      void syncPendingCheckins(options);
    }
  });

  return unsubscribe;
}

export async function syncSingleCheckin(
  record: PendingCheckinRecord,
  options?: SyncOptions
): Promise<void> {
  try {
    const response = await postCheckIn(
      {
        qr_code: record.qr_code,
        staff_id: record.staff_id,
        device_id: record.device_id,
        scanned_at: record.scanned_at,
      },
      options
    );
    if (response?.status && response.status !== 'ok') {
      await updateSyncStatus(record.id, -1, response.message ?? 'Sync failed.');
      return;
    }
    await updateSyncStatus(record.id, 1, null);
  } catch (error) {
    const message = getApiErrorMessage(error);
    await updateSyncStatus(record.id, -1, message);
    throw error;
  }
}
