import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'checkins.db';
const DEVICE_ID_KEY = 'device_id';

export interface PendingCheckinRecord {
  id: number;
  qr_code: string;
  staff_id: string;
  device_id: string;
  scanned_at: number;
  synced: number;
  sync_error: string | null;
  created_at: number;
}

export interface PendingCheckinInsert {
  qr_code: string;
  staff_id: string;
  device_id: string;
  scanned_at: number;
  synced?: number;
  sync_error?: string | null;
  created_at?: number;
}

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
}

export function initDb(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const database = getDb();
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS pending_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_code TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        scanned_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        sync_error TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_qr_code ON pending_checkins(qr_code);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON pending_checkins(synced);
      `
    );
  })();
  return initPromise;
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const newId = uuidv4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

export async function insertPendingCheckin(record: PendingCheckinInsert): Promise<number> {
  const database = getDb();
  const createdAt = record.created_at ?? Math.floor(Date.now() / 1000);
  const synced = record.synced ?? 0;
  const syncError = record.sync_error ?? null;

  const result = await database.runAsync(
    `INSERT INTO pending_checkins (
      qr_code,
      staff_id,
      device_id,
      scanned_at,
      synced,
      sync_error,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      record.qr_code,
      record.staff_id,
      record.device_id,
      record.scanned_at,
      synced,
      syncError,
      createdAt,
    ]
  );

  return result.lastInsertRowId ?? 0;
}

export async function hasUnsyncedQrCode(qrCode: string): Promise<boolean> {
  const database = getDb();
  const result = await database.getFirstAsync<{ id: number }>(
    'SELECT 1 FROM pending_checkins WHERE qr_code = ? AND synced = 0 LIMIT 1;',
    [qrCode]
  );
  return Boolean(result?.id);
}

export async function fetchUnsynced(limit = 50): Promise<PendingCheckinRecord[]> {
  const database = getDb();
  const result = await database.getAllAsync<PendingCheckinRecord>(
    'SELECT * FROM pending_checkins WHERE synced = 0 ORDER BY created_at ASC LIMIT ?;',
    [limit]
  );
  return result ?? [];
}

export async function fetchPendingList(limit = 200): Promise<PendingCheckinRecord[]> {
  const database = getDb();
  const result = await database.getAllAsync<PendingCheckinRecord>(
    'SELECT * FROM pending_checkins WHERE synced != 1 ORDER BY created_at DESC LIMIT ?;',
    [limit]
  );
  return result ?? [];
}

export async function countUnsynced(): Promise<number> {
  const database = getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_checkins WHERE synced = 0;'
  );
  return result?.count ?? 0;
}

export async function countPending(): Promise<number> {
  const database = getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_checkins WHERE synced != 1;'
  );
  return result?.count ?? 0;
}

export async function updateSyncStatus(
  id: number,
  synced: number,
  syncError: string | null
): Promise<void> {
  const database = getDb();
  await database.runAsync('UPDATE pending_checkins SET synced = ?, sync_error = ? WHERE id = ?;', [
    synced,
    syncError,
    id,
  ]);
}

export async function deletePendingCheckin(id: number): Promise<void> {
  const database = getDb();
  await database.runAsync('DELETE FROM pending_checkins WHERE id = ?;', [id]);
}

export async function deletePendingByQrCode(qrCode: string): Promise<number> {
  const database = getDb();
  const result = await database.runAsync(
    'DELETE FROM pending_checkins WHERE qr_code = ? AND synced != 1;',
    [qrCode]
  );
  return result.changes ?? 0;
}

export async function deleteAllPendingCheckins(): Promise<number> {
  const database = getDb();
  const result = await database.runAsync('DELETE FROM pending_checkins WHERE synced != 1;');
  return result.changes ?? 0;
}

export async function cleanupSyncedOlderThanDays(days = 7): Promise<number> {
  const database = getDb();
  const threshold = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const result = await database.runAsync(
    'DELETE FROM pending_checkins WHERE synced = 1 AND created_at <= ?;',
    [threshold]
  );
  return result.changes ?? 0;
}
